import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { checkProxyEndpoint } from '@/lib/checker/engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ids = [], reason = 'Bulk user operation' } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    let affectedCount = 0;

    if (action === 'delete') {
      for (const id of ids) {
        if (repo.deleteProxy(id)) affectedCount++;
      }
      return NextResponse.json({ success: true, action, affectedCount });
    }

    if (action === 'quarantine') {
      for (const id of ids) {
        if (repo.quarantineProxy(id, reason)) affectedCount++;
      }
      return NextResponse.json({ success: true, action, affectedCount });
    }

    if (action === 'restore') {
      for (const id of ids) {
        if (repo.restoreProxy(id)) affectedCount++;
      }
      return NextResponse.json({ success: true, action, affectedCount });
    }

    if (action === 'recheck') {
      const results: any[] = [];
      const CHUNK_SIZE = 10;
      
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunkIds = ids.slice(i, i + CHUNK_SIZE);
        await Promise.allSettled(
          chunkIds.map(async (id) => {
            const proxy = repo.getProxyById(id);
            if (proxy) {
              try {
                const checkRes = await checkProxyEndpoint(proxy, { timeoutMs: 4000 });
                repo.updateProxyCheck(proxy.id, checkRes);
                results.push({ id, status: checkRes.status, latency_ms: checkRes.latency_ms });
                affectedCount++;
              } catch (e: any) {
                results.push({ id, error: e.message });
              }
            }
          })
        );
      }
      return NextResponse.json({ success: true, action, affectedCount, results });
    }

    return NextResponse.json({ error: `Unknown bulk action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
