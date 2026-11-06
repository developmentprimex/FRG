import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAscDashboardRows } from '../lib/asc-dashboard-query.js';

test('loader is read-only, matches normalized contracts once and supports missing optional fields', async () => {
  const reads = [];
  const db = { $queryRaw: async (strings, ...values) => {
    const sql = String.raw({ raw: strings }, ...values.map(String));
    reads.push(sql);
    if (sql.includes('to_regclass')) return [{ relation: null }];
    return [{ id: 'case', contractType: 'ARC' }];
  } };
  const rows = await loadAscDashboardRows(db);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].submissions, []);
  assert.equal(reads.length, 2);
  assert.match(reads[0], /LEFT JOIN LATERAL/);
  assert.match(reads[0], /LIMIT 1/);
  assert.match(reads[0], /REGEXP_REPLACE/);
  assert.match(reads[0], /NOT LIKE '111%'/);
  assert.match(reads[0], /ticketSeries/);
  assert.match(reads[0], /to_jsonb\(sc\)->>'problemAreasJson'/);
  assert.ok(reads.every(sql => !/CREATE|UPDATE|INSERT|DELETE|ALTER/.test(sql)));
});

test('attaches existing follow-ups to their retained case without needing a Prisma delegate', async () => {
  let calls = 0;
  const rows = await loadAscDashboardRows({ $queryRaw: async () => {
    calls++;
    if (calls === 1) return [{ id: 'case' }];
    if (calls === 2) return [{ relation: 'ServiceClaimSubmission' }];
    return [{ id: 'submission', claimId: 'case', payload: { problemDescription: 'Follow-up' } }];
  } });
  assert.equal(rows[0].submissions.length, 1);
  assert.equal(rows[0].submissions[0].id, 'submission');
});

test('loads saved contract product metadata in one read without borrowing another contract inventory', async () => {
  const contract = { id: 'c1', contractType: 'ARC', appliances: [{ brand: 'bosch', articleNumber: 'EXACT', isPresent: true }] };
  let reads = 0, contractReads = 0;
  const rows = await loadAscDashboardRows({
    $queryRaw: async () => ++reads === 1 ? [{ id: 'a', contractId: 'c1' }, { id: 'b', contractId: null }] : [{ relation: null }],
    kitchenContract: { findMany: async query => { contractReads++; assert.deepEqual(query.where.id.in, ['c1']); return [contract]; } },
  });
  assert.equal(contractReads, 1);
  assert.equal(rows[0].contract.appliances[0].articleNumber, 'EXACT');
  assert.equal(rows[1].contract, null);
});
