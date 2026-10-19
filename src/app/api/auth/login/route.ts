import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usernameOrKey, password } = body;

    if (!usernameOrKey || typeof usernameOrKey !== 'string') {
      return NextResponse.json(
        { error: 'License key or username is required.' },
        { status: 400 }
      );
    }

    // Determine request origin for DRM single-site binding
    const origin = 
      body.origin ||
      req.headers.get('origin') || 
      req.headers.get('referer')?.replace(/\/[^/]*$/, '') || 
      'http://localhost:3000';

    const result = repo.authenticate({
      usernameOrKey,
      password: password || undefined,
      origin
    });

    if (!result.success) {
      const status = result.is_concurrent_locked ? 409 : 401;
      return NextResponse.json(
        { 
          error: result.error || 'Authentication failed',
          is_concurrent_locked: !!result.is_concurrent_locked 
        },
        { status }
      );
    }

    const response = NextResponse.json({
      success: true,
      session: result.session
    });

    // Also set an httpOnly/secure session cookie for resilience
    response.cookies.set('wsp_auth_token', result.session?.session_token || '', {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
