#!/usr/bin/env node
/** Spawn the preview server detached so it survives this process exiting. */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const child = spawn(process.execPath, [join(ROOT, 'scripts', 'serve.mjs')], {
  cwd: ROOT,
  detached: true,
  stdio: 'ignore',
})
child.unref()
console.log(`OK: preview server spawned (pid ${child.pid})`)
