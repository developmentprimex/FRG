import assert from "node:assert/strict";
import test from "node:test";
import { formatAdminDate, REPORT_TIME_ZONE, toTimeZoneWallClockDate } from "../lib/admin-date-time.js";

test("admin timestamps preserve their stored wall-clock time", () => {
  const storedClaimTime = "2026-08-25T10:53:00.000Z";

  assert.equal(formatAdminDate(storedClaimTime, "en"), "25 August 2026, 10:53");
  assert.equal(formatAdminDate(storedClaimTime, "de"), "25. August 2026, 10:53");
});

test("contract access timestamps display Berlin summer time in both languages", () => {
  const accessTime = "2026-10-12T07:44:00.000Z";
  assert.equal(formatAdminDate(accessTime, "en", "Europe/Berlin"), "12 October 2026, 09:44");
  assert.equal(formatAdminDate(accessTime, "de", "Europe/Berlin"), "12. Oktober 2026, 09:44");
});

test("contract access timestamps adjust automatically to Berlin winter time", () => {
  const accessTime = "2026-12-12T07:44:00.000Z";
  assert.equal(formatAdminDate(accessTime, "en", "Europe/Berlin"), "12 December 2026, 08:44");
  assert.equal(formatAdminDate(accessTime, "de", "Europe/Berlin"), "12. Dezember 2026, 08:44");
});

test("report timezone handles summer, winter and midnight consistently with Excel", () => {
  assert.equal(REPORT_TIME_ZONE, "Europe/Berlin");
  assert.equal(formatAdminDate("2026-10-12T07:44:00Z", "en", REPORT_TIME_ZONE), "12 October 2026, 09:44");
  assert.equal(toTimeZoneWallClockDate("2026-10-12T07:44:00Z", REPORT_TIME_ZONE).toISOString(), "2026-10-12T09:44:00.000Z");
  assert.equal(toTimeZoneWallClockDate("2026-12-12T07:44:00Z", REPORT_TIME_ZONE).toISOString(), "2026-12-12T08:44:00.000Z");
  assert.equal(toTimeZoneWallClockDate("2026-10-14T22:30:00Z", REPORT_TIME_ZONE).toISOString(), "2026-10-15T00:30:00.000Z");
  assert.equal(toTimeZoneWallClockDate(null, REPORT_TIME_ZONE), null);
  assert.equal(toTimeZoneWallClockDate("invalid", REPORT_TIME_ZONE), null);
});
