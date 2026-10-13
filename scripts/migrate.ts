/**
 * Minimal SQL migration runner.
 * Applies database/migrations/*.sql in filename order and records each in
 * `schema_migrations`, so every file runs exactly once.
 *
 * Usage: npm run db:migrate   (reads DATABASE_URL from the environment)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const conn = await mysql.createConnection({ uri: url, multipleStatements: true });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [rows] = await conn.query("SELECT filename FROM schema_migrations");
  const applied = new Set((rows as { filename: string }[]).map((r) => r.filename));

  const dir = join(process.cwd(), "database", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip   ${file}`);
      continue;
    }
    console.log(`apply  ${file}`);
    // MySQL DDL auto-commits, so a failure part-way needs manual repair.
    await conn.query(readFileSync(join(dir, file), "utf8"));
    await conn.query("INSERT INTO schema_migrations (filename) VALUES (?)", [file]);
  }

  await conn.end();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
