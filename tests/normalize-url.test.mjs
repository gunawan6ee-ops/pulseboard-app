import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeUrl } from '../scripts/verify-live.mjs'

const FALLBACK = 'https://example.test/index.html'

test('normalizeUrl prefixes a bare host with https://', () => {
  assert.equal(
    normalizeUrl('gunawan6ee-ops.github.io/pulseboard-app/'),
    'https://gunawan6ee-ops.github.io/pulseboard-app/'
  )
})

test('normalizeUrl keeps an existing https scheme', () => {
  assert.equal(normalizeUrl('https://a.test/x/'), 'https://a.test/x/')
})

test('normalizeUrl keeps an existing http scheme', () => {
  assert.equal(normalizeUrl('http://localhost:4889/'), 'http://localhost:4889/index.html')
})

test('normalizeUrl strips a protocol-relative marker', () => {
  assert.equal(normalizeUrl('//a.test/p/'), 'https://a.test/p/')
})

test('normalizeUrl maps a bare root path to index.html', () => {
  assert.equal(normalizeUrl('https://a.test'), 'https://a.test/index.html')
})

test('normalizeUrl falls back on empty input', () => {
  assert.equal(normalizeUrl('', FALLBACK), FALLBACK)
  assert.equal(normalizeUrl('   ', FALLBACK), FALLBACK)
  assert.equal(normalizeUrl(undefined, FALLBACK), FALLBACK)
  assert.equal(normalizeUrl(null, FALLBACK), FALLBACK)
})

test('normalizeUrl falls back on unparseable input', () => {
  assert.equal(normalizeUrl('http://', FALLBACK), FALLBACK)
})

test('normalizeUrl trims surrounding whitespace', () => {
  assert.equal(normalizeUrl('  https://a.test/x/  '), 'https://a.test/x/')
})
