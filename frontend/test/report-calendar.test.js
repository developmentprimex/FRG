import assert from "node:assert/strict";
import test from "node:test";
import { calendarDays, calendarDate, calendarKey, shiftCalendarMonth, calendarValueAllowed, normalizeCalendarValue } from "../lib/report-calendar.js";

test("report calendar uses complete Monday-first weeks across months, leap years and DST", () => {
  for (const month of ["2026-10", "2024-02", "2026-03", "2026-12"]) {
    const days = calendarDays(month);
    assert.equal(days.length, 42);
    assert.equal(calendarDate(days[0]).getUTCDay(), 1);
    assert.equal(calendarDate(days[41]).getUTCDay(), 0);
    assert.equal(new Set(days).size, 42);
    assert(days.includes(`${month}-01`));
  }
  assert(calendarDays("2024-02").includes("2024-02-29"));
  assert.equal(calendarKey(calendarDate("2026-10-25")), "2026-10-25");
  assert.equal(shiftCalendarMonth("2026-12", 1), "2027-01");
  assert.equal(shiftCalendarMonth("2026-01", -1), "2025-12");
});

test("date and month selection respect inclusive bounds without excluding today", () => {
  assert(calendarValueAllowed("2026-10-29", "", "2026-10-29"));
  assert(!calendarValueAllowed("2026-10-30", "", "2026-10-29"));
  assert(calendarValueAllowed("2026-10", "", "2026-10"));
  assert(!calendarValueAllowed("2026-11", "", "2026-10"));
  assert(calendarValueAllowed("2026-01-01", "2026-01-01", ""));
  assert(!calendarValueAllowed("2025-12-31", "2026-01-01", ""));
});

test("shared admin calendars handle empty and invalid filter values without crashing", () => {
  for (const value of [undefined, "", "invalid", "2026-13-01", "2026-02-30", "2026-04-31", "2026-1-1", "2026-10-29extra"]) {
    assert.equal(normalizeCalendarValue(value), "");
  }
  assert.equal(normalizeCalendarValue("2024-02-29"), "2024-02-29");
  assert.equal(normalizeCalendarValue("2026-10-29"), "2026-10-29");
  assert.equal(normalizeCalendarValue("2026-10", "month"), "2026-10");
  assert.equal(normalizeCalendarValue("2026-13", "month"), "");
});
