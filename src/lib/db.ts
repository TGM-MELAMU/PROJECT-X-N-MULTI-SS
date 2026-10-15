import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

// Prisma's engine-less client talks to MySQL 8 through this driver adapter, so there is no native
// query-engine binary to download or copy at deploy time.
// DATABASE_URL looks like: mysql://user:password@host:3306/multiss_ecommerce
function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const u = new URL(url);
  const adapter = new PrismaMariaDb({
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: Number(process.env.DATABASE_POOL_SIZE ?? 10),
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// One client per process, reused across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  return (globalForPrisma.prisma ??= createClient());
}

/**
 * The shared Prisma client. Created on first use, not at import, so builds and the no-database
 * preview (USE_MOCK_DATA=true) work without DATABASE_URL.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
