const path = require('path');
require('../frontend/node_modules/dotenv').config({path:path.join(__dirname,'../frontend/.env'),quiet:true});
const { PrismaClient } = require('../frontend/node_modules/@prisma/client');
const db = new PrismaClient();
(async()=>{
 const demos = await db.claimFeedbackInvitation.findMany({where:{claimId:{startsWith:'demo-feedback-example-'}},orderBy:{id:'asc'}});
 const done = await db.workProcessing.findMany({where:{workType:'CLAIM',status:'DONE',NOT:{workId:{startsWith:'demo-feedback-example-'}}},select:{workId:true,version:true}});
 const claims = await db.serviceClaim.findMany({where:{id:{in:done.map(r=>r.workId)}},select:{id:true,contractNumber:true,fullName:true,email:true},orderBy:{createdAt:'desc'}});
 const existing = await db.claimFeedbackInvitation.findMany({where:{claimId:{in:claims.map(r=>r.id)}},select:{claimId:true,status:true}});
 const targets = claims.filter(r=>!existing.some(f=>f.claimId===r.id)).slice(0,2);
 if (targets.length !== 2) throw Error('Expected two completed claims without existing feedback.');
 const sourceIds = ['demo-feedback-example-1-invitation','demo-feedback-example-3-invitation'];
 await db.$transaction(async tx=>{
   for(let i=0;i<targets.length;i++) {
     const target = targets[i];
     const source = demos.find(r=>r.id===sourceIds[i]);
     if(!source || source.status!=='ANSWERED' || !source.comment?.startsWith('TEST:')) throw Error('Demo source missing.');
     const current = await tx.workProcessing.findUnique({where:{workType_workId:{workType:'CLAIM',workId:target.id}}});
     if(current?.status!=='DONE') throw Error('Target is no longer closed.');
     if(await tx.claimFeedbackInvitation.count({where:{claimId:target.id}})) throw Error('Target already has feedback.');
     await tx.claimFeedbackInvitation.update({where:{id:source.id},data:{claimId:target.id,completionVersion:current.version,recipientEmail:target.email,tokenHash:null,expiresAt:null}});
   }
   const demoClaims = await tx.serviceClaim.findMany({where:{id:{startsWith:'demo-feedback-example-'}},select:{id:true,problemDescription:true}});
   if(demoClaims.some(r=>!r.problemDescription.startsWith('TEST DEMO - Feedback display example.'))) throw Error('Unexpected demo claim.');
   const ids=demoClaims.map(r=>r.id);
   await tx.claimFeedbackInvitation.deleteMany({where:{claimId:{in:ids}}});
   await tx.workProcessingEvent.deleteMany({where:{workType:'CLAIM',workId:{in:ids}}});
   await tx.workProcessing.deleteMany({where:{workType:'CLAIM',workId:{in:ids}}});
   await tx.serviceClaim.deleteMany({where:{id:{in:ids}}});
 });
 const saved=await db.claimFeedbackInvitation.findMany({where:{id:{in:sourceIds}},select:{claimId:true,overallRating:true,resolved:true}});
 console.log(JSON.stringify({linkedFeedback:saved,remainingDemoClaims:await db.serviceClaim.count({where:{id:{startsWith:'demo-feedback-example-'}}}),emailsSent:0},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
