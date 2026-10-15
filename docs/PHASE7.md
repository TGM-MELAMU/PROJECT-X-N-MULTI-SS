# Phase 7: Hardening and QA

## What is in place

| Requirement | Where | Notes |
|---|---|---|
| Input validation | `src/lib/auth/schemas.ts`, `src/lib/admin/validation.ts`, zod schemas in `src/app/actions/*` | Cart quantity is now validated with a schema (`updateSchema`). Anything not a whole number is ignored, a number above the maximum is lowered to it. |
| Rate limiting | `src/lib/auth/rate-limit.ts` | Login (per address + email and per address), register, forgot and reset password, newsletter, cart changes, order placing, PayFast notification route. In memory, per server process: fine for the single-process launch in `docs/DEPLOY.md`, move to the database or Redis before running several processes. |
| Security headers | `src/lib/security-headers.ts`, used by `next.config.ts` | CSP, HSTS (production only), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP. Private pages also send `X-Robots-Tag: noindex`. `script-src` still needs `'unsafe-inline'` for Next.js page data; a per-request nonce would remove it but makes every page dynamic. |
| Accessibility | `npm run a11y` (`scripts/a11y-check.cjs`) | axe-core, WCAG 2.1 A/AA, desktop and phone width. Fixed: logo link name did not contain its visible text, newsletter button contrast (white on brand-500 was 4.39:1), trust bar scrolls sideways without being keyboard reachable. Automated checks find only part of the problems: still do a keyboard-only and screen-reader pass on checkout before launch. |
| SEO | `src/app/sitemap.ts`, `src/app/robots.ts`, metadata in `layout.tsx`, product `generateMetadata` | Sitemap lists fixed pages, categories and products. Canonical, Open Graph and Twitter tags. Product JSON-LD. |
| Image optimisation | `src/lib/images.ts`, `src/components/ui/ProductImage.tsx`, `next.config.ts` | Photos on hosts listed in `NEXT_PUBLIC_IMAGE_HOSTS` are resized and served as AVIF/WebP. Photos on any other https host still display, unresized. |
| Unit tests | `src/lib/vat.test.ts`, `src/lib/stock.test.ts` | VAT, rounding, totals. Stock rules were moved out of the database code into `src/lib/stock.ts` so they can be tested: add, change quantity, buyable, checkout problem messages, sale, restock. |
| End-to-end test | `npm run e2e:journey` (`scripts/e2e-journey.cjs`) | Browse, log in, cart, checkout, pay page posts a signed form to PayFast for the right order and amount. The older scripts (`e2e:shop`, `e2e:auth`, `e2e:account`) cover the detail. All need a running server and a **dev** database. |
| POPIA | `/privacy`, registration form, `CookieNotice`, `users.terms_accepted_at` | Registration needs an explicit terms and privacy tick (stored with a timestamp) plus a separate, optional marketing box. Privacy notice covers responsible party, Information Officer, what and why, who it is shared with (PayFast, delivery, sellers, email and hosting), cross-border, retention, security, cookies, rights and the Information Regulator. The cookie notice is an information notice because only essential cookies are set. If analytics or marketing cookies are ever added it must become an opt-in choice. |

## Before launch (needs MultiSS, not code)

- `site.informationOfficer` in `src/config/site.ts` still has placeholder name and email.
- `site.legalDraft` is `true`, so the legal pages show a draft notice. Have MultiSS (ideally a lawyer) approve the wording, then set it to `false`.
- Contact details in `site.contact` are placeholders.
- Rotate `AUTH_SECRET` and the database password. An earlier commit on the public repository contained a `.env` file.
- Set `NEXT_PUBLIC_SITE_URL` (sitemap, canonical and PayFast URLs depend on it) and `NEXT_PUBLIC_IMAGE_HOSTS`.

## Running the checks

```bash
npm test                 # 98 unit tests
npm run typecheck
# accessibility, against a running server (works without a database with USE_MOCK_DATA=true)
BASE=http://localhost:3000 npm run a11y
# end to end, dev database only
BASE=http://localhost:3100 DATABASE_URL=mysql://... PAYFAST_PASSPHRASE=... npm run e2e:journey
```

Checked while building this phase: unit tests, typecheck, production build, the headers served by a running server,
and the accessibility audit (public pages and a product page, desktop and phone). `e2e:journey` was **not run** against a
database (none was available): its browse and log-in redirect steps were checked against the mock-data server, the rest
(login, cart, checkout, pay) should be run once on your machine.
