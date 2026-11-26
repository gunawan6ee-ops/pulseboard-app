// Incident domain model — Sprint 2 (DARKOWL-2631 design contract)
// Pure functions only: no DOM access, fully unit-testable under node --test.

export const SEVERITIES = ['critical', 'major', 'minor', 'maintenance']

export const SEVERITY_RANK = { critical: 0, major: 1, minor: 2, maintenance: 3 }

export const INCIDENTS = [
  {
    id: 'INC-1042',
    serviceId: 'api',
    severity: 'major',
    title: 'Elevated 5xx rate on Core API Gateway',
    startedAt: '2026-11-24T09:12:00Z',
    resolvedAt: '2026-11-24T10:04:00Z',
    summary: 'Upstream connection pool exhaustion caused 4.1% of requests to fail.',
  },
  {
    id: 'INC-1039',
    serviceId: 'worker',
    severity: 'minor',
    title: 'Background job backlog above threshold',
    startedAt: '2026-11-22T18:40:00Z',
    resolvedAt: '2026-11-22T19:15:00Z',
    summary: 'Queue depth peaked at 12k jobs after a batch import; drained by autoscaling.',
  },
  {
    id: 'INC-1031',
    serviceId: 'web',
    severity: 'critical',
    title: 'Web Frontend edge outage (EU region)',
    startedAt: '2026-11-18T02:05:00Z',
    resolvedAt: '2026-11-18T02:58:00Z',
    summary: 'Edge PoP failover loop; traffic rerouted to secondary region.',
  },
  {
    id: 'INC-1024',
    serviceId: 'api',
    severity: 'maintenance',
    title: 'Scheduled database failover drill',
    startedAt: '2026-11-12T23:00:00Z',
    resolvedAt: '2026-11-12T23:35:00Z',
    summary: 'Planned drill, no customer impact observed.',
  },
]

export function isActive(incident) {
  return !incident.resolvedAt
}

export function durationMinutes(incident) {
  const start = Date.parse(incident.startedAt)
  const end = incident.resolvedAt ? Date.parse(incident.resolvedAt) : Date.now()
  if (Number.isNaN(start) || Number.isNaN(end)) return 0
  return Math.max(0, Math.round((end - start) / 60000))
}

export function filterIncidents(incidents = INCIDENTS, { severity = 'all', serviceId = 'all' } = {}) {
  return incidents.filter((incident) => {
    const severityOk = severity === 'all' || incident.severity === severity
    const serviceOk = serviceId === 'all' || incident.serviceId === serviceId
    return severityOk && serviceOk
  })
}

export function sortIncidents(incidents = INCIDENTS) {
  return [...incidents].sort((a, b) => {
    const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (rank !== 0) return rank
    return Date.parse(b.startedAt) - Date.parse(a.startedAt)
  })
}

export function incidentStats(incidents = INCIDENTS) {
  const bySeverity = { critical: 0, major: 0, minor: 0, maintenance: 0 }
  let active = 0
  for (const incident of incidents) {
    if (bySeverity[incident.severity] !== undefined) bySeverity[incident.severity] += 1
    if (isActive(incident)) active += 1
  }
  return { total: incidents.length, active, bySeverity }
}
