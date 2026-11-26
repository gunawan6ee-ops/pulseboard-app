import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  SERVICES,
  HEALTH_VERSION,
  deriveOverallStatus,
  serviceOptions,
  buildHealthPayload,
  formatDuration,
} from '../app.js'
import { serializeHealth } from '../scripts/build-health.mjs'

const HEALTH_PATH = new URL('../health.json', import.meta.url)

test('deriveOverallStatus maps service state to the status enum', () => {
  assert.equal(deriveOverallStatus(SERVICES), 'operational')
  assert.equal(deriveOverallStatus([{ status: 'degraded' }]), 'degraded')
  assert.equal(deriveOverallStatus([{ status: 'degraded' }, { status: 'down' }]), 'outage')
})

test('buildHealthPayload follows the versioned v1 contract', () => {
  const payload = buildHealthPayload(SERVICES, new Date('2026-11-26T00:00:00Z'))
  assert.equal(payload.version, HEALTH_VERSION)
  assert.ok(['operational', 'degraded', 'outage'].includes(payload.status))
  assert.ok(Array.isArray(payload.services))
  assert.ok(!Number.isNaN(Date.parse(payload.checkedAt)))
  for (const svc of payload.services) {
    assert.ok(svc.id && svc.name && svc.status)
    assert.equal(typeof svc.latencyMs, 'number')
    assert.ok(svc.uptime)
  }
})

test('serviceOptions exposes id and name for every service', () => {
  const options = serviceOptions(SERVICES)
  assert.equal(options.length, SERVICES.length)
  assert.deepEqual(options[0], { id: SERVICES[0].id, name: SERVICES[0].name })
})

test('committed health.json matches the live SERVICES source', async () => {
  const raw = await readFile(HEALTH_PATH, 'utf8')
  const committed = JSON.parse(raw)
  const expected = JSON.parse(serializeHealth(buildHealthPayload(SERVICES, new Date(committed.checkedAt))))
  assert.deepEqual(committed, expected)
})

test('committed health.json has no degraded or down service', async () => {
  const health = JSON.parse(await readFile(HEALTH_PATH, 'utf8'))
  assert.equal(health.status, 'operational')
  assert.ok(health.services.every((s) => s.status === 'operational'))
})

test('formatDuration guards non-finite and negative input', () => {
  assert.equal(formatDuration(0), '0m')
  assert.equal(formatDuration(-5), '0m')
  assert.equal(formatDuration(Number.NaN), '0m')
  assert.equal(formatDuration(60), '1h')
  assert.equal(formatDuration(125), '2h 5m')
})
