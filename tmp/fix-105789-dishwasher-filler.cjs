const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../frontend');
const req = createRequire(path.join(root, 'package.json'));
req('@next/env').loadEnvConfig(root);
const { PrismaClient } = req('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const host = new URL(process.env.DATABASE_URL).hostname;
  console.log('Database host:', host);
  const where = { kitchen: { slug: 'ab-105789' }, code: 'DISH-AB105789-600-UPEF65' };
  const select = { id: true, price: true, blendeCode: true, blendePrice: true, catalogBlendeId: true, catalogBlendeQuantity: true, catalogArticle: { select: { price: true } } };
  console.log('Before:', await prisma.kitchenItem.findMany({ where, select }));
  if (!process.argv.includes('--apply')) return;
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(host), 'Only the local database may be updated');
  const sql = fs.readFileSync(path.join(root, 'prisma/migrations/20261027120000_ab105789_dishwasher_remove_attached_filler/migration.sql'), 'utf8');
  await prisma.$transaction(async (tx) => {
    assert.equal(await tx.$executeRawUnsafe(sql), 1);
    assert.equal(await tx.$executeRawUnsafe(sql), 0, 'Migration must be idempotent');
    const rows = await tx.kitchenItem.findMany({ where, select });
    assert.equal(rows.length, 1);
    const item = rows[0];
    assert.equal(item.blendeCode, null);
    assert.equal(item.blendePrice, null);
    assert.equal(item.catalogBlendeId, null);
    assert.equal(item.catalogBlendeQuantity, null);
    assert.equal(Number(item.price), Number(item.catalogArticle.price));
    console.log('After:', rows);
  });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
