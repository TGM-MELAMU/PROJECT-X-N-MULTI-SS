import type { NextConfig } from "next";
import { parseImageHosts } from "./src/lib/images";
import { nextHeaders } from "./src/lib/security-headers";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Self-contained server bundle: simplest way to run on a VPS behind Nginx.
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/adapter-mariadb", "@prisma/client"],
  images: {
    // Hosts whose photos may be resized by Next.js: NEXT_PUBLIC_IMAGE_HOSTS="cdn.multiss.co.za,**.cloudfront.net".
    // Photos on any other host still display, just without resizing (see src/components/ui/ProductImage.tsx).
    remotePatterns: parseImageHosts(process.env.NEXT_PUBLIC_IMAGE_HOSTS).map((hostname) => ({ protocol: "https" as const, hostname })),
    formats: ["image/avif", "image/webp"],
  },
  // Security headers on every response, and noindex on private pages (see src/lib/security-headers.ts).
  async headers() {
    return nextHeaders(isProd);
  },
};

export default nextConfig;
