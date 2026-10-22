const path = require('node:path');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '../frontend');
const req = createRequire(path.join(root,'package.json'));
req('@next/env').loadEnvConfig(root);
const {PrismaClient} = req('@prisma/client');
const db = new PrismaClient();
async function main() {
  const slugs = ['ab-105845','ab-105848','ab-105851','ab-105854','ab-105857','ab-105860'];
  const kitchens = await db.kitchen.findMany({where:{slug:{in:slugs}}, include:{items:{orderBy:[{sortOrder:'asc'},{code:'asc'}]}}});
  const base = kitchens.find(k=>k.slug==='ab-105848');
  const fields=['code','name','nameDe','itemType','componentKey','isActive','articleNumber','price','widthMm','heightMm','depthMm','blendeCode','blendePrice','isLocked','catalogArticleId','catalogBlendeId','catalogServiceId'];
  const normalized = i=>JSON.stringify(fields.map(f=>i[f]));
  console.log(JSON.stringify(kitchens.map(k=>({slug:k.slug,count:k.items.length,active:k.items.filter(i=>i.isActive).length,inactive:k.items.filter(i=>!i.isActive).length,extra:k.items.filter(i=>!base.items.some(b=>b.code===i.code)).map(i=>({code:i.code,name:i.name,active:i.isActive,articleNumber:i.articleNumber})),activeDifferences:k.items.filter(i=>i.isActive&&!base.items.some(b=>b.isActive&&normalized(b)===normalized(i))).map(i=>i.code),missingActive:base.items.filter(b=>b.isActive&&!k.items.some(i=>i.isActive&&i.code===b.code)).map(i=>i.code)})),null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
