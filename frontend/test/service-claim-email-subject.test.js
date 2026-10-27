import assert from "node:assert/strict";
import test from "node:test";
import { formatServiceClaimEmailSubject } from "../lib/service-claim-email-subject.js";

test("formats a two-digit KD sequence per contract", () => {
  assert.equal(
    formatServiceClaimEmailSubject("670105805", 1),
    "Reklamation 670105805 KD 01",
  );
  assert.equal(
    formatServiceClaimEmailSubject("670105805", 2),
    "Reklamation 670105805 KD 02",
  );
});

test("allows claim sequences above two digits", () => {
  assert.equal(
    formatServiceClaimEmailSubject("670105805", 100),
    "Reklamation 670105805 KD 100",
  );
});
