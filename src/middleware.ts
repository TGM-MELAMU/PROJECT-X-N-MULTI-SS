import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Route guard. It only READS the session cookie and never writes one. (Auth.js's own middleware
 * wrapper re-issues the session cookie on every guarded response, which let a slow background
 * request that finished after "Log out" put the old session cookie back.)
 *
 * This is a first line of defence only: pages and server actions that show or change private data
 * still check the user against the database through getCurrentUser().
 */
function origin(req: NextRequest) {
  // Built from the Host the browser actually used. Behind Nginx the server's own idea of its
  // address (HOSTNAME / localhost) can be wrong, so req.nextUrl isn't used for redirects.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? req.nextUrl.protocol.replace(":", "");
  return { base: `${proto}://${host}`, secure: proto === "https" };
}

export async function middleware(req: NextRequest) {
  const { base, secure } = origin(req);
  const go = (location: string) => NextResponse.redirect(new URL(location, base), 307);

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: secure,
  });

  const { pathname, search } = req.nextUrl;
  if (!token?.uid) return go(`/login?next=${encodeURIComponent(pathname + search)}`);

  const roles = Array.isArray(token.roles) ? (token.roles as string[]) : [];
  if (pathname.startsWith("/admin") && !roles.includes("admin")) return go("/account");

  return NextResponse.next();
}

export const config = {
  matcher: ["/cart/:path*", "/checkout/:path*", "/order/:path*", "/account/:path*", "/admin/:path*"],
};
