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

    if (!token) {
      return NextResponse.json({ success: false, error: 'No token' }, { status: 400 });
    }

    const alive = repo.heartbeat(token);
    return NextResponse.json({
      success: alive,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
