import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action = 'quarantine', reason = 'Manual quarantine by user' } = body;

    if (action === 'restore') {
      const restored = repo.restoreProxy(params.id);
      if (!restored) {
        return NextResponse.json({ error: 'Proxy not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Proxy restored to active pool', record: restored });
    } else {
      const quarantined = repo.quarantineProxy(params.id, reason);
      if (!quarantined) {
        return NextResponse.json({ error: 'Proxy not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Proxy quarantined', record: quarantined });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
