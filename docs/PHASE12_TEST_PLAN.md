# MultiSS Phase 12 — Testing and Release Plan

## Baseline

- Phases 1–11 merged to main.
- Phase 12 security updates are on phase-12-hardening.
- Latest local npm production audit: 0 reported vulnerabilities.
- Prisma 6.19.3 retained.
- Next.js 15.5.28 retained.
- MariaDB connector 3.5.4 and deepmerge-ts 8.0.2 validated.

## Already completed locally

- Frontend unit tests: 74 passing.
- Phase 11 PHP tests: 32 assertions passing.
- Phase 9–10 PHP tests: 126 assertions passing.
- TypeScript check passed.
- Prisma validation and client generation passed.
- Local production build passed.
- Database catalogue checked: 6,301 sellable products.
- Existing production npm dependency audit: 0 findings.

## GitHub CI — Phase 12.2A

Added automated checks for:
- Clean dependency installation from package-lock.json.
- Prisma schema validation and client generation.
- Frontend unit tests and TypeScript.
- Production npm dependency audit.
- PHP syntax and Phase 9–11 regression tests.

The placeholder DATABASE_URL in CI is not a real credential.
The initial CI checks must not connect to a production database.

CI validation status: Pending first GitHub Actions run.

## Remaining application tests

### Authentication
- Customer registration, login and logout.
- Session expiration and protected-route redirects.
- Password reset and invalid token handling.
- Cross-user account access restrictions.

### Administration and vendors
- Administrator-only endpoints.
- Vendor application submission and approval.
- Vendor ownership isolation.
- Product and inventory authorization.

### Checkout and payments
- Cart and checkout creation.
- Stock constraints and order transitions.
- Payment notification authenticity and idempotency.
- Failed payment and cancellation.
- Refund and duplicate-request protections.
- Sandbox-only payment validation.

### Delivery and notifications
- Delivery and collection quotes.
- Unsupported provider configuration failures.
- Email queue dry-run and notification permissions.
- No live integrations without approved credentials.

## Remaining release gates

- Test authenticated workflows with isolated fixture accounts.
- Run HTTP integration tests with an isolated database.
- Add database-backed CI and automated build validation.
- Audit Composer/PHP dependencies.
- Review environment secrets and deployment configuration.
- Verify clean deployment and production build.
- Complete hosting documentation and user manual.
- Complete the final presentation and release checklist.

A successful npm audit alone is not release approval.
Do not use live customer data, production payments, or real email
delivery for automated development tests.
