import assert from "node:assert/strict";
import test from "node:test";
import { formatServiceClaimEmailSubject, formatServiceClaimReference } from "../lib/service-claim-email-subject.js";

test("global ticket number prefixes the reference without changing the contract sequence", () => {
  assert.equal(formatServiceClaimReference("670105809", 2, 1020), "#1020 670105809 KD 02");
  assert.equal(formatServiceClaimEmailSubject("670105809", 2, 1020), "#1020 670105809 KD 02 – Reklamation");
  assert.equal(formatServiceClaimReference("670105809", 100, 1000), "#1000 670105809 KD 100");
});

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
