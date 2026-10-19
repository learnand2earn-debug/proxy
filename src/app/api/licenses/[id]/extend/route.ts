import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let days = 30;
    try {
      const body = await req.json();
      if (body.days && !isNaN(Number(body.days))) {
        days = Number(body.days);
      }
    } catch {}

    const updated = repo.extendLicense(params.id, days);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    }
    return NextResponse.json({ 
      success: true, 
      license: updated,
      message: `License extended by ${days} days. New expiry: ${new Date(updated.expires_at).toLocaleDateString()}` 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
