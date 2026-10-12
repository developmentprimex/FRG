import assert from "node:assert/strict";
import test from "node:test";
import { formatAdminDate } from "../lib/admin-date-time.js";

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
