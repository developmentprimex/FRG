export function resolveServiceClaimEmailRecipient(contractNumber, env = process.env) {
  const normalizedContractNumber = String(contractNumber || "").trim().replace(/\s+/g, "");
  const envKey = ["111", "222"].some((prefix) => normalizedContractNumber.startsWith(prefix))
    ? "SERVICE_REQUEST_EMAIL"
    : "SERVICE_REQUEST_OTHER_EMAIL";

  return String(env[envKey] || "").trim();
}

export function resolveServiceClaimEmailCc(contractType, kitchenPlan, contractNumber) {
  if (contractType !== "ARC" || kitchenPlan?.selectionMode !== "reference-pdf") return undefined;

  const normalizedContractNumber = String(contractNumber || "").trim().replace(/\s+/g, "");
  return normalizedContractNumber.startsWith("670")
    ? "verwaltung@hbi-wohnen.de"
    : "334primex.eu@gmail.com";
}
