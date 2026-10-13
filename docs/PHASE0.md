# Phase 0: decisions, changes and open items

## Decisions
- Stack: Next.js 15 + TypeScript + Tailwind + Prisma (MySQL 8) + Auth.js credentials, one codebase.
- Existing MySQL 8 schema is kept; SQL migrations (not Prisma Migrate) own schema changes.
- Guests browse; cart, checkout and account require login (cart is DB-backed, `carts.user_id` stays NOT NULL).
- All prices VAT-inclusive; VAT = total × 15 / 115 (`VAT_RATE_PERCENT` env var).
- Password reset uses `user_tokens` (SHA-256 hashed tokens, short expiry, single use).

## What migration 001 changes
| Change | Why |
|---|---|
| `user_tokens` table | Password reset / email verification |
| `orders.vat_amount`, `orders.shipping_amount` | VAT breakdown, delivery cost later |
| `order_status` + `pending_payment`, `payment_failed` | Order exists before PayFast redirect |
| `product_variants.compare_at_price` | SALE badge, Special Offers |
| `products.is_featured` | Featured products on home page |
| `newsletter_subscribers` | Footer signup |
| FKs on `products.vendor_id`, `payments.order_id` | Missing in the original dump |
| `roles`: `customer`, `vendor` | Only `admin` existed |

**Not yet tested:** there is no MySQL in the build workspace, so run `npm run db:migrate`
against a COPY of your dev database first and report any error.

## Known gaps / leave-alone items
- The dump's `Test Laboratory Centrifuge` (product 1) remains; delete it or ignore it.
- `prisma/schema.prisma` was hand-written from the dump and passes the Prisma 6.19 schema validator,
  but `prisma generate` could not run in the build workspace (engine download blocked). Run
  `npm run db:generate && npm run typecheck` locally and fix anything it reports.
- No banners table (hero is static for now). No delivery/shipment tables. No structured spec filters.
- Seed products, prices and stock are placeholders. Product images are not seeded.
- Seed MultiSS vendor uses a placeholder VAT number: replace it.

## Re-scoped plan for 14 October (about 4 days)
Priority is one working happy path: browse → register/login → cart → pay (PayFast sandbox) → order confirmation.

| Day | Target |
|---|---|
| Sun 11 Oct | App shell + design tokens, home page (Prototype 2), shop/category listing, product page |
| Mon 12 Oct | Register / login / logout, forgot + reset password, route guards, DB cart |
| Tue 13 Oct | Checkout with address + VAT breakdown, PayFast sandbox + notify handler, order confirmation, order history |
| Wed 14 Oct | Minimal admin (products, stock, order status), staging deploy, QA fixes |

Cut or fake for the deadline: delivery integration and tracking, vendor portal, spec-based filters,
image upload (use image URLs), email sending (log reset links to the console unless a provider is ready),
full POPIA/legal pages (placeholder text).

## Needed from client / team
Logo and brand assets, real product data and photos, legal text, PayFast merchant account,
decision on delivery provider, and who owns each phase now that the PHP backend task is gone.
