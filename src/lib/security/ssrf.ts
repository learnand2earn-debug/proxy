import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const resolve4Async = promisify(dns.resolve4);
const resolve6Async = promisify(dns.resolve6);

// IP Range check helpers
function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

function inSubnet(ipInt: number, subnetInt: number, maskBits: number): boolean {
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (subnetInt & mask);
}

const PRIVATE_SUBNETS_V4: Array<{ subnet: string; bits: number }> = [
  { subnet: '0.0.0.0', bits: 8 },         // Current network
  { subnet: '10.0.0.0', bits: 8 },        // RFC 1918 Class A
  { subnet: '100.64.0.0', bits: 10 },     // Carrier-grade NAT
  { subnet: '127.0.0.0', bits: 8 },       // Loopback
  { subnet: '169.254.0.0', bits: 16 },    // Link-local / AWS & Cloud Metadata
  { subnet: '172.16.0.0', bits: 12 },     // RFC 1918 Class B
  { subnet: '192.0.0.0', bits: 24 },      // IETF Protocol
  { subnet: '192.0.2.0', bits: 24 },      // TEST-NET-1 (non-routable documentation)
  { subnet: '192.168.0.0', bits: 16 },    // RFC 1918 Class C
  { subnet: '198.18.0.0', bits: 15 },     // Benchmark testing
  { subnet: '198.51.100.0', bits: 24 },   // TEST-NET-2
  { subnet: '203.0.113.0', bits: 24 },    // TEST-NET-3
  { subnet: '224.0.0.0', bits: 4 },       // Multicast
  { subnet: '240.0.0.0', bits: 4 },       // Reserved
  { subnet: '255.255.255.255', bits: 32 } // Broadcast
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254'
];

/**
 * Checks whether an IPv4 address belongs to a private, loopback, or cloud-metadata range.
 */
export function isPrivateIPv4(ip: string): boolean {
  if (!net.isIPv4(ip)) return false;
  const ipInt = ipToInt(ip);
  return PRIVATE_SUBNETS_V4.some(({ subnet, bits }) => {
    return inSubnet(ipInt, ipToInt(subnet), bits);
  });
}

/**
 * Checks whether an IPv6 address is loopback, unique-local, or link-local.
 */
export function isPrivateIPv6(ip: string): boolean {
  if (!net.isIPv6(ip)) return false;
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // fc00::/7 ULA
  if (normalized.startsWith('fe80')) return true; // fe80::/10 link-local
  return false;
}

export function isPrivateIP(ip: string): boolean {
  return isPrivateIPv4(ip) || isPrivateIPv6(ip);
}

export interface SSRFValidationResult {
  isSafe: boolean;
  resolvedIP?: string;
  error?: string;
}

/**
 * Validates a hostname or IP address against SSRF vulnerabilities,
 * performing secure DNS resolution and checking all returned IPs.
 */
export async function validateEndpointSecurity(
  host: string,
  allowInternal: boolean = false
): Promise<SSRFValidationResult> {
  const normalizedHost = host.trim().toLowerCase();

  // If internal access is explicitly allowed by operator configuration
  if (allowInternal) {
    return { isSafe: true, resolvedIP: normalizedHost };
  }

  // 1. Check known blocked hostnames & metadata addresses
  if (BLOCKED_HOSTNAMES.includes(normalizedHost)) {
    return {
      isSafe: false,
      error: `Hostname '${normalizedHost}' is blocked for SSRF security.`
    };
  }

  // 2. Direct IP check
  if (net.isIP(normalizedHost)) {
    if (isPrivateIP(normalizedHost)) {
      return {
        isSafe: false,
        error: `IP address '${normalizedHost}' is within a private or restricted network range.`
      };
    }
    return { isSafe: true, resolvedIP: normalizedHost };
  }

  // 3. DNS Resolution check (prevent DNS rebinding)
  try {
    let resolvedIPs: string[] = [];
    try {
      resolvedIPs = await resolve4Async(normalizedHost);
    } catch {
      // If IPv4 fails, try IPv6
      try {
        resolvedIPs = await resolve6Async(normalizedHost);
      } catch (err) {
        return {
          isSafe: false,
          error: `DNS resolution failed for hostname '${normalizedHost}'.`
        };
      }
    }

    if (!resolvedIPs || resolvedIPs.length === 0) {
      return {
        isSafe: false,
        error: `No DNS records returned for '${normalizedHost}'.`
      };
    }

    // Verify EVERY resolved IP address
    for (const ip of resolvedIPs) {
      if (isPrivateIP(ip)) {
        return {
          isSafe: false,
          error: `Hostname '${normalizedHost}' resolved to a restricted IP: ${ip}.`
        };
      }
    }

    return {
      isSafe: true,
      resolvedIP: resolvedIPs[0]
    };
  } catch (err: any) {
    return {
      isSafe: false,
      error: `DNS check error: ${err.message || 'Unknown error'}`
    };
  }
}
