import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let revokeVal: boolean | undefined = undefined;
    try {
      const body = await req.json();
      if (typeof body.revoke === 'boolean') {
        revokeVal = body.revoke;
      }
    } catch {}

    const updated = repo.toggleRevokeLicense(params.id, revokeVal);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, license: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
