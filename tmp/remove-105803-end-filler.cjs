const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../frontend');
const req = createRequire(path.join(root, 'package.json'));
req('@next/env').loadEnvConfig(root);
const { PrismaClient } = req('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sql = fs.readFileSync(path.join(root, 'prisma/migrations/20261026130000_ab105803_remove_oven_end_filler/migration.sql'), 'utf8');
  console.log('Deactivated:', await prisma.$executeRawUnsafe(sql));
  console.log('Idempotence:', await prisma.$executeRawUnsafe(sql));
  const rows = await prisma.kitchenItem.findMany({where:{kitchen:{slug:'ab-105803'},componentKey:'end-blende'},select:{code:true,isActive:true}});
  if (rows.some(row=>row.isActive)) throw new Error('End filler is still active');
  console.log(rows);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
