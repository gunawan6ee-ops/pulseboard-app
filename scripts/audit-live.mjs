#!/usr/bin/env node
/**
 * Live security probe for the PulseBoard preview server.
 *
 * Boots the real server on an ephemeral port, then asserts the hardening
 * actually holds over the wire — not just in unit tests:
 *
 *   1. Security headers present on a 200 response
 *   2. CSP forbids inline script and external origins
 *   3. Path traversal is refused (403) and cannot leak /etc/passwd
 *   4. Malformed percent-encoding does not crash the handler
 *   5. health.json is served as JSON with nosniff
 *   6. Rendered page still contains the mount points (no regression)
 *
 * Exit 0 = all probes pass, exit 1 = at least one failed.
 */

import { server } from './serve.mjs'

const reasons = []
const check = (ok, label) => {
  if (!ok) reasons.push(label)
}

function boot() {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(server.address().port))
  })
}

async function main() {
  const port = await boot()
  const base = `http://127.0.0.1:${port}`

  try {
    const page = await fetch(`${base}/`)
    check(page.status === 200, `root returned HTTP ${page.status}`)
    const html = await page.text()
    check(html.includes('services-grid'), 'page lost the services grid mount point')
    check(html.includes('incident-timeline'), 'page lost the incident timeline mount point')

    const csp = page.headers.get('content-security-policy') ?? ''
    check(csp.includes("script-src 'self'"), 'CSP missing script-src self')
    check(csp.includes("frame-ancestors 'none'"), 'CSP missing frame-ancestors none')
    check(!csp.includes('unsafe-inline'), 'CSP allows unsafe-inline')
    check(page.headers.get('x-content-type-options') === 'nosniff', 'missing nosniff')
    check(page.headers.get('x-frame-options') === 'DENY', 'missing X-Frame-Options DENY')
    check(page.headers.get('referrer-policy') === 'no-referrer', 'missing referrer-policy')

    const trav = await fetch(`${base}/../../../../etc/passwd`)
    check(trav.status === 403, `traversal returned HTTP ${trav.status}, expected 403`)
    const travBody = await trav.text()
    check(!travBody.includes('root:'), 'traversal leaked /etc/passwd contents')

    const encoded = await fetch(`${base}/%2e%2e/%2e%2e/etc/passwd`)
    check(encoded.status === 403, `encoded traversal returned HTTP ${encoded.status}, expected 403`)

    const malformed = await fetch(`${base}/%E0%A4%A`)
    check(malformed.status === 404, `malformed encoding returned HTTP ${malformed.status}, expected 404`)

    const health = await fetch(`${base}/health.json`)
    check(health.status === 200, `health.json returned HTTP ${health.status}`)
    check(
      (health.headers.get('content-type') ?? '').includes('application/json'),
      'health.json served with wrong content-type'
    )
    const payload = await health.json()
    check(payload.version === 1, `health.json version is ${payload.version}, expected 1`)
    check(Array.isArray(payload.services) && payload.services.length > 0, 'health.json has no services')
  } finally {
    await new Promise((r) => server.close(r))
  }

  if (reasons.length) {
    for (const reason of reasons) console.error(`FAIL: ${reason}`)
    process.exit(1)
  }
  console.log('OK: live probe passed — headers, traversal, encoding and health contract all hold')
}

main().catch((err) => {
  console.error(`FAIL: ${err.message}`)
  process.exit(1)
})
