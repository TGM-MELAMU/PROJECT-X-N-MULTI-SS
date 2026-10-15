// Compares prisma/schema.prisma against the live MySQL information_schema.
// Reports: tables/columns the schema expects but the DB lacks, nullability and enum mismatches,
// and DB columns that are NOT NULL without a default and that the schema doesn't know (inserts would fail).
const fs = require("fs");
const mysql = require("mysql2/promise");

(async () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  const enums = {};
  for (const m of schema.matchAll(/enum (\w+) \{([^}]*)\}/g)) enums[m[1]] = m[2].split("\n").map((s) => s.trim()).filter(Boolean);
  const modelNames = new Set([...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]));

  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [cols] = await conn.query(
    "select table_name t, column_name c, is_nullable n, column_default d, column_type ct, extra e from information_schema.columns where table_schema = database()",
  );
  const byTable = {};
  for (const r of cols) (byTable[r.t ?? r.TABLE_NAME] ??= {})[r.c ?? r.COLUMN_NAME] = r;
  const problems = [];
  const seenTables = new Set();

  for (const m of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const body = m[2];
    const table = (body.match(/@@map\("(\w+)"\)/) || [])[1] ?? m[1];
    seenTables.add(table);
    const dbCols = byTable[table];
    if (!dbCols) { problems.push(`MISSING TABLE ${table}`); continue; }
    const known = new Set();
    for (const line of body.split("\n")) {
      const f = line.trim().match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/);
      if (!f || line.trim().startsWith("@@") || line.trim().startsWith("//") || line.trim().startsWith("///")) continue;
      const [, name, type, arr, opt, rest] = f;
      if (arr || modelNames.has(type)) continue; // relation field
      const col = (rest.match(/@map\("(\w+)"\)/) || [])[1] ?? name;
      known.add(col);
      const d = dbCols[col];
      if (!d) { problems.push(`MISSING COLUMN ${table}.${col}`); continue; }
      const dbNullable = d.n === "YES";
      if (!!opt !== dbNullable) problems.push(`NULLABILITY ${table}.${col}: schema ${opt ? "optional" : "required"}, db ${dbNullable ? "NULL" : "NOT NULL"}`);
      if (enums[type]) {
        const dbVals = [...d.ct.matchAll(/'([^']*)'/g)].map((x) => x[1]);
        const sc = enums[type];
        if (JSON.stringify([...dbVals].sort()) !== JSON.stringify([...sc].sort())) problems.push(`ENUM ${table}.${col}: db [${dbVals}] vs schema [${sc}]`);
      }
    }
    for (const [c, d] of Object.entries(dbCols)) {
      if (!known.has(c) && d.n === "NO" && d.d == null && !/auto_increment|GENERATED/i.test(d.e ?? "")) problems.push(`UNKNOWN REQUIRED COLUMN ${table}.${c} (${d.ct}): inserts via Prisma would fail`);
      else if (!known.has(c)) problems.push(`info: db column not in schema ${table}.${c} (${d.ct}, ${d.n === "YES" ? "nullable" : "default " + d.d})`);
    }
  }
  const dbTables = Object.keys(byTable).filter((t) => t !== "schema_migrations");
  console.log("tables in DB not modelled:", dbTables.filter((t) => !seenTables.has(t)).join(", ") || "none");
  console.log(problems.length ? problems.join("\n") : "No problems.");
  await conn.end();
})();
