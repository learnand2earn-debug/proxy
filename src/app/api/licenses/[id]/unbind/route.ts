import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const res = repo.unbindLicenseOrigin(params.id);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: res.message });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
