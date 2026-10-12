import { NextResponse } from 'next/server';
import { repo, DEFAULT_OWNER_ID } from '@/lib/db/repository';

export async function GET() {
  try {
    const schedules = repo.getSchedules(DEFAULT_OWNER_ID);
    return NextResponse.json({ schedules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, interval_seconds, is_active, backoff_strategy, max_interval_seconds, jitter_factor } = body;

    if (!id) {
      return NextResponse.json({ error: 'Schedule id is required' }, { status: 400 });
    }

    const updated = repo.updateSchedule(id, {
      interval_seconds: interval_seconds !== undefined ? Number(interval_seconds) : undefined,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
      backoff_strategy,
      max_interval_seconds: max_interval_seconds !== undefined ? Number(max_interval_seconds) : undefined,
      jitter_factor: jitter_factor !== undefined ? Number(jitter_factor) : undefined
    });

    if (!updated) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, schedule: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
