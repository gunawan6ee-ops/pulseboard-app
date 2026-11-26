#!/usr/bin/env node
/**
 * Regenerate health.json from the single source of truth (SERVICES in app.js).
 * Keeps the static public contract from drifting away from the rendered bundle.
 *
 * Usage: node scripts/build-health.mjs [--check]
 *   --check  exit 1 when health.json is stale instead of rewriting it
 */

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

import { SERVICES, buildHealthPayload } from '../app.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TARGET = join(ROOT, 'health.json')

export function serializeHealth(payload) {
  return `${JSON.stringify(payload, null, 2)}\n`
}

async function main() {
  const checkOnly = process.argv.includes('--check')
  const next = serializeHealth(buildHealthPayload(SERVICES, new Date()))

  if (checkOnly) {
    const current = await readFile(TARGET, 'utf8')
    const strip = (s) => s.replace(/"checkedAt": "[^"]*"/, '')
    if (strip(current) !== strip(next)) {
      console.error('FAIL: health.json is stale — run node scripts/build-health.mjs')
      process.exit(1)
    }
    console.log('OK: health.json matches SERVICES')
    return
  }

  await writeFile(TARGET, next, 'utf8')
  console.log(`OK: health.json regenerated (${SERVICES.length} services)`)
}

const invokedDirectly =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) main().catch((err) => {
  console.error(`FAIL: ${err.message}`)
  process.exit(1)
})
