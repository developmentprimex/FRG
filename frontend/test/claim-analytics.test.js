import test from "node:test";
import assert from "node:assert/strict";
import { buildClaimAnalytics, claimContactKey, classifyClaimArea, extractClaimAnalyticsAreas } from "../lib/claim-analytics.js";
import { workDayStart } from "../lib/work-processing-rules.js";

const now = new Date("2026-10-12T12:00:00Z");
const cabinet = { componentId: "component-wall-cabinet-1", code: "CAB-WALL-600", name: "Wall cabinet" };
const appliance = { componentId: "component-claim-dishwasher", code: "DISH-600", name: "Dishwasher" };
const claim = (id, extra = {}) => ({ id, contractNumber: "670123", fullName: "Alex", email: "alex@example.com", createdAt: "2026-10-01T12:00:00Z", problemAreasJson: JSON.stringify([cabinet]), ...extra });

test("classifies installed appliances separately from furniture, fronts, filters and other parts", () => {
  for (const area of [appliance, { name: "Geschirrspüler" }, { componentId: "reference-electrical-1", name: "Unknown model" }]) assert.equal(classifyClaimArea(area), "electrical");
  for (const area of [cabinet, { name: "Unterschrank 60 cm" }, { name: "Oberschrank mit Dunstabzugshaube", code: "CAB-HOOD-600" }, { componentId: "component-claim-furniture-front", name: "Dishwasher front" }, { componentId: "component-claim-sink-cabinet", name: "Sink cabinet" }]) assert.equal(classifyClaimArea(area), "cabinets");
  for (const area of [{ name: "Worktop" }, { name: "Extractor hood filter", claimPartKey: "filter" }, { code: "REFERENCE-FURNITURE", componentId: "reference-furniture-2", name: "Worktop" }]) assert.equal(classifyClaimArea(area), "other");
  assert.equal(classifyClaimArea({ name: "Unspecified issue" }), "unknown");
});

test("counts claims once per category and item, preserves mixed claims", () => {
  const data = buildClaimAnalytics([claim("1", { problemAreasJson: JSON.stringify([cabinet, cabinet, { ...cabinet, componentId: "component-wall-cabinet-2" }, appliance]) }), claim("2")], { now });
  assert.equal(data.summary.total, 2);
  assert.equal(data.categories.find((row) => row.key === "cabinets").claims, 2);
  assert.equal(data.categories.find((row) => row.key === "electrical").claims, 1);
  assert.equal(data.items.find((row) => row.code === cabinet.code).claims, 2);
  assert.equal(data.summary.mixed, 1);
  assert.equal(data.summary.multiItem, 1);
});

test("normalizes email and phone, does not merge users by name or missing contacts", () => {
  assert.equal(claimContactKey({ email: "  ALEX@Example.COM " }), "email:alex@example.com");
  assert.equal(claimContactKey({ phone: "0049 123-456" }), claimContactKey({ phone: "+49 (123) 456" }));
  assert.equal(claimContactKey({ fullName: "Alex" }), null);
  const data = buildClaimAnalytics([claim("1"), claim("2", { email: " ALEX@example.com " }), claim("3", { email: "other@example.com" }), claim("4", { email: null }), claim("5", { email: null })], { now });
  assert.equal(data.summary.uniqueUsers, 2);
  assert.equal(data.summary.repeatUsers, 1);
  assert.equal(data.summary.missingContact, 2);
});

test("period user counts are distinct from lifetime counts across kitchens", () => {
  const selected = [claim("1", { kitchenId: "a" })];
  const history = [...selected, claim("older", { kitchenId: "b", createdAt: "2026-08-01" }), claim("px", { contractNumber: "111000" })];
  const data = buildClaimAnalytics(selected, { now, history });
  assert.equal(data.users[0].claims, 1);
  assert.equal(data.users[0].lifetimeClaims, 2);
  assert.equal(data.summary.repeatUsers, 0);
  assert.equal(data.summary.returningUsers, 1);
});

test("does not collapse reference furniture or different reference appliances into one item", () => {
  const data = buildClaimAnalytics([claim("1", { problemAreasJson: JSON.stringify([{ componentId: "reference-electrical-1", code: "REFERENCE-ELECTRICAL", name: "Oven" }, { componentId: "reference-electrical-2", code: "REFERENCE-ELECTRICAL", name: "Refrigerator" }]) })], { now });
  assert.equal(data.items.length, 2);
  assert.equal(data.categories.find((row) => row.key === "electrical").claims, 1);
});

test("legacy selected-area headers are parsed; free text and malformed JSON are not guessed", () => {
  assert.deepEqual(extractClaimAnalyticsAreas({ problemAreasJson: "bad", problemDescription: "Kitchen areas:\nWall cabinet: broken door\nDishwasher: not starting\n\nDetails" }).map((row) => row.name), ["Wall cabinet", "Dishwasher"]);
  assert.equal(extractClaimAnalyticsAreas({ problemDescription: "My dishwasher broke" }).length, 0);
  assert.equal(extractClaimAnalyticsAreas({ problemDescription: "Ausgewählte Küchenbereiche:\n- Unterschrank\n- Kühlschrank\n\nOther details" }).length, 2);
  const data = buildClaimAnalytics([claim("1", { problemAreasJson: "[]", problemDescription: "No selected areas" })], { now });
  assert.equal(data.categories.find((row) => row.key === "unknown").claims, 1);
});

