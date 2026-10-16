/**
 * Which product images can go through the Next.js image optimiser.
 *
 * next/image only accepts remote images from hosts listed in next.config.ts, and throws for any other host.
 * Admins can paste any https image address, so anything not on the list is shown as a plain lazy-loaded
 * <img> instead of breaking the page. Add the photo host to NEXT_PUBLIC_IMAGE_HOSTS (comma separated, e.g.
 * "cdn.multiss.co.za,**.cloudfront.net") and rebuild to get resizing and modern formats for it.
 */

export function parseImageHosts(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/** `**.example.com` matches any subdomain of example.com (not example.com itself), like next.config remotePatterns. */
function hostMatches(host: string, pattern: string): boolean {
  if (pattern.startsWith("**.")) return host.endsWith(pattern.slice(2));
  return host === pattern;
}

export function canOptimise(url: string, hosts: string[] = parseImageHosts(process.env.NEXT_PUBLIC_IMAGE_HOSTS)): boolean {
  if (url.startsWith("/")) return !url.startsWith("//"); // a file in /public
  try {
    const u = new URL(url);
    return u.protocol === "https:" && hosts.some((h) => hostMatches(u.hostname.toLowerCase(), h));
  } catch {
    return false;
  }
}
