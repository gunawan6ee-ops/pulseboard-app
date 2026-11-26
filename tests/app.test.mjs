import test from 'node:test'
import assert from 'node:assert/strict'
import { SERVICES, summarizeStatus } from '../app.js'

test('summarizeStatus reports all operational when all services are healthy', () => {
  const summary = summarizeStatus(SERVICES)
  assert.equal(summary.allOperational, true)
  assert.equal(summary.degradedCount, 0)
  assert.equal(summary.totalCount, 3)
})

test('summarizeStatus detects degraded services', () => {
  const summary = summarizeStatus([
    { id: 'api', name: 'API', status: 'down', latencyMs: 0, uptime: '95%' },
  ])
  assert.equal(summary.allOperational, false)
  assert.equal(summary.degradedCount, 1)
})
