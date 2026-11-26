import { INCIDENTS, filterIncidents, sortIncidents, durationMinutes, isActive } from './incidents.js'
import { escapeHtml, escapeAttr } from './scripts/escape-html.mjs'

export const SERVICES = [
  { id: 'api', name: 'Core API Gateway', status: 'operational', latencyMs: 42, uptime: '99.98%' },
  { id: 'web', name: 'Web Frontend', status: 'operational', latencyMs: 28, uptime: '99.99%' },
  { id: 'worker', name: 'Background Jobs', status: 'operational', latencyMs: 65, uptime: '99.95%' },
]

export const STATUS_LABEL = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
}

export const HEALTH_VERSION = 1

export function summarizeStatus(services = SERVICES) {
  const degraded = services.filter((s) => s.status !== 'operational')
  return {
    allOperational: degraded.length === 0,
    degradedCount: degraded.length,
    totalCount: services.length,
  }
}

/** Overall badge state derived from service array — never stored. */
export function deriveOverallStatus(services = SERVICES) {
  if (services.some((s) => s.status === 'down')) return 'outage'
  if (services.some((s) => s.status !== 'operational')) return 'degraded'
  return 'operational'
}

export function filterServices(services = SERVICES, status = 'all') {
  if (status === 'all') return [...services]
  return services.filter((s) => s.status === status)
}

/** Options for the service filter <select>, derived from the data layer. */
export function serviceOptions(services = SERVICES) {
  return services.map((s) => ({ id: s.id, name: s.name }))
}

/** health.json public contract v1 — additive-only evolution. */
export function buildHealthPayload(services = SERVICES, now = new Date()) {
  const summary = summarizeStatus(services)
  return {
    status: deriveOverallStatus(services),
    version: HEALTH_VERSION,
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      latencyMs: s.latencyMs,
      uptime: s.uptime,
    })),
    checkedAt: now.toISOString(),
    summary: { total: summary.totalCount, degraded: summary.degradedCount, allOperational: summary.allOperational },
  }
}

export function formatDuration(minutes) {
  const value = Number(minutes)
  if (!Number.isFinite(value) || value < 0) return '0m'
  const total = Math.round(value)
  if (total < 60) return `${total}m`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Normalize an uptime value ("99.98%", "99.98", 99.98) to a number in 0..100.
 * Returns null for unusable input so callers can sort/threshold without NaN drift.
 */
export function uptimeToPercent(uptime) {
  if (typeof uptime === 'number') {
    return Number.isFinite(uptime) ? clampPercent(uptime) : null
  }
  if (typeof uptime !== 'string') return null
  const parsed = Number.parseFloat(uptime.replace('%', '').trim())
  return Number.isFinite(parsed) ? clampPercent(parsed) : null
}

function clampPercent(value) {
  return Math.min(100, Math.max(0, value))
}

/** Render a normalized uptime number back to display form, e.g. 99.98 -> "99.98%". */
export function formatUptime(uptime) {
  const percent = uptimeToPercent(uptime)
  if (percent === null) return '—'
  return `${percent.toFixed(2)}%`
}

/** Services below the SLA floor, sorted worst-first. Unknown uptime sorts last. */
export function servicesBelowSla(services = SERVICES, floor = 99.9) {
  return services
    .map((service) => ({ ...service, uptimePercent: uptimeToPercent(service.uptime) }))
    .filter((service) => service.uptimePercent !== null && service.uptimePercent < floor)
    .sort((a, b) => a.uptimePercent - b.uptimePercent)
}

function renderServices(statusFilter) {
  const grid = document.getElementById('services-grid')
  if (!grid) return
  const list = filterServices(SERVICES, statusFilter)
  grid.innerHTML = list.length
    ? list
        .map(
          (s) => `
      <article class="card">
        <div class="card-top">
          <strong>${escapeHtml(s.name)}</strong>
          <span class="status-dot" data-status="${escapeAttr(s.status)}" title="${escapeAttr(STATUS_LABEL[s.status] ?? s.status)}"></span>
        </div>
        <div class="meta">Latency: ${escapeHtml(s.latencyMs)} ms · Uptime: ${escapeHtml(s.uptime)}</div>
      </article>`
        )
        .join('')
    : '<p class="empty">No services match this filter.</p>'
}

function renderIncidents({ severity = 'all', serviceId = 'all' } = {}) {
  const list = document.getElementById('incident-timeline')
  const empty = document.getElementById('incident-empty')
  if (!list) return
  const rows = sortIncidents(filterIncidents(INCIDENTS, { severity, serviceId }))
  list.innerHTML = rows
    .map(
      (i) => `
      <li class="incident" data-severity="${escapeAttr(i.severity)}">
        <div class="incident-top">
          <span class="sev-badge" data-severity="${escapeAttr(i.severity)}">${escapeHtml(i.severity)}</span>
          <span class="incident-title">${escapeHtml(i.title)}</span>
          ${isActive(i) ? '<span class="live">ONGOING</span>' : ''}
        </div>
        <p class="incident-meta">${escapeHtml(i.id)} · ${escapeHtml(i.serviceId)} · ${escapeHtml(formatDuration(durationMinutes(i)))} · ${escapeHtml(new Date(i.startedAt).toLocaleString())}</p>
        <p class="incident-summary">${escapeHtml(i.summary)}</p>
      </li>`
    )
    .join('')
  if (empty) empty.hidden = rows.length > 0
}

function populateServiceFilter() {
  const select = document.getElementById('service-filter')
  if (!select || select.dataset.populated === 'true') return
  for (const option of serviceOptions(SERVICES)) {
    const el = document.createElement('option')
    el.value = option.id
    el.textContent = option.name
    select.append(el)
  }
  select.dataset.populated = 'true'
}

export function renderDashboard(state = { status: 'all', severity: 'all', serviceId: 'all' }) {
  if (typeof document === 'undefined') return
  const badge = document.getElementById('overall-badge')
  const updated = document.getElementById('last-updated')
  if (!badge || !updated) return

  const overall = deriveOverallStatus(SERVICES)
  const summary = summarizeStatus(SERVICES)
  badge.textContent =
    overall === 'operational' ? 'ALL SYSTEMS OPERATIONAL' : `${summary.degradedCount} SERVICE(S) DEGRADED`
  badge.dataset.state = overall === 'operational' ? 'ok' : 'warn'

  renderServices(state.status)
  renderIncidents(state)
  updated.textContent = `Last checked: ${new Date().toLocaleTimeString()}`
}

if (typeof document !== 'undefined') {
  const state = { status: 'all', severity: 'all', serviceId: 'all' }
  document.addEventListener('DOMContentLoaded', () => {
    populateServiceFilter()
    renderDashboard(state)
    document.getElementById('refresh-btn')?.addEventListener('click', () => renderDashboard(state))
    document.querySelectorAll('[data-filter-status]').forEach((btn) =>
      btn.addEventListener('click', () => {
        state.status = btn.dataset.filterStatus
        document.querySelectorAll('[data-filter-status]').forEach((b) => b.classList.toggle('active', b === btn))
        renderDashboard(state)
      })
    )
    document.getElementById('severity-filter')?.addEventListener('change', (e) => {
      state.severity = e.target.value
      renderDashboard(state)
    })
    document.getElementById('service-filter')?.addEventListener('change', (e) => {
      state.serviceId = e.target.value
      renderDashboard(state)
    })
  })
}
