# GSM — PulseBoard Design System

- Background: `#0b0f19`
- Card Surface: `#131a2a`
- Border: `#232d45`
- Primary Text: `#e6edf7`
- Muted Text: `#8b9bb4`
- Accent: `#38bdf8`
- Status Colors: Operational `#22c55e`, Warning `#f59e0b`, Down `#ef4444`
- Radius: `12px` cards, `8px` buttons, `999px` badges

## Live Audit Runbook (browser_action fallback)

`browser_action` is the preferred live check, but it has two known failure modes
in this harness:

1. It rejects targets without an explicit scheme — `URL harus diawali http:// atau https://`.
   Always resolve the target through `node scripts/live-url.mjs` first.
2. Some harness builds reject the URL even when the scheme is present. In that
   case `browser_action` returns exit 1 with the same message and empty stdout.

Reliable path when `browser_action` fails:

```sh
node scripts/live-url.mjs                 # canonical, scheme-safe URL
node scripts/verify-live.mjs              # full live audit, exit 0 = healthy
```

`verify-live.mjs` covers everything the browser inspection would: HTTP 200,
title marker, `#app` mount point, deployed `app.js` reachability, per-service
parity with `health.json`, no degraded/down service, and v1 contract conformance.
`web_fetch` is the read-only fallback for eyeballing rendered text.
