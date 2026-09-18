/**
 * Wraps `URL.createObjectURL` with a paired `revoke`, so every call site that
 * needs an object URL for a `Blob` can release it deterministically (e.g.
 * from a Svelte `$effect` cleanup) instead of leaking it.
 */
export function createManagedObjectUrl(blob: Blob): { url: string; revoke: () => void } {
  const url = URL.createObjectURL(blob);
  let revoked = false;
  return {
    url,
    revoke: () => {
      if (revoked) return;
      revoked = true;
      URL.revokeObjectURL(url);
    },
  };
}
