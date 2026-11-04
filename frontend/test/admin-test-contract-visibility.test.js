import assert from "node:assert/strict";
import test from "node:test";
import { canAccess, canViewTestContracts, routePermission } from "../lib/admin-permissions.js";

test("workspace grants do not grant visibility of 111 test contracts", () => {
  for (const role of ["ADMIN", "USER", "PX_ADMIN", "SUPERADMIN"]) {
    for (const permissions of [[], ["FRG"], ["ASC"], ["FRG", "ASC"]]) {
      assert.equal(canViewTestContracts({ role, permissions }), ["PX_ADMIN", "SUPERADMIN"].includes(role));
    }
  }
  assert.equal(canViewTestContracts(null), false);
});

test("visitor pages follow the corresponding workspace permission", () => {
  for (const [page, scope] of [["contract-access", "FRG"], ["claim-activity", "ASC"]]) {
    const required = routePermission(`/admin/${page}`);
    assert.equal(required, `${scope}_VIEW`);
    for (const permissions of [[], ["FRG"], ["ASC"], ["FRG", "ASC"]]) {
      assert.equal(canAccess({ role: "ADMIN", permissions }, required), permissions.includes(scope));
    }
    assert.equal(canAccess({ role: "SUPERADMIN" }, required), true);
  }
  assert.equal(routePermission("/admin/users"), "SUPERADMIN");
});
