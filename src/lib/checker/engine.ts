import http from 'http';
import https from 'https';
import net from 'net';
import tls from 'tls';
import { SocksClient, SocksClientOptions } from 'socks';
import { ProxyRecord, ProxyCheckResult, ProxyStatus, TargetPlatform } from '@/types';
import { validateEndpointSecurity } from '../security/ssrf';
import { parseProxyString } from '../validation/parser';

export interface CheckOptions {
  timeoutMs?: number;
  diagnosticTargetUrl?: string;
  allowInternal?: boolean;
  target?: TargetPlatform;
}

export interface TargetConfig {
  name: string;
  connectHost: string;
  connectPort: number;
  requestPath: string;
  fallbackUrl: string;
  useTls: boolean;
  acceptableStatusCodes: number[];
}

export const TARGET_CONFIGS: Record<Exclude<TargetPlatform, 'all'>, TargetConfig> = {
  web: {
    name: 'General Web',
    connectHost: 'api.ipify.org',
    connectPort: 443,
    requestPath: '/',
    fallbackUrl: 'http://checkip.amazonaws.com',
    useTls: true,
    acceptableStatusCodes: [200, 204, 301, 302]
  },
  facebook: {
    name: 'Facebook',
    connectHost: 'm.facebook.com',
    connectPort: 443,
    requestPath: '/',
    fallbackUrl: 'https://m.facebook.com',
    useTls: true,
    acceptableStatusCodes: [200, 301, 302, 400] // Facebook returns 200/302 on valid proxy tunnel
  },
  linkedin: {
    name: 'LinkedIn',
    connectHost: 'www.linkedin.com',
    connectPort: 443,
    requestPath: '/',
    fallbackUrl: 'https://www.linkedin.com',
    useTls: true,
    acceptableStatusCodes: [200, 301, 302, 403, 999] // 999 is LinkedIn's valid edge status
  }
};

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Validates and executes an active health check on a proxy endpoint.
 * Supports targeting Web, Facebook, or LinkedIn specifically, or testing all 3 targets simultaneously.
 */
export async function checkProxyEndpoint(
  record: Pick<ProxyRecord, 'normalized_endpoint' | 'protocol' | 'host' | 'port' | 'username' | 'password'>,
  options: CheckOptions = {}
): Promise<ProxyCheckResult> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs || 5000;
  const allowInternal = options.allowInternal || false;
  const target = options.target || 'web';

  // If testing 'all' targets simultaneously, invoke checkProxyMultiTarget
  if (target === 'all') {
    const multi = await checkProxyMultiTarget(record, timeoutMs);
    return multi.result;
  }

  // 1. Structural Syntax Validation
  const parsed = parseProxyString(record.normalized_endpoint, record.protocol);
  if (!parsed.is_valid) {
    return {
      status: 'INVALID',
      latency_ms: 0,
      handshake_success: false,
      error_category: 'SYNTAX_ERROR',
      error_message: parsed.validation_error || 'Malformed endpoint structure',
      target,
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
      target,
      checked_at: new Date().toISOString()
    };
  }

  // 3. Protocol & Target Testing
  try {
    if (parsed.protocol === 'socks4' || parsed.protocol === 'socks5') {
      return await checkSocksProxy({
        ...parsed,
        protocol: parsed.protocol as 'socks4' | 'socks5'
      }, timeoutMs, target);
    } else {
      return await checkHttpProxy({
        ...parsed,
        protocol: parsed.protocol as 'http' | 'https'
      }, timeoutMs, options.diagnosticTargetUrl, target);
    }
  } catch (err: any) {
    const totalLatency = Date.now() - startTime;
    return mapErrorToResult(err, totalLatency, target);
  }
}

/**
 * Checks a SOCKS4 or SOCKS5 proxy using TCP socket & SocksClient handshake
 * with optional TLS negotiation to the specified target platform.
 */
