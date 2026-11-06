import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAscDashboard } from '../lib/asc-dashboard-summary.js';
import { getAscComparisonWindow, resolveAscProduct } from '../lib/asc-dashboard-insights.js';

const claim = (id, date, areas, extra = {}) => ({ id, contractNumber: '670123456', contractType: 'FRG', contractId: 'contract', kitchenId: 'kitchen', kitchenName: 'Kitchen A', createdAt: date, problemAreasJson: JSON.stringify(areas), ...extra });
const oven = extra => ({ name: 'Oven', componentId: 'component-claim-oven', ...extra });

test('compares equal Berlin calendar periods across DST and handles calendar months and all time', () => {
  const range = getAscComparisonWindow('7d', new Date('2026-11-01T12:00:00Z'));
  assert.equal(range.start, '2026-10-25T23:00:00.000Z');
  assert.equal(range.end, '2026-11-01T23:00:00.000Z');
  assert.equal(range.previousStart, '2026-10-18T22:00:00.000Z');
  assert.equal(range.previousEnd, range.start);
  const month = getAscComparisonWindow('month', new Date('2026-03-15T12:00:00Z'));
  assert.equal(month.start, '2026-02-28T23:00:00.000Z');
  assert.equal(month.previousStart, '2026-01-31T23:00:00.000Z');
  assert.equal(month.previousEnd, month.start);
  assert.equal(getAscComparisonWindow('all').start, null);
});

test('previous counts use identical source/category/kitchen filters and do not count follow-ups as cases', () => {
  const data = [claim('old', '2026-10-20T10:00Z', [oven()]), claim('now', '2026-10-30T10:00Z', [oven()], { submissions: [{ id: 'follow', payload: { problemAreasJson: JSON.stringify([oven()]) } }] }), claim('arc', '2026-10-30T10:00Z', [oven()], { contractType: 'ARC' }), claim('cab', '2026-10-30T10:00Z', [{ name: 'Wall cabinet' }])];
  const result = summarizeAscDashboard(data, { period: '7d', now: '2026-11-01T12:00:00Z', contractType: 'FRG', category: 'electrical' });
  assert.equal(result.total, 1);
  assert.equal(result.comparison.previous, 1);
  assert.equal(result.comparison.current, 1);
  assert.equal(result.comparison.changePercent, 0);
  assert.equal(result.comparison.delta, 0);
});

test('zero baselines use new activity rather than infinity; empty periods remain zero', () => {
  const result = summarizeAscDashboard([claim('now', '2026-10-30T10:00Z', [oven()])], { period: '7d', now: '2026-11-01T12:00:00Z' });
  assert.equal(result.comparison.previous, 0);
  assert.equal(result.comparison.changePercent, null);
  assert.equal(result.comparison.delta, 1);
  assert.equal(summarizeAscDashboard([], { period: '7d', now: '2026-11-01T12:00:00Z' }).comparison.changePercent, 0);
  assert.equal(summarizeAscDashboard([]).comparison, null);
});

test('repeat analysis distinguishes serial-confirmed repeats, different products and insufficient information', () => {
  const data = [claim('a', '2026-10-10T10:00Z', [oven({ serialNumber: 'SN-1' })]), claim('b', '2026-10-28T10:00Z', [oven({ serialNumber: 'SN-1' }), oven({ serialNumber: 'SN-1' })]), claim('c', '2026-10-29T10:00Z', [{ name: 'Dishwasher', serialNumber: 'DW-1' }]), claim('d', '2026-10-30T10:00Z', [{ name: 'Unspecified issue' }])];
  const result = summarizeAscDashboard(data, { period: '7d', now: '2026-11-01T12:00:00Z' });
  assert.equal(result.productRecurrence.sameAppliance, 1);
  assert.equal(result.productRecurrence.differentProduct, 1);
  assert.equal(result.productRecurrence.unknown, 1);
  assert.equal(result.productRecurrence.rows.length, 1);
  assert.equal(result.productRecurrence.rows[0].totalClaims, 2);
  assert.equal(result.productRecurrence.rows[0].selectedClaims, 1);
  assert.equal(result.productRecurrence.rows[0].evidence, 'serial');
});

test('same type without serial is qualified; replacements and ARC shared upload shells stay distinct', () => {
  const data = [claim('a', '2026-10-10T10:00Z', [oven({ serialNumber: 'OLD' })]), claim('b', '2026-10-28T10:00Z', [oven({ serialNumber: 'NEW' })]), claim('c', '2026-10-29T10:00Z', [oven()]), claim('arc', '2026-10-30T10:00Z', [oven({ serialNumber: 'OLD' })], { contractType: 'ARC', contractId: 'other' })];
  const result = summarizeAscDashboard(data, { period: '7d', now: '2026-11-01T12:00:00Z' });
  assert.equal(result.productRecurrence.sameAppliance, 0);
  assert.equal(result.productRecurrence.sameType, 1);
  assert.equal(result.productRecurrence.differentProduct, 1);
});

