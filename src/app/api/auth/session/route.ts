import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const headerToken = req.headers.get('x-session-token');
    const cookieToken = req.cookies.get('wsp_auth_token')?.value;

    const token = 
      (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null) ||
      headerToken ||
      cookieToken;

    if (!token) {
      return NextResponse.json({ valid: false, error: 'No active session token provided' }, { status: 401 });
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || undefined;
    const result = repo.validateSession(token, origin);

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      session: result.session
    });
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error.message || 'Session verification failed' },
      { status: 500 }
    );
  }
}
