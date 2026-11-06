import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAscDashboard, getAscDashboardStartDate } from '../lib/asc-dashboard-summary.js';
import { classifyClaimArea } from '../lib/asc-claim-analytics.js';
const row = (id, extra = {}) => ({ id, contractNumber: `6700000${id}`, contractId: `contract-${id}`, contractType: 'FRG', kitchenId: 'kitchen-a', kitchenName: 'Kitchen A', createdAt: '2026-11-02T09:00:00Z', ...extra });
const areas = (...values) => JSON.stringify(values);

test('periods start on Berlin calendar days independently of server timezone and daylight saving', () => {
  assert.equal(getAscDashboardStartDate(null), null);
  assert.equal(getAscDashboardStartDate(7, new Date('2026-11-01T23:30:00Z')).toISOString(), '2026-10-26T23:00:00.000Z');
  assert.equal(getAscDashboardStartDate(7, new Date('2026-03-29T12:00:00Z')).toISOString(), '2026-03-22T23:00:00.000Z');
});

test('legacy sink-cabinet labels count as cabinets while sinks and appliance panels stay distinct', () => {
  assert.equal(classifyClaimArea({ name: 'Sink cabinet' }), 'cabinets');
  assert.equal(classifyClaimArea({ name: 'Sink base cabinet' }), 'cabinets');
  assert.equal(classifyClaimArea({ name: 'Sink' }), 'other');
  assert.equal(classifyClaimArea({ name: 'Dishwasher front' }), 'cabinets');
});

test('counts the filename attachment metadata stored by the claims endpoint', () => {
  const result = summarizeAscDashboard([row('1', { attachmentsJson: '[{"filename":"photo.jpg","contentType":"image/jpeg","size":120}]' })]);
  assert.equal(result.withAttachments, 1);
});

test('marks overlap when a case has both classified and unclassified products', () => {
  const result = summarizeAscDashboard([row('1', { problemAreasJson: areas({ name: 'Oven' }, { name: 'Unspecified issue' }) })]);
  assert.equal(result.categories.electrical, 1);
  assert.equal(result.categories.unknown, 1);
  assert.equal(result.multiCategory, 1);
});

test('counts distinct cases and each category once per case; excludes tests', () => {
  const a = row('1', { problemAreasJson: areas({ name: 'Wall cabinet', code: 'CAB-1' }, { name: 'Wall cabinet', code: 'CAB-1' }, { name: 'Sink cabinet', claimPartKey: 'sink-cabinet' }, { name: 'Oven', claimPartKey: 'oven' }) });
  const result = summarizeAscDashboard([a, a, row('2', { problemAreasJson: areas({ name: 'Dishwasher front', componentId: 'reference-furniture-1' }) }), row('3', { problemAreasJson: areas({ name: 'Worktop' }) }), row('4'), row('5', { contractNumber: ' 111 12345' }), row('6', { ticketSeries: 'test' })]);
  assert.equal(result.total, 4);
  assert.deepEqual(result.categories, { cabinets: 2, electrical: 1, other: 1, unknown: 1 });
  assert.equal(result.items.find(item => item.name === 'Wall cabinet').claims, 1);
  assert.equal(result.multiCategory, 1);
  assert.equal(result.sources.find(source => source.key === 'FRG').claims, 4);
});

test('groups FRG across contracts but keeps ARC contracts with the same upload shell separate', () => {
  const result = summarizeAscDashboard([row('1'), row('2'), row('3', { contractType: 'ARC', kitchenId: 'upload-shell' }), row('4', { contractType: 'ARC', kitchenId: 'upload-shell' }), row('5', { contractType: null, contractId: null, kitchenId: null })]);
  assert.equal(result.kitchens, 4);
  assert.equal(result.repeatKitchens, 1);
  assert.equal(result.repeatClaims, 1);
  assert.equal(result.kitchenRows.find(kitchen => kitchen.key === 'FRG:kitchen-a').contracts.length, 2);
  assert.equal(result.sources.find(source => source.key === 'ARC').kitchens, 2);
  assert.equal(result.sources.find(source => source.key === 'unknown').claims, 1);
});

test('retains all-time repeat history when filtering; follow-ups enrich categories without adding cases', () => {
  const old = row('1', { createdAt: '2026-10-01T10:00:00Z' });
  const current = row('2', { problemAreasJson: areas({ name: 'Oven' }), submissions: [{ id: 'followup', payload: { problemAreasJson: areas({ name: 'Wall cabinet' }) } }] });
  const result = summarizeAscDashboard([old, current, row('3', { contractType: 'ARC' })], { startDate: '2026-11-01T00:00:00Z', contractType: 'FRG', category: 'cabinets' });
  assert.equal(result.total, 1);
  assert.equal(result.categories.cabinets, 1);
  assert.equal(result.categories.electrical, 1);
  assert.equal(result.repeatKitchens, 1);
  assert.equal(result.repeatClaims, 1);
  assert.equal(result.kitchenRows[0].claims, 1);
  assert.equal(result.kitchenRows[0].totalClaims, 2);
  assert.equal(result.kitchenRows[0].firstAt, '2026-10-01T10:00:00.000Z');
});

test('normalizes contracts/cities, validates files/dates, classifies legacy headers but never free problem text', () => {
  const result = summarizeAscDashboard([
    row('1', { contractNumber: '670 001', clientCity: ' Hamburg ', attachmentsJson: '[]', createdAt: '2026-11-01T23:30:00Z', problemDescription: 'Kitchen areas: Oven, Wall cabinet\n\nIssue: something broke' }),
    row('2', { contractNumber: '670001', clientCity: 'hamburg', attachmentsJson: '[{"name":"photo.jpg"}]', createdAt: '2026-11-02T09:00:00Z', problemAreasJson: 'invalid', problemDescription: 'The oven and cabinet are broken.' }),
    row('3', { contractNumber: '', kitchenId: null, contractId: null, contractType: null, createdAt: 'invalid', attachmentsJson: 'invalid', problemAreasJson: '[null, 3]' })
  ]);
  assert.equal(result.contracts, 1);
  assert.equal(result.cities, 1);
  assert.equal(result.withAttachments, 1);
  assert.deepEqual(result.daily, [{ date: '2026-11-02', claims: 2 }]);
  assert.equal(result.categories.cabinets, 1);
  assert.equal(result.categories.electrical, 1);
  assert.equal(result.categories.unknown, 2);
  assert.equal(result.cityRows[0].claims, 2);
  assert.equal(result.recent.at(-1).createdAt, null);
});

test('filters actual kitchen identity and returns honest empty states', () => {
  const result = summarizeAscDashboard([row('1'), row('2', { contractType: 'ARC', kitchenId: 'upload-shell' })], { kitchenKey: 'ARC:contract-2' });
  assert.equal(result.total, 1);
  assert.equal(result.kitchenRows[0].contractType, 'ARC');
  const empty = summarizeAscDashboard([], { category: 'electrical' });
  for (const key of ['total', 'contracts', 'kitchens', 'repeatKitchens', 'repeatClaims', 'withAttachments', 'cities']) assert.equal(empty[key], 0);
  for (const key of ['daily', 'recent', 'items', 'cityRows', 'kitchenRows']) assert.deepEqual(empty[key], []);
  assert.deepEqual(empty.categories, { cabinets: 0, electrical: 0, other: 0, unknown: 0 });
});
