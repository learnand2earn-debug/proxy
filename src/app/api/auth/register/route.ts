import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { LicensePlanType } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, username, password, plan_type = 'monthly' } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Full Name is required for registration.' },
        { status: 400 }
      );
    }

    if (!username || !username.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username is required for registration.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if username already exists in real licenses
    const existing = repo.getLicenseByUsername(cleanUsername);
    if (existing || cleanUsername === 'admin') {
      return NextResponse.json(
        { success: false, error: `Username '${cleanUsername}' is already registered. Please choose another username.` },
        { status: 409 }
      );
    }

    const cleanPlan: LicensePlanType = 
      ['monthly', 'annual', 'lifetime'].includes(plan_type) 
        ? plan_type 
        : 'monthly';

    // Create real license record in database
    const license = repo.createLicense({
      customer_name: name.trim(),
      customer_username: cleanUsername,
      password: password,
      plan_type: cleanPlan,
      notes: `Self-registered customer account created on ${new Date().toLocaleDateString()}`
    });

    // Auto-authenticate this real user to their current origin
    const origin = 
      body.origin ||
      req.headers.get('origin') || 
      req.headers.get('referer')?.replace(/\/[^/]*$/, '') || 
      'http://localhost:3000';

    const authRes = repo.authenticate({
      usernameOrKey: cleanUsername,
      password: password,
      origin
    });

    if (!authRes.success || !authRes.session) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Failed to authenticate registered account' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Account registered successfully with authentic DRM license.',
      session: authRes.session,
      license
    });

    response.cookies.set('wsp_auth_token', authRes.session.session_token, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
