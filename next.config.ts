import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle: simplest way to run on a VPS behind Nginx.
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/adapter-mariadb", "@prisma/client"],
  images: {
    // Add your bucket / CDN host here once product image storage is chosen.
    remotePatterns: [],
  },
};

export default nextConfig;
