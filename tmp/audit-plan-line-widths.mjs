import fs from 'node:fs';
import path from 'node:path';
import { PLAN_IMAGE_BY_SLUG } from '../frontend/lib/kitchen-plan-preview-data.js';
const groups = new Map();
for (const [slug, image] of Object.entries(PLAN_IMAGE_BY_SLUG)) {
  if (!image.endsWith('.svg')) continue;
  const file = path.join('frontend/public', decodeURIComponent(image));
  if (!fs.existsSync(file)) continue;
  if (!groups.has(file)) groups.set(file, []);
  groups.get(file).push(slug);
}
for (const [file, slugs] of groups) {
  const svg = fs.readFileSync(file, 'utf8');
  const widths = new Map();
  for (const [element] of svg.matchAll(/<path\b[^>]*\/>/g)) {
    if (!/stroke="#(?:000000|303030)"/.test(element)) continue;
    const width = element.match(/stroke-width="([\d.]+)"/);
    if (!width) continue;
    const transform = element.match(/transform="matrix\(([^)]+)\)"/);
    let scale = 1;
    if (transform) {
      const [a,b,c,d] = transform[1].split(/[\s,]+/).map(Number);
      scale = Math.sqrt(Math.abs(a*d-b*c));
    }
    const effective = (Number(width[1])*scale).toFixed(3);
    widths.set(effective, (widths.get(effective)||0)+1);
  }
  const thin = [...widths].filter(([width]) => Number(width) < 0.5).reduce((sum,[,count]) => sum+count, 0);
  if (thin >= 20) console.log(JSON.stringify({file, slugs, thinPaths:thin, widths:Object.fromEntries(widths)}));
}
