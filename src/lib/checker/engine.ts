import http from 'http';
import https from 'https';
import net from 'net';
import tls from 'tls';
import { SocksClient, SocksClientOptions } from 'socks';
import { ProxyRecord, ProxyCheckResult, ProxyStatus } from '@/types';
import { validateEndpointSecurity } from '../security/ssrf';
import { parseProxyString } from '../validation/parser';

export interface CheckOptions {
  timeoutMs?: number;
  diagnosticTargetUrl?: string;
  allowInternal?: boolean;
}

const DEFAULT_DIAGNOSTIC_PATH = '/api/health/diagnostic';
const DIAGNOSTIC_HEADER_NAME = 'x-proxy-diagnostic-probe';
const DIAGNOSTIC_HEADER_VALUE = 'ai-proxy-intel-probe-v1';

/**
 * Validates and executes an active health check on a proxy endpoint.
 */
export async function checkProxyEndpoint(
  record: Pick<ProxyRecord, 'normalized_endpoint' | 'protocol' | 'host' | 'port' | 'username' | 'password'>,
  options: CheckOptions = {}
): Promise<ProxyCheckResult> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs || 6000;
  const allowInternal = options.allowInternal || false;

  // 1. Structural Syntax Validation
  const parsed = parseProxyString(record.normalized_endpoint, record.protocol);
  if (!parsed.is_valid) {
    return {
      status: 'INVALID',
      latency_ms: 0,
      handshake_success: false,
      error_category: 'SYNTAX_ERROR',
      error_message: parsed.validation_error || 'Malformed endpoint structure',
      checked_at: new Date().toISOString()
    };
  }

  // 2. SSRF & Host Security Check
  const ssrfCheck = await validateEndpointSecurity(parsed.host, allowInternal);
  if (!ssrfCheck.isSafe) {
    return {
      status: 'INVALID',
      latency_ms: 0,
      handshake_success: false,
      error_category: 'SECURITY_VIOLATION',
      error_message: ssrfCheck.error || 'Blocked by SSRF security policy',
      checked_at: new Date().toISOString()
    };
  }

  // 3. Protocol Testing
  try {
    if (parsed.protocol === 'socks4' || parsed.protocol === 'socks5') {
      return await checkSocksProxy({
        ...parsed,
        protocol: parsed.protocol as 'socks4' | 'socks5'
      }, timeoutMs);
    } else {
      return await checkHttpProxy({
        ...parsed,
        protocol: parsed.protocol as 'http' | 'https'
      }, timeoutMs);
    }
  } catch (err: any) {
    const totalLatency = Date.now() - startTime;
    return mapErrorToResult(err, totalLatency);
  }
}

/**
 * Checks a SOCKS4 or SOCKS5 proxy using TCP socket & SocksClient handshake.
 */
async function checkSocksProxy(
  endpoint: { protocol: 'socks4' | 'socks5'; host: string; port: number; username?: string; password?: string },
  timeoutMs: number
): Promise<ProxyCheckResult> {
  const startTime = Date.now();

  const socksOptions: SocksClientOptions = {
    proxy: {
      host: endpoint.host,
      port: endpoint.port,
      type: endpoint.protocol === 'socks4' ? 4 : 5,
      userId: endpoint.username,
      password: endpoint.password
    },
    command: 'connect',
    destination: {
      host: '1.1.1.1', // Fast DNS IP for minimal handshake connectivity check
      port: 80
    },
    timeout: timeoutMs
  };

  try {
    const info = await SocksClient.createConnection(socksOptions);
    const latency = Date.now() - startTime;
    
    // Close the socket cleanly
    info.socket.destroy();

    return {
      status: 'ACTIVE',
      latency_ms: latency,
      handshake_success: true,
      status_code: 200,
      diagnostic_target: 'tcp://1.1.1.1:80',
      checked_at: new Date().toISOString()
    };
  } catch (err: any) {
    const latency = Date.now() - startTime;
    const msg = (err.message || '').toLowerCase();

    if (msg.includes('authentication') || msg.includes('auth failed') || msg.includes('0x02')) {
      return {
        status: 'AUTH_REQUIRED',
        latency_ms: latency,
        handshake_success: false,
        error_category: 'AUTHENTICATION_REQUIRED',
        error_message: 'Proxy rejected connection: authentication required or invalid credentials',
        checked_at: new Date().toISOString()
      };
    }

    if (msg.includes('etimedout') || msg.includes('timeout')) {
      return {
        status: 'INACTIVE',
        latency_ms: latency,
        handshake_success: false,
        error_category: 'TIMEOUT',
        error_message: `Connection timed out after ${timeoutMs}ms`,
        checked_at: new Date().toISOString()
      };
    }

    if (msg.includes('econnrefused') || msg.includes('ehostunreach') || msg.includes('enotfound')) {
      return {
        status: 'INACTIVE',
        latency_ms: latency,
        handshake_success: false,
        error_category: 'CONNECTION_REFUSED',
        error_message: err.message,
        checked_at: new Date().toISOString()
      };
    }

    return {
      status: 'INACTIVE',
      latency_ms: latency,
      handshake_success: false,
      error_category: 'SOCKS_HANDSHAKE_FAILURE',
      error_message: err.message,
      checked_at: new Date().toISOString()
    };
  }
}

