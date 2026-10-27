export function formatServiceClaimReference(contractNumber, claimSequence, ticketNumber) {
  const parsedSequence = Number.parseInt(String(claimSequence), 10);
  const normalizedSequence = Number.isInteger(parsedSequence) && parsedSequence > 0
    ? parsedSequence
    : 1;

  const ticket = Number(ticketNumber);
  const prefix = Number.isSafeInteger(ticket) && ticket >= 1000 ? `#${ticket} ` : "";
  return `${prefix}${String(contractNumber || "").trim()} KD ${String(normalizedSequence).padStart(2, "0")}`;
}

export function formatServiceClaimEmailSubject(contractNumber, claimSequence, ticketNumber) {
  const reference = formatServiceClaimReference(contractNumber, claimSequence, ticketNumber);
  return reference.startsWith("#") ? `${reference} – Reklamation` : `Reklamation ${reference}`;
}
