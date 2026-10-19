import { NextResponse } from 'next/server';
import { repo, DEFAULT_OWNER_ID } from '@/lib/db/repository';
import { ProxyStatus, ProxyProtocol } from '@/types';
import { discoveryEngine } from '@/lib/discovery/engine';
import { checkProxyEndpoint } from '@/lib/checker/engine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ProxyStatus | undefined;
    const protocol = searchParams.get('protocol') as ProxyProtocol | undefined;
    const source_id = searchParams.get('source_id') || undefined;
    const search = searchParams.get('search') || undefined;
    const country = searchParams.get('country') || searchParams.get('country_code') || undefined;
    const is_quarantined = searchParams.has('is_quarantined') 
      ? searchParams.get('is_quarantined') === 'true' 
      : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sort_by = (searchParams.get('sort_by') as any) || 'created_at';
    const sort_order = (searchParams.get('sort_order') as any) || 'desc';

    const result = repo.getProxies({
      owner_id: DEFAULT_OWNER_ID,
      status: status || undefined,
      protocol: protocol || undefined,
      source_id,
      search,
      country_code: country,
      is_quarantined,
      page,
      limit,
      sort_by,
      sort_order
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type = 'manual', payload, source_id, immediate_check = true } = body;

    let source = source_id ? repo.getSources().find(s => s.id === source_id) : undefined;
    if (!source) {
      source = repo.getSources().find(s => s.type === type) || repo.getSources()[0];
    }

    if (!source) {
      source = repo.insertSource({
        owner_id: DEFAULT_OWNER_ID,
        name: type === 'bulk_paste' ? 'Bulk Ingestion' : 'Manual Entry',
        type: type as any,
        config: {},
        is_active: true,
        sync_interval_minutes: 60,
        rate_limit_per_minute: 60
      });
    }

    const ingestRes = await discoveryEngine.ingestSource(source, payload, DEFAULT_OWNER_ID);

    // If immediate check was requested and there are a reasonable number of proxies, run checks in background
    if (immediate_check && ingestRes.insertedCount > 0 && ingestRes.insertedCount <= 10) {
      const { data: latest } = repo.getProxies({ owner_id: DEFAULT_OWNER_ID, limit: ingestRes.insertedCount });
      for (const p of latest) {
        if (!p.is_quarantined && p.current_status === 'UNKNOWN') {
          checkProxyEndpoint(p).then(res => {
            repo.updateProxyCheck(p.id, res);
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount: ingestRes.insertedCount,
      duplicateCount: ingestRes.duplicateCount,
      invalidCount: ingestRes.invalidCount,
      totalDiscovered: ingestRes.discoveryResult.total_discovered
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