test('recorded model matches stay separate from different models, brands and placeholder serials', () => {
  const data = [claim('a', '2026-10-10T10:00Z', [oven({ model: 'HBA123', manufacturer: 'Bosch', serialNumber: 'Not recorded' })]), claim('b', '2026-10-28T10:00Z', [oven({ model: 'HBA123', manufacturer: 'Bosch', serialNumber: 'Not recorded' })]), claim('c', '2026-10-29T10:00Z', [oven({ model: 'OTHER', manufacturer: 'Bosch' })])];
  const result = summarizeAscDashboard(data, { period: '7d', now: '2026-11-01T12:00:00Z' });
  assert.equal(result.productRecurrence.sameAppliance, 0);
  assert.equal(result.productRecurrence.sameModel, 1);
  assert.equal(result.productRecurrence.differentProduct, 1);
  assert.equal(result.productRecurrence.rows[0].reference, 'HBA123');
});

test('distinct product types count once per manufacturer and model and never use serial as model', () => {
  const result = summarizeAscDashboard([claim('a', '2026-10-10T10:00Z', [oven({ manufacturer: 'Bosch', serialNumber: 'SN-123' }), { name: 'Dishwasher', manufacturer: 'Bosch' }])]);
  assert.equal(result.productBreakdown.manufacturers[0].claims, 1);
  assert.equal(result.productBreakdown.models.length, 0);
});

test('manufacturer/model rankings count distinct cases and explicitly track missing information', () => {
  const data = [claim('a', '2026-10-29T10:00Z', [oven({ manufacturer: ' Bosch ', model: 'HBA123' }), oven({ manufacturer: 'BOSCH', model: 'HBA123' }), { name: 'Dishwasher', brand: 'AEG', articleCode: 'FSE123' }]), claim('b', '2026-10-30T10:00Z', [oven({ manufacturer: 'bosch', model: 'HBA123' })]), claim('c', '2026-10-31T10:00Z', [oven()])];
  const result = summarizeAscDashboard(data);
  assert.equal(result.productBreakdown.manufacturers.find(row => row.name === 'BOSCH').claims, 2);
  assert.equal(result.productBreakdown.models.find(row => row.model === 'HBA123').claims, 2);
  assert.equal(result.productBreakdown.missingManufacturer, 1);
  assert.equal(result.productBreakdown.missingModel, 1);
});

test('metadata matching never assumes a default or borrows ARC shared kitchen metadata', () => {
  const contract = { contractType: 'ARC', appliances: [{ applianceType: 'oven', brand: 'bosch', articleNumber: 'CURRENT', isPresent: true }], kitchen: { items: [{ articleNumber: 'OTHER', catalogArticle: { articleNumber: 'OTHER', manufacturer: 'Amica' } }] } };
  assert.equal(resolveAscProduct(oven(), contract).manufacturer, 'BOSCH');
  assert.equal(resolveAscProduct(oven(), contract).manufacturerSource, 'inventoryType');
  assert.equal(resolveAscProduct(oven(), contract).model, '');
  assert.equal(resolveAscProduct(oven({ articleCode: 'CURRENT' }), contract).manufacturer, 'BOSCH');
  assert.equal(resolveAscProduct(oven({ articleCode: 'OTHER' }), contract).manufacturer, '');
  assert.equal(resolveAscProduct(oven({ model: 'OLD-MODEL' }), contract).model, 'OLD-MODEL');
  assert.equal(resolveAscProduct(oven({ articleCode: 'REFERENCE-ELECTRICAL' }), contract).model, '');
});

test('FRG exact catalog matches use recorded labels and codes while explicit claim data takes priority', () => {
  const contract = { contractType: 'FRG', kitchen: { items: [{ code: 'OVEN-A', articleNumber: 'HBA123', catalogArticle: { articleNumber: 'HBA123', name: 'Bosch oven' } }] } };
  const matched = resolveAscProduct(oven({ code: 'OVEN-A' }), contract);
  assert.equal(matched.manufacturer, 'BOSCH');
  assert.equal(matched.model, 'HBA123');
  assert.equal(matched.manufacturerSource, 'catalog');
  assert.equal(resolveAscProduct(oven({ code: 'OVEN-B' }), contract).manufacturer, '');
  assert.equal(resolveAscProduct(oven({ articleCode: 'HBA123', manufacturer: 'Siemens' }), contract).manufacturer, 'Siemens');
});

test('recurrence history cannot borrow matches from another kitchen or from after the selected period', () => {
  const result = summarizeAscDashboard([
    claim('other', '2026-10-01T10:00Z', [oven({ serialNumber: 'SN-1' })], { kitchenId: 'other' }),
    claim('now', '2026-10-30T10:00Z', [oven({ serialNumber: 'SN-1' })]),
    claim('future', '2026-11-05T10:00Z', [oven({ serialNumber: 'SN-1' })]),
  ], { period: '7d', now: '2026-11-01T12:00:00Z', kitchenKey: 'FRG:kitchen' });
  assert.equal(result.total, 1);
  assert.equal(result.productRecurrence.sameAppliance, 0);
  assert.equal(result.productRecurrence.rows.length, 0);
});
