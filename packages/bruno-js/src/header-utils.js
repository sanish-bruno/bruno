/**
 * Case-insensitive equality for HTTP-style header keys.
 * Non-string inputs fall back to strict equality so callers can pass through
 * arbitrary values without a type guard at every site.
 */
const ciEquals = (a, b) => {
  return typeof a === 'string' && typeof b === 'string'
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
};

/**
 * Parse a "Key: Value" header line. Splits on the first colon so values
 * containing colons (URLs, timestamps) survive intact.
 * @returns {{ key: string, value: string } | null}
 */
const parseHeaderString = (str) => {
  if (typeof str !== 'string') return null;
  const idx = str.indexOf(':');
  if (idx === -1) return null;
  return { key: str.substring(0, idx).trim(), value: str.substring(idx + 1).trim() };
};

/**
 * Look up a value from a headers map using a case-insensitive key match.
 * Returns `undefined` when the map is missing/malformed or the key is absent.
 */
const findHeaderValue = (headers, name) => {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return undefined;
  const match = Object.keys(headers).find((k) => ciEquals(k, name));
  return match === undefined ? undefined : headers[match];
};

module.exports = {
  ciEquals,
  parseHeaderString,
  findHeaderValue
};
