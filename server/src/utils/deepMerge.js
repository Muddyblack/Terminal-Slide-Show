const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Recursively merges `override` into `base` without mutating either.
 * Plain objects are merged key by key; arrays and other values are replaced.
 * @param {Object} base
 * @param {Object} [override]
 * @returns {Object}
 */
export function deepMerge(base, override) {
  if (!isPlainObject(override)) return base;

  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = isPlainObject(value) && isPlainObject(base[key])
      ? deepMerge(base[key], value)
      : value;
  }
  return result;
}
