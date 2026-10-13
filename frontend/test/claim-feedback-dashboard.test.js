import test from "node:test";
import assert from "node:assert/strict";
import { buildFeedbackDashboard, loadPxClaimFeedback, normalizeFeedbackFilters } from "../lib/claim-feedback-dashboard.js";

const invitation = (id, extra = {}) => ({
  id,
  claimId: id,
  contractNumber: `111${id}`,
  claimSequence: 1,
  ticketNumber: Number(id) || 1,
  fullName: "Alex Example",
  email: "alex@example.com",
  status: "ANSWERED",
  createdAt: new Date("2026-10-10T10:00:00Z"),
  sentAt: new Date("2026-10-10T10:05:00Z"),
  submittedAt: new Date("2026-10-11T10:00:00Z"),
  overallRating: 5,
  speedRating: 4,
  communicationRating: 5,
  resolved: "YES",
  comment: "Helpful service",
  ...extra,
});

test("keeps an older response visible after a claim is reopened, while invitations show its latest cycle", () => {
  const rows = [
    invitation("1", { id: "new", status: "SENT", submittedAt: null, overallRating: null, resolved: null, createdAt: new Date("2026-10-12T10:00:00Z") }),
    invitation("1", { id: "old", overallRating: 2, resolved: "PARTLY" }),
  ];
  const responses = buildFeedbackDashboard(rows, normalizeFeedbackFilters({ attention: "1" }));
  assert.equal(responses.summary.answered, 1);
  assert.equal(responses.summary.invited, 2);
  assert.equal(responses.summary.attention, 1);
  assert.deepEqual(responses.rows.map((row) => row.id), ["old"]);
  const invitations = buildFeedbackDashboard(rows, normalizeFeedbackFilters({ view: "invitations" }));
  assert.deepEqual(invitations.rows.map((row) => row.id), ["new"]);
});

test("filters responses by received date and customer search, without treating an invitation as a response", () => {
  const rows = [
    invitation("1", { submittedAt: new Date("2026-10-11T10:00:00Z") }),
    invitation("2", { fullName: "Sam Other", submittedAt: new Date("2026-09-01T10:00:00Z") }),
    invitation("3", { status: "FAILED", submittedAt: null, overallRating: null }),
  ];
  const result = buildFeedbackDashboard(rows, normalizeFeedbackFilters({ q: "alex", dateFrom: "2026-10-01", dateTo: "2026-10-31" }));
  assert.equal(result.total, 1);
  assert.equal(result.rows[0].claimId, "1");
  assert.equal(result.summary.answered, 2);
  assert.equal(result.summary.invited, 2);
});

test("a newer positive answer clears an older low rating from the attention queue", () => {
  const rows = [
    invitation("1", { id: "recent", overallRating: 5, resolved: "YES", submittedAt: new Date("2026-10-12T10:00:00Z") }),
    invitation("1", { id: "previous", overallRating: 1, resolved: "NO" }),
  ];
  const result = buildFeedbackDashboard(rows, normalizeFeedbackFilters({ attention: "1" }));
  assert.equal(result.summary.answered, 2);
  assert.equal(result.summary.attention, 0);
  assert.equal(result.total, 0);
});

test("database query scopes feedback to 111 contracts", async () => {
  const db = { $queryRaw: async (query) => {
    assert.match(query.sql, /REGEXP_REPLACE\(COALESCE\(sc\."contractNumber"/);
    assert.match(query.sql, /LIKE '111%'/);
    return [];
  } };
  const result = await loadPxClaimFeedback(db, {});
  assert.equal(result.summary.answered, 0);
});
