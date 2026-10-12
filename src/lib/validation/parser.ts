import { ProxyProtocol, ProxyRecord } from '@/types';

export interface ParsedProxyEndpoint {
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
  normalized_endpoint: string;
  is_valid: boolean;
  validation_error?: string;
}

const VALID_PROTOCOLS: ProxyProtocol[] = ['http', 'https', 'socks4', 'socks5'];

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

function isIPAddress(host: string): boolean {
  if (IPV4_REGEX.test(host)) return true;
  if (host.includes(':') && host.split(':').length >= 3) return true;
  return false;
}

/**
 * Validates a hostname (domain name or IPv4 / IPv6).
 */
export function isValidHost(host: string): boolean {
  if (!host || host.length > 253) return false;
  if (isIPAddress(host)) return true;

  // Domain name check (RFC 1123)
  const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*$/;
  return domainRegex.test(host);
}

/**
 * Validates port range 1-65535.
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Parse a raw proxy string into a structured, normalized proxy endpoint.
 * Supports:
 * - protocol://user:pass@host:port
 * - protocol://host:port
 * - host:port:user:pass
 * - user:pass@host:port
 * - host:port
 */
export function parseProxyString(raw: string, defaultProtocol: ProxyProtocol = 'http'): ParsedProxyEndpoint {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      protocol: defaultProtocol,
      host: '',
      port: 0,
      normalized_endpoint: '',
      is_valid: false,
      validation_error: 'Empty input string'
    };
  }

  let protocol: ProxyProtocol = defaultProtocol;
  let working = trimmed;

  // 1. Check protocol prefix (e.g. socks5:// or http://)
  const schemeMatch = working.match(/^([a-zA-Z0-9]+):\/\//);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (VALID_PROTOCOLS.includes(scheme as ProxyProtocol)) {
      protocol = scheme as ProxyProtocol;
      working = working.slice(schemeMatch[0].length);
    } else {
      return {
        protocol: defaultProtocol,
        host: '',
        port: 0,
        normalized_endpoint: trimmed,
        is_valid: false,
        validation_error: `Unsupported protocol scheme '${scheme}'. Supported: ${VALID_PROTOCOLS.join(', ')}`
      };
    }
  }

  let username: string | undefined;
  let password: string | undefined;
  let host = '';
  let port = 0;

  // 2. Check for user:pass@host:port
  if (working.includes('@')) {
    const atIndex = working.lastIndexOf('@');
    const authPart = working.slice(0, atIndex);
    const hostPortPart = working.slice(atIndex + 1);

    const [u, ...pParts] = authPart.split(':');
    username = decodeURIComponent(u || '');
    password = decodeURIComponent(pParts.join(':') || '');

    const [h, portStr] = hostPortPart.split(':');
    host = h?.trim() || '';
    port = parseInt(portStr || '0', 10);
  } 
  // 3. Check for 4-part host:port:user:pass format
  else if (working.split(':').length === 4) {
    const parts = working.split(':');
    host = parts[0].trim();
    port = parseInt(parts[1], 10);
    username = parts[2].trim();
    password = parts[3].trim();
  }
  // 4. Standard host:port
  else if (working.includes(':')) {
    const parts = working.split(':');
    host = parts[0].trim();
    port = parseInt(parts[1], 10);
  } else {
    return {
      protocol,
      host: working,
      port: 0,
      normalized_endpoint: trimmed,
      is_valid: false,
      validation_error: 'Missing port delimiter (:)'
    };
  }

  // Structural validations
  if (!isValidHost(host)) {
    return {
      protocol,
      host,
      port,
      username,
      password,
      normalized_endpoint: `${protocol}://${host}:${port}`,
      is_valid: false,
      validation_error: `Invalid hostname or IP address format: '${host}'`
    };
  }

  if (!isValidPort(port)) {
    return {
      protocol,
      host,
      port,
      username,
      password,
      normalized_endpoint: `${protocol}://${host}:${port}`,
      is_valid: false,
      validation_error: `Invalid port '${port}'. Port must be between 1 and 65535`
    };
  }

  // Canonical normalized endpoint string
  // Note: credentials are kept in normalized_endpoint when present or standardized
  let normalized = `${protocol}://`;
  if (username) {
    normalized += `${encodeURIComponent(username)}${password ? ':' + encodeURIComponent(password) : ''}@`;
  }
  normalized += `${host.toLowerCase()}:${port}`;

  return {
    protocol,
    host: host.toLowerCase(),
    port,
    username,
    password,
    normalized_endpoint: normalized,
    is_valid: true
  };
}

/**
 * Masks sensitive credentials in an endpoint for logs, exports, and UI display.
 */
export function maskEndpoint(endpoint: string): string {
  try {
    return endpoint.replace(/:([^:@]+)@/, ':••••••@');
  } catch {
    return endpoint;
  }
}

/**
 * Bulk parses text content (line by line, CSV, or JSON array)
 */
export function parseBulkProxyList(
  content: string,
  defaultProtocol: ProxyProtocol = 'http'
): { valid: ParsedProxyEndpoint[]; invalid: ParsedProxyEndpoint[] } {
  const trimmed = content.trim();
  const valid: ParsedProxyEndpoint[] = [];
  const invalid: ParsedProxyEndpoint[] = [];

  // Check if content is JSON
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const items = JSON.parse(trimmed);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (typeof item === 'string') {
            const parsed = parseProxyString(item, defaultProtocol);
            if (parsed.is_valid) valid.push(parsed);
            else invalid.push(parsed);
          } else if (typeof item === 'object' && item !== null) {
            const host = item.host || item.ip || '';
            const port = parseInt(item.port, 10);
            const protocol = (item.protocol || item.type || defaultProtocol).toLowerCase() as ProxyProtocol;
            const username = item.username || item.user;
            const password = item.password || item.pass;
            
            const rawStr = username ? `${protocol}://${username}:${password || ''}@${host}:${port}` : `${protocol}://${host}:${port}`;
            const parsed = parseProxyString(rawStr, protocol);
            if (parsed.is_valid) valid.push(parsed);
            else invalid.push(parsed);
          }
        }
        return { valid, invalid };
      }
    } catch {
      // Not valid JSON, continue with line-by-line / CSV parsing
    }
  }

  // Line-by-line / CSV
  const lines = trimmed.split(/[\r\n]+/);
  for (const line of lines) {
    const lineTrimmed = line.trim();
    if (!lineTrimmed || lineTrimmed.startsWith('#') || lineTrimmed.startsWith('//')) {
      continue;
    }

    // CSV format: host,port,protocol,username,password
    if (lineTrimmed.includes(',') && !lineTrimmed.includes('://')) {
      const parts = lineTrimmed.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        const host = parts[0];
        const port = parseInt(parts[1], 10);
        const protocol = (parts[2] ? parts[2].toLowerCase() : defaultProtocol) as ProxyProtocol;
        const username = parts[3];
        const password = parts[4];
        const rawStr = username ? `${protocol}://${username}:${password || ''}@${host}:${port}` : `${protocol}://${host}:${port}`;
        const parsed = parseProxyString(rawStr, protocol);
        if (parsed.is_valid) valid.push(parsed);
        else invalid.push(parsed);
        continue;
      }
    }

    const parsed = parseProxyString(lineTrimmed, defaultProtocol);
    if (parsed.is_valid) {
      valid.push(parsed);
    } else {
      invalid.push(parsed);
    }
  }

  return { valid, invalid };
}
