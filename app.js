export const SERVICES = [
  { id: 'api', name: 'Core API Gateway', status: 'operational', latencyMs: 42, uptime: '99.98%' },
  { id: 'web', name: 'Web Frontend', status: 'operational', latencyMs: 28, uptime: '99.99%' },
  { id: 'worker', name: 'Background Jobs', status: 'operational', latencyMs: 65, uptime: '99.95%' },
]

export function summarizeStatus(services = SERVICES) {
  const degraded = services.filter((s) => s.status !== 'operational')
  return {
    allOperational: degraded.length === 0,
    degradedCount: degraded.length,
    totalCount: services.length,
  }
}

export function renderDashboard() {
  if (typeof document === 'undefined') return
  const grid = document.getElementById('services-grid')
  const badge = document.getElementById('overall-badge')
  const updated = document.getElementById('last-updated')
  if (!grid || !badge || !updated) return

  const summary = summarizeStatus(SERVICES)
  badge.textContent = summary.allOperational ? 'ALL SYSTEMS OPERATIONAL' : `${summary.degradedCount} SERVICE(S) DEGRADED`

  grid.innerHTML = SERVICES.map(
    (s) => `
      <article class="card">
        <div class="card-top">
          <strong>${s.name}</strong>
          <span class="status-dot" title="${s.status}"></span>
        </div>
        <div class="meta">Latency: ${s.latencyMs} ms · Uptime: ${s.uptime}</div>
      </article>
    `
  ).join('')

  updated.textContent = `Last checked: ${new Date().toLocaleTimeString()}`
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    renderDashboard()
    document.getElementById('refresh-btn')?.addEventListener('click', renderDashboard)
  })
}
