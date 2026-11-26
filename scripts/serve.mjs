#!/usr/bin/env node
/**
 * Minimal zero-dependency static server for local preview / smoke checks.
 * Port 4889 (Dark Owl project preview range), with EADDRINUSE fallback 4890-4899.
 */

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join, normalize } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const START_PORT = Number(process.env.PORT ?? 4889)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0])
  const rel = normalize(urlPath === '/' ? '/index.html' : urlPath).replace(/^(\.\.[/\\])+/, '')
  const file = join(ROOT, rel)
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  }
})

let port = START_PORT
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && port < 4899) {
    port += 1
    server.listen(port, '127.0.0.1')
  } else {
    console.error(`FAIL: ${err.message}`)
    process.exit(1)
  }
})

server.on('listening', () => console.log(`OK: serving ${ROOT} on http://127.0.0.1:${port}/`))
server.listen(port, '127.0.0.1')
