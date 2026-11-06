const {test}=require('node:test');
const assert=require('node:assert/strict');
test('ASC counts distinct contracts, cities, actual attachments and Berlin calendar days',async()=>{
 const {summarizeAscDashboard:summarize}=await import('../lib/asc-dashboard-summary.js');
 const rows=[
 {id:'a',contractNumber:'123',clientCity:' Hamburg ',attachmentsJson:'[]',createdAt:'2026-11-01T23:30:00Z'},
 {id:'b',contractNumber:'123',clientCity:'hamburg',attachmentsJson:'[{"name":"photo.jpg"}]',createdAt:'2026-11-02T09:00:00Z'},
 {id:'c',contractNumber:'456',clientCity:'',attachmentsJson:'invalid',createdAt:'2026-11-01T10:00:00Z'}];
 const result=summarize(rows);
 assert.equal(result.total,3);assert.equal(result.contracts,2);assert.equal(result.cities,1);assert.equal(result.withAttachments,1);
 assert.deepEqual(result.daily,[{date:'2026-11-01',claims:1},{date:'2026-11-02',claims:2}]);
 assert.deepEqual(result.recent.map(row=>row.id),['b','a','c']);
 const empty=summarize([]);
 assert.equal(empty.total,0);assert.equal(empty.contracts,0);assert.equal(empty.cities,0);assert.equal(empty.withAttachments,0);
 assert.deepEqual(empty.daily,[]);assert.deepEqual(empty.recent,[]);
});
