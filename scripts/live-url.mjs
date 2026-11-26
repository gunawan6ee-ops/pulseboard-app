#!/usr/bin/env node
/**
 * Emit a browser_action-safe URL for the PulseBoard live audit.
 *
 * browser_action has TWO hard requirements, both discovered the hard way:
 *
 *   1. The target must carry an explicit http(s):// scheme, otherwise it
 *      bails with "URL harus diawali http:// atau https://".
 *   2. The target must carry a NON-EMPTY query string. A bare path
 *      (".../pulseboard-app/") and even a dangling "?" are rejected with the
 *      very same scheme error, which makes the message actively misleading.
 *      Only "...?audit=1" gets through.
 *
 * This resolver runs the normalizeUrl() guard used by verify-live.mjs and then
 * appends a cache-busting `audit` param when the URL has no query, so the
 * audit flow can pipe stdout straight into browser_action.
 *
 * Usage:
 *   node scripts/live-url.mjs                       # default production target
 *   node scripts/live-url.mjs gunawan6ee-ops.github.io/pulseboard-app/
 *   node scripts/live-url.mjs http://localhost:4889/
 *
 * Exit 0 = safe URL on stdout, exit 1 = input could not be repaired.
 */

import { normalizeUrl } from './verify-live.mjs'

const raw = process.argv[2] ?? process.env.PULSEBOARD_URL
const url = normalizeUrl(raw)

if (!/^https?:\/\//i.test(url)) {
  console.error(`FAIL: could not derive an http(s) URL from "${raw ?? ''}"`)
  process.exit(1)
}

// browser_action rejects a missing OR empty query string, so guarantee one.
const parsed = new URL(url)
if (!parsed.search || parsed.search === '?') {
  parsed.searchParams.set('audit', String(Date.now()))
}

const safe = parsed.toString()

if (!/^https?:\/\/[^?]+\?\S+/i.test(safe)) {
  console.error(`FAIL: "${safe}" still lacks a scheme or a non-empty query`)
  process.exit(1)
}

console.log(safe)
