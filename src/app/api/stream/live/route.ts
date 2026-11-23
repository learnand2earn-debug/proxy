import { NextRequest } from 'next/server';
import { 
  getLiveProxyStreamBuffer, 
  fetchLivePublicFeeds, 
  testProxyLive, 
  testProxyTargetLive,
  ingestLiveProxiesIntoDatabase, 
  LiveDiscoveredProxy 
} from '@/lib/discovery/live_stream';
import { DEFAULT_OWNER_ID } from '@/lib/db/repository';
import { TargetPlatform } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const autoIngest = searchParams.get('auto_ingest') === 'true';
  const filterProtocol = searchParams.get('protocol') || 'all';
  const filterCountry = (searchParams.get('country') || 'ALL').trim().toUpperCase();
  const filterTarget = (searchParams.get('target') || 'all').toLowerCase();
  const speed = searchParams.get('speed') || 'fast';

  // Interval in ms based on speed - faster throughput for continuous multi-proxy streaming
  const intervalMs = speed === 'turbo' ? 80 : speed === 'fast' ? 180 : 450;
  const burstPerTick = speed === 'turbo' ? 6 : speed === 'fast' ? 3 : 1;

  const matchesFilters = (p: LiveDiscoveredProxy) => {
    const matchProto = filterProtocol === 'all' || p.protocol === filterProtocol;
    const matchCountry = filterCountry === 'ALL' || (p.country_code && p.country_code.toUpperCase() === filterCountry);
    const matchTarget = filterTarget === 'all' ||
      (filterTarget === 'facebook' && (p.target_compatibility?.facebook || p.protocol === 'socks5' || p.protocol === 'https')) ||
      (filterTarget === 'linkedin' && (p.target_compatibility?.linkedin || p.protocol === 'socks5' || p.protocol === 'https')) ||
      (filterTarget === 'web');
    return matchProto && matchCountry && matchTarget;
  };

  // Raw discovered proxies waiting to be tested
  let rawPool: LiveDiscoveredProxy[] = [];
  // Genuinely tested proxies ready to stream to client
  const testedQueue: LiveDiscoveredProxy[] = [];
  
  let isClosed = false;
  let isTesting = false;
  let isFetching = false;
  const ingestBatch: LiveDiscoveredProxy[] = [];

  // 1. Replenishes raw authentic proxies from real sources
  const replenishRawPool = async () => {
    if (isFetching || isClosed) return;
    isFetching = true;
    try {
      const fresh = await fetchLivePublicFeeds(0, filterCountry);
      const filtered = fresh.filter(matchesFilters);
      if (filtered.length > 0) {
        rawPool.push(...filtered);
      }
    } catch (err: any) {
      console.warn('[Stream Route] Feed replenish warning:', err.message);
    } finally {
      isFetching = false;
    }
  };

  // 2. Concurrently probes raw proxies with real TCP/TLS target handshakes
  const processTestBatch = async () => {
    if (isTesting || isClosed) return;
    if (rawPool.length === 0) {
      await replenishRawPool();
    }
    if (rawPool.length === 0) return;

    isTesting = true;
    try {
      const batch = rawPool.splice(0, 45);
      const isSpecialTarget = filterTarget === 'facebook' || filterTarget === 'linkedin';

      const tested = await Promise.all(
        batch.map(async (p) => {
          try {
            if (isSpecialTarget) {
              const res = await testProxyTargetLive(
                { normalized_endpoint: p.normalized_endpoint, protocol: p.protocol, host: p.ip, port: p.port },
                filterTarget as TargetPlatform,
                2000
              );
              return {
                ...p,
                latency_ms: res.latencyMs,
                verified_active: res.isLive,
                target_compatibility: {
                  web: true,
                  facebook: filterTarget === 'facebook' ? res.isLive : !!p.target_compatibility?.facebook,
                  linkedin: filterTarget === 'linkedin' ? res.isLive : !!p.target_compatibility?.linkedin
                },
                timestamp: new Date().toISOString()
              };
            } else {
              const { isLive, latencyMs } = await testProxyLive(p.ip, p.port, 1200);
              return {
                ...p,
                latency_ms: latencyMs,
                verified_active: isLive,
                timestamp: new Date().toISOString()
              };
            }
          } catch {
            return {
              ...p,
              latency_ms: 0,
              verified_active: false,
              timestamp: new Date().toISOString()
            };
          }
        })
      );
      testedQueue.push(...tested);
    } finally {
      isTesting = false;
    }
  };

  // Initial load
  const initialData = await getLiveProxyStreamBuffer(filterCountry);
  rawPool.push(...initialData.filter(matchesFilters));

  // Run initial test batch
  await processTestBatch();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial burst of tested real proxies (up to 50)
      const initialBurst = testedQueue.splice(0, Math.min(testedQueue.length, 50));
      controller.enqueue(encoder.encode(`event: initial_burst\ndata: ${JSON.stringify(initialBurst)}\n\n`));

      // Periodic stream feeder
      const timer = setInterval(async () => {
        if (isClosed) {
          clearInterval(timer);
          return;
        }

        try {
          if (testedQueue.length < 35 && !isTesting) {
            processTestBatch().catch(() => {});
          }

          if (testedQueue.length === 0) return;

          const toSend = testedQueue.splice(0, Math.min(testedQueue.length, burstPerTick));
          for (const candidate of toSend) {
            controller.enqueue(
              encoder.encode(`event: proxy_incoming\ndata: ${JSON.stringify(candidate)}\n\n`)
            );

            if (autoIngest) {
              ingestBatch.push(candidate);
              if (ingestBatch.length >= 60) {
                const toFlush = ingestBatch.splice(0, ingestBatch.length);
                ingestLiveProxiesIntoDatabase(toFlush, DEFAULT_OWNER_ID, true).catch(() => {});
              }
            }
          }
        } catch {
          isClosed = true;
          clearInterval(timer);
        }
      }, intervalMs);

      // Heartbeat pulse every 2.5 seconds
      const heartbeatTimer = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeatTimer);
          return;
        }
        try {
          controller.enqueue(
            encoder.encode(`: keep-alive\nevent: ping\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`)
          );
        } catch {
          isClosed = true;
          clearInterval(heartbeatTimer);
        }
      }, 2500);

      // Cleanup on stream abort
      req.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(timer);
        clearInterval(heartbeatTimer);
        if (autoIngest && ingestBatch.length > 0) {
          ingestLiveProxiesIntoDatabase(ingestBatch, DEFAULT_OWNER_ID, true).catch(() => {});
        }
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      isClosed = true;
      if (autoIngest && ingestBatch.length > 0) {
        ingestLiveProxiesIntoDatabase(ingestBatch, DEFAULT_OWNER_ID, true).catch(() => {});
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
