import test from 'node:test';
import assert from 'node:assert/strict';
import { getAscClaimItem } from '../lib/asc-claim-item-labels.js';
import { summarizeAscDashboard } from '../lib/asc-dashboard-summary.js';

test('English and German legacy product labels share an identity and bilingual display labels', () => {
  for (const [english, german] of [['Dishwasher', 'Geschirrspüler'], ['Extractor hood', 'Dunstabzugshaube'], ['Fridge / freezer', 'Kühlschrank'], ['Tap light', 'Armaturenleuchte']]) {
    const en = getAscClaimItem({ name: english }, 'other');
    const de = getAscClaimItem({ name: german }, 'other');
    assert.equal(en.key, de.key);
    assert.equal(en.name, english);
    assert.ok(en.nameDe);
    assert.deepEqual(en, de);
  }
});

test('selected parts distinguish dishwasher furniture from the appliance and retain left/right cabinets', () => {
  const front = getAscClaimItem({ name: 'Dishwasher front', componentId: 'component-claim-furniture-front' }, 'cabinets');
  assert.equal(front.name, 'Furniture front');
  assert.notEqual(front.key, getAscClaimItem({ name: 'Geschirrspüler' }, 'electrical').key);
  assert.notEqual(getAscClaimItem({ name: 'Wall Cabinet left' }, 'cabinets').key, getAscClaimItem({ name: 'Oberschrank rechts' }, 'cabinets').key);
});

test('unknown user text is not displayed as a product; explicitly saved bilingual custom products remain intact', () => {
  const unknown = getAscClaimItem({ name: 'Dies ist nur ein Hinweis' }, 'unknown');
  assert.equal(unknown.name, 'Unspecified item');
  assert.equal(unknown.nameDe, 'Nicht zugeordneter Artikel');
  const custom = getAscClaimItem({ name: 'Custom bracket', nameDe: 'Individueller Halter' }, 'other');
  assert.equal(custom.name, 'Custom bracket');
  assert.equal(custom.nameDe, 'Individueller Halter');
});

test('unrecognized products with real article codes keep distinct identities and readable identifiers', () => {
  const a = getAscClaimItem({ name: 'Sonderteil A', articleCode: 'A-123' }, 'other');
  const b = getAscClaimItem({ name: 'Sonderteil B', articleCode: 'B-123' }, 'other');
  assert.notEqual(a.key, b.key);
  assert.equal(a.name, 'Other component · A-123');
  assert.equal(a.nameDe, 'Sonstige Komponente · A-123');
});

test('custom bilingual products keep distinct real article identities and count each product within a case', () => {
  const a = { name: 'Custom bracket', nameDe: 'Individueller Halter', articleCode: 'A-123' };
  const b = { ...a, articleCode: 'B-123' };
  assert.notEqual(getAscClaimItem(a, 'other').key, getAscClaimItem(b, 'other').key);
  const summary = summarizeAscDashboard([{ id: 'custom', contractNumber: '670123456', problemAreasJson: JSON.stringify([a, b, a]) }]);
  assert.equal(summary.total, 1);
  assert.equal(summary.items.length, 2);
  assert.deepEqual(summary.items.map(item => item.claims), [1, 1]);
});

test('rankings combine translations across cases and count the same product once within a case', () => {
  const claim = (id, names) => ({ id, contractNumber: id, createdAt: '2026-11-06T10:00:00Z', problemAreasJson: JSON.stringify(names.map(name => ({ name }))) });
  const summary = summarizeAscDashboard([claim('1', ['Dishwasher', 'Geschirrspüler']), claim('2', ['Geschirrspüler']), claim('3', ['Dunstabzugshaube'])]);
  assert.equal(summary.total, 3);
  assert.equal(summary.items.length, 2);
  assert.equal(summary.items[0].name, 'Dishwasher');
  assert.equal(summary.items[0].nameDe, 'Geschirrspüler');
  assert.equal(summary.items[0].claims, 2);
});
