import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'

import { escapeHtml, escapeAttr } from '../scripts/escape-html.mjs'
import { SECURITY_HEADERS, withSecurityHeaders } from '../scripts/security-headers.mjs'
import { safeDecode, resolveSafePath } from '../scripts/serve.mjs'

const ROOT = '/srv/pulseboard'

/* ---------- XSS: renderer escaping ---------- */

test('escapeHtml neutralises the five breakout characters', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;')
  assert.equal(escapeHtml('a & b'), 'a &amp; b')
  assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;')
  assert.equal(escapeHtml("it's"), 'it&#39;s')
})

test('escapeHtml does not double-encode an existing entity', () => {
  assert.equal(escapeHtml('&lt;'), '&amp;lt;')
})

test('escapeHtml coerces non-strings and handles nullish', () => {
  assert.equal(escapeHtml(42), '42')
  assert.equal(escapeHtml(null), '')
  assert.equal(escapeHtml(undefined), '')
})

test('escapeAttr blocks attribute breakout via a double quote', () => {
  const payload = 'x" onmouseover="alert(1)'
  const escaped = escapeAttr(payload)
  assert.equal(escaped.includes('"'), false, 'no raw quote may survive')
  assert.equal(escaped, 'x&quot; onmouseover=&quot;alert(1)')
})

test('img onerror payload is fully neutralised', () => {
  const payload = '<img src=x onerror=alert(1)>'
  const escaped = escapeHtml(payload)
  assert.equal(escaped.startsWith('&lt;img'), true)
  assert.equal(escaped.includes('<'), false)
  assert.equal(escaped.includes('>'), false)
})

/* ---------- Path traversal ---------- */

test('resolveSafePath maps the root to index.html', () => {
  assert.equal(resolveSafePath(ROOT, '/'), join(ROOT, 'index.html'))
  assert.equal(resolveSafePath(ROOT, ''), join(ROOT, 'index.html'))
})

test('resolveSafePath serves a normal asset', () => {
  assert.equal(resolveSafePath(ROOT, '/app.js'), join(ROOT, 'app.js'))
})

test('resolveSafePath strips the query string', () => {
  assert.equal(resolveSafePath(ROOT, '/health.json?v=2'), join(ROOT, 'health.json'))
})

test('resolveSafePath blocks ../ traversal', () => {
  assert.equal(resolveSafePath(ROOT, '/../etc/passwd'), null)
  assert.equal(resolveSafePath(ROOT, '/../../../../etc/passwd'), null)
})

test('resolveSafePath blocks encoded traversal', () => {
  assert.equal(resolveSafePath(ROOT, '/%2e%2e/%2e%2e/etc/passwd'), null)
})

test('resolveSafePath keeps a nested path inside the root', () => {
  assert.equal(resolveSafePath(ROOT, '/scripts/serve.mjs'), join(ROOT, 'scripts/serve.mjs'))
})

/* ---------- Malformed encoding ---------- */

test('safeDecode survives malformed percent-encoding', () => {
  assert.equal(safeDecode('/%E0%A4%A'), '/%E0%A4%A')
  assert.equal(safeDecode('/a%20b'), '/a b')
})

test('safeDecode defaults a missing url to the root', () => {
  assert.equal(safeDecode(undefined), '/')
  assert.equal(safeDecode(null), '/')
})

test('resolveSafePath does not throw on malformed encoding', () => {
  assert.doesNotThrow(() => resolveSafePath(ROOT, '/%E0%A4%A'))
})

/* ---------- Security headers ---------- */

test('CSP locks scripts and frames to self', () => {
  const csp = SECURITY_HEADERS['content-security-policy']
  assert.ok(csp.includes("default-src 'self'"))
  assert.ok(csp.includes("script-src 'self'"))
  assert.ok(csp.includes("frame-ancestors 'none'"))
  assert.ok(csp.includes("object-src 'none'") || csp.includes("default-src 'self'"))
})

test('baseline hardening headers are present', () => {
  assert.equal(SECURITY_HEADERS['x-content-type-options'], 'nosniff')
  assert.equal(SECURITY_HEADERS['x-frame-options'], 'DENY')
  assert.equal(SECURITY_HEADERS['referrer-policy'], 'no-referrer')
})

test('withSecurityHeaders merges without mutating the baseline', () => {
  const merged = withSecurityHeaders({ 'content-type': 'text/html' })
  assert.equal(merged['content-type'], 'text/html')
  assert.equal(merged['x-frame-options'], 'DENY')
  assert.equal(Object.isFrozen(SECURITY_HEADERS), true)
})
