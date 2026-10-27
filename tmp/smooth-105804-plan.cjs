const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../frontend');
const req = createRequire(path.join(root, 'package.json'));
const sharp = req('sharp');
const file = path.join(root, 'public/plans/670 105804.svg');
const original = fs.readFileSync(file, 'utf8');
let changed = 0;
const svg = original.replace(/<path\b[^>]*\/>/g, element => {
  const transform = element.match(/transform="matrix\(([^)]+)\)"/);
  let scale = 1;
  if (transform) {
    const [a,b,c,d] = transform[1].split(/[\s,]+/).map(Number);
    scale = Math.sqrt(Math.abs(a*d-b*c));
  }
  if (scale <= 0) return element;
  return element.replace(/stroke-width="([\d.]+)"/g, (match,width) => {
    if (Number(width)*scale >= 0.64999) return match;
    changed++;
    return `stroke-width="${Number((0.65/scale).toPrecision(7))}"`;
  });
});
async function main() {
  fs.writeFileSync(file, svg);
  const output = path.join(root, 'public/plans/670 105804-smooth.png');
  await sharp(Buffer.from(svg)).resize(3368,2380).flatten({background:'#fff'}).png().toFile(output);
  console.log({changed, output, width:3368, height:2380});
}
main().catch(error=>{console.error(error);process.exitCode=1;});