test("uses work processing deadlines and recorded completion dates", () => {
  const data = buildClaimAnalytics([claim("recent", { createdAt: "2026-10-02T12:00:00Z" }), claim("attention", { createdAt: "2026-10-01T12:00:00Z" }), claim("old", { createdAt: "2026-09-16T12:00:00Z" }), claim("done", { createdAt: "2026-09-01T12:00:00Z", processing: { status: "DONE", completedAt: "2026-09-03T12:00:00Z" } })], { now });
  assert.deepEqual(data.aging.map((row) => row.claims), [1, 1, 1]);
  assert.equal(data.summary.open, 3);
  assert.equal(data.summary.done, 1);
  assert.equal(data.summary.overdue, 1);
  assert.equal(data.summary.averageCompletionDays, 2);
  assert.equal(data.summary.medianCompletionDays, 2);
  assert.equal(data.summary.p90CompletionDays, 2);
  assert.equal(data.summary.oldestOpenDays, 26);
});

test("completion spread uses only completed claims with a valid completion date", () => {
  const data = buildClaimAnalytics([
    claim("one", { processing: { status: "DONE", completedAt: "2026-10-02T12:00:00Z" } }),
    claim("three", { processing: { status: "DONE", completedAt: "2026-10-04T12:00:00Z" } }),
    claim("nine", { processing: { status: "DONE", completedAt: "2026-10-10T12:00:00Z" } }),
    claim("missing", { processing: { status: "DONE" } }),
  ], { now });
  assert.equal(data.summary.completionSamples, 3);
  assert.equal(data.summary.medianCompletionDays, 3);
  assert.equal(data.summary.p90CompletionDays, 9);
});

test("completion trend counts closures by their own date across submission cohorts", () => {
  const startDate = workDayStart("2026-10-10");
  const selected = [claim("new", { createdAt: "2026-10-11T12:00:00Z" })];
  const history = [
    ...selected,
    claim("old-completed", { createdAt: "2026-09-01T12:00:00Z", processingStatus: "DONE", completedAt: "2026-10-10T12:00:00Z" }),
    claim("old-open", { createdAt: "2026-09-02T12:00:00Z", processingStatus: "OPEN", completedAt: null }),
  ];
  const data = buildClaimAnalytics(selected, { now, startDate, history });
  assert.equal(data.summary.total, 1);
  assert.equal(data.summary.completedInPeriod, 1);
  assert.deepEqual(data.timeline, [
    { date: "2026-10-10", claims: 0, completed: 1 },
    { date: "2026-10-11", claims: 1, completed: 0 },
    { date: "2026-10-12", claims: 0, completed: 0 },
  ]);
});

test("work day boundaries follow Berlin daylight saving time", () => {
  assert.equal(workDayStart("2026-01-15").toISOString(), "2026-01-14T23:00:00.000Z");
  assert.equal(workDayStart("2026-07-15").toISOString(), "2026-07-14T22:00:00.000Z");
  assert.equal(workDayStart("2026-10-25").toISOString(), "2026-10-24T22:00:00.000Z");
});

test("empty evidence arrays and generated previews do not count as uploaded evidence", () => {
  const data = buildClaimAnalytics([claim("empty", { attachmentsJson: "[]" }), claim("preview", { attachmentsJson: JSON.stringify([{ filename: "plan.png", role: "kitchen_preview", contentType: "image/png" }]) }), claim("photo", { attachmentsJson: JSON.stringify([{ filename: "damage.jpg", contentType: "image/jpeg" }]) }), claim("invalid", { attachmentsJson: "broken" })], { now });
  assert.equal(data.summary.withFiles, 1);
  assert.equal(data.summary.withPhotos, 1);
});

test("excludes test contracts and future claims from counts and history", () => {
  const data = buildClaimAnalytics([claim("live"), claim("test", { contractNumber: " 111 000 " }), claim("future", { createdAt: "2027-01-01" })], { now });
  assert.equal(data.summary.total, 1);
  assert.equal(data.users[0].lifetimeClaims, 1);
});

test("fills daily gaps and compares the same-length previous period for the selected kitchen", () => {
  const startDate = new Date("2026-10-10T00:00:00Z");
  const selected = [claim("1", { kitchenId: "a", createdAt: "2026-10-11T12:00:00Z" })];
  const history = [...selected, claim("previous", { kitchenId: "a", createdAt: "2026-10-08T12:00:00Z" }), claim("different-kitchen", { kitchenId: "b", createdAt: "2026-10-08T12:00:00Z" }), claim("too-old", { kitchenId: "a", createdAt: "2026-10-06T12:00:00Z" })];
  const data = buildClaimAnalytics(selected, { now, startDate, history, kitchenId: "a" });
  assert.equal(data.summary.previousPeriod, 1);
  assert.deepEqual(data.timeline, [{ date: "2026-10-10", claims: 0, completed: 0 }, { date: "2026-10-11", claims: 1, completed: 0 }, { date: "2026-10-12", claims: 0, completed: 0 }]);
});

test("rolls long-range trends into months and merges city case variations", () => {
  const data = buildClaimAnalytics([claim("1", { createdAt: "2026-08-01", clientCity: " Hamburg " }), claim("2", { clientCity: "hamburg" })], { now });
  assert.equal(data.monthly, true);
  assert.deepEqual(data.timeline.map((row) => row.claims), [1, 0, 1]);
  assert.equal(data.cities.length, 1);
  assert.equal(data.cities[0].claims, 2);
});

test("empty selections have safe zero counts and missing-duration values", () => {
  const data = buildClaimAnalytics([], { now });
  assert.equal(data.summary.total, 0);
  assert.equal(data.summary.averageCompletionDays, null);
  assert.equal(data.summary.medianCompletionDays, null);
  assert.equal(data.summary.p90CompletionDays, null);
  assert.equal(data.summary.averageOpenDays, null);
  assert.deepEqual(data.users, []);
  assert.deepEqual(data.timeline, []);
});
