import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    roles?: string[];
    stamp?: string;
  }
  interface Session {
    user: { id: string; roles: string[]; stamp: string; name?: string | null; email?: string | null };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    roles?: string[];
    stamp?: string;
  }
}
