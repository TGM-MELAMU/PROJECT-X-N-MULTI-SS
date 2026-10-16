# Phase 12 — Security Baseline

## Scope

Production npm dependencies, assessed before Phase 12 changes.
This report is a baseline, not evidence of remediation.

Source commit: d6e51b66bf06162e17866adacd3d621d3fb6fe9d
Audit captured: 2026-10-16 12:47:07 +02:00

## Vulnerability totals

- Critical: 2
- High: 5
- Moderate: 2
- Low: 0
- Total: 9

## Affected packages

| Package | Severity | Direct dependency | Suggested remediation |
|---|---|---|---|
| @auth/core | critical | False | Candidate: 5.0.0-beta.32 |
| @prisma/adapter-mariadb | moderate | True | Candidate: 7.10.1 (major change) |
| @prisma/config | high | False | Fix candidate available |
| deepmerge-ts | high | False | Fix candidate available |
| mariadb | high | False | Candidate: 7.10.1 (major change) |
| next | moderate | True | Candidate: 16.4.2 (major change) |
| next-auth | critical | True | Candidate: 5.0.0-beta.32 |
| postcss | high | False | Candidate: 16.4.2 (major change) |
| prisma | high | True | Fix candidate available |

## Release requirements

- Investigate and remediate actionable vulnerability findings.
- Re-run dependency audit after any changes.
- Run frontend unit tests, TypeScript checks and production build.
- Run PHP regression and integration tests.
- Verify authentication and role separation.
- Verify payment, checkout and refund controls using safe test cases.
- Review deployment secrets and hosting configuration.

No dependency changes were made by this baseline.
