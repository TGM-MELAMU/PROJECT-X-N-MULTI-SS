"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { fieldErrors } from "@/lib/auth/schemas";
import { hit } from "@/lib/auth/rate-limit";
import { CheckoutError, createOrderFromCart } from "@/lib/orders";
import { PROVINCES } from "@/lib/provinces";

export type CheckoutState = { error?: string; fields?: Record<string, string>; values?: Record<string, string> };

const req = (label: string, max: number) =>
  z.string({ required_error: `Enter ${label}.` }).trim().min(1, `Enter ${label}.`).max(max, `That's too long.`);

const addressSchema = z.object({
  recipientName: req("the recipient's name", 200),
  contactNumber: z
    .string({ required_error: "Enter a contact number." })
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number, like 082 123 4567."),
  line1: req("the street address", 150),
  line2: z.string().trim().max(150).optional(),
  city: req("the city or town", 100),
  province: z.enum(PROVINCES, { errorMap: () => ({ message: "Choose a province." }) }),
  postalCode: z.string().trim().regex(/^\d{4}$/, "Enter a 4-digit postal code."),
});

const text = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fcheckout");

  const values = {
    recipientName: text(formData, "recipientName"),
    contactNumber: text(formData, "contactNumber"),
    line1: text(formData, "line1"),
    line2: text(formData, "line2"),
    city: text(formData, "city"),
    province: text(formData, "province"),
    postalCode: text(formData, "postalCode"),
    saveAddress: text(formData, "saveAddress"),
  };
  const parsed = addressSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  if (!hit(`order:${user.id}`, 10, 15 * 60_000).ok) {
    return { error: "Too many order attempts. Please wait a few minutes and try again.", values };
  }

  let orderNumber: string;
  try {
    orderNumber = await createOrderFromCart(user.id, parsed.data, values.saveAddress === "on");
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.message, values };
    console.error("create order failed", err);
    return { error: "We couldn't place your order just now. Please try again.", values };
  }
  revalidatePath("/", "layout");
  redirect(`/checkout/pay/${orderNumber}`);
}
