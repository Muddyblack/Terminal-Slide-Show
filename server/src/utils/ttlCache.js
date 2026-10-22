const MAX_ENTRIES = 50;
const entries = new Map();

/**
 * Returns a cached value for `key`, calling `load` only when the entry is missing or older than `ttlMs`.
 * Concurrent callers share one in-flight request. Failed loads are not cached.
 * @template T
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<T>} load
 * @returns {Promise<T>}
 */
export function cached(key, ttlMs, load) {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise;

  const promise = load();
  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value);
  entries.set(key, { at: Date.now(), promise });
  promise.catch(() => {
    if (entries.get(key)?.promise === promise) entries.delete(key);
  });
  return promise;
}
