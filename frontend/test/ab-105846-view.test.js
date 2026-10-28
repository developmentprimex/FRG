import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import sharp from "sharp";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";
import { PLAN_IMAGE_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";

test("105846 view preserves the complete image from the revised PDF, including the fourth hob ring", async () => {
  const pdf = await PDFDocument.load(readFileSync(
    new URL("../public/pdfs/AB 105846.pdf", import.meta.url),
  ));
  const images = pdf.getPage(0).node.Resources().lookup(PDFName.of("XObject"), PDFDict);
  const sourceImages = images.entries().map(([, ref]) => pdf.context.lookup(ref)).filter(
    (object) => object instanceof PDFRawStream
      && object.dict.get(PDFName.of("Subtype"))?.toString() === "/Image",
  );
  assert.equal(sourceImages.length, 1);

  const svg = await loadKitchenSvgMarkup("ab-105846");
  const embedded = svg.match(/data:image\/jpeg;base64,([^"]+)/);
  assert.ok(embedded, "Use the current PDF image rather than the older vector drawing");
  assert.deepEqual(Buffer.from(embedded[1], "base64"), Buffer.from(sourceImages[0].contents));
  assert.match(svg, /matrix\(\.2399645075421473,0,0,\.2399494310998736,10\.92,9\.52\)/);
  assert.equal(PLAN_IMAGE_BY_SLUG["ab-105846"], "/plans/AB%20105846-view.svg?v=3");

  const visible = svg.replace(/<defs>[\s\S]*?<\/defs>/, "");
  assert.doesNotMatch(visible, /<image\b|<filter\b/, "Paint smooth contours rather than the thin source bitmap");

  // Check the ring that the older CAD drawing omitted, independently of the
  // retained source reference. Compare its source ink with the visible output.
  const source = await sharp(Buffer.from(embedded[1], "base64")).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rendered = await sharp(Buffer.from(svg), { density: 288 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let ringInk = 0;
  let retainedInk = 0;
  for (let y = 1338; y < 1360; y++) {
    for (let x = 2270; x < 2334; x++) {
      if (source.data[y * source.info.width + x] >= 180) continue;
      ringInk++;
      const px = Math.round((10.92 + x * .2399645075421473) * 4);
      const py = Math.round((9.52 + y * .2399494310998736) * 4);
      let minimum = 255;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        minimum = Math.min(minimum, rendered.data[(py + dy) * rendered.info.width + px + dx]);
      }
      if (minimum < 180) retainedInk++;
    }
  }
  assert.ok(ringInk > 100, "Sample the visible fourth ring in the source PDF");
  assert.ok(retainedInk / ringInk > .99, "The fourth ring must remain visible in the traced view");
});

test("105846 cabinet outlines remain continuous at normal plan sizes", async () => {
  const svg = await loadKitchenSvgMarkup("ab-105846");
  const edges = [
    [[395.64, 23.2], [483.48, 35.92]],
    [[57.12, 349.24], [447.6, 309.28]],
    [[653.52, 168.04], [758.04, 157.36]],
    [[653.52, 569.08], [758.04, 558.28]],
    [[572.16, 557.2], [653.52, 569.08]],
    [[653.52, 200], [653.52, 540]],
  ];
  for (const width of [760, 944, 1200]) {
    const { data, info } = await sharp(Buffer.from(svg), { density: 288 })
      .resize({ width }).flatten({ background: "#fff" }).greyscale().raw().toBuffer({ resolveWithObject: true });
    const scale = width / 842;
    for (const [start, end] of edges) {
      const steps = Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) * scale);
      for (let step = 1; step < steps; step++) {
        const x = Math.round((start[0] + (end[0] - start[0]) * step / steps) * scale);
        const y = Math.round((start[1] + (end[1] - start[1]) * step / steps) * scale);
        let minimum = 255;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          minimum = Math.min(minimum, data[(y + dy) * info.width + x + dx]);
        }
        assert.ok(minimum < 200, `Outline gap at ${width}px, page point ${x / scale}, ${y / scale}`);
      }
    }
  }
});

test("105846 layout family loads the same improved view in configurators and previews", async () => {
  const source = await loadKitchenSvgMarkup("ab-105846");
  for (const slug of ["ab-105849", "ab-105852", "ab-105855", "ab-105858", "ab-105861"]) {
    assert.equal(PLAN_IMAGE_BY_SLUG[slug], PLAN_IMAGE_BY_SLUG["ab-105846"]);
    assert.equal(await loadKitchenSvgMarkup(slug), source);
  }
});
