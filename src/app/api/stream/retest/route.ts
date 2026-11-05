import { NextResponse } from 'next/server';
import { testProxyLive, LiveDiscoveredProxy } from '@/lib/discovery/live_stream';
import { repo, DEFAULT_OWNER_ID } from '@/lib/db/repository';
import { isSupabaseEnabled, insertProxiesToSupabase } from '@/lib/db/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const proxies: LiveDiscoveredProxy[] = Array.isArray(body.proxies) ? body.proxies.slice(0, 20) : [];

    if (proxies.length === 0) {
      return NextResponse.json({ success: true, testedCount: 0, recovered: [] });
    }

    const recovered: LiveDiscoveredProxy[] = [];
    const now = new Date().toISOString();

    // Test offline proxies concurrently using genuine TCP sockets
    await Promise.all(
      proxies.map(async (p) => {
        try {
          const { isLive, latencyMs } = await testProxyLive(p.ip, p.port, 1500);
          if (isLive) {
            const recoveredProxy: LiveDiscoveredProxy = {
              ...p,
              latency_ms: latencyMs,
              verified_active: true,
              source: `${p.source} (Auto-Recovered)`,
              timestamp: now
            };

            recovered.push(recoveredProxy);

            // Update in local repository
            const existing = repo.getProxies({ search: p.ip, limit: 1 }).data[0];
            if (existing) {
              existing.current_status = 'ACTIVE';
              existing.last_latency_ms = latencyMs;
              existing.last_checked_at = now;
              existing.last_successful_check_at = now;
              existing.recovery_count = (existing.recovery_count || 0) + 1;
              repo.save();
            }

            // Sync to Supabase
            if (isSupabaseEnabled()) {
              insertProxiesToSupabase([recoveredProxy], DEFAULT_OWNER_ID).catch(() => {});
            }
          }
        } catch {}
      })
    );

    return NextResponse.json({
      success: true,
      testedCount: proxies.length,
      recoveredCount: recovered.length,
      recovered
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

