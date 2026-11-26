import { INCIDENTS, filterIncidents, sortIncidents, durationMinutes, isActive } from './incidents.js'

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

export function summarizeStatus(services = SERVICES) {
  const degraded = services.filter((s) => s.status !== 'operational')
  return {
    allOperational: degraded.length === 0,
    degradedCount: degraded.length,
    totalCount: services.length,
  }
}

export function filterServices(services = SERVICES, status = 'all') {
  if (status === 'all') return [...services]
  return services.filter((s) => s.status === status)
}

export function buildHealthPayload(services = SERVICES, now = new Date()) {
  const summary = summarizeStatus(services)
  return {
    status: summary.allOperational ? 'operational' : 'degraded',
    generatedAt: now.toISOString(),
    version: '1.0.0',
    checks: services.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      latencyMs: s.latencyMs,
      uptime: s.uptime,
    })),
    summary: { total: summary.totalCount, degraded: summary.degradedCount, allOperational: summary.allOperational },
  }
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
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
          <strong>${s.name}</strong>
          <span class="status-dot" data-status="${s.status}" title="${STATUS_LABEL[s.status] ?? s.status}"></span>
        </div>
        <div class="meta">Latency: ${s.latencyMs} ms · Uptime: ${s.uptime}</div>
      </article>`
        )
        .join('')
    : '<p class="empty">No services match this filter.</p>'
}

function renderIncidents({ severity = 'all', serviceId = 'all' } = {}) {
  const list = document.getElementById('incident-list')
  if (!list) return
  const rows = sortIncidents(filterIncidents(INCIDENTS, { severity, serviceId }))
  list.innerHTML = rows.length
    ? rows
        .map(
          (i) => `
      <li class="incident" data-severity="${i.severity}">
        <div class="incident-head">
          <span class="sev sev-${i.severity}">${i.severity}</span>
          <strong>${i.title}</strong>
          ${isActive(i) ? '<span class="live">ONGOING</span>' : ''}
        </div>
        <p class="meta">${i.id} · ${i.serviceId} · ${formatDuration(durationMinutes(i))} · ${new Date(i.startedAt).toLocaleString()}</p>
        <p class="incident-summary">${i.summary}</p>
      </li>`
        )
        .join('')
    : '<li class="empty">No incidents match this filter.</li>'
}

export function renderDashboard(state = { status: 'all', severity: 'all', serviceId: 'all' }) {
  if (typeof document === 'undefined') return
  const badge = document.getElementById('overall-badge')
  const updated = document.getElementById('last-updated')
  if (!badge || !updated) return

  const summary = summarizeStatus(SERVICES)
  badge.textContent = summary.allOperational
    ? 'ALL SYSTEMS OPERATIONAL'
    : `${summary.degradedCount} SERVICE(S) DEGRADED`
  badge.dataset.state = summary.allOperational ? 'ok' : 'warn'

  renderServices(state.status)
  renderIncidents(state)
  updated.textContent = `Last checked: ${new Date().toLocaleTimeString()}`
}

if (typeof document !== 'undefined') {
  const state = { status: 'all', severity: 'all', serviceId: 'all' }
  document.addEventListener('DOMContentLoaded', () => {
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
