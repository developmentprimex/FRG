import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { buildClaimEmailPreview } from '../lib/email/claim-email-preview.js';
const claim = {id:'claim-1',contractNumber:'670123456',claimSequence:2,fullName:'Saved Customer',email:'customer@example.com',problemAreasJson:JSON.stringify([{componentId:'fridge',name:'Fridge',detail:'Noisy fridge'}]),attachmentsJson:JSON.stringify([{filename:'photo.png',contentType:'image/png',size:100,role:'problem_area',areaComponentId:'fridge'}])};
test('main preview retains main subject, saved problem details and attachment links',()=>{
 const preview=buildClaimEmailPreview({claim,env:{SMTP_FROM:'sender@example.com',SERVICE_REQUEST_OTHER_EMAIL:'claims@example.com'}}).notification;
 assert.equal(preview.subject,'Reklamation 670123456 KD 02');
 assert.equal(preview.to,'claims@example.com');
 assert.equal(preview.replyTo,'customer@example.com');
 assert(preview.html.includes('Noisy fridge'));
 assert(preview.html.includes('Saved'));
 assert(preview.html.includes('/api/admin/claims/claim-1/attachments/0?view=1'));
 assert(!preview.html.includes('src="cid:'));
});
test('preview escapes submitted HTML',()=>{
 const preview=buildClaimEmailPreview({claim:{...claim,fullName:'<script>alert(1)</script>'},env:{}}).notification;
 assert(!preview.html.includes('<script>'));
 assert(preview.html.includes('&lt;script&gt;'));
});
const source=readFileSync(new URL('../app/api/admin/claims/[id]/email-preview/route.js',import.meta.url),'utf8').replace(/^import[^\n]*;\r?\n/gm,'').replace(/export /g,'');
test('preview requires admin access before reading claim',async()=>{
 let reads=0;
 const context=vm.createContext({requireAdminClaimsApi:async()=>{throw new Error('Unauthorized')},queryServiceClaimById:async()=>{reads++;return [claim]},prisma:{}});
 vm.runInContext(source,context);
 await assert.rejects(context.GET({}, {params:{id:claim.id}}),/Unauthorized/);
 assert.equal(reads,0);
});
test('preview is read only and not cacheable',async()=>{
 const context=vm.createContext({requireAdminClaimsApi:async()=>({}),queryServiceClaimById:async()=>[claim],prisma:{},getServiceClaimKitchenPlan:async()=>null,buildClaimEmailPreview:()=>({notification:{subject:'Preview'}}),NextResponse:{json:(body,options)=>({body,...options})}});
 vm.runInContext(source,context);
 const result=await context.GET({}, {params:{id:claim.id}});
 assert.equal(result.headers['Cache-Control'],'no-store');
 assert.equal(result.body.notification.subject,'Preview');
 assert(!source.includes('sendMail'));
});
