# MultiSS Phases 9 + 10 — Vendor marketplace and notifications (PHP API)

## Scope

Phase 9 adds vendor applications, admin review, owner membership provisioning, vendor product/inventory listings, scoped vendor order handling, and read-only earnings/payout-split reporting. Existing Phase 8 admin product approval, vendor status controls and vendor product editing remain in use. **Bank payouts, gateway settlement and a Next.js vendor portal UI are not implemented by this backend package.**

Phase 10 adds in-app notifications, per-event email preferences, admin/vendor/customer events and a retryable SMTP mail outbox. Email verification and password reset continue using the existing `EmailService` methods. All notification bodies use fixed templates, not arbitrary HTML submitted by clients.

## API endpoints

All endpoints require the existing PHP cookie session. Writes require `X-CSRF-Token` from `GET /api/v1/csrf-token`. Admin endpoints require the `admin` role. Vendor-owned data requires active vendor membership; earnings, payout details and status changes also require an owner/manager role.

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/v1/vendor/applications` | Applicant listing / submission |
| GET | `/api/v1/admin/vendor-applications` | Admin list (`status`, `page`, `limit`) |
| PATCH | `/api/v1/admin/vendor-applications/{id}/review` | Review (`status`, `review_notes`) |
| GET | `/api/v1/vendor/me` | My vendor memberships |
| GET | `/api/v1/vendor/{vendorId}/products` | My vendor product catalogue |
| GET | `/api/v1/vendor/{vendorId}/inventory` | Vendor stock levels |
| GET | `/api/v1/vendor/{vendorId}/orders` | Vendor orders |
| GET | `/api/v1/vendor/{vendorId}/orders/{orderId}` | Scoped vendor order detail |
| PATCH | `/api/v1/vendor/{vendorId}/orders/{orderId}/status` | `new → confirmed → processing` only, paid parent order required |
| GET | `/api/v1/vendor/{vendorId}/earnings` | Order-based estimated earnings |
| GET | `/api/v1/vendor/{vendorId}/payouts` | Read-only gateway payment split ledger |
| GET | `/api/v1/notifications` | Own notifications |
| PATCH | `/api/v1/notifications/{id}/read` | Mark own notification read |
| GET/PUT | `/api/v1/notification-preferences` | Own email preferences; JSON `{ "event_type": "inventory_low_stock", "email_enabled": false }` |
| GET | `/api/v1/admin/notifications/queue` | Admin outbox aggregate counts |

### Application submission example

`POST /api/v1/vendor/applications`, JSON:

```json
{
  "institution_company_name": "Example Supplies Ltd",
  "vat_number": "4123456789",
  "email_address": "business@example.org",
  "primary_contact_number": "0123456789",
  "billing_address_line_1": "1 Main Street",
  "billing_city": "Pretoria",
  "billing_province": "Gauteng",
  "billing_postal_code": "0001"
}
```

Users must have verified email. The server rejects blocked VAT numbers and existing pending/approved applications. Approval creates an active third-party vendor, a vendor owner membership and grants the user the `vendor` role in a database transaction. Other statuses do not provision a vendor. Rejection requires review notes.

### Admin review example

`PATCH /api/v1/admin/vendor-applications/123/review` with `{ "status": "approved", "review_notes": "Verified documents" }`.

## Mail queue

Run migrations before using the Phase 10 APIs:

```powershell
npm.cmd run db:migrate
& 'C:\xampp\php\php.exe' scripts\phase9_10_verify.php
```

SMTP requires `MAIL_HOST`, `MAIL_FROM_ADDRESS` and optionally `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_PORT`, `MAIL_ENCRYPTION`, `MAIL_FROM_NAME`, plus `FRONTEND_URL` for existing auth emails. Set these **only** in the local `.env`, never in Git. If SMTP is not configured, notifications persist and the worker refuses to consume the queue.

```powershell
& 'C:\xampp\php\php.exe' scripts\process_mail_queue.php --dry-run
& 'C:\xampp\php\php.exe' scripts\process_mail_queue.php
```

Schedule the normal command through Windows Task Scheduler (e.g. every 5 minutes) once an SMTP account has been configured and tested. Do not expose this CLI script over HTTP. Processing claims up to 20 rows with row locks; retries apply increasing delays up to five attempts. **Delivery is at-least-once**, so an interrupted worker may repeat a message; queued messages do not prove delivery. Failed messages require an administrator-run reconciliation or explicit requeue process (not exposed to web clients).

## Guardrails / next UI work

- Product creation/update still goes through `POST /api/v1/vendor/products` and `PATCH /api/v1/vendor/products/{id}`. Admin reviews use existing Phase 8 routes.
- No payment execution or money movement is triggered by the new finance endpoints.
- Low-stock alerts are emitted when an **admin manual inventory adjustment** crosses the reorder threshold downward; other inventory mutation paths are not yet hooked to alerts.
- Customer email notifications currently cover PHP backend order creation/cancellation and vendor order-status changes. Separate Next.js/Auth.js transactions are **not** routed through these PHP events automatically. Those integrations must be completed when unifying frontend/backend workflows.
- The `notification_preferences` setting affects future queued emails, not messages already enqueued. In-app notifications remain available.
- Existing committed `.env` history is not removed by `git rm --cached`; rotate any previously exposed credentials.

## Validation

```powershell
& 'C:\xampp\php\php.exe' tests\phase9_10_unit.php
& 'C:\xampp\php\php.exe' scripts\phase9_10_verify.php
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```
