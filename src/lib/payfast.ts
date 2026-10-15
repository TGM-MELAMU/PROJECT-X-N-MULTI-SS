import { createHash } from "node:crypto";

/**
 * PayFast helpers. Docs: https://developers.payfast.co.za/docs
 * Sandbox values come from the PayFast sandbox account (see docs/DEPLOY.md).
 */
export function payfastConfig() {
  const sandbox = process.env.PAYFAST_SANDBOX !== "false";
  return {
    sandbox,
    merchantId: process.env.PAYFAST_MERCHANT_ID ?? "",
    merchantKey: process.env.PAYFAST_MERCHANT_KEY ?? "",
    passphrase: process.env.PAYFAST_PASSPHRASE ?? "",
    processUrl: sandbox ? "https://sandbox.payfast.co.za/eng/process" : "https://www.payfast.co.za/eng/process",
    validateUrl: sandbox ? "https://sandbox.payfast.co.za/eng/query/validate" : "https://www.payfast.co.za/eng/query/validate",
    hosts: sandbox
      ? ["sandbox.payfast.co.za"]
      : ["www.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za"],
  };
}

export function payfastConfigured(): boolean {
  const c = payfastConfig();
  return Boolean(c.merchantId && c.merchantKey);
}

/** PHP-style urlencode, which is what PayFast signs: spaces as "+", and !'()*~ percent-encoded. */
export function pfEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

/** Outgoing checkout fields, in the order PayFast requires. Empty values are left out of the signature. */
export const CHECKOUT_FIELD_ORDER = [
  "merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url",
  "name_first", "name_last", "email_address", "cell_number",
  "m_payment_id", "amount", "item_name", "item_description",
] as const;

export function signCheckout(fields: Record<string, string>, passphrase: string): string {
  const parts: string[] = [];
  for (const key of CHECKOUT_FIELD_ORDER) {
    const v = fields[key];
    if (v !== undefined && v !== "") parts.push(`${key}=${pfEncode(v)}`);
  }
  let str = parts.join("&");
  if (passphrase) str += `&passphrase=${pfEncode(passphrase)}`;
  return md5(str);
}

/** The ordered field list to render in the auto-submitting form (signature last). */
export function buildCheckoutFields(fields: Record<string, string>, passphrase: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const key of CHECKOUT_FIELD_ORDER) {
    const v = fields[key];
    if (v !== undefined && v !== "") out.push([key, v.trim()]);
  }
  out.push(["signature", signCheckout(fields, passphrase)]);
  return out;
}

/**
 * Parameter string of an incoming ITN, in the order received, without the signature. Unlike the
 * outgoing signature, empty values are kept here.
 */
export function itnParamString(pairs: Array<[string, string]>): string {
  return pairs
    .filter(([k]) => k !== "signature")
    .map(([k, v]) => `${k}=${pfEncode(v)}`)
    .join("&");
}

export function itnSignatureOk(pairs: Array<[string, string]>, passphrase: string): boolean {
  const given = pairs.find(([k]) => k === "signature")?.[1];
  if (!given) return false;
  let str = itnParamString(pairs);
  if (passphrase) str += `&passphrase=${pfEncode(passphrase)}`;
  const expected = md5(str);
  // Constant-ish comparison; both are 32 hex chars.
  return expected.length === given.length && expected === given.toLowerCase();
}

/** "R 12,50" style amount for PayFast: exactly two decimals, dot separator. */
export function pfAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function amountToCents(amount: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) return null;
  return Math.round(Number(amount) * 100);
}

/**
 * Local testing only: PayFast can't reach localhost to confirm a payment, so a "Simulate payment" button
 * stands in for it when PAYFAST_DEV_SIMULATE=true. Never set this on a server real customers can reach.
 */
export function devSimulationEnabled(): boolean {
  return process.env.PAYFAST_DEV_SIMULATE === "true" && payfastConfig().sandbox;
}
