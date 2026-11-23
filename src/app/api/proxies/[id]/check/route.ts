import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { checkProxyEndpoint, checkProxyMultiTarget } from '@/lib/checker/engine';
import { TargetPlatform } from '@/types';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const proxy = repo.getProxyById(params.id);
    if (!proxy) {
      return NextResponse.json({ error: 'Proxy record not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const target = (searchParams.get('target') || body.target || 'all') as TargetPlatform;

    let checkResult;
    let compatibility;
    let latencies;

    if (target === 'all') {
      const multi = await checkProxyMultiTarget(proxy, 5000);
      checkResult = multi.result;
      compatibility = multi.compatibility;
      latencies = multi.latencies;
    } else {
      checkResult = await checkProxyEndpoint(proxy, { timeoutMs: 5000, target });
      compatibility = checkResult.target_compatibility;
    }

    const updateResult = repo.updateProxyCheck(proxy.id, checkResult);

    return NextResponse.json({
      success: true,
      checkResult,
      compatibility,
      latencies,
      record: updateResult?.record,
      transition: updateResult?.transition
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
