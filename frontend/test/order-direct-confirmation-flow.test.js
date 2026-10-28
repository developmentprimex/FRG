import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ordersPath = path.join(__dirname, "..", "lib", "orders.js");
const stripePaymentsPath = path.join(__dirname, "..", "lib", "stripe-payments.js");
const kitchenPagePath = path.join(__dirname, "..", "app", "kitchens", "[slug]", "page.js");
const kitchenAccessPath = path.join(__dirname, "..", "app", "api", "kitchen-access", "route.js");
const ordersSource = fs.readFileSync(ordersPath, "utf8");
const stripePaymentsSource = fs.readFileSync(stripePaymentsPath, "utf8");
const kitchenPageSource = fs.readFileSync(kitchenPagePath, "utf8");
const kitchenAccessSource = fs.readFileSync(kitchenAccessPath, "utf8");

test("order creation does not send confirmation or webhook before payment", () => {
  assert.doesNotMatch(ordersSource, /getDirectOrderConfirmationEnabled/);
  assert.match(ordersSource, /runEmail:\s*false/);
  assert.match(ordersSource, /runWebhook:\s*false/);
});

test("paid Stripe checkout sends automatic confirmation after successful payment", () => {
  assert.match(stripePaymentsSource, /getDirectOrderConfirmationEnabled/);
  assert.match(stripePaymentsSource, /maybeSendPaidOrderConfirmation\(updatedOrder,\s*\{\s*orderKind\s*\}\)/);
  assert.match(stripePaymentsSource, /paymentStatus:\s*isPaid \? "PAID"/);
  assert.match(stripePaymentsSource, /await sendOrderConfirmationEmail\(\{\s*order\s*\}\)/);
  assert.match(stripePaymentsSource, /getMissingEmailSmtpConfig\(\)/);
  assert.match(stripePaymentsSource, /Skipping paid order confirmation email/);
  assert.match(stripePaymentsSource, /Could not send paid order confirmation email/);
  assert.match(stripePaymentsSource, /data:\s*orderStatusUpdateData\("CONFIRMED",\s*orderRecord\)/);
  assert.match(stripePaymentsSource, /orderStatus === "CONFIRMED" \|\| orderStatus === "EMAILED" \|\| orderStatus === "CANCELLED"/);
});

test("PX test checkout uses test order table and test Stripe metadata", () => {
  assert.match(stripePaymentsSource, /session\.metadata\?\.orderKind/);
  assert.match(stripePaymentsSource, /getOrderDelegate\(prisma,\s*orderKind\)/);
  assert.match(stripePaymentsSource, /orderKind,/);
  assert.match(stripePaymentsSource, /stripeMode,/);
});

test("PX test contracts load test order state in the configurator", () => {
  assert.match(kitchenPageSource, /getOrderKindForContractNumber\(contract\.contractNumber\)/);
  assert.match(kitchenPageSource, /getContractOrderState\(contract\.id,\s*prisma,\s*orderKind\)/);
  assert.match(kitchenPageSource, /getOrderDelegate\(prisma,\s*returnOrderKind\)\.findUnique/);
  assert.match(kitchenAccessSource, /getOrderKindForContractNumber\(contract\.contractNumber\)/);
  assert.match(kitchenAccessSource, /getContractOrderState\(contract\.id,\s*prisma,\s*orderKind\)/);
});
