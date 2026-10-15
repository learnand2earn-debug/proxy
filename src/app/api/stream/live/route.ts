import { NextRequest } from 'next/server';
import { getLiveProxyStreamBuffer, fetchLivePublicFeeds, ingestLiveProxiesIntoDatabase, LiveDiscoveredProxy } from '@/lib/discovery/live_stream';
import { DEFAULT_OWNER_ID } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const autoIngest = searchParams.get('auto_ingest') === 'true';
  const filterProtocol = searchParams.get('protocol') || 'all';
  const speed = searchParams.get('speed') || 'normal';

  // Interval in ms based on speed
  const intervalMs = speed === 'turbo' ? 200 : speed === 'fast' ? 450 : 800;

  let buffer = await getLiveProxyStreamBuffer();
  if (buffer.length === 0) {
    buffer = await fetchLivePublicFeeds(200);
  }

  let index = 0;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial burst of 10 real proxies
      const initialBurst = buffer
        .filter(p => filterProtocol === 'all' || p.protocol === filterProtocol)
        .slice(0, 12);

      controller.enqueue(encoder.encode(`event: initial_burst\ndata: ${JSON.stringify(initialBurst)}\n\n`));

      // Periodic feeder
      const timer = setInterval(async () => {
        if (isClosed) {
          clearInterval(timer);
          return;
        }

        try {
          if (buffer.length === 0 || index >= buffer.length) {
            // Refill buffer
            buffer = await fetchLivePublicFeeds(150);
            index = 0;
          }

          if (buffer.length === 0) return;

          // Find next matching proxy
          let candidate: LiveDiscoveredProxy | null = null;
          let attempts = 0;
          while (attempts < buffer.length) {
            const p = buffer[index % buffer.length];
            index++;
            attempts++;
            if (filterProtocol === 'all' || p.protocol === filterProtocol) {
              candidate = p;
              break;
            }
          }

          if (candidate) {
            // If auto-ingest enabled, write to persistent inventory
            if (autoIngest) {
              ingestLiveProxiesIntoDatabase([candidate], DEFAULT_OWNER_ID, true).catch(() => {});
            }

            // Stream candidate to client
            controller.enqueue(
              encoder.encode(`event: proxy_incoming\ndata: ${JSON.stringify(candidate)}\n\n`)
            );
          }
        } catch (err: any) {
          // If controller is closed, stop
          clearInterval(timer);
        }
      }, intervalMs);

      // Heartbeat pulse every 5 seconds
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

      // Cleanup on stream cancel
      req.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(timer);
        clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      isClosed = true;
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
