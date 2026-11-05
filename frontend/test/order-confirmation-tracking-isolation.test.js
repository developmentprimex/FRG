import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setImmediate as nextTurn } from "node:timers/promises";
import vm from "node:vm";
import test from "node:test";
import { orderStatusUpdateData } from "../lib/order-confirmation-date.js";

const ordersSource = readFileSync(new URL("../lib/orders.js", import.meta.url), "utf8");
const stripeSource = readFileSync(new URL("../lib/stripe-payments.js", import.meta.url), "utf8");
const flows = [
  { name: "confirmOrder", source: ordersSource, confirms: true },
  { name: "resendOrderEmail", source: ordersSource, confirms: false },
  { name: "maybeSendPaidOrderConfirmation", source: stripeSource, confirms: true },
];

for (const flow of flows) {
  for (const outcome of ["success", "partial", "failure"]) {
    test(`${flow.name}: original ${outcome} behavior has no tracking writes in the order workflow`, async (t) => {
      t.mock.method(console, "error", () => {});
      const writes = [];
      let sends = 0;
      let trackingCalls = 0;
      const smtpError = new Error("SMTP unavailable");
      const order = { id: "order-id", orderNumber: "100001-1", status: "NEW", paymentStatus: "PAID" };
      const context = vm.createContext({
        console,
        orderStatusUpdateData,
        ORDER_KIND_LIVE: "live",
        OrderStatus: { CONFIRMED: "CONFIRMED", CANCELLED: "CANCELLED" },
        prisma: {
          $executeRaw: () => {
            trackingCalls += 1;
            throw new Error("Email tracking must never access the database");
          },
        },
        getOrderRecordForOperations: async () => order,
        buildOrderForNotificationsWithConfirmedBaseline: async () => order,
        readEmailOverrides: () => ({}),
        getOrderDelegate: () => ({ update: async (input) => { writes.push(input); } }),
        getDirectOrderConfirmationEnabled: async () => true,
        isTestOrderKind: () => false,
        getMissingEmailSmtpConfig: () => [],
        sendOrderConfirmationEmail: async (options) => {
          sends += 1;
          assert.equal(Object.hasOwn(options, "recordDelivery"), false);
          assert.strictEqual(options.order, order);
          if (outcome === "failure") throw smtpError;
          return {
            accepted: outcome === "partial" ? ["customer@example.com"] : ["customer@example.com", "sender@example.com"],
            rejected: outcome === "partial" ? ["sender@example.com"] : [],
          };
        },
      });
      const start = flow.source.indexOf(`async function ${flow.name}(`);
      const nextExport = flow.source.indexOf("\nexport ", start);
      const functionSource = flow.source.slice(start, nextExport < 0 ? undefined : nextExport);
      vm.runInContext(functionSource, context);
      let completed = false;
      let returnedError;
      const operation = context[flow.name](flow.name === "maybeSendPaidOrderConfirmation" ? order : order.id)
        .then(() => { completed = true; }, (error) => { completed = true; returnedError = error; });
      await nextTurn();
      assert.equal(completed, true, "the existing workflow must not wait for tracking");
      await operation;
      assert.equal(sends, 1, "tracking must never retry sending");
      assert.equal(trackingCalls, 0);
      const shouldConfirm = flow.confirms && outcome !== "failure";
      assert.equal(writes.length, shouldConfirm ? 1 : 0);
      if (shouldConfirm) {
        assert.deepEqual(Object.keys(writes[0].data), ["status", "confirmedAt"]);
        assert.equal(writes[0].data.status, "CONFIRMED");
        assert.ok(writes[0].data.confirmedAt instanceof Date);
      }
      const shouldThrow = outcome === "failure" && flow.name !== "maybeSendPaidOrderConfirmation";
      assert.strictEqual(returnedError, shouldThrow ? smtpError : undefined);
    });
  }
}
