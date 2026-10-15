const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { execFileSync } = require("node:child_process");
const requireApp = createRequire(path.resolve("package.json"));
requireApp("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = requireApp("@prisma/client");
const client = new PrismaClient();
(async () => {
  for (const [name, columnName] of [
    ["20261015180000_store_kitchen_ab_pdfs_on_disk", "pdfStorageKey"],
    ["20261015190000_add_kitchen_ab_last_read_at", "lastReadAt"],
  ]) {
  const [column] = await client.$queryRaw`SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'KitchenAbDocument' AND column_name = ${columnName}) AS "exists"`;
  if (!column.exists) {
    const sql = fs.readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
    await client.$transaction(async tx => {
      for (const statement of sql.split(";").filter(value => value.trim())) await tx.$executeRawUnsafe(statement);
    });
  }
  const registered = await client.$queryRaw`SELECT 1 FROM "_prisma_migrations" WHERE migration_name = ${name} AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  if (!registered.length) execFileSync("sudo", ["-u", "deploy", "/usr/local/bin/node", "node_modules/prisma/build/index.js", "migrate", "resolve", "--applied", name], { stdio: "inherit" });
  console.log(`AB migration is installed: ${name}`);
  }
})().catch(error => { console.error(error.code || error.name, error.meta?.code || "", error.meta?.message || ""); process.exitCode = 1; }).finally(() => client.$disconnect());
