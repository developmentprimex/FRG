const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../frontend');
const req = createRequire(path.join(root, 'package.json'));
req('@next/env').loadEnvConfig(root);
const { PrismaClient } = req('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const where = {kitchen:{slug:{in:['ab-104968','ab-105734','ab-105737','ab-105740']}},code:'CAB-WALL-AB104968-H5002-R',componentKey:'wall-cabinet-1'};
  const select = {kitchen:{select:{slug:true}},price:true,blendeCode:true,blendePrice:true,catalogBlendeId:true};
  console.log('Before:', await prisma.kitchenItem.findMany({where,select}));
  const sql = fs.readFileSync(path.join(root,'prisma/migrations/20261026140000_ab104968_family_h5002_upper_filler/migration.sql'),'utf8');
  console.log('Updated:',await prisma.$executeRawUnsafe(sql));
  console.log('Idempotence:',await prisma.$executeRawUnsafe(sql));
  const rows = await prisma.kitchenItem.findMany({where,select});
  if (rows.length!==4 || rows.some(r=>r.blendeCode!=='HPK2002' || Number(r.blendePrice)!==35 || !r.catalogBlendeId)) throw new Error('Unexpected H5002 filler state');
  console.log('After:', rows);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
