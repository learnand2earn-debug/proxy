import { NextResponse } from 'next/server';
import { fetchLivePublicFeeds, ingestLiveProxiesIntoDatabase, getCountryInfo } from '@/lib/discovery/live_stream';
import { DEFAULT_OWNER_ID } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = parseInt(body.count || '2500', 10);
    const country = body.country ? String(body.country).trim().toUpperCase() : undefined;
    const countryInfo = country ? getCountryInfo(country) : null;

    const fresh = await fetchLivePublicFeeds(count, country);
    const { inserted, duplicates } = await ingestLiveProxiesIntoDatabase(fresh, DEFAULT_OWNER_ID, true);

    return NextResponse.json({
      success: true,
      country: country || 'GLOBAL',
      countryInfo,
      discovered: fresh.length,
      inserted,
      duplicates,
      sample: fresh.slice(0, 5)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
