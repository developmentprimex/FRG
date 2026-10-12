const path = require("node:path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env.production") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const send = process.argv.includes("--send");
  const [{ prisma }, { sendWorkReminders }] = await Promise.all([
    import("../lib/prisma.js"), import("../lib/email/work-reminders.js"),
  ]);
  // Independent connection for the durable pre-send ledger, including servers
  // where the application's DATABASE_URL sets connection_limit=1.
  const { PrismaClient } = require("@prisma/client");
  const deliveryDb = send ? new PrismaClient() : prisma;
  try {
    const result = await sendWorkReminders({ db: prisma, deliveryDb, dryRun: !send });
    if (!send) console.log(JSON.stringify({ dryRun: true, count: result.items.length, items: result.items.map((item) => ({ id: item.id, type: item.workType, reference: item.orderNumber || item.contractNumber })) }, null, 2));
    else console.log(JSON.stringify(result));
  } finally { if (deliveryDb !== prisma) await deliveryDb.$disconnect(); await prisma.$disconnect(); }
}
main().catch((error) => { console.error("Work reminders failed:", error.message); process.exitCode = 1; });
