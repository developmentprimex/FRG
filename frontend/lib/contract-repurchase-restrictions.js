export const REPURCHASE_UNAVAILABLE_CODE = "REPURCHASE_UNAVAILABLE";
export const REPURCHASE_UNAVAILABLE_MESSAGE = "Diese Küche ist nicht für einen digitalen Nachkauf vorgesehen. Bitte kontaktieren Sie Ihren Vermieter über die alternativen Nachkaufmöglichkeiten.";

// These contracts remain eligible for service; only additional purchases are excluded.
const CONTRACTS_WITHOUT_REPURCHASE = new Set(["670105650"]);

export function isContractRepurchaseRestricted(contractNumber) {
  const normalized = String(contractNumber || "").trim().replace(/\s+/g, "");
  return CONTRACTS_WITHOUT_REPURCHASE.has(normalized);
}

export function assertContractAllowsRepurchase(contractNumber) {
  if (!isContractRepurchaseRestricted(contractNumber)) return;
  const error = new Error(REPURCHASE_UNAVAILABLE_MESSAGE);
  error.code = REPURCHASE_UNAVAILABLE_CODE;
  error.status = 403;
  throw error;
}
