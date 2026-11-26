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

test('live-url emits a scheme-prefixed URL for the bare host that broke browser_action', async () => {
  const url = await resolveUrl('gunawan6ee-ops.github.io/pulseboard-app/')
  assert.match(url, /^https:\/\//)
  assert.equal(url, 'https://gunawan6ee-ops.github.io/pulseboard-app/')
})

test('live-url defaults to the production target when no argument is given', async () => {
  const url = await resolveUrl()
  assert.equal(url, 'https://gunawan6ee-ops.github.io/pulseboard-app/')
})

test('live-url preserves an explicit localhost scheme and maps the root path', async () => {
  const url = await resolveUrl('http://localhost:4889/')
  assert.equal(url, 'http://localhost:4889/index.html')
})

test('live-url output always satisfies the browser_action scheme requirement', async () => {
  for (const input of ['a.test/p/', '//a.test/p/', 'https://a.test/p/', '  https://a.test/p/  ']) {
    const url = await resolveUrl(input)
    assert.match(url, /^https?:\/\//, `input ${JSON.stringify(input)} produced ${url}`)
  }
})
