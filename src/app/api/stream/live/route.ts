import { NextRequest } from 'next/server';
import { 
  getLiveProxyStreamBuffer, 
  fetchLivePublicFeeds, 
  testProxyLive, 
  ingestLiveProxiesIntoDatabase, 
  LiveDiscoveredProxy 
} from '@/lib/discovery/live_stream';
import { DEFAULT_OWNER_ID } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const autoIngest = searchParams.get('auto_ingest') === 'true';
  const filterProtocol = searchParams.get('protocol') || 'all';
  const filterCountry = (searchParams.get('country') || 'ALL').trim().toUpperCase();
  const speed = searchParams.get('speed') || 'normal';

  // Interval in ms based on speed
  const intervalMs = speed === 'turbo' ? 250 : speed === 'fast' ? 500 : 900;

  const matchesFilters = (p: LiveDiscoveredProxy) => {
    const matchProto = filterProtocol === 'all' || p.protocol === filterProtocol;
    const matchCountry = filterCountry === 'ALL' || (p.country_code && p.country_code.toUpperCase() === filterCountry);
    return matchProto && matchCountry;
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

  // 2. Concurrently probes raw proxies with real TCP handshakes to test live vs dead
  const processTestBatch = async () => {
    if (isTesting || isClosed) return;
    if (rawPool.length === 0) {
      await replenishRawPool();
    }
    if (rawPool.length === 0) return;

    isTesting = true;
    try {
      const batch = rawPool.splice(0, 10);
      const tested = await Promise.all(
        batch.map(async (p) => {
          try {
            const { isLive, latencyMs } = await testProxyLive(p.ip, p.port, 1400);
            return {
              ...p,
              latency_ms: latencyMs,
              verified_active: isLive,
              timestamp: new Date().toISOString()
            };
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

      // Send initial burst of already tested real proxies
      const initialBurst = testedQueue.splice(0, Math.min(testedQueue.length, 12));
      controller.enqueue(encoder.encode(`event: initial_burst\ndata: ${JSON.stringify(initialBurst)}\n\n`));

      // Periodic stream feeder
      const timer = setInterval(async () => {
        if (isClosed) {
          clearInterval(timer);
          return;
        }

        try {
          // If tested queue is low, test more proxies in parallel
          if (testedQueue.length < 15 && !isTesting) {
            processTestBatch().catch(() => {});
          }

          if (testedQueue.length === 0) return;

          const candidate = testedQueue.shift();
          if (!candidate) return;

          // Stream verified proxy to client
          controller.enqueue(
            encoder.encode(`event: proxy_incoming\ndata: ${JSON.stringify(candidate)}\n\n`)
          );

          // Batch auto-ingestion: saves both live and inactive real results
          if (autoIngest) {
            ingestBatch.push(candidate);
            if (ingestBatch.length >= 8) {
              const toFlush = ingestBatch.splice(0, ingestBatch.length);
              ingestLiveProxiesIntoDatabase(toFlush, DEFAULT_OWNER_ID, true).catch(() => {});
            }
          }
        } catch (err: any) {
          clearInterval(timer);
        }
      }, intervalMs);

      // Heartbeat pulse every 5 seconds to keep connection alive
      const heartbeatTimer = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeatTimer);
          return;
        }
        try {
          controller.enqueue(
            encoder.encode(`event: ping\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`)
          );
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 5000);

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
