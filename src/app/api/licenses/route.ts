import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { LicensePlanType, LicenseStatus } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const plan_type = (searchParams.get('plan_type') as LicensePlanType) || undefined;
    const status = (searchParams.get('status') as LicenseStatus) || undefined;
    const search = searchParams.get('search') || undefined;

    const licenses = repo.getLicenses({
      plan_type,
      status,
      search
    });

    const stats = repo.getLicenseStats();

    return NextResponse.json({
      success: true,
      data: licenses,
      stats
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch licenses' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_name, customer_username, password, plan_type, notes, expires_in_days } = body;

    if (!customer_name || !plan_type) {
      return NextResponse.json(
        { success: false, error: 'Customer name and plan type are required.' },
        { status: 400 }
      );
    }

    if (!['monthly', 'annual', 'lifetime'].includes(plan_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan type. Must be monthly, annual, or lifetime.' },
        { status: 400 }
      );
    }

    const license = repo.createLicense({
      customer_name: customer_name.trim(),
      customer_username: customer_username?.trim() || undefined,
      password: password || undefined,
      plan_type,
      notes: notes?.trim() || undefined,
      expires_in_days: expires_in_days ? Number(expires_in_days) : undefined
    });

    return NextResponse.json({
      success: true,
      license
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create license' },
      { status: 500 }
    );
  }
}
