import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Standard forbidden IP ranges (e.g., AWS/GCP/Azure instance metadata services).
 */
const DEFAULT_DENIED_IPS = [
  '169.254.169.254', // AWS / GCP / Azure metadata service
  '169.254.170.2',   // AWS ECS task metadata
  'fd00:ec2::254',   // AWS IPv6 metadata
];

export interface SsrfConfig {
  allowInternalIps?: boolean; // If false, 127.0.0.1, 10.x, 192.168.x are blocked
  allowedHosts?: string[];    // Whitelist
  deniedIps?: string[];       // Explicit blacklist
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 127.0.0.0/8
    if (parts[0] === 127) return true;
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 0.0.0.0
    if (parts[0] === 0) return true;
    // 169.254.0.0/16 (Link Local)
    if (parts[0] === 169 && parts[1] === 254) return true;
  } else if (net.isIPv6(ip)) {
    // ::1 (loopback)
    if (ip === '::1' || ip === '::') return true;
    // fe80::/10 (Link local)
    if (ip.toLowerCase().startsWith('fe80:')) return true;
    // fc00::/7 (Unique local address)
    if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true;
  }
  return false;
}

export async function validateSsrfTarget(targetUrl: string, config: SsrfConfig = {}): Promise<void> {
  const allowInternal = config.allowInternalIps ?? (process.env.SSRF_ALLOW_INTERNAL === 'true' || true); // In internal API testing, internal IPs are allowed by default, metadata is always denied
  const deniedIps = new Set([...DEFAULT_DENIED_IPS, ...(config.deniedIps || [])]);
  const allowedHosts = new Set(config.allowedHosts || []);

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch (err) {
    throw new Error(`Invalid URL target: ${targetUrl}`);
  }

  // Only http and https protocols allowed
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Protocol '${parsed.protocol}' is not supported. Use HTTP or HTTPS.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (allowedHosts.has(hostname)) {
    return;
  }

  // Resolve DNS to check underlying IP addresses
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (deniedIps.has(addr.address)) {
        throw new Error(`Access to blocked IP address (${addr.address}) is forbidden.`);
      }

      if (!allowInternal && isPrivateIp(addr.address)) {
        throw new Error(`Access to private network address (${addr.address}) is restricted by SSRF policy.`);
      }
    }
  } catch (err: unknown) {
    if ((err as Error).message.includes('forbidden') || (err as Error).message.includes('restricted')) {
      throw err;
    }
    // DNS resolution failure will be caught naturally by http client
  }
}

