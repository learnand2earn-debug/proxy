import http from 'http';
import { repo } from '../src/lib/db/repository';
import { checkProxyEndpoint } from '../src/lib/checker/engine';
import { dispatchNotification } from '../src/lib/notifications/service';

const PORT = parseInt(process.env.WORKER_PORT || '3001', 10);
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || '10000', 10);

let isRunning = true;
let activeJobs = 0;
let totalChecksRun = 0;
let totalRecoveries = 0;
let lastCycleAt: string = new Date().toISOString();

console.log(`[Worker] Starting AI Proxy Intelligence Monitoring Daemon...`);
console.log(`[Worker] Concurrency: ${CONCURRENCY}, Poll Interval: ${POLL_INTERVAL_MS}ms, Health Port: ${PORT}`);

/**
 * Health & Metric server for Render / Railway / Docker
 */
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime_seconds: process.uptime(),
      active_jobs: activeJobs,
      total_checks_run: totalChecksRun,
      total_recoveries: totalRecoveries,
      last_cycle_at: lastCycleAt,
      timestamp: new Date().toISOString()
    }));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

healthServer.listen(PORT, () => {
  console.log(`[Worker] Healthcheck server listening at http://localhost:${PORT}/health`);
});

/**
 * Main Monitoring Loop
 */
export async function runMonitoringCycle(): Promise<{ checked: number; recovered: number }> {
  lastCycleAt = new Date().toISOString();
  const now = Date.now();

  // Get eligible proxies for check
  const { data: proxies } = repo.getProxies({ limit: 100 });
  const eligible = proxies.filter(p => {
    if (p.is_quarantined) return false;
    const nextCheck = new Date(p.next_scheduled_check_at).getTime();
    return nextCheck <= now;
  });

  if (eligible.length === 0) {
    return { checked: 0, recovered: 0 };
  }

  console.log(`[Worker] Found ${eligible.length} proxies scheduled for health check`);

  let checkedCount = 0;
  let cycleRecoveries = 0;

  // Process in chunks up to CONCURRENCY
  for (let i = 0; i < eligible.length && isRunning; i += CONCURRENCY) {
    const chunk = eligible.slice(i, i + CONCURRENCY);
    activeJobs = chunk.length;

    await Promise.all(chunk.map(async (proxy) => {
      try {
        console.log(`[Worker] Checking ${proxy.protocol}://${proxy.host}:${proxy.port} (Status: ${proxy.current_status})...`);
        const result = await checkProxyEndpoint(proxy, { timeoutMs: 5000 });
        
        const updateResult = repo.updateProxyCheck(proxy.id, result);
        totalChecksRun++;
        checkedCount++;

        if (updateResult?.transition) {
          const t = updateResult.transition;
          console.log(`[Worker] ⚡ Transition detected for ${proxy.host}:${proxy.port}: ${t.from_status} -> ${t.to_status}`);
          
          if (t.from_status === 'INACTIVE' && t.to_status === 'ACTIVE') {
            totalRecoveries++;
            cycleRecoveries++;
          }

          // Dispatch notification
          await dispatchNotification({
            owner_id: proxy.owner_id,
            title: t.to_status === 'ACTIVE' ? 'Proxy Recovered: INACTIVE -> ACTIVE' : 'Proxy Downtime Detected',
            message: t.reason || '',
            type: t.to_status === 'ACTIVE' ? 'proxy_recovered' : 'proxy_failed',
            proxy_id: proxy.id,
            endpoint: proxy.normalized_endpoint,
            latency_ms: t.latency_ms,
            from_status: t.from_status,
            to_status: t.to_status
          });
        }
      } catch (err) {
        console.error(`[Worker] Error checking proxy ${proxy.id}:`, err);
      }
    }));

    activeJobs = 0;
  }

  return { checked: checkedCount, recovered: cycleRecoveries };
}

async function loop() {
  while (isRunning) {
    try {
      await runMonitoringCycle();
    } catch (e) {
      console.error('[Worker] Error in monitoring cycle:', e);
    }
    // Sleep with jitter
    const delay = POLL_INTERVAL_MS + Math.floor(Math.random() * 2000);
    await new Promise(r => setTimeout(r, delay));
  }
}

// Graceful termination handling
process.on('SIGTERM', () => {
  console.log('[Worker] SIGTERM received. Shutting down gracefully...');
  isRunning = false;
  healthServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[Worker] SIGINT received. Shutting down gracefully...');
  isRunning = false;
  healthServer.close(() => process.exit(0));
});

// Run loop if started directly
if (process.env.NODE_ENV !== 'test') {
  loop();
}
