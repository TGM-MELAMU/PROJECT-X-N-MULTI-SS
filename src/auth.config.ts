import type { NextAuthConfig } from "next-auth";

/**
 * The part of the Auth.js setup that is safe to run in the middleware (edge runtime): no database
 * and no bcrypt in here. The Credentials provider lives in src/auth.ts.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // signed in for up to 7 days
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present at the moment of sign-in.
      if (user) {
        token.uid = user.id as string;
        token.roles = user.roles ?? [];
        token.stamp = user.stamp ?? "";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.roles = (token.roles as string[]) ?? [];
        session.user.stamp = (token.stamp as string) ?? "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
