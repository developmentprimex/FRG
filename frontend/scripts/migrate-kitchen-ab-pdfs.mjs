import { createRequire } from "node:module";
import { kitchenAbPdfDirectory } from "../lib/kitchen-ab-pdf-files.js";
import { migrateKitchenAbPdfs } from "../lib/kitchen-ab-pdf-migration.js";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const client = new PrismaClient();
try {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--release-db-bytes")) throw new Error("Use only --release-db-bytes, or no arguments for copy/verify mode.");
  const result = await migrateKitchenAbPdfs(client, { releaseDatabaseBytes: args.includes("--release-db-bytes") });
  console.log(JSON.stringify({ directory: kitchenAbPdfDirectory(), ...result }));
} finally { await client.$disconnect(); }
