import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    let token: string | undefined;

    try {
      const body = await req.json();
      token = body.session_token;
    } catch {}

    if (!token) {
      const authHeader = req.headers.get('authorization');
      token = 
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null) ||
        req.headers.get('x-session-token') ||
        req.cookies.get('wsp_auth_token')?.value;
    }

    if (token) {
      repo.logoutSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Session terminated and origin un-bound successfully'
    });

    response.cookies.delete('wsp_auth_token');
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Logout failed' },
      { status: 500 }
    );
  }
}
