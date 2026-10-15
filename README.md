# MultiSS Web

Multi Success Supplies e-commerce / B2B marketplace.
Stack: Next.js 15 (App Router) · TypeScript · Tailwind · Prisma (MySQL 8) · Auth.js (credentials).

## Setup

```bash
npm install
cp .env.example .env          # fill DATABASE_URL and AUTH_SECRET (npx auth secret)

# 1. Load the existing dev database (from your repo) into MySQL 8
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS multiss_ecommerce"
mysql -u root -p multiss_ecommerce < database/multiss_ecommerce_dev.sql

# 2. Apply SQL migrations, generate the Prisma client, seed dev data
npm run db:migrate
npm run db:generate
SEED_ADMIN_PASSWORD='choose-a-dev-password' npm run db:seed

npm run dev
```

Copy `database/multiss_ecommerce_dev.sql` from your repo into this project's `database/`
folder (or run the mysql command against its original location).

## Preview without a database

`USE_MOCK_DATA=true npm run dev` renders the home page with built-in sample products, so you can work
on the UI before MySQL is set up. Never set it in staging or production.

## Project layout

- `src/config/site.ts`: contact details (placeholders), categories, navigation.
- `src/components/ui`: Button, Badge, Price (always shows "incl. VAT"), CategoryIcon.
- `src/components/layout`: Header, TrustBar, SearchForm, Footer, NewsletterForm, MobileTabBar.
- `src/components/home`, `src/components/product`: home sections and ProductCard.
- `src/lib/catalogue.ts`: loads products from MySQL (cached 60 s) and product detail (never cached).
- `src/lib/catalogue-query.ts`: pure filter / sort / paginate / facet logic. `src/lib/shop-params.ts`: URL <-> filters.
- `src/lib/vat.ts`: money in integer cents.
- `src/app/shop`, `src/app/product/[slug]`, `src/app/categories` + static pages (about, contact, terms, privacy, returns, delivery).
- `prisma/sample-data.ts`: the placeholder catalogue shared by the seed and the no-database preview.
- Deployment: `docs/DEPLOY.md`.

## Checks

```bash
npm test             # 27 unit tests: search, filters, facets, sorting, pagination, URL parsing
npm run typecheck
npm run db:check     # after migrate + seed: runs the real MySQL queries and compares with the sample data
```

`db:check` exists because the MySQL queries could not be run where this was built. **Run it first.**

## Database rules

- The SQL files in `database/` are the source of truth. **Do not** use `prisma migrate` or `prisma db push`.
- Change the schema by adding a numbered file to `database/migrations/` (`002_...sql`), run `npm run db:migrate`,
  then `npm run db:pull` and review the diff in `prisma/schema.prisma`, then `npm run db:generate`.
- All prices are VAT-inclusive. Use `src/lib/vat.ts` (integer cents) for all money maths.

See `docs/PHASE0.md` for decisions, open questions and the re-scoped plan.

## Phase 2 notes

- The whole active catalogue is loaded into memory and filtered in code. Fine for up to a few thousand products;
  beyond that, move filtering into SQL. Results are cached for 60 s. When the admin dashboard (Phase 6) edits products,
  call `invalidateCatalogue()` (`src/lib/catalogue.ts`) so changes show immediately.
- "Special Offers" is derived: any product with a compare-at price above its price. Nobody has to tag it.
- Navigation categories come from `src/config/site.ts`. Categories added later in the admin will not appear in the
  menu until the menu reads from the database.
- Price sorting and the card price use the cheapest in-stock variant. Products with several variants show "From".
- Legal pages are skeletons with a visible draft notice (`site.legalDraft`). Do not publish them as they are.
- The product photo gallery has not been exercised yet because no product has photos. Test it with the first real photos.
- "Add to cart" sends guests to log in and brings them back to the product (Phase 4 made the cart real).

## Phase 3 notes (accounts)

- **Setup after pulling this phase:** `npm install`, `npm run db:generate` (Prisma now uses the engine-less client with the
  MariaDB/MySQL driver adapter, so no native engine download), then `npm run db:migrate` to apply `002_categories_and_consent.sql`
  (adds `users.terms_accepted_at` and the 8 categories). Set `AUTH_SECRET`, `AUTH_URL` and `NEXT_PUBLIC_SITE_URL` in `.env`.
- Pages: `/register`, `/login`, `/forgot-password`, `/reset-password?token=...`, `/account`. Log out is a button in the header.
- Guards: `src/middleware.ts` sends guests from `/cart`, `/checkout`, `/account` and `/admin` to `/login?next=...`, and sends
  non-admins away from `/admin`. The middleware only reads the cookie (it never writes one, see the comment in the file).
  Real checks are in `getCurrentUser()` (`src/lib/auth/session.ts`), which also reads the user from the database.
