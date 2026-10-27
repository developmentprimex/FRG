const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../frontend');
const req = createRequire(path.join(root, 'package.json'));
req('@next/env').loadEnvConfig(root);
const prisma = new (req('@prisma/client').PrismaClient)();
async function main() {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname), 'Only the local database may be updated');
  const sql = fs.readFileSync(path.join(root, 'prisma/migrations/20261027130000_ab105789_corner_filler_on_us30/migration.sql'), 'utf8');
  await prisma.$transaction(async (tx) => {
    assert.equal(await tx.$executeRawUnsafe(sql), 1);
    assert.equal(await tx.$executeRawUnsafe(sql), 0);
    const items = await tx.kitchenItem.findMany({ where: { kitchen: { slug: 'ab-105789' }, componentKey: { in: ['base-module-1', 'dishwasher-base'] } }, select: { componentKey: true, price: true, blendeCode: true, blendePrice: true, catalogBlendeQuantity: true } });
    const cabinet = items.find(item => item.componentKey === 'base-module-1');
    const dishwasher = items.find(item => item.componentKey === 'dishwasher-base');
    assert.equal(cabinet.blendeCode, 'UPEF65');
    assert.equal(cabinet.catalogBlendeQuantity, 1);
    assert.equal(Number(cabinet.price), 243);
    assert.equal(dishwasher.blendeCode, null);
    assert.equal(Number(dishwasher.price), 579);
    console.log(items);
  });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
