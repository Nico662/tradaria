export async function apiFetch(url, opts = {}) {
  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    return { ok: false, data: null, status: 0, retryAfter: null };
  }
  const retryAfter = res.headers?.get('Retry-After') ? Number(res.headers.get('Retry-After')) : null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    return { ok: false, data: null, status: res.status, retryAfter };
  }
  return { ok: res.ok, data, status: res.status, retryAfter };
}

// Maps HTTP status (or server error code) to a human-readable localized message.
export function httpErrorMsg(t, status, retryAfter) {
  const e = t?.common?.errors;
  if (!e) return t?.common?.error ?? 'Error';
  if (status === 0)   return e.offline;
  if (status === 401) return e.session;
  if (status === 403) return e.forbidden;
  if (status === 404) return e.notFound;
  if (status === 429) return retryAfter ? e.rateLimit.replace('{n}', retryAfter) : e.rateLimitGeneric;
  if (status >= 500)  return e.server;
  return e.unknown;
}

// Maps stable server error codes from data.error to a human message when available.
export function codeErrorMsg(t, code) {
  const e = t?.common?.errors;
  if (!e) return t?.common?.error ?? 'Error';
  if (code === 'rate_limit')     return e.rateLimitGeneric;
  if (code === 'not_found')      return e.notFound;
  if (code === 'internal_error') return e.server;
  if (code === 'stripe_error')   return e.server;
  return null; // unknown code — caller should use httpErrorMsg or its own fallback
}
