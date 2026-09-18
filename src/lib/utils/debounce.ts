/**
 * Trailing-edge debounce: calling the returned function repeatedly only
 * invokes `fn` once, `ms` after the last call. The returned function also
 * exposes `cancel()` to discard a pending invocation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic callback signature
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number,
): T & { cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = ((...args: Parameters<T>) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, ms);
  }) as T & { cancel(): void };

  debounced.cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return debounced;
}
