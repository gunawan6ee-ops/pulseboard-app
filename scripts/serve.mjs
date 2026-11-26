#!/usr/bin/env node
/**
 * Minimal zero-dependency static server for local preview / smoke checks.
 * Port 4889 (Dark Owl project preview range), with EADDRINUSE fallback 4890-4899.
 */

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join, resolve, sep } from 'node:path'

import { withSecurityHeaders } from './security-headers.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const START_PORT = Number(process.env.PORT ?? 4889)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

/**
 * Decode a request path without throwing on malformed percent-encoding.
 * `decodeURIComponent('%E0%A4%A')` throws URIError, which would otherwise
 * crash the handler and drop the connection.
 */
export function safeDecode(rawPath) {
  const path = (rawPath ?? '/').split('?')[0]
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

/**
 * Resolve a request path to an absolute file inside ROOT.
 * Returns null when the resolved path escapes the document root, so
 * `../` traversal and absolute-path tricks cannot read outside the bundle.
 */
export function resolveSafePath(root, rawPath) {
  const decoded = safeDecode(rawPath)
  const rel = decoded === '/' || decoded === '' ? '/index.html' : decoded
  const file = resolve(root, `.${rel.startsWith('/') ? rel : `/${rel}`}`)
  const rootWithSep = root.endsWith(sep) ? root : `${root}${sep}`
  if (file !== root && !file.startsWith(rootWithSep)) return null
  return file
}

const server = createServer(async (req, res) => {
  const file = resolveSafePath(ROOT, req.url)
  if (!file) {
    res.writeHead(403, withSecurityHeaders({ 'content-type': 'text/plain; charset=utf-8' }))
    res.end('Forbidden')
    return
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, withSecurityHeaders({ 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }))
    res.end(body)
  } catch {
    res.writeHead(404, withSecurityHeaders({ 'content-type': 'text/plain; charset=utf-8' }))
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

/**
 * Only bind when executed directly. Importing this module from a test must not
 * leave a listening handle behind, otherwise the node --test process never
 * drains its event loop and the run times out.
 */
const invokedDirectly =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) server.listen(port, '127.0.0.1')

export { server }
