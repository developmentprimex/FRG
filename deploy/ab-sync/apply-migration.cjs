const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { execFileSync } = require("node:child_process");
const requireApp = createRequire(path.resolve("package.json"));
requireApp("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = requireApp("@prisma/client");
const client = new PrismaClient();
(async () => {
  const tables = await client.$queryRaw`SELECT to_regclass('"KitchenAbDocument"')::text AS "existing"`;
  if (!tables[0].existing) {
    const sql = fs.readFileSync("prisma/migrations/20261015160000_add_kitchen_ab_sync/migration.sql", "utf8");
    await client.$transaction(async (tx) => {
      for (const statement of sql.split(";").filter((value) => value.trim())) await tx.$executeRawUnsafe(statement);
    });
  }
  const registered = await client.$queryRaw`SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261015160000_add_kitchen_ab_sync' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  if (!registered.length) execFileSync("sudo", ["-u", "deploy", "/usr/local/bin/node", "node_modules/prisma/build/index.js", "migrate", "resolve", "--applied", "20261015160000_add_kitchen_ab_sync"], { stdio: "inherit" });
  console.log("AB database tables are available.");
})().catch((error) => { console.error(error.code || error.name, error.meta?.code || "", error.meta?.message || ""); process.exitCode = 1; }).finally(() => client.$disconnect());
