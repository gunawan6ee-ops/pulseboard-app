#!/usr/bin/env node
/**
 * PulseBoard live health verifier.
 *
 * Guards against the browser_action failure mode where a bare host
 * ("gunawan6ee-ops.github.io/...") is rejected because it lacks a scheme.
 * normalizeUrl() repairs that before any request is made.
 *
 * Checks:
 *   1. URL normalization (scheme + default page handling)
 *   2. Live page reachable, HTTP 200, expected title + mount point present
 *   3. Deployed app.js bundle reachable and matching health.json per service
 *   4. No degraded/down service in the static payload
 *   5. health.json conforms to the versioned v1 public contract
 *
 * Services are rendered client-side from app.js, so the raw HTML never
 * contains them — the deployed bundle is the real render source and is
 * therefore what gets compared against health.json.
 *
 * Exit 0 = healthy, exit 1 = unhealthy (with reasons on stderr).
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_TARGET = 'https://gunawan6ee-ops.github.io/pulseboard-app/'
const TIMEOUT_MS = 15000

/**
 * Repair a target URL so it always satisfies the http(s):// requirement.
 * Bare hosts get https://, and a missing path falls back to the default page.
 */
export function normalizeUrl(raw, fallback = DEFAULT_TARGET) {
  const input = String(raw ?? '').trim()
  if (!input) return fallback

  let url = input
  if (!/^https?:\/\//i.test(url)) {
    // Strip a leading protocol-relative marker before re-prefixing.
    url = url.replace(/^\/\//, '')
    url = `https://${url}`
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return fallback
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback
  if (!parsed.hostname) return fallback
  if (parsed.pathname === '/' || parsed.pathname === '') parsed.pathname = '/index.html'

  return parsed.toString()
}

function fail(reasons) {
  for (const reason of reasons) console.error(`FAIL: ${reason}`)
  process.exit(1)
}

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'pulseboard-live-audit/1.0' },
    })
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const target = normalizeUrl(process.argv[2] ?? process.env.PULSEBOARD_URL)
  const reasons = []

  if (!/^https?:\/\//i.test(target)) reasons.push(`normalized URL still lacks a scheme: ${target}`)

  let res
  try {
    res = await fetchWithTimeout(target)
  } catch (err) {
    fail([`live page unreachable: ${err.message}`])
  }

  if (res.status !== 200) reasons.push(`live page returned HTTP ${res.status}`)

  const html = await res.text()
  if (!html.includes('PulseBoard')) reasons.push('live page missing expected title text')
  if (!html.includes('services-grid')) reasons.push('live page missing services grid mount point')

  // Services render client-side, so verify the deployed bundle instead.
  const bundleUrl = new URL('./app.js', target).toString()
  let bundle = ''
  try {
    const bundleRes = await fetchWithTimeout(bundleUrl)
    if (bundleRes.status !== 200) reasons.push(`live bundle returned HTTP ${bundleRes.status}`)
    else bundle = await bundleRes.text()
  } catch (err) {
    reasons.push(`live bundle unreachable: ${err.message}`)
  }

  const health = JSON.parse(await readFile(join(ROOT, 'health.json'), 'utf8'))

  // Public contract v1: { status, version, services[], checkedAt }
  if (health.version !== 1) reasons.push(`health.json version is ${health.version}, expected 1`)
  if (!['operational', 'degraded', 'outage'].includes(health.status)) {
    reasons.push(`health.json status "${health.status}" is outside the v1 enum`)
  }
  if (!Array.isArray(health.services) || health.services.length === 0) {
    reasons.push('health.json has no services array')
  }
  if (Number.isNaN(Date.parse(health.checkedAt))) reasons.push('health.json checkedAt is not ISO-8601')

  for (const check of health.services ?? []) {
    if (check.status !== 'operational') reasons.push(`service ${check.id} is ${check.status}`)
    if (!bundle.includes(check.name)) reasons.push(`live bundle does not render service "${check.name}"`)
    const svcPattern = new RegExp(`id: '${check.id}'[^}]*latencyMs: ${check.latencyMs}\\b`)
    if (!svcPattern.test(bundle)) reasons.push(`live bundle latency for ${check.id} does not match health.json (${check.latencyMs} ms)`)
    if (!bundle.includes(check.uptime)) reasons.push(`live bundle uptime for ${check.id} does not match health.json (${check.uptime})`)
  }

  if (reasons.length) fail(reasons)
  console.log(`OK: ${target} healthy — ${health.services.length} services operational, live bundle matches health.json v${health.version}`)
  process.exit(0)
}

const invokedDirectly =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) main().catch((err) => fail([err.message]))
