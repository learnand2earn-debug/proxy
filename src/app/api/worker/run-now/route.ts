import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { checkProxyEndpoint } from '@/lib/checker/engine';
import { dispatchNotification } from '@/lib/notifications/service';

export async function POST() {
  try {
    const { data: proxies } = repo.getProxies({ limit: 25 });
    let checkedCount = 0;
    let recoveredCount = 0;

    for (const proxy of proxies) {
      if (!proxy.is_quarantined) {
        try {
          const res = await checkProxyEndpoint(proxy, { timeoutMs: 4000 });
          const updated = repo.updateProxyCheck(proxy.id, res);
          checkedCount++;

          if (updated?.transition) {
            const t = updated.transition;
            if (t.from_status === 'INACTIVE' && t.to_status === 'ACTIVE') {
              recoveredCount++;
            }
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
        } catch (e) {
          // continue
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Monitoring cycle completed. Checked ${checkedCount} proxies, detected ${recoveredCount} recoveries.`,
      checkedCount,
      recoveredCount
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