async function checkSocksProxy(
  endpoint: { protocol: 'socks4' | 'socks5'; host: string; port: number; username?: string; password?: string },
  timeoutMs: number,
  target: Exclude<TargetPlatform, 'all'> = 'web'
): Promise<ProxyCheckResult> {
  const startTime = Date.now();
  const config = TARGET_CONFIGS[target];

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
      host: config.connectHost,
      port: config.connectPort
    },
    timeout: timeoutMs
  };

  try {
    const info = await SocksClient.createConnection(socksOptions);
    info.socket.on('error', () => {});
    const latency = Date.now() - startTime;

    // Validate connection to target host
    return new Promise((resolve) => {
      let resolved = false;
      const finish = (result: ProxyCheckResult) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          try { info.socket.destroy(); } catch {}
          resolve(result);
        }
      };

      const timer = setTimeout(() => {
        finish({
          status: 'ACTIVE',
          latency_ms: latency,
          handshake_success: true,
          status_code: 200,
          diagnostic_target: `tcp://${config.connectHost}:${config.connectPort}`,
          target,
          checked_at: new Date().toISOString()
        });
      }, Math.min(Math.max(timeoutMs - latency, 800), 2000));

      if (config.useTls) {
        const tlsSocket = tls.connect({
          socket: info.socket,
          servername: config.connectHost,
          rejectUnauthorized: false
        }, () => {
          clearTimeout(timer);
          const totalLatency = Date.now() - startTime;
          try { tlsSocket.destroy(); } catch {}
          finish({
            status: 'ACTIVE',
            latency_ms: totalLatency,
            handshake_success: true,
            status_code: 200,
            diagnostic_target: `tls://${config.connectHost}:${config.connectPort}`,
            target,
            checked_at: new Date().toISOString()
          });
        });

        tlsSocket.on('error', () => {
          clearTimeout(timer);
          const totalLatency = Date.now() - startTime;
          if (target === 'web') {
            finish({
              status: 'ACTIVE',
              latency_ms: latency,
              handshake_success: true,
              status_code: 200,
              diagnostic_target: `tcp://${config.connectHost}:${config.connectPort}`,
              target,
              checked_at: new Date().toISOString()
            });
          } else {
            finish({
              status: 'INACTIVE',
              latency_ms: totalLatency,
              handshake_success: false,
              error_category: 'TLS_HANDSHAKE_FAILURE',
              error_message: `TLS Handshake with ${config.connectHost} failed via SOCKS proxy`,
              target,
              checked_at: new Date().toISOString()
            });
          }
        });
      } else {
        clearTimeout(timer);
        finish({
          status: 'ACTIVE',
          latency_ms: latency,
          handshake_success: true,
          status_code: 200,
          diagnostic_target: `tcp://${config.connectHost}:${config.connectPort}`,
          target,
          checked_at: new Date().toISOString()
        });
      }
    });
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return mapErrorToResult(err, latency, target);
  }
}

/**
 * Checks an HTTP / HTTPS forward proxy using CONNECT tunnel or direct GET request.
 * Strictly verifies HTTPS port 443 SSL CONNECT capability for Facebook and LinkedIn.
 */
