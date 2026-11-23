import { NextResponse } from 'next/server';
import { repo, DEFAULT_OWNER_ID } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const stats = repo.getDashboardStats(DEFAULT_OWNER_ID);
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
