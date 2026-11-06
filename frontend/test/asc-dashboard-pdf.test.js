import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { PDFParse } from 'pdf-parse';
import { summarizeAscDashboard } from '../lib/asc-dashboard-summary.js';
import { buildAscDashboardPdf } from '../lib/asc-dashboard-pdf.js';

const fonts = Object.fromEntries(['regular', 'bold'].map((style, index) => [style, fs.readFileSync(new URL(`../public/pdf-fonts/LiberationSans-${index ? 'Bold' : 'Regular'}.ttf`, import.meta.url)).toString('base64')]));
const sample = (count = 12) => summarizeAscDashboard(Array.from({ length: count }, (_, index) => ({ id: `case-${index}`, contractNumber: `670${String(index).padStart(6, '0')}`, contractType: 'ARC', contractId: `contract-${index}`, kitchenId: 'shared-upload', createdAt: `2026-10-${String(index % 20 + 1).padStart(2, '0')}T10:00:00Z`, fullName: 'Customer ÄÖÜ', clientCity: 'Düsseldorf', problemAreasJson: JSON.stringify([{ name: 'Oven', manufacturer: 'BOSCH', model: 'HBA123' }]) })));
async function extract(doc) {
  const bytes = new Uint8Array(doc.output('arraybuffer'));
  const parsed = await PDFDocument.load(bytes);
  const parser = new PDFParse({ data: bytes });
  try { return { text: (await parser.getText()).text, pages: parsed.getPageCount(), bytes }; } finally { await parser.destroy(); }
}

test('exports the full filtered overview, not only the first eight visible kitchens', async () => {
  const summary = sample();
  const doc = buildAscDashboardPdf(summary, { fonts, language: 'en', generatedAt: new Date('2026-11-06T11:00Z'), filters: [['Date range', 'All time'], ['Kitchen source', 'ARC'], ['Claim category', 'Electrical appliances']] });
  const result = await extract(doc);
  assert.ok(result.pages >= 2);
  for (const text of ['Claims overview', 'ARC', 'Electrical appliances', 'BOSCH', 'HBA123', 'Düsseldorf', '670000011', '670000000', 'Claims per kitchen', 'Claims by manufacturer', 'Claims by model / article', 'Latest claims']) assert.ok(result.text.includes(text), 'Missing ' + text);
  assert.ok(!result.text.includes('How these figures are counted'));
  assert.ok(result.text.includes('10:00'), 'Claim timestamps match the admin table wall-clock display');
});

test('exports German headings, umlauts, active filters and period comparison', async () => {
  const dictionary = JSON.parse(fs.readFileSync(new URL('../locales/admin.de.json', import.meta.url), 'utf8')).ascDashboard;
  const summary = sample();
  summary.comparison = { start: '2026-10-25T23:00:00Z', end: '2026-11-01T23:00:00Z', previousStart: '2026-10-18T22:00:00Z', previousEnd: '2026-10-25T23:00:00Z', current: 12, previous: 8, delta: 4, changePercent: 50 };
  const result = await extract(buildAscDashboardPdf(summary, { fonts, language: 'de', translate: (key, fallback) => dictionary[key] || fallback, filters: [['Zeitraum', 'Letzte 7 Tage'], ['Kategorie', 'Elektrogeräte']] }));
  for (const text of ['Reklamationen im Überblick', 'Letzte 7 Tage', 'Elektrogeräte', 'Düsseldorf', '+50%', 'Vorheriger Zeitraum']) assert.ok(result.text.includes(text), 'Missing ' + text);
});

test('empty results produce a valid report and the repeat-only table filter is honored', async () => {
  const empty = await extract(buildAscDashboardPdf(summarizeAscDashboard([]), { fonts }));
  assert.ok(empty.text.includes('No claims for these filters.'));
  assert.ok(!empty.text.includes('NaN'));
  const result = await extract(buildAscDashboardPdf(sample(), { fonts, onlyRepeats: true }));
  assert.ok(result.text.includes('Only kitchens with repeat claims'));
  assert.ok(result.text.includes('No kitchens with repeat claims for these filters.'));
});

test('long tables paginate without losing rows or breaking multi-page text', async () => {
  const summary = sample(65);
  summary.productBreakdown.models = [{ key: 'long', model: 'MODEL-'.repeat(80), manufacturer: 'Manufacturer with a very long recorded name '.repeat(8), name: 'Oven', nameDe: 'Backofen', claims: 1, sources: ['claim'] }];
  const result = await extract(buildAscDashboardPdf(summary, { fonts }));
  assert.ok(result.pages > 3);
  assert.ok(result.text.includes('670000064'));
  assert.ok(result.text.includes('670000000'));
});
