#!/usr/bin/env node
/**
 * Emit a browser_action-safe URL for the PulseBoard live audit.
 *
 * browser_action rejects targets that lack an explicit http(s):// scheme
 * ("URL harus diawali http:// atau https://"). This resolver runs the same
 * normalizeUrl() guard used by verify-live.mjs and prints the repaired URL,
 * so the audit flow can pipe it straight into browser_action.
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

console.log(url)
