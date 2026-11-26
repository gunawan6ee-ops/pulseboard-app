import test from 'node:test'
import assert from 'node:assert/strict'
import { uptimeToPercent, formatUptime, servicesBelowSla, SERVICES } from '../app.js'

test('uptimeToPercent parses percent strings, bare strings and numbers', () => {
  assert.equal(uptimeToPercent('99.98%'), 99.98)
  assert.equal(uptimeToPercent('99.98'), 99.98)
  assert.equal(uptimeToPercent(99.98), 99.98)
  assert.equal(uptimeToPercent(' 95.5 % '), 95.5)
})

test('uptimeToPercent clamps out-of-range values into 0..100', () => {
  assert.equal(uptimeToPercent(120), 100)
  assert.equal(uptimeToPercent(-4), 0)
})

test('uptimeToPercent returns null for unusable input', () => {
  assert.equal(uptimeToPercent('n/a'), null)
  assert.equal(uptimeToPercent(''), null)
  assert.equal(uptimeToPercent(null), null)
  assert.equal(uptimeToPercent(undefined), null)
  assert.equal(uptimeToPercent(NaN), null)
  assert.equal(uptimeToPercent(Infinity), null)
})

test('formatUptime renders two decimals and an em dash fallback', () => {
  assert.equal(formatUptime('99.9%'), '99.90%')
  assert.equal(formatUptime(100), '100.00%')
  assert.equal(formatUptime('n/a'), '—')
})

test('servicesBelowSla returns nothing when every service clears the floor', () => {
  assert.deepEqual(servicesBelowSla(SERVICES, 99.9), [])
})

test('servicesBelowSla sorts worst-first and skips unknown uptime', () => {
  const services = [
    { id: 'a', name: 'A', status: 'operational', latencyMs: 10, uptime: '99.50%' },
    { id: 'b', name: 'B', status: 'degraded', latencyMs: 10, uptime: '97.10%' },
    { id: 'c', name: 'C', status: 'operational', latencyMs: 10, uptime: 'n/a' },
    { id: 'd', name: 'D', status: 'operational', latencyMs: 10, uptime: '99.99%' },
  ]
  const result = servicesBelowSla(services, 99.9)
  assert.deepEqual(result.map((s) => s.id), ['b', 'a'])
  assert.equal(result[0].uptimePercent, 97.1)
})

test('servicesBelowSla does not mutate the source array', () => {
  const services = [{ id: 'a', name: 'A', status: 'operational', latencyMs: 1, uptime: '90%' }]
  servicesBelowSla(services, 99.9)
  assert.equal(services[0].uptimePercent, undefined)
})
