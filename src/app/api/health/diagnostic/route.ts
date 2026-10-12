import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for') || 'direct';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return NextResponse.json({
    status: 'ok',
    probe: 'acknowledged',
    service: 'ai-proxy-diagnostic-probe',
    timestamp: new Date().toISOString(),
    client_ip: forwardedFor.split(',')[0].trim(),
    user_agent: userAgent
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Proxy-Diagnostic-Status': 'VERIFIED'
    }
  });
}