/**
 * Checks an HTTP / HTTPS forward proxy using CONNECT or GET request.
 */
async function checkHttpProxy(
  endpoint: { protocol: 'http' | 'https'; host: string; port: number; username?: string; password?: string },
  timeoutMs: number
): Promise<ProxyCheckResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    let resolved = false;
    const authHeader = endpoint.username 
      ? `Basic ${Buffer.from(`${endpoint.username}:${endpoint.password || ''}`).toString('base64')}`
      : undefined;

    const reqHeaders: Record<string, string> = {
      'Host': 'diagnostic.internal',
      'User-Agent': 'AI-Proxy-Intel-Diagnostic/1.0',
      [DIAGNOSTIC_HEADER_NAME]: DIAGNOSTIC_HEADER_VALUE
    };

    if (authHeader) {
      reqHeaders['Proxy-Authorization'] = authHeader;
    }

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        req.destroy();
        resolve({
          status: 'INACTIVE',
          latency_ms: Date.now() - startTime,
          handshake_success: false,
          error_category: 'TIMEOUT',
          error_message: `TCP connect or proxy response timed out after ${timeoutMs}ms`,
          checked_at: new Date().toISOString()
        });
      }
    }, timeoutMs);

    const req = http.request({
      host: endpoint.host,
      port: endpoint.port,
      method: 'GET',
      path: 'http://diagnostic.internal/api/health/diagnostic',
      headers: reqHeaders,
      timeout: timeoutMs
    }, (res) => {
      clearTimeout(timer);
      if (resolved) return;
      resolved = true;

      const latency = Date.now() - startTime;
      const statusCode = res.statusCode || 0;

      // Check HTTP 407 Proxy Authentication Required
      if (statusCode === 407) {
        resolve({
          status: 'AUTH_REQUIRED',
          latency_ms: latency,
          handshake_success: true,
          status_code: 407,
          error_category: 'AUTHENTICATION_REQUIRED',
          error_message: 'HTTP 407 Proxy Authentication Required',
          checked_at: new Date().toISOString()
        });
        return;
      }

      // Check success (200-399) or normal forward response
      if (statusCode >= 200 && statusCode < 400) {
        resolve({
          status: 'ACTIVE',
          latency_ms: latency,
          handshake_success: true,
          status_code: statusCode,
          diagnostic_target: 'http://diagnostic.internal/api/health/diagnostic',
          checked_at: new Date().toISOString()
        });
        return;
      }

      // Proxy error responses (e.g. 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout)
      if (statusCode >= 500) {
        resolve({
          status: 'INACTIVE',
          latency_ms: latency,
          handshake_success: true,
          status_code: statusCode,
          error_category: 'PROXY_SERVER_ERROR',
          error_message: `Proxy returned upstream error status code: ${statusCode}`,
          checked_at: new Date().toISOString()
        });
        return;
      }

      // Other status codes still show proxy is alive
      resolve({
        status: 'ACTIVE',
        latency_ms: latency,
        handshake_success: true,
        status_code: statusCode,
        checked_at: new Date().toISOString()
      });
    });

    req.on('error', (err) => {
      clearTimeout(timer);
      if (resolved) return;
      resolved = true;
      resolve(mapErrorToResult(err, Date.now() - startTime));
    });

    req.end();
  });
}

/**
 * Maps system and network error to classification status.
 */
function mapErrorToResult(err: any, latency: number): ProxyCheckResult {
  const code = (err.code || '').toUpperCase();
  const msg = err.message || 'Unknown network error';

  if (code === 'ECONNREFUSED') {
    return {
      status: 'INACTIVE',
      latency_ms: latency,
      handshake_success: false,
      error_category: 'CONNECTION_REFUSED',
      error_message: 'Target host actively refused the connection on specified port',
      checked_at: new Date().toISOString()
    };
  }

  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
    return {
      status: 'INACTIVE',
      latency_ms: latency,
      handshake_success: false,
      error_category: 'TIMEOUT',
      error_message: 'Connection attempt timed out waiting for proxy acknowledgment',
      checked_at: new Date().toISOString()
    };
  }

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return {
      status: 'INACTIVE',
      latency_ms: latency,
      handshake_success: false,
      error_category: 'DNS_RESOLUTION_FAILURE',
      error_message: 'DNS resolution failed or hostname does not exist',
      checked_at: new Date().toISOString()
    };
  }

  if (code === 'ECONNRESET') {
    return {
      status: 'INACTIVE',
      latency_ms: latency,
      handshake_success: false,
      error_category: 'CONNECTION_RESET',
      error_message: 'Connection was forcibly closed by the remote host',
      checked_at: new Date().toISOString()
    };
  }

  return {
    status: 'UNKNOWN',
    latency_ms: latency,
    handshake_success: false,
    error_category: code || 'NETWORK_ERROR',
    error_message: msg,
    checked_at: new Date().toISOString()
  };
}
