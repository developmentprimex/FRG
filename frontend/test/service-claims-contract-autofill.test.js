import assert from "node:assert/strict";
import test from "node:test";
import {
  buildServiceClaimAutofillFromContract,
  splitPersonName,
} from "../lib/service-claim-contract-autofill.js";

test("splitPersonName splits a full name into given name and surname", () => {
  assert.deepEqual(splitPersonName("Max Mustermann"), {
    givenName: "Max",
    surname: "Mustermann",
  });
  assert.deepEqual(splitPersonName("Anna"), {
    givenName: "Anna",
    surname: "",
  });
});

test("buildServiceClaimAutofillFromContract leaves client address for manual entry and maps landlord fields", () => {
  const autofill = buildServiceClaimAutofillFromContract({
    contractNumber: "670104296",
    floor: "2",
    unitNumber: "14",
    address: {
      country: "Germany",
      address1: "Invalidenstrasse 10",
      address2: "Hinterhaus",
      postalCode: "10115",
      city: "Berlin",
    },
    landlord: {
      companyName: "Anna Schmidt Housing GmbH",
      email: "anna.schmidt@example.com",
      phone: "+49 30 555 0101",
      managerName: "Clara Kontakt",
    },
  });

  for (const field of [
    "clientCountry",
    "clientAddressLine1",
    "clientAddressLine2",
    "clientPostalCode",
    "clientCity",
    "clientFloor",
    "clientUnitNumber",
  ]) {
    assert.equal(Object.hasOwn(autofill, field), false, `${field} must be entered by the client`);
  }
  assert.equal(autofill.registrationVerificationPostalCode, "10115");
  assert.equal(autofill.registrationVerificationUnit, "Invalidenstrasse 10");
  assert.equal(autofill.landlordCompanyName, "Anna Schmidt Housing GmbH");
  assert.equal(autofill.landlordCompanyPhone, "+49 30 555 0101");
  assert.equal(autofill.landlordCompanyEmail, "anna.schmidt@example.com");
  assert.equal(autofill.landlordContactGivenName, "Clara");
  assert.equal(autofill.landlordContactSurname, "Kontakt");
  assert.equal(autofill.landlordPhone, undefined);
  assert.equal(autofill.landlordEmail, undefined);
});

for (const contractNumber of ["670104332", "111104332"]) {
test(`${contractNumber} uses its confirmed supplier address instead of the shared project address`, () => {
  const autofill = buildServiceClaimAutofillFromContract({
    contractNumber,
    floor: "3",
    unitNumber: "3B",
    address: {
      country: "Germany",
      city: "Munich",
      postalCode: "64410",
      address1: "Hermannstal 92-114",
      address2: "Shared project",
    },
  });
  assert.equal(autofill.clientCountry, "Germany");
  assert.equal(autofill.clientCity, "Hamburg");
  assert.equal(autofill.clientPostalCode, "22149");
  assert.equal(autofill.clientAddressLine1, "Theodor-Storm-Str. 7-9");
  assert.equal(autofill.clientAddressLine2, "");
  assert.equal(autofill.clientFloor, "");
  assert.equal(autofill.clientUnitNumber, "");
  assert.equal(autofill.registrationVerificationPostalCode, "22149");
  assert.equal(autofill.registrationVerificationUnit, "Theodor-Storm-Str. 7-9");
});
}

test("670104332 leaves landlord company name blank while retaining its client address", () => {
  const autofill = buildServiceClaimAutofillFromContract({
    contractNumber: "670104332",
    landlord: { companyName: "ARGE N\u00f6rdliche Riedsiedlung" },
  });
  assert.equal(autofill.landlordCompanyName, "");
  assert.equal(autofill.clientAddressLine1, "Theodor-Storm-Str. 7-9");
  assert.equal(autofill.clientCity, "Hamburg");
  assert.equal(autofill.clientPostalCode, "22149");
});

test("buildServiceClaimAutofillFromContract maps active registration customer fields", () => {
  const autofill = buildServiceClaimAutofillFromContract({
    registration: {
      fullName: "Lena Beispiel",
      email: "lena@example.com",
      phone: "+49 170 123456",
    },
  });

  assert.equal(autofill.givenName, "Lena");
  assert.equal(autofill.surname, "Beispiel");
  assert.equal(autofill.email, "lena@example.com");
  assert.equal(autofill.phone, "+49 170 123456");
});
