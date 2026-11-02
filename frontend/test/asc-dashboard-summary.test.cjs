const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../lib/asc-dashboard-summary.js'),'utf8');
const summarize=new Function(source.replace('export function','function')+';return summarizeAscDashboard;')();
test('ASC counts distinct contracts, cities, actual attachments and Berlin calendar days',()=>{
 const rows=[
 {id:'a',contractNumber:'123',clientCity:' Hamburg ',attachmentsJson:'[]',createdAt:'2026-11-01T23:30:00Z'},
 {id:'b',contractNumber:'123',clientCity:'hamburg',attachmentsJson:'[{"name":"photo.jpg"}]',createdAt:'2026-11-02T09:00:00Z'},
 {id:'c',contractNumber:'456',clientCity:'',attachmentsJson:'invalid',createdAt:'2026-11-01T10:00:00Z'}];
 const result=summarize(rows);
 assert.equal(result.total,3);assert.equal(result.contracts,2);assert.equal(result.cities,1);assert.equal(result.withAttachments,1);
 assert.deepEqual(result.daily,[{date:'2026-11-01',claims:1},{date:'2026-11-02',claims:2}]);
 assert.deepEqual(result.recent.map(row=>row.id),['b','a','c']);
 assert.deepEqual(summarize([]),{total:0,contracts:0,cities:0,withAttachments:0,daily:[],recent:[]});
});