- `next` after login is passed through `safeNext()`: only same-site paths are accepted, so `//evil.com`, `https://...` and
  backslash tricks all land on `/account`.
- Passwords: bcrypt cost 12, 8 to 72 bytes, a short common-password list is refused. Changing the password (reset) signs out
  every older session, because the session carries a fingerprint of the password hash.
- Reset links: random 32-byte token, only its SHA-256 is stored in `user_tokens`, valid 1 hour, single use, and a newer link
  cancels older ones. The reply to "forgot password" is identical whether or not the email has an account.
- Email: with `EMAIL_API_KEY` set, mail goes out through Resend (`src/lib/email.ts`). Without it, the message, including the
  reset link, is printed to the server console, which is how to test locally. To use another provider, change `sendEmail()` only.
- Rate limits (login, register, forgot, reset) are in the memory of one server process (`src/lib/auth/rate-limit.ts`).
  That is fine for the single-process launch setup; move them to the database or Redis if you run several processes.
- Tests: `npm test` (unit) and `scripts/e2e-auth.cjs` (browser flow against a running server and a **development** database;
  see the header of that file). Never run the e2e script against production, it deletes `e2e-*@example.com` users.
- The imported development dump contains test users with unusable password hashes, and one test customer has the `admin` role.
  Do not carry those users into production; create the first real admin by running `npm run db:seed` with `SEED_ADMIN_PASSWORD` set (it creates `admin@multiss.co.za`), then change the password.

## Phase 4 notes (cart, checkout, payment)

- **Flow:** Add to cart (login needed) -> `/cart` -> `/checkout` (delivery address) -> order is created as `pending_payment`
  and the stock is *not* touched yet -> `/checkout/pay/<order>` posts a signed form to PayFast -> PayFast calls
  `/api/payfast/notify` (server to server) -> the order becomes `confirmed`, the payment `successful`, stock is reduced
  and an `inventory_movements` row is written. The page the customer returns to (`/order/<order>`) only *shows* the status;
  it never marks anything paid.
- **Notification checks** (`src/app/api/payfast/notify/route.ts`): signature, PayFast's own IP, amount equals our order total,
  and PayFast's "validate" call. Any failure returns 400 and changes nothing. A repeat of the same notification does nothing.
- **Prices** are re-read from the database when the order is created, so the browser can't change what is charged.
  Delivery is "To be confirmed" (R 0) until the client sets a fee: `SHIPPING_FLAT_CENTS` / `SHIPPING_FREE_OVER_CENTS`.
- **Vendors:** each order is split into one `vendor_orders` row per seller, with commission taken from the product rule, then
  the category rule, otherwise 0%. No commission rules exist yet, so vendor net equals the line total until the admin sets them.
- **Testing without PayFast reaching you:** PayFast can't call `localhost`. Either expose the site with a tunnel (ngrok,
  Cloudflare Tunnel) and set `NEXT_PUBLIC_SITE_URL` to that address, or set `PAYFAST_DEV_SIMULATE=true` locally and use the
  "Simulate a successful payment" button on an unpaid order's page.
- **Tests:** `npm test` (41 unit tests) and `scripts/e2e-shop.cjs` (browser test of the whole flow against a *dev* server started
  with `next dev` and a *dev* database; the header of that file lists the env it needs).
- **Not built yet:** cancelling an unpaid order, refunds, and emails to the customer and vendors (planned for the admin phase).
  An order left unpaid keeps its items reserved in that order, not in the cart; the customer can pay it from `/account/orders`.

## Phase 6 notes (admin dashboard)

- **Where:** `/admin` (admins only; the link is in the top bar). Dashboard, Orders, Products, Stock, Categories.
- **Orders:** search by order number, name or email; filter by status. Admins move an order forward (confirmed, processing, completed) or cancel it.
  Paid orders become "Received/Confirmed" by themselves through PayFast, so "paid" is never set by hand. Cancelling a paid order puts its items back in
  stock but **does not refund**: refund in PayFast. Every change is written to the order's history with the admin's name.
- **Products:** list with filters (category, stock, status, approval, featured), add a product, edit details, categories, price/"was" price, status,
  approval and photos (by image address; file upload is not built).
- **Stock:** set an exact quantity per variant, or import a CSV of SKU and quantity (comma, semicolon or tab separated). Every change writes an
  `inventory_movements` row. The import never creates products; unknown SKUs are listed back.
- **Categories:** add, rename, re-parent, hide. Categories come from the database, so a new one shows in the menu, filters and category page with no code change.
  Products with no (active) category show under "Other products".
- Every admin page **and** every admin server action checks the admin role against the database (`requireAdmin()`), not just the cookie.
- Admin edits call `invalidateCatalogue()`, so the shop updates at once (single server process).
- **Not built:** deleting products/categories, photo upload, refunds, customer emails on status change, user management, vendor approval screens, audit log beyond order notes.
