/**
 * A config URL with a 'javascript:' scheme would be arbitrary code execution
 * the moment someone imports a third-party JSON. This whitelist is checked
 * both when config is parsed and again right before actually navigating.
 */
export const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function isAllowedUrl(value: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}
