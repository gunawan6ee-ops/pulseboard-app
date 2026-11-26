import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = join(ROOT, 'scripts', 'live-url.mjs')

async function resolveUrl(arg) {
  const args = arg === undefined ? [SCRIPT] : [SCRIPT, arg]
  const { stdout } = await run(process.execPath, args)
  return stdout.trim()
}

// browser_action needs BOTH a scheme and a non-empty query string. A bare path
// and a dangling "?" are rejected with the same misleading scheme error.
const BROWSER_ACTION_SAFE = /^https?:\/\/[^?]+\?\S+$/

test('live-url emits a scheme-prefixed URL for the bare host that broke browser_action', async () => {
  const url = await resolveUrl('gunawan6ee-ops.github.io/pulseboard-app/')
  assert.match(url, /^https:\/\//)
  assert.ok(url.startsWith('https://gunawan6ee-ops.github.io/pulseboard-app/'), url)
})

test('live-url defaults to the production target when no argument is given', async () => {
  const url = await resolveUrl()
  assert.ok(url.startsWith('https://gunawan6ee-ops.github.io/pulseboard-app/'), url)
})

test('live-url preserves an explicit localhost scheme and maps the root path', async () => {
  const url = await resolveUrl('http://localhost:4889/')
  assert.ok(url.startsWith('http://localhost:4889/index.html'), url)
})

test('live-url always appends a non-empty query string for browser_action', async () => {
  const url = await resolveUrl('gunawan6ee-ops.github.io/pulseboard-app/')
  const parsed = new URL(url)
  assert.ok(parsed.search.length > 1, `empty query in ${url}`)
  assert.ok(parsed.searchParams.get('audit'), `missing audit param in ${url}`)
})

test('live-url keeps an existing non-empty query instead of doubling it', async () => {
  const url = await resolveUrl('https://a.test/p/?keep=1')
  const parsed = new URL(url)
  assert.equal(parsed.searchParams.get('keep'), '1')
  assert.equal(parsed.searchParams.get('audit'), null)
})

test('live-url output always satisfies the browser_action scheme requirement', async () => {
  for (const input of ['a.test/p/', '//a.test/p/', 'https://a.test/p/', '  https://a.test/p/  ']) {
    const url = await resolveUrl(input)
    assert.match(url, BROWSER_ACTION_SAFE, `input ${JSON.stringify(input)} produced ${url}`)
  }
})
