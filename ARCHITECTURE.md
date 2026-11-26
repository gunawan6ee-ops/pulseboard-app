# ARCHITECTURE — PulseBoard Status

**Task:** DARKOWL-2631 · Arsitektur & Desain
**Owner:** a2 (Architecture & Design) · **Supervisor:** Arga (MD, L1)
**Status:** Design baseline — Sprint 1 shipped, Sprint 2 designed here

## 1. Design Goals

| Goal | Constraint | Decision |
| --- | --- | --- |
| Zero-build deploy | No bundler, no framework | Native ES modules, static hosting |
| Testable core | `node --test` must run headless | Pure functions separated from DOM layer |
| Fast first paint | < 50 KB total payload | No runtime deps, CSS-only visuals |
| Machine-readable health | External monitors need JSON | Static `health.json` contract |

## 2. Layered Architecture

```
┌──────────────────────────────────────────────┐
│ Presentation   index.html · styles.css       │  DOM only, no logic
├──────────────────────────────────────────────┤
│ View binding   app.js (renderDashboard)      │  guarded by typeof document
├──────────────────────────────────────────────┤
│ Domain         app.js (summarizeStatus)      │  pure, unit-tested
│                incidents.js (filterIncidents)│
├──────────────────────────────────────────────┤
│ Data           SERVICES · INCIDENTS (static) │  frozen module constants
│                health.json (public contract) │
└──────────────────────────────────────────────┘
```

**Rule:** the domain layer never imports the DOM. Every exported function must be
callable from `node --test` with zero globals. This is what keeps the suite green
without jsdom.

## 3. Module Contracts

### `app.js`
- `SERVICES: ReadonlyArray<Service>` — `{ id, name, status, latencyMs, uptime }`
- `summarizeStatus(services?) → { allOperational, degradedCount, totalCount }`
- `renderDashboard()` — no-op when `document` is undefined

### `incidents.js`
- `INCIDENTS: ReadonlyArray<Incident>` — `{ id, serviceId, severity, title, startedAt, resolvedAt|null }`
- `filterIncidents(incidents, { severity, open }) → Incident[]`
- `incidentDurationMinutes(incident) → number|null`

### `health.json` (public contract, versioned)
```json
{ "status": "operational", "version": 1, "services": [...], "checkedAt": "<ISO-8601>" }
```
`status` enum: `operational | degraded | outage`. Consumers must tolerate unknown
fields (additive-only evolution).

## 4. Status Model

`operational` → `degraded` → `outage`. Severity of an incident maps 1:1 to the
service status it induces. The overall badge is derived, never stored — single
source of truth is the `SERVICES` array.

## 5. Accessibility & Design Tokens

All colors come from `GSM.md` tokens exposed as CSS custom properties. Status is
never encoded by color alone: each badge carries a text label, and the status dot
keeps a `title` attribute. Filter controls are real `<button>` elements with
`aria-pressed`.

## 6. Non-Goals

- No backend, no auth, no persistence (Sprint 3 candidate).
- No client-side routing.
- No third-party analytics.

## 7. Verification

`npm test` runs `node --test tests/*.test.mjs`. Coverage targets the domain layer
only; the DOM layer is verified manually via the preview port (4889).
