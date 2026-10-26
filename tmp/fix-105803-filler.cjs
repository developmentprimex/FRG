const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../frontend');
const req = createRequire(path.join(root, 'package.json'));
req('@next/env').loadEnvConfig(root);
const { PrismaClient } = req('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const where = { kitchen: { slug: 'ab-105803' }, componentKey: { in: ['base-module-2', 'dishwasher-base'] } };
  const select = { id: true, code: true, price: true, blendeCode: true, blendePrice: true, catalogBlendeId: true, catalogBlendeQuantity: true };
  console.log('Before:', await prisma.kitchenItem.findMany({ where, select }));
  if (process.argv.includes('--apply')) {
    const sql = fs.readFileSync(path.join(root, 'prisma/migrations/20261026120000_ab105803_us30_remove_attached_filler/migration.sql'), 'utf8');
    const statements = sql.split(';').map(s=>s.trim()).filter(Boolean);
    console.log('Updated:', await prisma.$transaction(statements.map(s=>prisma.$executeRawUnsafe(s))));
    console.log('Idempotence check:', await prisma.$transaction(statements.map(s=>prisma.$executeRawUnsafe(s))));
    const rows = await prisma.kitchenItem.findMany({ where, select });
    const cabinet = rows.find(r=>r.code==='CAB-BASE-AB105803-US30-UPK20');
    const dishwasher = rows.find(r=>r.code==='DISH-AB105803-600-UPEF65');
    if (rows.length !== 2 || cabinet?.blendeCode !== 'UPEF65' || !cabinet.catalogBlendeId || dishwasher?.blendeCode || dishwasher?.catalogBlendeId) throw new Error('Unexpected corner filler state');
    console.log('After:', rows);
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
