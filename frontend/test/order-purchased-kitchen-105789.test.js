import assert from "node:assert/strict";
import test from "node:test";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import {
  buildOrderConfirmationAttachmentLabels,
  buildPurchasedKitchenOverlaySvg,
  generatePurchasedKitchenPdf,
  loadKitchenPlanPreviewData,
  preparePurchasedKitchenPlanGeometry,
} from "../lib/email/order-notifications.js";

const order = {
  id: "purchased-kitchen-check",
  orderNumber: "670105789-1",
  createdAt: "2026-10-07T08:00:00Z",
  kitchen: { slug: "ab-105789", name: "105 789" },
  customer: { contractNumber: "670105789" },
  components: [
    { componentKey: "worktop", isLocked: true },
    { componentKey: "oven-module", isLocked: true },
    { componentKey: "sink-base", isLocked: true },
    { componentKey: "sink-faucet", isLocked: true },
    { componentKey: "refrigerator" },
    { componentKey: "dishwasher-base" },
    { componentKey: "wall-cabinet-1" },
  ],
};

test("email metadata loads modular 105789 geometry and keeps earlier kitchen layouts available", async () => {
  const preview = await loadKitchenPlanPreviewData();
  assert.equal(preview.imageViews[order.kitchen.slug], "/plans/670%20105789-smooth.png");
  assert.equal(preview.hotspotsBySlug[order.kitchen.slug].length, 38);
  assert.ok(preview.hotspotsBySlug["ab-105778"].length > 0);
  assert.deepEqual(preview.linkedGroupsBySlug[order.kitchen.slug], [["component-wall-cabinet-1", "component-extractor-hood"]]);
  for (const slug of ["ab-105789", "ab-105778"]) {
    const labels = await buildOrderConfirmationAttachmentLabels({ ...order, kitchen: { slug } });
    assert.ok(labels.some((entry) => entry.key === "purchased-kitchen"));
  }
  const geometry = preparePurchasedKitchenPlanGeometry(order, preview.hotspotsBySlug[order.kitchen.slug]);
  const overlay = buildPurchasedKitchenOverlaySvg({ order, ...geometry, width: 1400, height: 1000, linkedGroups: preview.linkedGroupsBySlug[order.kitchen.slug] }).toString();
  assert.match(overlay, /rgba\(37,99,235,0\.26\)/);
  assert.match(overlay, /rgba\(62,188,116,0\.34\)/);
});

test("105789 generates the purchased-kitchen PDF attachment with its rendered sketch", async () => {
  const attachment = await generatePurchasedKitchenPdf(order);
  assert.equal(attachment.filename, "Gekaufte-Kueche-670105789-1.pdf");
  const bytes = Buffer.from(attachment.base64, "base64");
  assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  const images = pdf.getPage(0).node.Resources().lookup(PDFName.of("XObject"), PDFDict);
  assert.ok(images.entries().some(([, reference]) => pdf.context.lookup(reference).dict?.get(PDFName.of("Subtype")) === PDFName.of("Image")), "page embeds the kitchen sketch image");
  assert.ok(bytes.length > 20000, "attachment contains the rendered kitchen sketch");
});
