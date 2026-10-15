/**
 * Dev seed. Idempotent: safe to run repeatedly.
 *
 *   npm run db:migrate && npm run db:seed
 *
 * What it does by default (safe on the real imported catalogue):
 *   - makes sure the roles and the 8 site categories exist
 *   - makes sure a first-party MultiSS vendor exists (reuses the existing one if there is one)
 *   - creates admin@multiss.co.za when SEED_ADMIN_PASSWORD is set
 *
 * Placeholder products (prisma/sample-data.ts) are only added when SEED_SAMPLE_PRODUCTS=true AND the
 * database has no products yet. They are for an empty development database, never for the real catalogue.
 */
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { SAMPLE_CATEGORIES, SAMPLE_PRODUCTS, slugify } from "./sample-data";

async function main() {
  for (const [name, description] of [
    ["admin", "MultiSS administrator"],
    ["customer", "Registered MultiSS customer"],
    ["vendor", "Approved third-party vendor user"],
  ]) {
    await db.role.upsert({ where: { name }, update: {}, create: { name, description } });
  }

  const cats = new Map<string, number>();
  for (const [name, slug] of SAMPLE_CATEGORIES) {
    const c = await db.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, description: `${name} for laboratories and medical professionals` },
    });
    cats.set(slug, c.id);
  }

  // The first-party vendor. The imported data already has one (type "multiss"); only create a
  // placeholder when there is none, and say so loudly because it needs real details.
  let vendor = await db.vendor.findFirst({ where: { type: "multiss" } });
  if (vendor) {
    console.log(`Using existing MultiSS vendor #${vendor.id} (${vendor.companyName})`);
  } else {
    vendor = await db.vendor.create({
      data: {
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
    console.warn("Created a PLACEHOLDER MultiSS vendor. Replace its VAT number and address with the real ones.");
  }

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

  if (process.env.SEED_SAMPLE_PRODUCTS === "true") {
    const existing = await db.product.count();
    if (existing > 0) {
      console.log(`Skipped sample products: the database already has ${existing} products.`);
    } else {
      await seedSampleProducts(vendor.id, cats);
    }
  }
}

async function seedSampleProducts(vendorId: number, cats: Map<string, number>) {
  for (const p of SAMPLE_PRODUCTS) {
    const slug = slugify(p.name);
    const product = await db.product.upsert({
      where: { slug },
      update: {},
      create: {
        vendorId,
        name: p.name,
        slug,
        brand: p.brand,
        description: p.desc,
        status: "active",
        approvalStatus: "approved",
        isFeatured: !!p.featured,
      },
    });

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

    if (!(await db.inventory.findUnique({ where: { variantId: variant.id } }))) {
      await db.inventory.create({ data: { variantId: variant.id, quantityInStock: p.stock, reorderLevel: 3 } });
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
  console.log(`Seeded ${SAMPLE_PRODUCTS.length} placeholder products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
