const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const projectRequire = createRequire(path.join(frontend, 'package.json'));
projectRequire('@next/env').loadEnvConfig(frontend, true);
const database = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname), 'Expected local database');
const { PrismaClient } = projectRequire('@prisma/client');
const prisma = new PrismaClient();
const where = { contractNumber: { startsWith: '222' } };
const relatedOrders = { OR: [{ contractNumber: { startsWith: '222' } }, { kitchenContract: { is: where } }] };
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main() {
  const applyPath = process.argv[2];
  if (!applyPath) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(root, 'backups', 'database', `local-before-delete-222-${stamp}.dump`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const env = { ...process.env, PGPASSWORD: decodeURIComponent(database.password) };
    const args = ['--format=custom', '--file', file, '--host', database.hostname,
      '--port', database.port || '5432', '--username', decodeURIComponent(database.username),
      '--dbname', decodeURIComponent(database.pathname.slice(1))];
    const dump = spawnSync('C:/Program Files/PostgreSQL/16/bin/pg_dump.exe', args, { env, encoding: 'utf8' });
    assert.equal(dump.status, 0, dump.stderr || 'pg_dump failed');
    assert.ok(fs.statSync(file).size > 0);
    const verify = spawnSync('C:/Program Files/PostgreSQL/16/bin/pg_restore.exe', ['--list', file], { encoding: 'utf8' });
    assert.equal(verify.status, 0, verify.stderr || 'Archive validation failed');
    assert.ok(verify.stdout.includes('KitchenContract') && verify.stdout.includes('TABLE DATA'));
    const [targets, orders, testOrders] = await Promise.all([
      prisma.kitchenContract.count({ where }), prisma.order.count({ where: relatedOrders }), prisma.testOrder.count({ where: relatedOrders }),
    ]);
    const manifest = { file, createdAt: new Date().toISOString(), sha256: sha256(file), bytes: fs.statSync(file).size, targets, orders, testOrders };
    fs.writeFileSync(file + '.manifest.json', JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(applyPath + '.manifest.json', 'utf8'));
  assert.equal(manifest.file, path.resolve(applyPath));
  assert.equal(sha256(applyPath), manifest.sha256, 'Backup checksum mismatch');
  const result = await prisma.$transaction(async tx => {
    const [before, otherBefore, ordersBefore, testOrdersBefore, linkedOrders, linkedTestOrders] = await Promise.all([
      tx.kitchenContract.count({ where }), tx.kitchenContract.count({ where: { NOT: where } }),
      tx.order.count(), tx.testOrder.count(), tx.order.count({ where: relatedOrders }), tx.testOrder.count({ where: relatedOrders }),
    ]);
    assert.equal(before, manifest.targets, 'Target count changed since backup');
    assert.equal(linkedOrders, 0, 'Found linked orders; refusing deletion');
    assert.equal(linkedTestOrders, 0, 'Found linked test orders; refusing deletion');
    const deleted = await tx.kitchenContract.deleteMany({ where: { ...where, orders: { none: {} }, testOrders: { none: {} } } });
    assert.equal(deleted.count, before);
    assert.equal(await tx.kitchenContract.count({ where }), 0);
    assert.equal(await tx.kitchenContract.count({ where: { NOT: where } }), otherBefore);
    assert.equal(await tx.order.count(), ordersBefore);
    assert.equal(await tx.testOrder.count(), testOrdersBefore);
    return { deleted: deleted.count, remaining222: 0, otherContracts: otherBefore, orders: ordersBefore, testOrders: testOrdersBefore };
  }, { isolationLevel: 'Serializable', timeout: 30000 });
  console.log(JSON.stringify({ backup: applyPath, ...result }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
