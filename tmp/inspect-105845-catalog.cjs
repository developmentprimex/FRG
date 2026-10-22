const path = require('node:path');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '../frontend');
const req = createRequire(path.join(root,'package.json'));
req('@next/env').loadEnvConfig(root);
const db = new (req('@prisma/client').PrismaClient)();
async function main(){
 const ks=await db.kitchen.findMany({where:{slug:{in:['ab-105845','ab-105848','ab-105851','ab-105854','ab-105857','ab-105860']}},include:{items:{include:{catalogArticle:true,catalogBlende:true,catalogService:true},orderBy:{sortOrder:'asc'}}}});
 const base=ks.find(k=>k.slug==='ab-105848');
 for(const k of ks){const items=k.items.filter(i=>base.items.some(b=>b.code===i.code));console.log(JSON.stringify({slug:k.slug,total:items.length,linked:items.filter(i=>i.catalogArticle||i.catalogBlende||i.catalogService).length,unlinked:items.filter(i=>!(i.catalogArticle||i.catalogBlende||i.catalogService)).map(i=>({code:i.code,name:i.name,locked:i.isLocked,active:i.isActive,status:i.catalogLinkStatus})),details:k===base?items.map(i=>({code:i.code,active:i.isActive,article:i.catalogArticle?.articleNumber,blende:i.catalogBlende?.code,service:i.catalogService?.code,status:i.catalogLinkStatus,mode:i.catalogPriceSyncMode})):undefined},null,2));}
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
