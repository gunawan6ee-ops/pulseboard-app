/**
 * Baseline security response headers for the static preview server.
 *
 * The app is a static bundle with no third-party origins, so the policy can be
 * strict: everything is same-origin, and inline styles are the only relaxation
 * (the renderer sets no inline style, but the stylesheet is same-origin anyway).
 *
 * `frame-ancestors 'none'` plus X-Frame-Options covers clickjacking on both
 * modern and legacy engines. `nosniff` stops MIME confusion on the JSON
 * endpoint, which is served as application/json but is also directly linkable.
 */

export const SECURITY_HEADERS = Object.freeze({
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'geolocation=(), microphone=(), camera=()',
})

/** Merge the security baseline into a header object without mutating it. */
export function withSecurityHeaders(headers = {}) {
  return { ...SECURITY_HEADERS, ...headers }
}
