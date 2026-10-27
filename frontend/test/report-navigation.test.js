import assert from "node:assert/strict";
import test from "node:test";
import { getReportsReturnHref } from "../lib/report-navigation.js";

test("return navigation preserves report filters", () => {
  assert.equal(getReportsReturnHref("/admin/reports?dateFrom=2026-10-01&dateTo=2026-10-14&type=CLAIM&status=RECEIVED"), "/admin/reports?dateFrom=2026-10-01&dateTo=2026-10-14&type=CLAIM&status=RECEIVED");
  assert.equal(getReportsReturnHref(["/admin/reports?type=ORDER"]), "/admin/reports?type=ORDER");
});

test("return navigation accepts only the report page", () => {
  for (const value of [undefined, "https://example.com", "//example.com/admin/reports", "/admin/orders", "/admin/reports-other", "/admin/reports/../orders"]) {
    assert.equal(getReportsReturnHref(value), "");
  }
  assert.equal(getReportsReturnHref("/admin/reports"), "/admin/reports");
});

test("return navigation removes unrelated parameters", () => {
  assert.equal(getReportsReturnHref("/admin/reports?type=CLAIM&success=unused#section"), "/admin/reports?type=CLAIM");
});
