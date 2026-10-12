import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { checkProxyEndpoint } from '@/lib/checker/engine';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const proxy = repo.getProxyById(params.id);
    if (!proxy) {
      return NextResponse.json({ error: 'Proxy record not found' }, { status: 404 });
    }

    const checkResult = await checkProxyEndpoint(proxy, { timeoutMs: 6000 });
    const updateResult = repo.updateProxyCheck(proxy.id, checkResult);

    return NextResponse.json({
      success: true,
      checkResult,
      record: updateResult?.record,
      transition: updateResult?.transition
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
