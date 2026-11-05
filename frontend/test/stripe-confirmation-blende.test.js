import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { buildOrderSummaryHtml } from "../lib/email/order-notifications.js";
import { orderStatusUpdateData } from "../lib/order-confirmation-date.js";

// Next resolves extensionless local imports; use the same resolution in Node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && context.parentURL) {
      const candidate = new URL(`${specifier}.js`, context.parentURL);
      if (fs.existsSync(candidate)) return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { buildOrderForNotifications } = await import("../lib/orders.js");

test("Stripe paid confirmation includes each cabinet's linked filler without changing the total", async () => {
  const source = fs.readFileSync(new URL("../lib/stripe-payments.js", import.meta.url), "utf8")
    .replace(/^import[\s\S]*?from\s+["'][^"']+["'];\s*/gm, "")
    .replace(/^export /gm, "");
  let emailHtml;
  let confirmed = false;
  const delegate = {
    async update({ data, include }) {
      if (!include) {
        confirmed = data.status === "CONFIRMED";
        return {};
      }
      const linked = include.items.include.kitchenItem?.include?.catalogBlende;
      return {
        id: "test-order", orderNumber: "111111539-1", status: "NEW",
        paymentStatus: data.paymentStatus, totalPrice: 334,
        createdAt: new Date("2026-09-14T10:00:00Z"),
        kitchen: { id: "test-kitchen", slug: "ab-111539", name: "111539" },
        items: [["H6002", 184], ["H3002", 150]].map(([article, price]) => ({
          code: article, itemType: "COMPONENT", priceSnapshot: price,
          nameSnapshot: article, quantity: 1,
          kitchenItem: {
            articleNumber: article, blendeCode: "HPK2002",
            blendeLabel: "Passblende bis 20 cm", blendePrice: 0,
            catalogBlendeId: "filler", catalogBlendeQuantity: 1,
            ...(linked ? { catalogBlende: {
              code: "HPK2002", nameDe: "Passblende bis 20 cm", price: 35,
            } } : {}),
          },
        })),
      };
    },
  };
  const context = vm.createContext({
    console, URL, prisma: {}, ORDER_KIND_LIVE: "live",
    orderStatusUpdateData,
    getOrderDelegate: () => delegate,
    isTestOrderKind: () => true,
    getMissingEmailSmtpConfig: () => [],
    buildOrderForNotificationsWithConfirmedBaseline: async (orderRecord) =>
      buildOrderForNotifications(orderRecord),
    sendOrderConfirmationEmail: async ({ order }) => {
      emailHtml = buildOrderSummaryHtml(order).replace(/\u00a0/g, " ");
    },
  });
  vm.runInContext(source, context);
  await context.updateOrderFromCheckoutSession({
    id: "checkout-test", client_reference_id: "111111539-1", payment_status: "paid",
  }, { orderKind: "test" });

  assert.equal(confirmed, true);
  assert.equal((emailHtml.match(/Typen-Nr\.: HPK2002/g) || []).length, 2);
  assert.match(emailHtml, /149,00/);
  assert.match(emailHtml, /115,00/);
  assert.equal((emailHtml.match(/35,00/g) || []).length, 2);
  assert.match(emailHtml, /Gesamtpreis: 334,00/);
});
