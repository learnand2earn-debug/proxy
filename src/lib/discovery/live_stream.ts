import net from 'net';
import { ProxyRecord, ProxyProtocol, ProxyStatus } from '@/types';
import { repo, DEFAULT_OWNER_ID } from '../db/repository';
import { validateEndpointSecurity } from '../security/ssrf';

export interface LiveDiscoveredProxy {
  ip: string;
  port: number;
  protocol: ProxyProtocol;
  normalized_endpoint: string;
  country_code: string;
  country_name: string;
  flag: string;
  city?: string;
  anonymity: 'elite' | 'anonymous' | 'transparent';
  latency_ms: number;
  source: string;
  verified_active?: boolean;
  timestamp: string;
}

export * from '../constants/countries';
import { getCountryInfo } from '../constants/countries';

/**
 * Measures genuine TCP handshake latency in milliseconds.
 * Returns real network elapsed time (zero simulation).
 */
export function measureRealTcpLatency(host: string, port: number, timeoutMs = 1500): Promise<number> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let finished = false;

    const done = (latency: number) => {
      if (!finished) {
        finished = true;
        socket.destroy();
        resolve(latency);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      const elapsed = Date.now() - start;
      done(Math.max(1, elapsed));
    });

    socket.once('timeout', () => done(0));
    socket.once('error', () => done(0));

    try {
      socket.connect(port, host);
    } catch {
      done(0);
    }
  });
}

// In-memory rotating live buffer by country
const liveProxyBufferByCountry = new Map<string, { list: LiveDiscoveredProxy[]; timestamp: number }>();

/**
 * Fetches real public proxies from verified live public sources.
 * If countryCode is provided (e.g. 'PK', 'IN', 'US'), only fetches for that country.
 */