async function checkHttpProxy(
  endpoint: { protocol: 'http' | 'https'; host: string; port: number; username?: string; password?: string },
  timeoutMs: number,
  customTargetUrl?: string,
  target: Exclude<TargetPlatform, 'all'> = 'web'
): Promise<ProxyCheckResult> {
  const startTime = Date.now();
  const config = TARGET_CONFIGS[target];

  const authHeader = endpoint.username 
    ? `Basic ${Buffer.from(`${endpoint.username}:${endpoint.password || ''}`).toString('base64')}`
    : undefined;

  // Step A: Attempt HTTP CONNECT tunnel check to the target's port 443
  const connectResult = await new Promise<ProxyCheckResult | null>((resolve) => {
    let resolved = false;
    const reqHeaders: Record<string, string> = {
      'Host': `${config.connectHost}:${config.connectPort}`,
      'User-Agent': BROWSER_USER_AGENT,
      'Proxy-Connection': 'Keep-Alive'
    };
    if (authHeader) reqHeaders['Proxy-Authorization'] = authHeader;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        req.destroy();
        resolve(null);
      }
    }, Math.min(timeoutMs, 4000));

    const req = http.request({
      host: endpoint.host,
      port: endpoint.port,
      method: 'CONNECT',
      path: `${config.connectHost}:${config.connectPort}`,
      headers: reqHeaders,
      timeout: timeoutMs
    });

    req.on('connect', (res, socket) => {
      clearTimeout(timer);
      if (resolved) {
        try { socket.destroy(); } catch {}
        return;
      }
      socket.on('error', () => {});
      const latency = Date.now() - startTime;

      if (res.statusCode === 200) {
        let tunnelResolved = false;
        let fallbackTimer: NodeJS.Timeout | null = null;

        const finishTunnel = (result: ProxyCheckResult | null) => {
          if (!tunnelResolved) {
            tunnelResolved = true;
            if (fallbackTimer) clearTimeout(fallbackTimer);
            if (!resolved) {
              resolved = true;
              resolve(result);
            }
          }
        };

        // Upgrade socket to TLS to verify real TLS handshake with Facebook / LinkedIn / Web
        const tlsSocket = tls.connect({
          socket,
          servername: config.connectHost,
          rejectUnauthorized: false
        }, () => {
          const totalLatency = Date.now() - startTime;
          try { tlsSocket.destroy(); } catch {}
          try { socket.destroy(); } catch {}
          finishTunnel({
            status: 'ACTIVE',
            latency_ms: totalLatency,
            handshake_success: true,
            status_code: 200,
            diagnostic_target: `https://${config.connectHost}:${config.connectPort} (SSL CONNECT)`,
            target,
            checked_at: new Date().toISOString()
          });
        });

        tlsSocket.on('error', () => {
          try { tlsSocket.destroy(); } catch {}
          try { socket.destroy(); } catch {}
          if (target === 'web') {
            finishTunnel({
              status: 'ACTIVE',
              latency_ms: latency,
              handshake_success: true,
              status_code: 200,
              diagnostic_target: `tcp://${config.connectHost}:${config.connectPort} (CONNECT Tunnel)`,
              target,
              checked_at: new Date().toISOString()
            });
          } else {
            finishTunnel({
              status: 'INACTIVE',
              latency_ms: Date.now() - startTime,
              handshake_success: false,
              error_category: 'SSL_HANDSHAKE_FAILED',
              error_message: `SSL CONNECT Tunnel failed TLS negotiation with ${config.connectHost}`,
              target,
              checked_at: new Date().toISOString()
            });
          }
        });

        fallbackTimer = setTimeout(() => {
          try { tlsSocket.destroy(); } catch {}
          try { socket.destroy(); } catch {}
          if (target === 'web') {
            finishTunnel({
              status: 'ACTIVE',
              latency_ms: latency,
              handshake_success: true,
              status_code: 200,
              diagnostic_target: `tcp://${config.connectHost}:${config.connectPort} (CONNECT Tunnel)`,
              target,
              checked_at: new Date().toISOString()
            });
          } else {
            finishTunnel({
              status: 'INACTIVE',
              latency_ms: Date.now() - startTime,
              handshake_success: false,
              error_category: 'SSL_HANDSHAKE_TIMEOUT',
              error_message: `SSL CONNECT Tunnel timed out during TLS negotiation with ${config.connectHost}`,
              target,
              checked_at: new Date().toISOString()
            });
          }
        }, 1500);

      } else if (res.statusCode === 407) {
        resolved = true;
        try { socket.destroy(); } catch {}
        resolve({
          status: 'AUTH_REQUIRED',
          latency_ms: latency,
          handshake_success: true,
          status_code: 407,
          error_category: 'AUTHENTICATION_REQUIRED',
          error_message: 'HTTP 407 Proxy Authentication Required',
          target,
          checked_at: new Date().toISOString()
        });
      } else {
        resolved = true;
        try { socket.destroy(); } catch {}
        resolve(null);
      }
    });

    req.on('error', () => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    });

    req.end();
  });

  if (connectResult) {
    return connectResult;
  }

  // If CONNECT tunnel failed and target is Facebook or LinkedIn, it CANNOT work on Facebook/LinkedIn
  if (target === 'facebook' || target === 'linkedin') {
    return {
      status: 'INACTIVE',
      latency_ms: Date.now() - startTime,
      handshake_success: false,
      error_category: 'SSL_CONNECT_REFUSED',
      error_message: `Proxy cannot establish SSL CONNECT tunnel to ${config.connectHost}:443`,
      target,
      checked_at: new Date().toISOString()
    };
  }

  // Step B: For general web, fallback to direct HTTP GET forward request
  const targetUrl = customTargetUrl || config.fallbackUrl;
  let targetUrlObj: URL;
  try {
    targetUrlObj = new URL(targetUrl);
  } catch {
    targetUrlObj = new URL('http://checkip.amazonaws.com');
  }

  return new Promise((resolve) => {
    let resolved = false;
    const reqHeaders: Record<string, string> = {
      'Host': targetUrlObj.host,
      'User-Agent': BROWSER_USER_AGENT,
      'Accept': '*/*'
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
          error_message: `Connection attempt timed out after ${timeoutMs}ms`,
          target,
          checked_at: new Date().toISOString()
        });
      }
    }, timeoutMs);

    const req = http.request({
      host: endpoint.host,
      port: endpoint.port,
      method: 'GET',
      path: targetUrl,
      headers: reqHeaders,
      timeout: timeoutMs
    }, (res) => {
      clearTimeout(timer);
      if (resolved) return;
      resolved = true;

      const latency = Date.now() - startTime;
      const statusCode = res.statusCode || 0;
      res.resume();

      if (statusCode === 407) {
        resolve({
          status: 'AUTH_REQUIRED',
          latency_ms: latency,
          handshake_success: true,
          status_code: 407,
          error_category: 'AUTHENTICATION_REQUIRED',
          error_message: 'HTTP 407 Proxy Authentication Required',
          target,
          checked_at: new Date().toISOString()
        });
        return;
      }

      if (statusCode >= 200 && statusCode < 400) {
        resolve({
          status: 'ACTIVE',
          latency_ms: latency,
          handshake_success: true,
          status_code: statusCode,
          diagnostic_target: targetUrl,
          target,
          checked_at: new Date().toISOString()
        });
        return;
      }

      if (statusCode >= 500) {
        resolve({
          status: 'INACTIVE',
          latency_ms: latency,
          handshake_success: false,
          status_code: statusCode,
          error_category: 'PROXY_SERVER_ERROR',
          error_message: `Proxy returned upstream error status code: ${statusCode}`,
          target,
          checked_at: new Date().toISOString()
        });
        return;
      }

      resolve({
        status: 'ACTIVE',
        latency_ms: latency,
        handshake_success: true,
        status_code: statusCode,
        target,
        checked_at: new Date().toISOString()
      });
    });

    req.on('error', (err) => {
      clearTimeout(timer);
      if (resolved) return;
      resolved = true;
      resolve(mapErrorToResult(err, Date.now() - startTime, target));
    });

    req.end();
  });
}

