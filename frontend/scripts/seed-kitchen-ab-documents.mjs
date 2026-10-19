import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { validateAbUpload } from "../lib/kitchen-ab-validation.js";
import { saveKitchenAb } from "../lib/kitchen-ab-store.js";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const client = new PrismaClient();
try {
  const manifest = JSON.parse(await readFile(new URL("../data/kitchen-specifications/index.json", import.meta.url), "utf8"));
  let imported = 0;
  for (const document of Object.values(manifest)) {
    const bytes = await readFile(new URL(`../data/kitchen-specifications/pdfs/${document.sourceFile}`, import.meta.url));
    // Retried deploys never overwrite a reviewed active version.
    await saveKitchenAb(client, validateAbUpload({ document, pdfBase64: bytes.toString("base64") }), { recordRead: false });
    imported++;
  }
  console.log(`Initialized ${imported} AB document records and verified their private PDF files.`);
} finally { await client.$disconnect(); }
