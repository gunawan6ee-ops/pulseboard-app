import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INCIDENTS,
  SEVERITIES,
  filterIncidents,
  sortIncidents,
  durationMinutes,
  isActive,
} from '../incidents.js'
import { filterServices, buildHealthPayload, formatDuration, SERVICES } from '../app.js'

test('every incident uses a known severity and has required fields', () => {
  for (const incident of INCIDENTS) {
    assert.ok(SEVERITIES.includes(incident.severity), `bad severity: ${incident.severity}`)
    assert.ok(incident.id && incident.title && incident.startedAt)
    assert.ok(!Number.isNaN(Date.parse(incident.startedAt)))
  }
})

test('filterIncidents narrows by severity', () => {
  const critical = filterIncidents(INCIDENTS, { severity: 'critical' })
  assert.equal(critical.length, 1)
  assert.equal(critical[0].id, 'INC-1031')
})

test('filterIncidents narrows by serviceId', () => {
  const api = filterIncidents(INCIDENTS, { serviceId: 'api' })
  assert.equal(api.length, 2)
  assert.ok(api.every((i) => i.serviceId === 'api'))
})

test('filterIncidents returns all when filters are "all"', () => {
  assert.equal(filterIncidents(INCIDENTS, { severity: 'all', serviceId: 'all' }).length, INCIDENTS.length)
})

test('sortIncidents puts critical first and does not mutate source', () => {
  const sorted = sortIncidents(INCIDENTS)
  assert.equal(sorted[0].severity, 'critical')
  assert.equal(INCIDENTS[0].id, 'INC-1042')
})

test('durationMinutes computes resolved span and isActive flags ongoing', () => {
  assert.equal(durationMinutes(INCIDENTS[0]), 52)
  assert.equal(isActive(INCIDENTS[0]), false)
  assert.equal(isActive({ startedAt: '2026-11-26T00:00:00Z' }), true)
})

test('durationMinutes returns 0 for invalid dates', () => {
  assert.equal(durationMinutes({ startedAt: 'nope', resolvedAt: 'nope' }), 0)
})

test('filterServices filters by status', () => {
  assert.equal(filterServices(SERVICES, 'all').length, 3)
  assert.equal(filterServices(SERVICES, 'down').length, 0)
})

test('buildHealthPayload mirrors service state', () => {
  const payload = buildHealthPayload(SERVICES, new Date('2026-11-26T00:00:00Z'))
  assert.equal(payload.status, 'operational')
  assert.equal(payload.summary.total, 3)
  assert.equal(payload.checks.length, 3)
  assert.equal(payload.generatedAt, '2026-11-26T00:00:00.000Z')
})

test('formatDuration renders minutes and hours', () => {
  assert.equal(formatDuration(52), '52m')
  assert.equal(formatDuration(60), '1h')
  assert.equal(formatDuration(95), '1h 35m')
})
