const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const frontendRoot = path.resolve(__dirname, '../frontend');
const projectRequire = createRequire(path.join(frontendRoot, 'package.json'));
projectRequire('@next/env').loadEnvConfig(frontendRoot, true);
const database = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname), 'Expected a local database');
const { PrismaClient } = projectRequire('@prisma/client');
const prisma = new PrismaClient();
const contractWhere = { contractNumber: { startsWith: '222' } };
const orderWhere = { OR: [
  { contractNumber: { startsWith: '222' } },
  { kitchenContract: { is: contractWhere } },
  { orderNumber: { startsWith: '222' } },
] };
const orderSelect = {
  orderNumber: true, contractNumber: true, status: true, createdAt: true,
  kitchenContract: { select: { contractNumber: true } },
};
async function main() {
  const [contractCount, orders, testOrders, contracts] = await Promise.all([
    prisma.kitchenContract.count({ where: contractWhere }),
    prisma.order.findMany({ where: orderWhere, select: orderSelect, orderBy: { createdAt: 'desc' } }),
    prisma.testOrder.findMany({ where: orderWhere, select: orderSelect, orderBy: { createdAt: 'desc' } }),
    prisma.kitchenContract.findMany({ where: contractWhere, take: 12, orderBy: { contractNumber: 'asc' },
      select: { contractNumber: true, contractType: true, isActive: true, _count: { select: { orders: true, testOrders: true } } } }),
  ]);
  console.log(JSON.stringify({ databaseHost: database.hostname, contractCount,
    orderCount: orders.length, testOrderCount: testOrders.length,
    contracts, orders: orders.slice(0, 12), testOrders: testOrders.slice(0, 12) }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
