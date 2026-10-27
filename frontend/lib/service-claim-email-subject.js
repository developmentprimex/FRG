export function formatServiceClaimEmailSubject(contractNumber, claimSequence) {
  const parsedSequence = Number.parseInt(String(claimSequence), 10);
  const normalizedSequence = Number.isInteger(parsedSequence) && parsedSequence > 0
    ? parsedSequence
    : 1;

  return `Reklamation ${String(contractNumber || "").trim()} KD ${String(normalizedSequence).padStart(2, "0")}`;
}
