import { z } from "zod";
import { passwordProblem } from "@/lib/auth/password";
import { phoneField } from "@/lib/auth/schemas";

import { PROVINCES } from "./constants";

export { MAX_ADDRESSES, PROVINCES } from "./constants";

const required = (label: string, max: number) =>
  z
    .string({ required_error: `Enter ${label}.` })
    .trim()
    .min(1, `Enter ${label}.`)
    .max(max, `That is too long (at most ${max} characters).`);

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `That is too long (at most ${max} characters).`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const profileSchema = z.object({
  firstName: required("your first name", 100),
  lastName: required("your last name", 100),
  phone: phoneField,
});

export const addressSchema = z.object({
  label: optional(50),
  line1: required("the street address", 150),
  line2: optional(150),
  city: required("the city or town", 100),
  province: z.enum(PROVINCES, { errorMap: () => ({ message: "Choose a province." }) }),
  postalCode: z.string().trim().regex(/^\d{4}$/, "Enter a 4-digit postal code, like 2000."),
  isDefault: z.preprocess((v) => v === "on", z.boolean()),
});

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password.").max(200),
    password: z
      .string({ required_error: "Choose a new password." })
      .max(200)
      .superRefine((pw, ctx) => {
        const problem = passwordProblem(pw);
        if (problem) ctx.addIssue({ code: "custom", message: problem });
      }),
    confirm: z.string().max(200),
  })
  .superRefine((v, ctx) => {
    if (v.confirm !== v.password) ctx.addIssue({ code: "custom", path: ["confirm"], message: "The two passwords don't match." });
    if (v.current && v.password === v.current) {
      ctx.addIssue({ code: "custom", path: ["password"], message: "Choose a password different from your current one." });
    }
  });
