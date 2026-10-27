import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { ADMIN_ROLES, hasFullAdminAccess, canAccessPx, canAccessClaim, parseAdminRole, formatAdminRoleLabel } from "../lib/admin-roles.js";
import { getAdminUserActionRestrictions } from "../lib/admin-user-management.js";

function loadSource(relative, context) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\s*$/gm, "")
    .replace(/export (async function|function|const)/g, "$1");
  vm.runInContext(source, context);
}

for (const role of ADMIN_ROLES) {
  test(`${role} has the agreed section and claim permissions`, () => {
    const admin = { role };
    const full = ["SUPERADMIN", "PX_ADMIN"].includes(role);
    assert.equal(hasFullAdminAccess(admin), full);
    assert.equal(canAccessPx(admin), full);
    assert.equal(canAccessClaim(admin, " 1 1 1 123456"), full);
    assert.equal(canAccessClaim(admin, "670103832"), true);
  });
  test(`${role} page and API guards enforce full access`, async () => {
    const context = vm.createContext({
      hasFullAdminAccess, requireAdminPage: async () => ({ role }), requireAdminApi: async () => ({ role }),
      redirect: () => { throw new Error("redirected"); },
    });
    loadSource("../lib/admin-role-guards.js", context);
    if (hasFullAdminAccess({ role })) {
      assert.equal((await context.requireSuperAdminPage()).role, role);
      assert.equal((await vm.runInContext("requirePxAdminApi()", context)).role, role);
    } else {
      await assert.rejects(vm.runInContext("requirePxAdminPage()", context), /redirected/);
      await assert.rejects(context.requireSuperAdminApi(), error => error.status === 403);
    }
  });
}

test("PX Admin is selectable and last actual superadmin remains protected", () => {
  assert.equal(parseAdminRole("px_admin"), "PX_ADMIN");
  assert.equal(formatAdminRoleLabel("PX_ADMIN"), "PX Admin");
  assert.equal(hasFullAdminAccess(null), false);
  assert.equal(canAccessClaim(null, "670103832"), false);
  const users = [{ id: "super", role: "SUPERADMIN", isActive: true }, { id: "px", role: "PX_ADMIN", isActive: true }];
  const restrictions = getAdminUserActionRestrictions(users[0], "px", users);
  assert.equal(restrictions.canDelete, false);
  assert.equal(restrictions.canDeactivate, false);
  assert.equal(restrictions.canChangeRole, false);
});

for (const relative of ["px-orders/route.js", "px-orders/[id]/route.js", "px-orders/[id]/attachments/[type]/route.js", "px-claims/route.js"]) {
  test(`ADMIN direct API access is denied before reading data: ${relative}`, async () => {
    const context = vm.createContext({
      requirePxAdminApi: async () => { throw Object.assign(new Error("Forbidden"), { status: 403 }); },
      NextResponse: { json: (body, options) => ({ body, status: options.status }) },
    });
    loadSource(`../app/api/admin/${relative}`, context);
    for (const method of ["GET", "POST"]) {
      if (typeof context[method] !== "function") continue;
      const result = await context[method]({}, { params: Promise.resolve({ id: "test", type: "test" }) });
      assert.equal(result.status, 403);
    }
  });
}

test("shared claim delete, attachments and processing APIs reject PX claims for ADMIN", async () => {
  for (const relative of ["claims/[id]/route.js", "claims/[id]/attachments/[index]/route.js", "work-processing/route.js"]) {
    const context = vm.createContext({
      URL, canAccessClaim, canAccessPx,
      requireAdminClaimsApi: async () => ({ role: "ADMIN" }),
      requireAdminApi: async () => ({ role: "ADMIN", email: "admin@example.com" }),
      NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) },
      prisma: { serviceClaim: { findUnique: async () => ({ contractNumber: "111123456" }) } },
      queryServiceClaimById: async () => [{ contractNumber: "111123456" }],
      WORK_TYPES: ["CLAIM"],
    });
    loadSource(`../app/api/admin/${relative}`, context);
    const request = { url: "http://localhost:3001/api/admin/work-processing", headers: { get: () => null }, json: async () => ({ workType: "CLAIM", workId: "px-claim", status: "DONE" }) };
    const method = relative.includes("attachments") ? "GET" : "POST";
    const result = await context[method](request, { params: Promise.resolve({ id: "px-claim", index: "0" }) });
    assert.equal(result.status, 403, relative);
  }
});

test("PX_ADMIN can read PX orders through the API", async () => {
  const context = vm.createContext({
    URL, requirePxAdminApi: async () => ({ role: "PX_ADMIN" }),
    getTestOrdersForAdmin: async () => [{ id: "px-order" }],
    NextResponse: { json: body => ({ body, status: 200 }) },
  });
  loadSource("../app/api/admin/px-orders/route.js", context);
  const result = await context.GET({ url: "http://localhost:3001/api/admin/px-orders" });
  assert.equal(result.status, 200);
  assert.equal(result.body[0].id, "px-order");
});
