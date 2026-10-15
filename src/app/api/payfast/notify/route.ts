import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  amountToCents, itnParamString, itnSignatureOk, payfastConfig,
} from "@/lib/payfast";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/orders";
import { toCents } from "@/lib/vat";

export const dynamic = "force-dynamic";

/**
 * PayFast "ITN": PayFast calls this URL (server to server) when a payment changes state.
 * The browser return page is never trusted for payment. Checks, in PayFast's recommended order:
 *   1. signature, 2. PayFast's own IP, 3. amount matches our order, 4. PayFast confirms the data.
 * Anything wrong gets a 400 and changes nothing.
 */
export async function POST(req: Request) {
  const cfg = payfastConfig();
  const raw = await req.text();
  const pairs = [...new URLSearchParams(raw).entries()] as Array<[string, string]>;
  const data = Object.fromEntries(pairs);

  if (!itnSignatureOk(pairs, cfg.passphrase)) return reject("bad signature");

  // Test switches only work outside production, so they can't weaken a live server by accident.
  const isProd = process.env.NODE_ENV === "production";
  if (isProd || process.env.PAYFAST_CHECK_IP !== "false") {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    if (!(await ipIsPayfast(ip, cfg.hosts))) return reject("not from PayFast");
  }

  const orderNumber = data.m_payment_id;
  if (!orderNumber) return reject("no order reference");
  const order = await db.order.findUnique({ where: { orderNumber }, select: { totalAmount: true } });
  if (!order) return reject("unknown order");

  const gross = amountToCents(data.amount_gross ?? "");
  if (gross === null || gross !== toCents(order.totalAmount)) return reject("amount mismatch");

  // Ask PayFast whether it really sent this.
  const skip = !isProd && process.env.PAYFAST_SKIP_SERVER_CONFIRM === "true";
  if (!skip) {
    try {
      const res = await fetch(cfg.validateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: itnParamString(pairs),
        cache: "no-store",
      });
      if ((await res.text()).trim() !== "VALID") return reject("PayFast did not confirm");
    } catch {
      // PayFast will retry the notification, so a network hiccup here is safe to fail on.
      return new NextResponse("try again", { status: 503 });
    }
  }

  const status = (data.payment_status ?? "").toUpperCase();
  try {
    if (status === "COMPLETE") {
      await markOrderPaid(orderNumber, { pfPaymentId: data.pf_payment_id, method: data.payment_method, amountCents: gross });
    } else if (status === "FAILED" || status === "CANCELLED") {
      await markOrderPaymentFailed(orderNumber);
    }
    // PENDING and anything else: nothing to do yet.
  } catch (err) {
    console.error("payfast notify failed", err);
    return new NextResponse("error", { status: 500 });
  }
  return new NextResponse("OK", { status: 200 });
}

function reject(reason: string) {
  console.warn(`[payfast] notification rejected: ${reason}`);
  return new NextResponse("invalid", { status: 400 });
}

async function ipIsPayfast(ip: string, hosts: string[]): Promise<boolean> {
  if (!ip) return false;
  try {
    for (const h of hosts) {
      const addrs = await lookup(h, { all: true });
      if (addrs.some((a) => a.address === ip)) return true;
    }
  } catch {
    return false;
  }
  return false;
}
