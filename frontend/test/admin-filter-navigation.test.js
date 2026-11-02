import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_FILTER_SEARCH_DELAY, buildAdminFilterHref, createFilterScheduler } from "../lib/admin-filter-navigation.js";

test("filter changes reset pagination and preserve search, date, and report scope", () => {
  const href = buildAdminFilterHref("/admin/reports", [
    ["page", "8"], ["q", "  Müller & Söhne  "], ["contractType", "ARC"],
    ["dateFrom", "2026-11-01"], ["period", "CUSTOM"], ["status", ""],
  ]);
  const url = new URL(href, "http://localhost");
  assert.equal(url.pathname, "/admin/reports");
  assert.equal(url.searchParams.get("q"), "Müller & Söhne");
  assert.equal(url.searchParams.get("contractType"), "ARC");
  assert.equal(url.searchParams.get("dateFrom"), "2026-11-01");
  assert.equal(url.searchParams.get("period"), "CUSTOM");
  assert.equal(url.searchParams.has("page"), false);
  assert.equal(url.searchParams.has("status"), false);
  assert.equal(buildAdminFilterHref("/admin/contracts", [["q", "  "]]), "/admin/contracts");
});

test("typing waits 700 ms after the last edit and submits only the latest search", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let query = "a";
  const searches = [];
  const scheduler = createFilterScheduler(() => searches.push(query));
  assert.equal(ADMIN_FILTER_SEARCH_DELAY, 700);
  scheduler.schedule();
  t.mock.timers.tick(500);
  query = "arc";
  scheduler.schedule();
  t.mock.timers.tick(699);
  assert.deepEqual(searches, []);
  t.mock.timers.tick(1);
  assert.deepEqual(searches, ["arc"]);
  assert.equal(scheduler.waiting, false);
});

test("dropdown/date changes include pending text without a second delayed navigation", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let navigations = 0;
  const scheduler = createFilterScheduler(() => navigations++);
  scheduler.schedule();
  t.mock.timers.tick(300);
  scheduler.schedule(true);
  t.mock.timers.tick(0);
  assert.equal(navigations, 1);
  t.mock.timers.tick(1000);
  assert.equal(navigations, 1);
});

test("Clear, Enter, composition, and leaving a page can cancel queued searches", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let navigations = 0;
  const scheduler = createFilterScheduler(() => navigations++);
  scheduler.schedule();
  scheduler.cancel();
  t.mock.timers.tick(1000);
  assert.equal(navigations, 0);
  assert.equal(scheduler.waiting, false);
});
