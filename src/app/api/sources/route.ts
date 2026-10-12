import { NextResponse } from 'next/server';
import { repo, DEFAULT_OWNER_ID } from '@/lib/db/repository';
import { discoveryEngine } from '@/lib/discovery/engine';

export async function GET() {
  try {
    const sources = repo.getSources(DEFAULT_OWNER_ID);
    const adapters = discoveryEngine.getAllAdapters().map(a => ({
      type: a.type,
      name: a.name,
      description: a.description,
      supportsAutoSync: a.supportsAutoSync,
      requiresCredentials: a.requiresCredentials
    }));

    return NextResponse.json({ sources, availableAdapters: adapters });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, config = {}, sync_interval_minutes = 60, rate_limit_per_minute = 60 } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Source name and type are required' }, { status: 400 });
    }

    const adapter = discoveryEngine.getAdapter(type);
    if (!adapter) {
      return NextResponse.json({ error: `Unsupported source type '${type}'` }, { status: 400 });
    }

    const valRes = adapter.validateConfig(config);
    if (!valRes.valid) {
      return NextResponse.json({ error: valRes.error || 'Invalid source configuration' }, { status: 400 });
    }

    const newSource = repo.insertSource({
      owner_id: DEFAULT_OWNER_ID,
      name,
      type,
      config,
      is_active: true,
      sync_interval_minutes,
      rate_limit_per_minute
    });

    return NextResponse.json({ success: true, source: newSource });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
