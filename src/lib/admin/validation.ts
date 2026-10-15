import { z } from "zod";

/** First message of a failed validation, for the one-line banner the admin forms use. */
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Please check the form and try again.";
}

/** Rand amount to cents. Accepts "1500", "1500.5", "1 500,50" (space and decimal comma); rejects "R1500", "1,500.50", negatives and more than 2 decimals. Returns null when invalid. */
export function parseRands(input: string | null | undefined): number | null {
  if (input == null) return null;
  const s = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export const MAX_PRICE_CENTS = 100_000_000_00; // R 100 million: far above any real product, catches typos
export const MAX_STOCK = 1_000_000;

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
}

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optText = (max: number, label: string) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `${label} is too long (most ${max} characters).`).optional());
const checkbox = z.preprocess((v) => v === "on" || v === "1" || v === "true", z.boolean());
const id = z.coerce.number({ invalid_type_error: "Something went wrong. Reload the page and try again." }).int().positive();

export const PRODUCT_STATUSES = ["draft", "active", "inactive"] as const;
export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;

export const productSchema = z
  .object({
    id,
    name: z.string({ required_error: "Enter a product name." }).trim().min(2, "Enter a product name.").max(200, "The product name is too long (most 200 characters)."),
    brand: optText(150, "The brand"),
    description: optText(10_000, "The description"),
    status: z.enum(PRODUCT_STATUSES, { errorMap: () => ({ message: "Choose a status." }) }),
    approvalStatus: z.enum(APPROVAL_STATUSES, { errorMap: () => ({ message: "Choose an approval status." }) }),
    rejectionReason: optText(500, "The rejection reason"),
    isFeatured: checkbox,
    categoryIds: z.array(id).max(50, "Too many categories.").default([]),
  })
  .superRefine((v, ctx) => {
    if (v.approvalStatus === "rejected" && !v.rejectionReason) {
      ctx.addIssue({ code: "custom", path: ["rejectionReason"], message: "Say why the product was rejected." });
    }
  });

export const newProductSchema = z.object({
  name: z.string({ required_error: "Enter a product name." }).trim().min(2, "Enter a product name.").max(200, "The product name is too long (most 200 characters)."),
  sku: z.string({ required_error: "Enter a SKU." }).trim().min(1, "Enter a SKU.").max(100, "The SKU is too long (most 100 characters)."),
  vendorId: id,
  price: z.string().trim().min(1, "Enter a price."),
  status: z.enum(PRODUCT_STATUSES),
});

export const variantSchema = z
  .object({
    id,
    productId: id,
    name: z.string().trim().min(1, "Enter a variant name.").max(150, "The variant name is too long (most 150 characters)."),
    modelNumber: optText(100, "The model number"),
    unit: optText(50, "The unit"),
    price: z.string().trim().min(1, "Enter a price."),
    compareAt: z.string().trim().optional(),
    status: z.enum(["active", "inactive"], { errorMap: () => ({ message: "Choose a variant status." }) }),
  })
  .transform((v, ctx) => {
    const priceCents = parseRands(v.price);
    if (priceCents == null || priceCents <= 0 || priceCents > MAX_PRICE_CENTS) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Enter the price in rand, like 1250 or 1250.50. It must be more than zero." });
      return z.NEVER;
    }
    let compareAtCents: number | null = null;
    if (v.compareAt) {
      compareAtCents = parseRands(v.compareAt);
      if (compareAtCents == null || compareAtCents > MAX_PRICE_CENTS) {
        ctx.addIssue({ code: "custom", path: ["compareAt"], message: "The 'was' price must be an amount in rand, like 1500 or 1500.50." });
        return z.NEVER;
      }
      if (compareAtCents <= priceCents) {
        ctx.addIssue({ code: "custom", path: ["compareAt"], message: "The 'was' price must be higher than the price. Leave it empty if the product isn't on sale." });
        return z.NEVER;
      }
    }
    return { ...v, priceCents, compareAtCents };
  });

export const imageSchema = z.object({
  productId: id,
  url: z
    .string({ required_error: "Enter the image address." })
    .trim()
    .max(500, "The image address is too long (most 500 characters).")
    .refine((u) => {
      try {
        const p = new URL(u);
        return p.protocol === "https:" || p.protocol === "http:";
      } catch {
        return false;
      }
    }, "Enter a full image address starting with https://"),
  alt: optText(255, "The description"),
});

export const RESERVED_CATEGORY_SLUGS = ["other", "special-offers"] as const;