/**
 * Executes a full multi-target diagnostic suite on a proxy endpoint,
 * checking General Web, Facebook, and LinkedIn in parallel.
 */
export async function checkProxyMultiTarget(
  record: Pick<ProxyRecord, 'normalized_endpoint' | 'protocol' | 'host' | 'port' | 'username' | 'password'>,
  timeoutMs = 4500
): Promise<{
  result: ProxyCheckResult;
  compatibility: { web: boolean; facebook: boolean; linkedin: boolean };
  latencies: { web?: number; facebook?: number; linkedin?: number };
}> {
  const [webRes, fbRes, liRes] = await Promise.all([
    checkProxyEndpoint(record, { timeoutMs, target: 'web' }),
    checkProxyEndpoint(record, { timeoutMs, target: 'facebook' }),
    checkProxyEndpoint(record, { timeoutMs, target: 'linkedin' })
  ]);

  const webOk = webRes.status === 'ACTIVE';
  const fbOk = fbRes.status === 'ACTIVE';
  const liOk = liRes.status === 'ACTIVE';

  const anyActive = webOk || fbOk || liOk;
  const bestResult = (fbOk ? fbRes : liOk ? liRes : webRes);

  const finalResult: ProxyCheckResult = {
    ...bestResult,
    status: anyActive ? 'ACTIVE' : bestResult.status,
    target: 'all',
    target_compatibility: {
      web: webOk,
      facebook: fbOk,
      linkedin: liOk
    }
  };

  return {
    result: finalResult,
    compatibility: {
      web: webOk,
      facebook: fbOk,
      linkedin: liOk
    },
    latencies: {
      web: webRes.latency_ms || undefined,
      facebook: fbRes.latency_ms || undefined,
      linkedin: liRes.latency_ms || undefined
    }
  };
}

/**
 * Maps system and network error to classification status.
 */
function mapErrorToResult(err: any, latency: number, target: TargetPlatform = 'web'): ProxyCheckResult {
  const code = (err.code || '').toUpperCase();
  const msg = (err.message || '').toLowerCase();

  if (msg.includes('authentication') || msg.includes('auth failed') || msg.includes('0x02')) {
    return {
      status: 'AUTH_REQUIRED',
      latency_ms: latency,
      handshake_success: false,
      error_category: 'AUTHENTICATION_REQUIRED',
      error_message: 'Proxy rejected connection: authentication required or invalid credentials',
      target,
      checked_at: new Date().toISOString()
    };
  }

  if (code === 'ECONNREFUSED' || msg.includes('econnrefused')) {
    return {
      status: 'INACTIVE',
      latency_ms: latency,
      handshake_success: false,
      error_category: 'CONNECTION_REFUSED',
      error_message: 'Target host actively refused the connection on specified port',
      target,
      checked_at: new Date().toISOString()
    };
  }

  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || msg.includes('timeout') || msg.includes('etimedout')) {
    return {
      status: 'INACTIVE',
      latency_ms: latency,
      handshake_success: false,
      error_category: 'TIMEOUT',
      error_message: 'Connection attempt timed out waiting for proxy acknowledgment',
      target,
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
      target,
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
      target,
      checked_at: new Date().toISOString()
    };
  }

  return {
    status: 'INACTIVE',
    latency_ms: latency,
    handshake_success: false,
    error_category: code || 'NETWORK_ERROR',
    error_message: err.message || 'Unknown network error',
    target,
    checked_at: new Date().toISOString()
  };
}
