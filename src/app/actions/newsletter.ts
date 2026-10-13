"use server";

import { z } from "zod";
import { db } from "@/lib/db";

export type NewsletterState = { status: "idle" | "ok" | "error"; message: string };

const emailSchema = z.string().trim().toLowerCase().email().max(255);

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address, like name@company.co.za." };
  }

  try {
    // Re-subscribing clears an earlier unsubscribe; same message either way, so emails aren't revealed.
    await db.newsletterSubscriber.upsert({
      where: { email: parsed.data },
      update: { unsubscribedAt: null },
      create: { email: parsed.data },
    });
  } catch (err) {
    console.error("newsletter subscribe failed", err);
    return { status: "error", message: "We couldn't save your email. Try again in a moment." };
  }
  return { status: "ok", message: "You're subscribed. We'll email you about new stock and offers." };
}
