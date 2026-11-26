import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * DOM smoke test — proves the view layer actually mounts.
 * Uses a hand-rolled minimal DOM shim so the suite stays dependency-free
 * (no jsdom), while still exercising renderDashboard end to end.
 */

function makeElement(id = '') {
  const el = {
    id,
    innerHTML: '',
    textContent: '',
    hidden: false,
    dataset: {},
    children: [],
    listeners: {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c) },
      remove(c) { this._set.delete(c) },
      toggle(c, on) { on ? this._set.add(c) : this._set.delete(c) },
      contains(c) { return this._set.has(c) },
    },
    append(child) { this.children.push(child) },
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn) },
    fire(type, event = {}) { for (const fn of this.listeners[type] ?? []) fn(event) },
  }
  return el
}

function installDom() {
  const ids = [
    'overall-badge',
    'last-updated',
    'services-grid',
    'incident-timeline',
    'incident-empty',
    'severity-filter',
    'service-filter',
    'refresh-btn',
  ]
  const store = new Map(ids.map((id) => [id, makeElement(id)]))
  const chips = ['all', 'operational', 'degraded', 'down'].map((s) => {
    const el = makeElement()
    el.dataset.filterStatus = s
    return el
  })
  const domReady = []

  globalThis.document = {
    getElementById: (id) => store.get(id) ?? null,
    createElement: () => makeElement(),
    querySelectorAll: (sel) => (sel === '[data-filter-status]' ? chips : []),
    addEventListener: (type, fn) => { if (type === 'DOMContentLoaded') domReady.push(fn) },
  }

  return { store, chips, ready: () => domReady.forEach((fn) => fn()) }
}

test('renderDashboard mounts services, incidents and the derived badge', async () => {
  const dom = installDom()
  const { renderDashboard } = await import('../app.js')
  dom.ready()

  const grid = dom.store.get('services-grid')
  const timeline = dom.store.get('incident-timeline')
  const badge = dom.store.get('overall-badge')

  assert.equal(grid.innerHTML.includes('Core API Gateway'), true, 'services must render')
  assert.equal(timeline.innerHTML.includes('INC-1031'), true, 'incidents must render')
  assert.equal(timeline.innerHTML.includes('sev-badge'), true, 'severity badge class must be used')
  assert.equal(badge.textContent, 'ALL SYSTEMS OPERATIONAL')
  assert.equal(badge.dataset.state, 'ok')
  assert.equal(dom.store.get('incident-empty').hidden, true)

  // Service filter options are derived from the data layer, not hardcoded.
  const options = dom.store.get('service-filter').children
  assert.equal(options.length, 3)
  assert.deepEqual(options.map((o) => o.value), ['api', 'web', 'worker'])

  // Severity filter narrows the timeline and reveals the empty state.
  const severity = dom.store.get('severity-filter')
  severity.fire('change', { target: { value: 'critical' } })
  assert.equal(timeline.innerHTML.includes('INC-1031'), true)
  assert.equal(timeline.innerHTML.includes('INC-1042'), false)

  severity.fire('change', { target: { value: 'maintenance' } })
  assert.equal(timeline.innerHTML.includes('INC-1024'), true)
  assert.equal(timeline.innerHTML.includes('INC-1031'), false)

  // Status chip filter narrows the service grid.
  dom.chips[3].fire('click')
  assert.equal(grid.innerHTML.includes('No services match this filter.'), true)
  dom.chips[0].fire('click')
  assert.equal(grid.innerHTML.includes('Core API Gateway'), true)

  // Refresh re-renders without throwing.
  dom.store.get('refresh-btn').fire('click')
  assert.equal(badge.textContent, 'ALL SYSTEMS OPERATIONAL')

  delete globalThis.document
  assert.equal(renderDashboard({}), undefined)
})

test('renderDashboard is a no-op without a document', async () => {
  delete globalThis.document
  const { renderDashboard } = await import('../app.js')
  assert.equal(renderDashboard(), undefined)
})
