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
  call `revalidateTag("catalogue")` so changes show immediately.
- "Special Offers" is derived: any product with a compare-at price above its price. Nobody has to tag it.
- Navigation categories come from `src/config/site.ts`. Categories added later in the admin will not appear in the
  menu until the menu reads from the database.
- Price sorting and the card price use the cheapest in-stock variant. Products with several variants show "From".
- Legal pages are skeletons with a visible draft notice (`site.legalDraft`). Do not publish them as they are.
- The product photo gallery has not been exercised yet because no product has photos. Test it with the first real photos.
- "Add to cart" still only sends guests to log in (Phases 3 and 4).
