import assert from "node:assert/strict";
import test from "node:test";
import { formatBusinessClaimReference } from "../lib/business-report-reference.js";
import { buildServiceClaimListWhere } from "../lib/service-claim-admin-query.js";
import { loadBusinessReportDetails } from "../lib/business-report-details.js";

test("report claim references work with the main schema and optional existing ticket numbers", async () => {
  assert.equal(formatBusinessClaimReference("670000001", 2), "670000001 KD 02");
  assert.equal(formatBusinessClaimReference("670000001", 2, "1020"), "#1020 670000001 KD 02");
  const records = await loadBusinessReportDetails({ period: "ALL" }, "ASC", {
    $queryRaw: async () => [{ contractNumber: "670000001", claimSequence: 2, ticketNumber: null }],
  });
  assert.equal(records[0].reference, "670000001 KD 02");
});

test("report claim dates use the full Berlin DST day while existing claim pages retain UTC dates", () => {
  const range = { dateFrom: "2026-10-25", dateTo: "2026-10-25" };
  const report = buildServiceClaimListWhere({ ...range, reportTimeZone: "Europe/Berlin" });
  const legacy = buildServiceClaimListWhere(range);
  assert.deepEqual(report.values.map(value => value.toISOString()), ["2026-10-24T22:00:00.000Z", "2026-10-25T23:00:00.000Z"]);
  assert.deepEqual(legacy.values.map(value => value.toISOString()), ["2026-10-25T00:00:00.000Z", "2026-10-25T23:59:59.999Z"]);
});
