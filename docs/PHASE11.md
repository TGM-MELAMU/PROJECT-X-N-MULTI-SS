# Phase 11 — Future integrations foundation

## Scope and status

Foundation only: preserves the existing demo delivery/payment paths, existing PayFast flow and SMTP outbox. This phase does **not** activate a live courier, external distance API, automatic payouts or a new payment processor.

### Implemented

- `MultiSS\Integrations\ProviderFactory`: explicit server-controlled adapters. Local `demo` distance and demo payments work through the existing contracts, with no implicit fallback to demo when a different provider is selected. Demo adapters are rejected in production. The real PayFast flow remains in `PaymentService` and is not redirected through the demo factory.
- `IntegrationReadiness`: CLI-only, secret-free configuration inventory. States such as `configured_not_live_verified` are **not** claims of connectivity. Missing provider adapters and payouts are explicitly reported.
- `OutboundUrlPolicy`: HTTPS and exact host allowlist validation for **future** outbound adapters (no network calls). A future adapter must also independently secure DNS resolution, redirects, TLS, credentials and response size at the transport layer.
- `RetryPolicy`: retries only appropriate transient responses; non-idempotent writes require an idempotency key. No retry execution here.
- `scripts/phase11_status.php`: review integration configuration safely without printing passwords or API keys.
- `tests/phase11_unit.php`: offline tests for selection, isolation and fail-closed behavior.

### How to validate

From repository root:

```powershell
& 'C:\xampp\php\php.exe' tests\phase11_unit.php
& 'C:\xampp\php\php.exe' scripts\phase11_status.php
& 'C:\xampp\php\php.exe' tests\phase9_10_unit.php
npm.cmd test
npm.cmd run typecheck
```

Use the existing Step 15 smoke tests for PHP HTTP auth/CSRF and Next.js build. No extra SQL migrations or npm dependencies are needed.

### Provider activation checklist (future)

1. Obtain client approval for a named service and its account, fees, webhook contract and data-sharing terms.
2. Implement a concrete adapter that conforms to the existing `DistanceProviderInterface` or payment integration contract. Preserve normalized return types and require provider-specific tests, bounded transport and strong webhook validation.
3. Store credentials in private deployment secrets; do not commit them. Require sandbox testing, replay/idempotency protections and redacted logs.
4. Add explicit wiring/configuration for approved providers; never silently fall back to demo if a live provider is unavailable.
5. Validate integration with test customer/vendor accounts and zero-real-money flows before any release. SMTP delivery, actual payment settlement/refunds and payouts are **not** validated by Phase 11.

### Security and release blockers

The latest production npm audit on the team machine reported 2 critical, 5 high and 2 moderate vulnerabilities (`next-auth`/`@auth/core` among them). This package deliberately does not run `npm audit fix --force` or introduce incompatible major updates. Resolve and retest the dependency tree before deploying publicly; Phases 11 and 12 do not waive security requirements.

Also review old Git history for previously tracked `.env` and rotate any active historic secrets.
