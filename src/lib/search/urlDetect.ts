/**
 * Dot-suffixed tokens that look like a domain but are almost always a
 * filename or version string in practice. Heuristic and necessarily
 * imperfect: 'example.io' is a domain, 'main.go' is not, and there is no way
 * to tell them apart without a list like this one.
 */
const EXCLUDED_TLDS = new Set(['js', 'ts', 'md', 'txt', 'json', 'py', 'go', 'css', 'html']);

const BLOCKED_SCHEME_PREFIXES = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:', 'mailto:'];

function isIPv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isDomainLike(host: string): boolean {
  if (!host.includes('.')) return false;
  const labels = host.split('.');
  const tld = labels[labels.length - 1] ?? '';
  if (!/^[a-z]{2,}$/i.test(tld)) return false;
  if (EXCLUDED_TLDS.has(tld.toLowerCase())) return false;
  return labels.every((label) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(label));
}

/** Splits 'host:port/path' into its parts; port and path are optional. */
function parseHostPortPath(value: string): { host: string; port?: string } {
  const slashIndex = value.indexOf('/');
  const hostPort = slashIndex === -1 ? value : value.slice(0, slashIndex);
  const colonIndex = hostPort.indexOf(':');
  if (colonIndex === -1) return { host: hostPort };
  return { host: hostPort.slice(0, colonIndex), port: hostPort.slice(colonIndex + 1) };
}

/**
 * Returns the URL to navigate to, or null if the input doesn't look like
 * one. This is an inexhaustible source of false positives, so it stays
 * conservative and lets anything ambiguous fall through to a web search.
 */
export function detectUrl(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '' || /\s/.test(trimmed)) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).href;
    } catch {
      return null;
    }
  }

  const lower = trimmed.toLowerCase();
  if (BLOCKED_SCHEME_PREFIXES.some((prefix) => lower.startsWith(prefix))) return null;

  const { host, port } = parseHostPortPath(trimmed);
  if (port !== undefined && !/^\d+$/.test(port)) return null;

  if (/^localhost$/i.test(host)) return `http://${trimmed}`;
  if (isIPv4(host)) return `http://${trimmed}`;
  if (isDomainLike(host)) return `https://${trimmed}`;

  return null;
}
