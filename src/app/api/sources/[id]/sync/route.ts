import { NextResponse } from 'next/server';
import { repo, DEFAULT_OWNER_ID } from '@/lib/db/repository';
import { discoveryEngine } from '@/lib/discovery/engine';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const source = repo.getSources(DEFAULT_OWNER_ID).find(s => s.id === params.id);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const res = await discoveryEngine.ingestSource(source, undefined, DEFAULT_OWNER_ID);

    source.last_synced_at = new Date().toISOString();
    source.last_sync_status = res.discoveryResult.sync_error ? 'failed' : 'success';
    source.last_sync_error = res.discoveryResult.sync_error;

    return NextResponse.json({
      success: !res.discoveryResult.sync_error,
      result: res
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
