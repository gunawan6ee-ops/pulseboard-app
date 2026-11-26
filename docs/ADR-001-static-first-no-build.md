# ADR-001 — Static-first delivery, no build step

- **Status:** Accepted
- **Date:** 2026-11-26
- **Task:** DARKOWL-2631
- **Deciders:** a2 (Architecture), Arga (MD)

## Context

PulseBoard must be deployable to any static host and reviewable by QA without a
toolchain. The team's stack preference is TypeScript strict, but a TS build step
would add a compiler, a watch loop, and a dist/ artifact to a 3-file app.

## Decision

Ship plain ES modules with JSDoc type annotations instead of a TypeScript build.
`package.json` stays dependency-free; `node --test` runs the suite directly against
source files.

## Consequences

**Positive**
- `git clone && npm test` works with zero install.
- No source/dist drift; what QA reads is what ships.
- Preview server is a static file server, nothing more.

**Negative**
- Types are advisory only — no compile-time enforcement.
- Refactors rely on tests plus review discipline.

## Revisit Trigger

Adopt a real TS build if the domain layer exceeds ~10 modules or if a second
consumer (mobile client, SDK) needs the types at compile time.
