import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const proxy = repo.getProxyById(params.id);
    if (!proxy) {
      return NextResponse.json({ error: 'Proxy record not found' }, { status: 404 });
    }

    const checkHistory = repo.getCheckHistory().filter(c => c.proxy_id === params.id);
    const transitions = repo.getTransitions().filter(t => t.proxy_id === params.id);

    return NextResponse.json({
      proxy,
      check_history: checkHistory,
      transitions
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = repo.deleteProxy(params.id);
    if (!success) {
      return NextResponse.json({ error: 'Proxy record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Proxy record permanently removed' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
