import { NextResponse } from 'next/server';
import { repo, DEFAULT_OWNER_ID } from '@/lib/db/repository';
import { maskEndpoint } from '@/lib/validation/parser';
import { ProxyStatus } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase(); // csv | json | txt
    const status = searchParams.get('status') as ProxyStatus | undefined;
    const country = searchParams.get('country') || searchParams.get('country_code') || undefined;
    const is_quarantined = searchParams.has('is_quarantined') 
      ? searchParams.get('is_quarantined') === 'true' 
      : undefined;
    const include_credentials = searchParams.get('include_credentials') === 'true';

    const { data: proxies } = repo.getProxies({
      owner_id: DEFAULT_OWNER_ID,
      status: status || undefined,
      country_code: country,
      is_quarantined,
      limit: 0 // 0 = UNLIMITED (export every single proxy without cap)
    });

    const filename = `proxy_inventory_${country || 'all'}_${status || 'all'}_${Date.now()}`;

    // TXT Format: host:port per line
    if (format === 'txt') {
      const lines = proxies.map(p => {
        if (include_credentials && p.username && p.password) {
          return `${p.protocol}://${p.username}:${p.password}@${p.host}:${p.port}`;
        }
        return `${p.protocol}://${p.host}:${p.port}`;
      });
      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.txt"`
        }
      });
    }

    // JSON Format
    if (format === 'json') {
      const sanitized = proxies.map(p => {
        return {
          id: p.id,
          endpoint: include_credentials ? p.normalized_endpoint : maskEndpoint(p.normalized_endpoint),
          protocol: p.protocol,
          host: p.host,
          port: p.port,
          status: p.current_status,
          latency_ms: p.last_latency_ms,
          last_checked: p.last_checked_at,
          source: p.source_name,
          country: p.country_code,
          is_quarantined: p.is_quarantined,
          quarantine_reason: p.quarantine_reason
        };
      });

      return new NextResponse(JSON.stringify(sanitized, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.json"`
        }
      });
    }

    // Default: CSV Format
    const headers = [
      'ID',
      'Protocol',
      'Host',
      'Port',
      'Normalized Endpoint',
      'Status',
      'Latency (ms)',
      'Last Checked',
      'Last Successful Check',
      'Source',
      'Country',
      'Consecutive Failures',
      'Recovery Count',
      'Quarantined',
      'Quarantine Reason'
    ];

    const rows = proxies.map(p => [
      p.id,
      p.protocol,
      p.host,
      p.port,
      `"${include_credentials ? p.normalized_endpoint : maskEndpoint(p.normalized_endpoint)}"`,
      p.current_status,
      p.last_latency_ms || '',
      p.last_checked_at || '',
      p.last_successful_check_at || '',
      `"${p.source_name || ''}"`,
      p.country_code || '',
      p.consecutive_failures,
      p.recovery_count,
      p.is_quarantined ? 'TRUE' : 'FALSE',
      `"${p.quarantine_reason || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
