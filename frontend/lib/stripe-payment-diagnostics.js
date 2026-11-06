// Only codes are retained. Never store Stripe payloads, card details or error messages.
export const STRIPE_DIAGNOSTIC_EVENTS = [
  "payment_intent.payment_failed", "payment_intent.requires_action", "payment_intent.canceled",
  "checkout.session.completed", "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed", "checkout.session.expired",
];

function code(value) {
  return typeof value === "string" && /^[a-z0-9_]{1,100}$/i.test(value) ? value : null;
}

export function describeStripePaymentEvent(event) {
  if (!STRIPE_DIAGNOSTIC_EVENTS.includes(event?.type)) return null;
  const object = event.data?.object;
  if (!object?.id) return null;
  const errorCode = code(object.last_payment_error?.code);
  const declineCode = code(object.last_payment_error?.decline_code);
  let step = "payment_failed";
  let reason = "unknown_failure";
  if (event.type === "checkout.session.expired") { step = "checkout_expired"; reason = "session_expired"; }
  else if (event.type === "payment_intent.requires_action") { step = "payment_requires_action"; reason = "additional_action"; }
  else if (event.type === "payment_intent.canceled") { step = "payment_canceled"; reason = "canceled"; }
  else if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    const paid = ["paid", "no_payment_required"].includes(object.payment_status);
    step = paid ? "payment_paid" : "payment_pending";
    reason = paid ? "paid" : "pending";
  } else {
    const value = declineCode || errorCode;
    const reasons = {
      insufficient_funds: "insufficient_funds", expired_card: "expired_card",
      incorrect_cvc: "incorrect_cvc", invalid_cvc: "incorrect_cvc",
      incorrect_number: "incorrect_number", invalid_number: "incorrect_number",
      invalid_expiry_month: "invalid_expiry", invalid_expiry_year: "invalid_expiry",
      authentication_required: "authentication_failed", payment_intent_authentication_failure: "authentication_failed",
      card_declined: "bank_declined", generic_decline: "bank_declined", do_not_honor: "bank_declined",
      processing_error: "processing_error", card_not_supported: "card_not_supported",
      currency_not_supported: "card_not_supported", transaction_not_allowed: "bank_declined",
      fraudulent: "blocked", lost_card: "bank_declined", stolen_card: "bank_declined",
    };
    reason = reasons[value] || "unknown_failure";
  }
  return { step, reason, errorCode, declineCode };
}
