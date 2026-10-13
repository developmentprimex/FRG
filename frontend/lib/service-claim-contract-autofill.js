export function splitPersonName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return { givenName: "", surname: "" };
  }

  if (parts.length === 1) {
    return { givenName: parts[0], surname: "" };
  }

  return {
    givenName: parts.slice(0, -1).join(" "),
    surname: parts[parts.length - 1],
  };
}

export function buildServiceClaimAutofillFromContract(contract) {
  const address = contract?.address || {};
  const landlord = contract?.landlord || {};
  const registration = contract?.registration || {};
  const contact = splitPersonName(landlord.managerName);
  const customer = splitPersonName(registration.fullName);
  const registrationVerificationUnit = [
    address.address1,
    address.address2,
    contract?.unitNumber,
    contract?.floor,
    contract?.building,
    contract?.propertyObjectName,
  ].find((value) => String(value || "").trim());

  return {
    givenName: String(customer.givenName || "").trim(),
    surname: String(customer.surname || "").trim(),
    phone: String(registration.phone || "").trim(),
    email: String(registration.email || "").trim(),
    registrationVerificationPostalCode: String(address.postalCode || "").trim(),
    registrationVerificationUnit: String(registrationVerificationUnit || "").trim(),
    landlordCompanyName: String(landlord.companyName || "").trim(),
    landlordCompanyPhone: String(landlord.phone || "").trim(),
    landlordCompanyEmail: String(landlord.email || "").trim(),
    landlordContactGivenName: String(contact.givenName || "").trim(),
    landlordContactSurname: String(contact.surname || "").trim(),
  };
}