export async function fetchLivePublicFeeds(maxCount = 200, countryCode?: string): Promise<LiveDiscoveredProxy[]> {
  const targetCountry = (countryCode && countryCode !== 'ALL' && countryCode !== 'all')
    ? countryCode.trim().toUpperCase()
    : null;

  const results: LiveDiscoveredProxy[] = [];
  const seenEndpoints = new Set<string>();

  // Source 1: GeoNode live verified API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    const geoUrl = targetCountry
      ? `https://proxylist.geonode.com/api/proxy-list?limit=150&page=1&sort_by=lastChecked&sort_type=desc&country=${encodeURIComponent(targetCountry)}`
      : 'https://proxylist.geonode.com/api/proxy-list?limit=150&page=1&sort_by=lastChecked&sort_type=desc';

    const resp = await fetch(geoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.data)) {
        for (const item of data.data) {
          if (!item.ip || !item.port) continue;
          const host = String(item.ip).trim();
          const port = parseInt(item.port, 10);
          if (isNaN(port) || port <= 0 || port > 65535) continue;

          // If country-filtered, ensure country matches
          const itemCountry = (item.country || '').toUpperCase();
          if (targetCountry && itemCountry && itemCountry !== targetCountry) continue;

          // Protocols from GeoNode
          let proto: ProxyProtocol = 'http';
          if (Array.isArray(item.protocols) && item.protocols.length > 0) {
            const p = item.protocols[0].toLowerCase();
            if (p === 'socks5') proto = 'socks5';
            else if (p === 'socks4') proto = 'socks4';
            else if (p === 'https') proto = 'https';
            else proto = 'http';
          }

          const endpoint = `${proto}://${host}:${port}`;
          if (seenEndpoints.has(endpoint)) continue;
          seenEndpoints.add(endpoint);

          const cInfo = getCountryInfo(itemCountry || targetCountry || 'US');
          const rawAnon = (item.anonymityLevel || '').toLowerCase();
          const anonymity = rawAnon.includes('elite') ? 'elite' : rawAnon.includes('transparent') ? 'transparent' : 'anonymous';

          results.push({
            ip: host,
            port,
            protocol: proto,
            normalized_endpoint: endpoint,
            country_code: cInfo.code,
            country_name: cInfo.name,
            flag: cInfo.flag,
            city: item.city || '',
            anonymity,
            latency_ms: Math.max(15, Math.round(Number(item.latency) || 85)),
            source: `GeoNode Verified ${cInfo.name} Feed`,
            verified_active: true,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  } catch (err: any) {
    console.warn('[LiveFeed] GeoNode fetch warning:', err.message);
  }

  // Source 2: ProxyScrape API (Supports targeted country filtering or global)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    const scrapeUrl = targetCountry
      ? `https://api.proxyscrape.com/v2/?request=displayproxies&protocol=all&timeout=10000&country=${encodeURIComponent(targetCountry.toLowerCase())}&ssl=all&anonymity=all`
      : 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http,socks5,socks4&timeout=10000&ssl=all&anonymity=all';

    const resp = await fetch(scrapeUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      const text = await resp.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const cInfo = targetCountry ? getCountryInfo(targetCountry) : getCountryInfo('US');

      for (const line of lines.slice(0, 120)) {
        const [host, pStr] = line.split(':');
        const port = parseInt(pStr, 10);
        if (!host || isNaN(port) || port <= 0 || port > 65535) continue;

        // Default protocol http
        const endpoint = `http://${host}:${port}`;
        if (seenEndpoints.has(endpoint)) continue;
        seenEndpoints.add(endpoint);

        results.push({
          ip: host,
          port,
          protocol: 'http',
          normalized_endpoint: endpoint,
          country_code: cInfo.code,
          country_name: cInfo.name,
          flag: cInfo.flag,
          city: '',
          anonymity: 'elite',
          latency_ms: 0, // Unchecked until live probe
          source: `ProxyScrape ${cInfo.name} Realtime Feed`,
          verified_active: false,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (err: any) {
    console.warn('[LiveFeed] ProxyScrape fetch warning:', err.message);
  }

  // Source 3: Multi-country Sunny9577 proxy repository
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch('https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/proxies.json', { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data)) {
        const cInfo = targetCountry ? getCountryInfo(targetCountry) : null;

        const filtered = targetCountry
          ? data.filter(item => {
              const countryField = (item.country || '').toLowerCase();
              return countryField.includes(cInfo?.name.toLowerCase() || '') ||
                     countryField.toUpperCase() === targetCountry;
            })
          : data.slice(0, 100);

        for (const item of filtered.slice(0, 80)) {
          if (!item.ip || !item.port) continue;
          const host = String(item.ip).trim();
          const port = parseInt(item.port, 10);
          if (isNaN(port) || port <= 0 || port > 65535) continue;

          let proto: ProxyProtocol = 'http';
          const rawType = (item.type || '').toLowerCase();
          if (rawType.includes('socks5')) proto = 'socks5';
          else if (rawType.includes('socks4')) proto = 'socks4';
          else if (rawType.includes('https')) proto = 'https';

          const endpoint = `${proto}://${host}:${port}`;
          if (seenEndpoints.has(endpoint)) continue;
          seenEndpoints.add(endpoint);

          const itemCInfo = getCountryInfo(item.country || targetCountry || 'US');
          const rawAnon = (item.anonymity || '').toLowerCase();
          const anonymity = rawAnon.includes('elite') ? 'elite' : rawAnon.includes('transparent') ? 'transparent' : 'anonymous';

          results.push({
            ip: host,
            port,
            protocol: proto,
            normalized_endpoint: endpoint,
            country_code: itemCInfo.code,
            country_name: itemCInfo.name,
            flag: itemCInfo.flag,
            city: '',
            anonymity,
            latency_ms: 0, // Unchecked until live probe
            source: `Global Scraper ${itemCInfo.name} Node`,
            verified_active: false,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  } catch (err: any) {
    console.warn('[LiveFeed] Sunny9577 fetch warning:', err.message);
  }

  // Source 4 (if Global): monosans fresh lists
  if (!targetCountry && results.length < 50) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch('https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt', { signal: controller.signal });
      clearTimeout(timeout);

      if (resp.ok) {
        const text = await resp.text();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines.slice(0, 60)) {
          const [host, pStr] = line.split(':');
          const port = parseInt(pStr, 10);
          if (!host || isNaN(port)) continue;
          const endpoint = `http://${host}:${port}`;
          if (seenEndpoints.has(endpoint)) continue;
          seenEndpoints.add(endpoint);

          const cInfo = getCountryInfo('US');
          results.push({
            ip: host,
            port,
            protocol: 'http',
            normalized_endpoint: endpoint,
            country_code: cInfo.code,
            country_name: cInfo.name,
            flag: cInfo.flag,
            anonymity: 'elite',
            latency_ms: 0,
            source: 'monosans Realtime Feed',
            verified_active: false,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch {}
  }

  // Cache buffer by country
  const bufferKey = targetCountry || 'GLOBAL';
  if (results.length > 0) {
    liveProxyBufferByCountry.set(bufferKey, {
      list: results,
      timestamp: Date.now()
    });
  }

  return results.slice(0, maxCount);
}

/**
 * Returns cached or fresh live proxies from memory buffer for a specific country or global
 */
export async function getLiveProxyStreamBuffer(countryCode?: string): Promise<LiveDiscoveredProxy[]> {
  const targetCountry = (countryCode && countryCode !== 'ALL' && countryCode !== 'all')
    ? countryCode.trim().toUpperCase()
    : 'GLOBAL';

  const cached = liveProxyBufferByCountry.get(targetCountry);
  const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;

  if (!cached || cached.list.length === 0 || cacheAge > 120000) {
    return await fetchLivePublicFeeds(300, targetCountry === 'GLOBAL' ? undefined : targetCountry);
  }

  return cached.list;
}

/**
 * Ingests a list of discovered real proxies into the repository
 */
export async function ingestLiveProxiesIntoDatabase(
  proxies: LiveDiscoveredProxy[],
  owner_id: string = DEFAULT_OWNER_ID,
  markActive: boolean = true
): Promise<{ inserted: number; duplicates: number }> {
  let inserted = 0;
  let duplicates = 0;

  for (const p of proxies) {
    // Validate SSRF security (do not insert private / loopback IPs)
    const sec = await validateEndpointSecurity(p.ip, false);
    if (!sec.isSafe) continue;

    const res = repo.insertProxy({
      owner_id,
      source_name: p.source,
      normalized_endpoint: p.normalized_endpoint,
      protocol: p.protocol,
      host: p.ip,
      port: p.port,
      auth_required: false,
      current_status: markActive ? 'ACTIVE' : 'UNKNOWN',
      last_latency_ms: p.latency_ms,
      country_code: p.country_code,
      anonymity: p.anonymity,
      check_interval_seconds: 600,
      tags: [
        'live-feed',
        p.protocol,
        p.country_code.toLowerCase(),
        (p.country_name || '').toLowerCase().replace(/[^a-z0-9]/g, '-')
      ]
    });

    if (res.is_duplicate) {
      duplicates++;
    } else {
      inserted++;
    }
  }

  return { inserted, duplicates };
}
