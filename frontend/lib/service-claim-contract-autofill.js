import contractClientAddressDefaults from "./contract-client-address-defaults.cjs";

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
  const contractNumber = String(contract?.contractNumber || "").trim().replace(/\s+/g, "");
  const clientAddressDefault = Object.hasOwn(contractClientAddressDefaults, contractNumber)
    ? contractClientAddressDefaults[contractNumber]
    : null;
  const address = clientAddressDefault || contract?.address || {};
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
    ...(clientAddressDefault ? {
      clientCountry: clientAddressDefault.country,
      clientCity: clientAddressDefault.city,
      clientPostalCode: clientAddressDefault.postalCode,
      clientAddressLine1: clientAddressDefault.address1,
      clientAddressLine2: clientAddressDefault.address2,
      clientFloor: clientAddressDefault.floor,
      clientUnitNumber: clientAddressDefault.unitNumber,
    } : {}),
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
