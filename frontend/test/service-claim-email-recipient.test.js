import assert from "node:assert/strict";
import test from "node:test";

import { resolveServiceClaimEmailCc, resolveServiceClaimEmailRecipient } from "../lib/service-claim-email-recipient.js";

const env = {
  SERVICE_REQUEST_EMAIL: "140primex.eu@gmail.com",
  SERVICE_REQUEST_OTHER_EMAIL: "kd@myarchitecto.de",
};

test("copies HBI for 670 ARC sketch claims and Primex for other ARC sketch claims", () => {
  const sketchPlan = { selectionMode: "reference-pdf" };
  assert.equal(resolveServiceClaimEmailCc("ARC", sketchPlan, "670123456"), "verwaltung@hbi-wohnen.de");
  assert.equal(resolveServiceClaimEmailCc("ARC", sketchPlan, " 670 123 456 "), "verwaltung@hbi-wohnen.de");
  for (const contractNumber of ["671123456", "111123456", "222123456", "ARC-123"]) {
    assert.equal(resolveServiceClaimEmailCc("ARC", sketchPlan, contractNumber), "334primex.eu@gmail.com");
  }
  for (const contractNumber of ["670123456", "671123456"]) {
    assert.equal(resolveServiceClaimEmailCc("ARC", { selectionMode: "interactive" }, contractNumber), undefined);
    assert.equal(resolveServiceClaimEmailCc("ARC", null, contractNumber), undefined);
    assert.equal(resolveServiceClaimEmailCc("PX", sketchPlan, contractNumber), undefined);
    assert.equal(resolveServiceClaimEmailCc("AB", sketchPlan, contractNumber), undefined);
  }
});

test("routes 111 and 222 contract claims to the existing service request recipient", () => {
  for (const contractNumber of ["111123456", " 111 123 456 ", "222123456", " 222 123 456 "]) {
    assert.equal(resolveServiceClaimEmailRecipient(contractNumber, env), "140primex.eu@gmail.com");
  }
});

test("routes all other contract claims to the other-contract recipient", () => {
  assert.equal(resolveServiceClaimEmailRecipient("670123456", env), "kd@myarchitecto.de");
  assert.equal(resolveServiceClaimEmailRecipient("223123456", env), "kd@myarchitecto.de");
  assert.equal(resolveServiceClaimEmailRecipient("ARC-123", env), "kd@myarchitecto.de");
});

test("does not fall back to the other recipient when the 111/222 recipient is missing", () => {
  for (const contractNumber of ["111123456", "222123456"]) {
    assert.equal(resolveServiceClaimEmailRecipient(contractNumber, {
      SERVICE_REQUEST_OTHER_EMAIL: "kd@myarchitecto.de",
    }), "");
  }
});

test("does not fall back to the 111 recipient when the other-contract recipient is missing", () => {
  assert.equal(
    resolveServiceClaimEmailRecipient("670123456", {
      SERVICE_REQUEST_EMAIL: "315@example.com",
    }),
    "",
  );
});
