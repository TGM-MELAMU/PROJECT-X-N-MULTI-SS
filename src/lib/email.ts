import { site } from "@/config/site";
import { siteUrl } from "@/lib/site-url";

/**
 * Sends a transactional email through Resend's HTTP API when EMAIL_API_KEY is set.
 * Without a key (local development) the message is printed to the server console instead, so the
 * password-reset link can be copied from there.
 * To use another provider (Brevo, SES, SMTP) only this function needs to change.
 */
export async function sendEmail(msg: { to: string; subject: string; text: string; html: string }): Promise<void> {
  const from = process.env.EMAIL_FROM || `${site.name} <no-reply@multiss.co.za>`;
  const key = process.env.EMAIL_API_KEY;

  if (!key) {
    console.log(`[email:dev] to=${msg.to} subject="${msg.subject}"\n${msg.text}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
  });
  if (!res.ok) throw new Error(`Email provider returned ${res.status}`);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);


export async function sendPasswordResetEmail(to: string, firstName: string, rawToken: string): Promise<void> {
  const link = `${siteUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const text =
    `Hi ${firstName},\n\nWe received a request to reset your ${site.name} password. ` +
    `Use this link within 1 hour:\n\n${link}\n\n` +
    `If you didn't ask for this, you can ignore this email. Your password stays the same.\n\n${site.legalName}`;
  const html =
    `<p>Hi ${esc(firstName)},</p><p>We received a request to reset your ${esc(site.name)} password. ` +
    `This link works for 1 hour:</p><p><a href="${esc(link)}">Choose a new password</a></p>` +
    `<p>If you didn't ask for this, you can ignore this email. Your password stays the same.</p><p>${esc(site.legalName)}</p>`;
  await sendEmail({ to, subject: `Reset your ${site.name} password`, text, html });
}
