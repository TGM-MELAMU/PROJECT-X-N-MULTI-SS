/**
 * Dev seed. Idempotent: safe to run repeatedly (upserts by slug / SKU / email).
 *
 *   npm run db:migrate && npm run db:seed
 *
 * Product data lives in ./sample-data.ts (placeholders; replace before launch).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SAMPLE_CATEGORIES, SAMPLE_PRODUCTS, slugify } from "./sample-data";

const db = new PrismaClient();

async function main() {
  // Roles (also created by migration 001; kept here so seed works on its own)
  for (const [name, description] of [
    ["admin", "MultiSS administrator"],
    ["customer", "Registered MultiSS customer"],
    ["vendor", "Approved third-party vendor user"],
  ]) {
    await db.role.upsert({ where: { name }, update: {}, create: { name, description } });
  }

  // First-party MultiSS vendor (owns all seeded products)
  const vendor = await db.vendor.upsert({
    where: { vatNumber: "REPLACE-WITH-MULTISS-VAT" },
    update: {},
    create: {
      type: "multiss",
      companyName: "Multi Success Supplies (Pty) Ltd",
      vatNumber: "REPLACE-WITH-MULTISS-VAT",
      emailAddress: "info@multiss.co.za",
      primaryContactNumber: "0000000000",
      billingAddressLine1: "REPLACE WITH REAL ADDRESS",
      billingCity: "Johannesburg",
      billingProvince: "Gauteng",
      billingPostalCode: "0000",
    },
  });

  // Dev admin — only if a password is supplied; never hard-code credentials.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminPassword) {
    const admin = await db.user.upsert({
      where: { email: "admin@multiss.co.za" },
      update: {},
      create: {
        firstName: "MultiSS",
        lastName: "Admin",
        email: "admin@multiss.co.za",
        passwordHash: await bcrypt.hash(adminPassword, 12),
      },
    });
    const role = await db.role.findUniqueOrThrow({ where: { name: "admin" } });
    await db.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: role.id } },
      update: {},
      create: { userId: admin.id, roleId: role.id },
    });
    console.log("Seeded admin@multiss.co.za");
  } else {
    console.log("SEED_ADMIN_PASSWORD not set: skipped admin user");
  }

  const cats = new Map<string, number>();
  for (const [name, slug] of SAMPLE_CATEGORIES) {
    const c = await db.category.upsert({
      where: { slug },
      update: { name },
      create: { name, slug, description: `${name} for laboratories and medical professionals` },
    });
    cats.set(slug, c.id);
  }

  for (const p of SAMPLE_PRODUCTS) {
    const slug = slugify(p.name);
    const product = await db.product.upsert({
      where: { slug },
      update: {},
      create: {
        vendorId: vendor.id,
        name: p.name,
        slug,
        brand: p.brand,
        description: p.desc,
        status: "active",
        isFeatured: !!p.featured,
      },
    });

    // Special-offer products are found by their compare-at price in the app, so only the
    // product's own category is linked here.
    const categoryId = cats.get(p.category);
    if (!categoryId) throw new Error(`Unknown category slug: ${p.category}`);
    await db.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId } },
      update: {},
      create: { productId: product.id, categoryId },
    });

    if (p.specs && (await db.productSpecification.count({ where: { productId: product.id } })) === 0) {
      await db.productSpecification.createMany({
        data: p.specs.map(([name, value], i) => ({ productId: product.id, name, value, sortOrder: i })),
      });
    }

    const variant = await db.productVariant.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        productId: product.id,
        name: p.variant,
        sku: p.sku,
        modelNumber: p.model,
        unit: "Each",
        sellingPrice: p.price.toFixed(2),
        compareAtPrice: p.was?.toFixed(2),
        status: "active",
      },
    });

    const existing = await db.inventory.findUnique({ where: { variantId: variant.id } });
    if (!existing) {
      await db.inventory.create({
        data: { variantId: variant.id, quantityInStock: p.stock, reorderLevel: 3 },
      });
      if (p.stock > 0) {
        await db.inventoryMovement.create({
          data: {
            variantId: variant.id,
            type: "stock_in",
            quantityChange: p.stock,
            previousQuantity: 0,
            newQuantity: p.stock,
            notes: "Seed stock (placeholder)",
          },
        });
      }
    }
  }

  console.log(`Seeded ${SAMPLE_CATEGORIES.length} categories, ${SAMPLE_PRODUCTS.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
