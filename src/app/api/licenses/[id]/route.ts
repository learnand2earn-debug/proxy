import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const license = repo.getLicenseById(params.id);
    if (!license) {
      return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, license });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const updated = repo.updateLicense(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, license: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = repo.deleteLicense(params.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'License deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
