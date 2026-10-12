import { NextResponse } from 'next/server';
import { repo, DEFAULT_OWNER_ID } from '@/lib/db/repository';
import { parseProxyString } from '@/lib/validation/parser';
import { checkProxyEndpoint } from '@/lib/checker/engine';

const CHROME_SYNC_SECRET = process.env.CHROME_SYNC_SECRET || 'dev-chrome-extension-pairing-token-321';

export async function GET() {
  try {
    const connections = repo.getBrowserConnections(DEFAULT_OWNER_ID);
    return NextResponse.json({
      connections,
      pairingSecret: CHROME_SYNC_SECRET,
      instruction: 'Enter this pairing secret into your Chrome Extension companion settings.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Authenticate pairing token
    if (token !== CHROME_SYNC_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid pairing token' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, protocol = 'http', mode = 'fixed_servers', device_name = 'User Chrome Browser' } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'No proxy endpoint provided' }, { status: 400 });
    }

    // Register/update browser connection session
    repo.registerBrowserConnection({
      owner_id: DEFAULT_OWNER_ID,
      device_name,
      pairing_token: token,
      is_connected: true,
      last_synced_at: new Date().toISOString(),
      detected_proxy_type: mode
    });

    // Ensure Chrome Extension source exists
    let chromeSource = repo.getSources(DEFAULT_OWNER_ID).find(s => s.type === 'chrome_extension');
    if (!chromeSource) {
      chromeSource = repo.insertSource({
        owner_id: DEFAULT_OWNER_ID,
        name: 'Chrome Extension Sync',
        type: 'chrome_extension',
        config: { device: device_name },
        is_active: true,
        sync_interval_minutes: 15,
        rate_limit_per_minute: 120
      });
    }

    const parsed = parseProxyString(endpoint, protocol as any);
    if (!parsed.is_valid) {
      return NextResponse.json({
        error: `Detected proxy format is structurally invalid: ${parsed.validation_error}`
      }, { status: 422 });
    }

    // Insert proxy record into inventory
    const { record, is_duplicate } = repo.insertProxy({
      owner_id: DEFAULT_OWNER_ID,
      source_id: chromeSource.id,
      source_name: chromeSource.name,
      normalized_endpoint: parsed.normalized_endpoint,
      protocol: parsed.protocol,
      host: parsed.host,
      port: parsed.port,
      auth_required: !!parsed.username,
      username: parsed.username,
      password: parsed.password,
      current_status: 'UNKNOWN',
      check_interval_seconds: 900,
      tags: ['chrome-extension', 'synced-device']
    });

    // Execute real-time verification probe
    const checkRes = await checkProxyEndpoint(record, { timeoutMs: 5000 });
    repo.updateProxyCheck(record.id, checkRes);

    return NextResponse.json({
      success: true,
      message: is_duplicate ? 'Chrome proxy updated and verified.' : 'New Chrome proxy imported and verified.',
      proxy_id: record.id,
      endpoint: parsed.normalized_endpoint,
      status: checkRes.status,
      latency_ms: checkRes.latency_ms
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
