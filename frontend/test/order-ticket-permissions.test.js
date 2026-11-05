import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { hasPermission, canAccess, routePermission } from "../lib/admin-permissions.js";
import { canAccessClaim, canAccessPx } from "../lib/admin-roles.js";

const source = readFileSync(new URL("../app/api/admin/work-processing/route.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace("export async function", "async function");

function fixture(admin) {
  const calls = [];
  const context = vm.createContext({ URL, hasPermission, canAccessClaim, canAccessPx,
    WORK_TYPES: ["CLAIM", "ORDER"],
    requireAdminApi: async required => {
      if (!canAccess(admin, required)) throw Object.assign(new Error("Forbidden"), { status: 403 });
      return admin;
    },
    prisma: {
      orderTicket: { findUnique: async ({ where }) => { calls.push("read-order"); return { ticketSeries: where.id === "px" ? "px" : "live" }; } },
      serviceClaim: { findUnique: async () => { calls.push("read-claim"); return { contractNumber: "670" }; } },
    },
    updateWorkProcessing: async data => { calls.push(data.workType); return { status: "DONE", version: 1 }; },
    after: () => { throw new Error("Order completion must not send claim feedback."); },
    NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) },
  });
  vm.runInContext(source, context);
  return { calls, run: (workType, workId = "live", origin = null) => context.POST({
    url: "http://localhost/api/admin/work-processing", headers: { get: name => name === "origin" ? origin : null },
    json: async () => ({ workType, workId, status: "DONE", expectedVersion: 0 }),
  }) };
}

test("ticket pages follow FRG and PX permissions", () => {
  assert.equal(routePermission("/admin/order-tickets/a"), "FRG_VIEW");
  assert.equal(routePermission("/admin/px-order-tickets/a"), "PX_FRG_VIEW");
  for (const role of ["ADMIN", "USER", "PX_ADMIN", "SUPERADMIN"]) {
    for (const permissions of [[], ["ASC"], ["FRG"], ["ASC", "FRG"]]) {
      const admin = { role, permissions };
      assert.equal(canAccess(admin, routePermission("/admin/order-tickets")), role === "SUPERADMIN" || permissions.includes("FRG"));
      assert.equal(canAccess(admin, routePermission("/admin/px-order-tickets")), role === "SUPERADMIN" || role === "PX_ADMIN" && permissions.includes("FRG"));
    }
  }
});

test("processing scopes block cross-workspace reads and PX order closure before mutations", async () => {
  for (const [permissions, type, expected] of [[["ASC"], "ORDER", 403], [["FRG"], "CLAIM", 403], [["FRG"], "ORDER", 200], [["ASC"], "CLAIM", 200], [[], "ORDER", 403]]) {
    const { calls, run } = fixture({ role: "ADMIN", permissions, email: "worker@example.com" });
    assert.equal((await run(type)).status, expected);
    if (expected === 403) assert.deepEqual(calls, []);
  }
  const ordinary = fixture({ role: "ADMIN", permissions: ["FRG"], email: "worker@example.com" });
  assert.equal((await ordinary.run("ORDER", "px")).status, 403);
  assert.deepEqual(ordinary.calls, ["read-order"]);
  const px = fixture({ role: "PX_ADMIN", permissions: ["FRG"], email: "worker@example.com" });
  assert.equal((await px.run("ORDER", "px")).status, 200);
  assert.deepEqual(px.calls, ["read-order", "ORDER"]);
});

test("cross-origin requests cannot close tickets", async () => {
  const { calls, run } = fixture({ role: "SUPERADMIN", email: "worker@example.com" });
  assert.equal((await run("ORDER", "live", "https://untrusted.example")).status, 403);
  assert.deepEqual(calls, []);
});
