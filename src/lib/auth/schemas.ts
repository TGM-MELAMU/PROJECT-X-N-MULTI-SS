import { z } from "zod";
import { MAX_PASSWORD_BYTES, passwordProblem } from "./password";

const email = z
  .string({ required_error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(255, "That email address is too long.")
  .email("Enter a valid email address, like name@company.co.za.");

const name = (label: string) =>
  z
    .string({ required_error: `Enter your ${label}.` })
    .trim()
    .min(1, `Enter your ${label}.`)
    .max(100, `Your ${label} is too long.`);

// Local and international numbers: digits, spaces, dashes, brackets and an optional leading +.
const phone = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || /^\+?[0-9 ()-]{7,20}$/.test(v), "Enter a valid phone number, like 082 123 4567.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(200),
});

export const registerSchema = z
  .object({
    firstName: name("first name"),
    lastName: name("last name"),
    email,
    phone,
    // Checked on the field itself so its message shows even when another field also has an error.
    password: z
      .string({ required_error: "Choose a password." })
      .max(200)
      .superRefine((pw, ctx) => {
        const problem = passwordProblem(pw);
        if (problem) ctx.addIssue({ code: "custom", message: problem });
      }),
    acceptTerms: z.literal("on", { errorMap: () => ({ message: "Please accept the terms and privacy policy to continue." }) }),
  })
  .superRefine((v, ctx) => {
    if (v.password.toLowerCase() === v.email) {
      ctx.addIssue({ code: "custom", path: ["password"], message: "Your password can't be your email address." });
    }
  });

export const forgotSchema = z.object({ email });

export const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string({ required_error: "Choose a new password." }).max(200),
});

/** Flattens zod issues to one message per field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export { MAX_PASSWORD_BYTES };
