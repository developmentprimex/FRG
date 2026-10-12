export function resolveServiceClaimEmailRecipient(contractNumber, env = process.env) {
  const normalizedContractNumber = String(contractNumber || "").trim().replace(/\s+/g, "");
  const envKey = ["111", "222"].some((prefix) => normalizedContractNumber.startsWith(prefix))
    ? "SERVICE_REQUEST_EMAIL"
    : "SERVICE_REQUEST_OTHER_EMAIL";

  return String(env[envKey] || "").trim();
}
