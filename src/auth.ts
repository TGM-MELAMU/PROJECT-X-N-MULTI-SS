import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";
import { loginSchema } from "@/lib/auth/schemas";
import { dummyHash, passwordStamp, verifyPassword } from "@/lib/auth/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true, firstName: true, lastName: true, email: true, passwordHash: true, status: true,
            roles: { select: { role: { select: { name: true } } } },
          },
        });

        // Always run one bcrypt comparison so an unknown email takes as long as a wrong password.
        const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
        if (!user || !ok || user.status !== "active") return null;

        return {
          id: String(user.id),
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          roles: user.roles.map((r) => r.role.name),
          stamp: await passwordStamp(user.passwordHash),
        };
      },
    }),
  ],
});
