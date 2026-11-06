import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAscProduct } from '../lib/asc-dashboard-insights.js';
import { summarizeAscDashboard } from '../lib/asc-dashboard-summary.js';
const appliance = (applianceType, brand, extra = {}) => ({ applianceType, brand, isPresent: true, ...extra });
const contract = { contractType: 'ARC', appliances: [appliance('fridge', 'bosch'), appliance('dishwasher', 'aeg'), appliance('extractor_hood', 'amica'), appliance('oven', 'Siemens', { articleNumber: 'CURRENT' })] };

test('legacy ARC appliance labels resolve manufacturers from that contract inventory without requiring article numbers', () => {
  for (const [name, brand] of [['Fridge / freezer','BOSCH'], ['Kühlschrank','BOSCH'], ['Dishwasher','AEG'], ['Geschirrspüler','AEG'], ['Dunstabzugshaube','Amica'], ['Oven','Siemens']]) {
    const result = resolveAscProduct({ name, componentId: 'reference-electrical-legacy-1', code: 'REFERENCE-ELECTRICAL' }, contract);
    assert.equal(result.manufacturer, brand, name);
    assert.equal(result.manufacturerSource, 'inventoryType');
    assert.equal(result.model, '', 'A type match must not invent a historical model');
  }
});

test('recorded brand and model win; a different known article or model prevents type fallback', () => {
  const oven = { name: 'Oven', componentId: 'reference-electrical-oven' };
  assert.equal(resolveAscProduct({ ...oven, manufacturer: 'Historical' }, contract).manufacturer, 'Historical');
  assert.equal(resolveAscProduct({ ...oven, articleCode: 'OLD' }, contract).manufacturer, '');
  assert.equal(resolveAscProduct({ ...oven, code: 'OLD-ARTICLE' }, contract).manufacturer, '');
  assert.equal(resolveAscProduct({ ...oven, model: 'OLD' }, contract).manufacturer, '');
  assert.equal(resolveAscProduct({ ...oven, articleCode: 'CURRENT' }, contract).manufacturerSource, 'inventory');
});

test('does not borrow appliance brands for furniture, ambiguous inventories, absent appliances or missing contracts', () => {
  const fridge = { name: 'Fridge / freezer', applianceType: 'fridge', code: 'REFERENCE-ELECTRICAL' };
  for (const appliances of [[], [appliance('fridge', 'bosch', { isPresent: false })], [appliance('fridge', '')], [appliance('fridge', 'bosch'), appliance('fridge', 'aeg')], [appliance('fridge', 'bosch'), appliance('fridge', '')]]) {
    assert.equal(resolveAscProduct(fridge, { appliances }).manufacturer, '');
  }
  assert.equal(resolveAscProduct(fridge).manufacturer, '');
  for (const area of [
    { name: 'Dishwasher front', componentId: 'reference-furniture-1', applianceType: 'dishwasher' },
    { name: 'Filter', componentId: 'reference-electrical-filter-1' },
    { name: 'Wall cabinet beside refrigerator', componentId: 'reference-furniture-2' },
    { name: 'Oven / hob set', claimPartKey: 'oven-set' },
    { ...fridge, applianceType: 'unknown' },
  ]) assert.equal(resolveAscProduct(area, contract).manufacturer, '');
});

test('brands explicitly named in saved product labels are usable without inventing models', () => {
  const result = resolveAscProduct({ name: 'Bosch oven', componentId: 'component-claim-oven' });
  assert.equal(result.manufacturer, 'BOSCH');
  assert.equal(result.manufacturerSource, 'claim');
  assert.equal(result.model, '');
});

test('manufacturer rankings count cases once after matching translated products against inventory', () => {
  const summary = summarizeAscDashboard([{ id: 'a', contractNumber: '670123456', contract, problemAreasJson: JSON.stringify([{ name: 'Fridge / freezer' }, { name: 'Kühlschrank' }]) }]);
  assert.equal(summary.productBreakdown.manufacturers.length, 1);
  assert.equal(summary.productBreakdown.manufacturers[0].name, 'BOSCH');
  assert.equal(summary.productBreakdown.manufacturers[0].claims, 1);
  assert.deepEqual(summary.productBreakdown.manufacturers[0].sources, ['inventoryType']);
  assert.equal(summary.productBreakdown.missingModel, 1);
});