export const categorySchema = z
  .object({
    id: z.preprocess(blankToUndefined, id.optional()),
    name: z.string({ required_error: "Enter a category name." }).trim().min(2, "Enter a category name.").max(100, "The name is too long (most 100 characters)."),
    slug: z.preprocess(blankToUndefined, z.string().trim().toLowerCase().max(120, "The web address is too long.").optional()),
    description: optText(500, "The description"),
    parentId: z.preprocess(blankToUndefined, id.optional()),
    status: z.enum(["active", "inactive"]),
  })
  .transform((v, ctx) => {
    const slug = v.slug ?? slugify(v.name);
    if (slug.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      ctx.addIssue({ code: "custom", path: ["slug"], message: "The web address can only use lower-case letters, numbers and single dashes." });
      return z.NEVER;
    }
    if ((RESERVED_CATEGORY_SLUGS as readonly string[]).includes(slug) && v.id == null) {
      ctx.addIssue({ code: "custom", path: ["slug"], message: `"${slug}" is reserved by the shop. Choose a different name or web address.` });
      return z.NEVER;
    }
    return { ...v, slug };
  });

export const stockSchema = z.object({
  variantId: id,
  // A blank box must be an error: z.coerce would turn "" into 0 and silently empty the shelf.
  quantity: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ invalid_type_error: "Enter the quantity as a whole number." })
      .int("Enter the quantity as a whole number.")
      .min(0, "The quantity can't be negative.")
      .max(MAX_STOCK, `The quantity can't be more than ${MAX_STOCK.toLocaleString("en-ZA")}.`),
  ),
  note: optText(200, "The note"),
});

export const orderStatusSchema = z.object({
  orderNumber: z.string().trim().min(1).max(50),
  to: z.enum(["confirmed", "processing", "completed", "cancelled"]),
  note: optText(500, "The note"),
});

// ───────────── Stock CSV import ─────────────

export const MAX_STOCK_CSV_ROWS = 20_000;
export const MAX_STOCK_CSV_BYTES = 2 * 1024 * 1024;

export type StockCsvRow = { line: number; sku: string; quantity: number };
export type StockCsvProblem = { line: number; message: string };

function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/**
 * Reads a stock sheet: two columns, SKU and quantity, with or without a header row. Comma,
 * semicolon and tab separated files all work (Excel in South Africa often saves with semicolons).
 * A SKU that appears more than once is rejected for every occurrence, because there is no safe way
 * to guess which quantity is right.
 */
export function parseStockCsv(raw: string): { rows: StockCsvRow[]; problems: StockCsvProblem[] } {
  const problems: StockCsvProblem[] = [];
  const text = raw.replace(/^﻿/, "");
  const lines = text.split(/\r\n|\n|\r/).map((l, i) => ({ text: l, line: i + 1 })).filter((l) => l.text.trim() !== "");
  if (lines.length === 0) return { rows: [], problems: [{ line: 0, message: "The file is empty." }] };

  const sample = lines[0].text;
  const delim = [",", ";", "\t"].map((d) => [d, sample.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];

  let skuCol = 0;
  let qtyCol = 1;
  let start = 0;
  const head = splitLine(lines[0].text, delim).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ""));
  const headSku = head.findIndex((h) => ["sku", "itemcode", "productcode", "code"].includes(h));
  const headQty = head.findIndex((h) => ["qty", "quantity", "stock", "onhand", "quantityinstock", "stockonhand"].includes(h));
  if (headSku !== -1 || headQty !== -1) {
    if (headSku === -1 || headQty === -1) return { rows: [], problems: [{ line: lines[0].line, message: "The header row needs both a SKU column and a quantity column." }] };
    skuCol = headSku;
    qtyCol = headQty;
    start = 1;
  }

  const seen = new Map<string, number[]>();
  const parsed: StockCsvRow[] = [];
  for (const { text: t, line } of lines.slice(start)) {
    const cells = splitLine(t, delim);
    const sku = (cells[skuCol] ?? "").trim();
    const qty = (cells[qtyCol] ?? "").trim();
    if (!sku) { problems.push({ line, message: "No SKU on this line." }); continue; }
    if (sku.length > 100) { problems.push({ line, message: `The SKU "${sku.slice(0, 20)}…" is too long.` }); continue; }
    if (!/^\d+(\.0+)?$/.test(qty)) { problems.push({ line, message: `The quantity for ${sku} must be a whole number (found "${qty.slice(0, 20)}").` }); continue; }
    const quantity = Math.trunc(Number(qty));
    if (quantity > MAX_STOCK) { problems.push({ line, message: `The quantity for ${sku} is more than ${MAX_STOCK.toLocaleString("en-ZA")}.` }); continue; }
    const key = sku.toLowerCase();
    seen.set(key, [...(seen.get(key) ?? []), line]);
    parsed.push({ line, sku, quantity });
  }

  const rows: StockCsvRow[] = [];
  for (const r of parsed) {
    const where = seen.get(r.sku.toLowerCase()) ?? [];
    if (where.length > 1) problems.push({ line: r.line, message: `${r.sku} appears more than once (lines ${where.join(", ")}), so none of them were used.` });
    else rows.push(r);
  }
  if (rows.length > MAX_STOCK_CSV_ROWS) {
    return { rows: [], problems: [{ line: 0, message: `That file has ${rows.length.toLocaleString("en-ZA")} products. The most is ${MAX_STOCK_CSV_ROWS.toLocaleString("en-ZA")} at a time; please split it.` }] };
  }
  problems.sort((a, b) => a.line - b.line);
  return { rows, problems };
}
