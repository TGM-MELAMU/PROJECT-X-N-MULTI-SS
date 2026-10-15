"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { markOrderPaid, getOrderForUser } from "@/lib/orders";
import { toCents } from "@/lib/vat";
import { devSimulationEnabled } from "@/lib/payfast";

export async function simulatePaymentAction(formData: FormData): Promise<void> {
  if (!devSimulationEnabled()) return;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const order = await getOrderForUser(user.id, orderNumber);
  if (!order) return;
  await markOrderPaid(orderNumber, { pfPaymentId: `SIM-${Date.now()}`, method: "simulated", amountCents: toCents(order.totalAmount) });
  revalidatePath("/", "layout");
  redirect(`/order/${orderNumber}`);
}
