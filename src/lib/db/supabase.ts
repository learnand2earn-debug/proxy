import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProxyRecord, ProxyProtocol, ProxyStatus } from '@/types';

let cachedClient: SupabaseClient | null = null;

/**
 * Returns the Supabase client if valid credentials exist in environment variables,
 * or null if Supabase is unconfigured / in local mode.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  if (url.includes('your-project.supabase.co') || key.includes('your-supabase') || key.includes('your-anon-key')) {
    return null;
  }

  if (!cachedClient) {
    try {
      cachedClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    } catch (e) {
      console.warn('[Supabase] Initialization warning:', e);
      return null;
    }
  }

  return cachedClient;
}

export function isSupabaseEnabled(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  return !url.includes('your-project.supabase.co') && !key.includes('your-supabase');
}

/**
 * Ingests a batch of discovered proxies directly into Supabase PostgreSQL proxy_records table.
 * Uses high-performance native PostgREST upsert with conflict resolution.
 */
export async function insertProxiesToSupabase(
  proxies: any[],
  owner_id: string
): Promise<{ inserted: number; duplicates: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || !proxies || proxies.length === 0) {
    return { inserted: 0, duplicates: 0 };
  }

  try {
    const rows = proxies.map(p => ({
      owner_id,
      normalized_endpoint: p.normalized_endpoint,
      protocol: p.protocol || 'http',
      host: p.host || p.ip,
      port: p.port,
      auth_required: false,
      current_status: p.current_status || 'ACTIVE',
      last_latency_ms: p.last_latency_ms || p.latency_ms || 80,
      country_code: (p.country_code || 'US').toUpperCase(),
      anonymity: p.anonymity || 'elite',
      check_interval_seconds: 600,
      last_checked_at: new Date().toISOString(),
      tags: p.tags || ['live-stream', p.protocol || 'http']
    }));

    const CHUNK_SIZE = 500;
    let totalInserted = 0;
    const endpointUrl = `${url}/rest/v1/proxy_records?on_conflict=owner_id,normalized_endpoint`;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates,return=minimal'
        },
        body: JSON.stringify(chunk)
      });

      if (res.ok) {
        totalInserted += chunk.length;
      } else {
        const errText = await res.text();
        if (errText.includes('PGRST205') || errText.includes('Could not find the table')) {
          console.warn('[Supabase Notice]: Table proxy_records not yet created in Supabase SQL editor.');
        } else {
          console.warn('[Supabase Ingest Status]:', res.status, errText);
        }
      }
    }

    return { inserted: totalInserted, duplicates: rows.length - totalInserted };
  } catch (err: any) {
    console.error('[Supabase Ingest Exception]:', err.message);
    return { inserted: 0, duplicates: 0 };
  }
}

/**
 * Returns exact proxy count from Supabase
 */
export async function getSupabaseProxyCount(owner_id?: string): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const query = owner_id 
      ? `${url}/rest/v1/proxy_records?owner_id=eq.${owner_id}&select=id`
      : `${url}/rest/v1/proxy_records?select=id`;

    const res = await fetch(query, {
      method: 'HEAD',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'count=exact'
      }
    });

    const contentRange = res.headers.get('content-range');
    if (contentRange && contentRange.includes('/')) {
      const total = parseInt(contentRange.split('/')[1], 10);
      return isNaN(total) ? null : total;
    }
    return null;
  } catch {
    return null;
  }
}
