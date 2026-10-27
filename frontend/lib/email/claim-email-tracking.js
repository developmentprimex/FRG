import addressparser from "nodemailer/lib/addressparser/index.js";
import { observeOrderEmailSend } from "./order-email-observer.js";
import { scheduleOrderEmailAttempt } from "./order-email-after.js";

export function scheduleClaimEmailAttempt(buildAttempt) {
  scheduleOrderEmailAttempt(buildAttempt, {
    save: async (attempt) => {
      const { saveClaimEmailAttempt } = await import("./claim-email-store.js");
      await saveClaimEmailAttempt(attempt);
    },
  });
}

export function buildClaimEmailDelivery({ recipient, receipt, skipped, failed, attemptedAt }) {
  const addresses = addressparser(String(recipient || ""), { flatten: true })
    .map((item) => item.address).filter(Boolean);
  const normalize = (value) => String(typeof value === "object" ? value?.address || "" : value || "").trim().toLowerCase();
  const accepted = new Set((receipt?.accepted || []).map(normalize));
  const rejected = new Set((receipt?.rejected || []).map(normalize));
  return {
    attemptedAt,
    messageId: String(receipt?.messageId || ""),
    recipients: (addresses.length ? addresses : [""]).map((email) => ({
      role: "service",
      email,
      status: skipped ? "SKIPPED" : failed ? "FAILED"
        : accepted.has(normalize(email)) ? "SENT"
          : rejected.has(normalize(email)) ? "FAILED" : "UNKNOWN",
    })),
  };
}

// Preserve the claim sender's true/false result and its original errors.
// Capturing the SMTP receipt only assigns a local variable; no storage runs.
export function observeClaimEmailSend({ claimId, recipient, send, schedule = scheduleClaimEmailAttempt }) {
  let receipt;
  return observeOrderEmailSend({
    send: () => send((value) => { receipt = value; }),
    schedule,
    buildAttempt: ({ result, failed, attemptedAt }) => ({
      claimId,
      delivery: buildClaimEmailDelivery({
        recipient: typeof recipient === "function" ? recipient() : recipient,
        receipt, skipped: result === false, failed, attemptedAt,
      }),
    }),
  });
}
