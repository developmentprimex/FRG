import nodemailer from "nodemailer";

const BLOCKED_LOCAL_MAILBOX = "nachkauf@myarchitecto.de";
export const LOCAL_EMAIL_RECIPIENT = "334primex.eu@gmail.com";
const LOCAL_DIRECT_EMAIL_SENDER = "315primex.eu@gmail.com";

export function isLocalEmailEnvironment(env = process.env) {
  if (String(env.LOCAL_EMAIL_SAFETY || "").trim().toLowerCase() === "true") return true;
  // Hosted production may also connect to PostgreSQL on localhost. Database
  // addresses must not decide whether production email is blocked.
  return ["development", "test"].includes(env.NODE_ENV);
}

function containsBlockedMailbox(value) {
  if (Array.isArray(value)) return value.some(containsBlockedMailbox);
  if (value && typeof value === "object") return containsBlockedMailbox(value.address);
  return String(value || "").toLowerCase().includes(BLOCKED_LOCAL_MAILBOX);
}

export function assertLocalEmailSenderAllowed({ user, from, sender, envelopeFrom } = {}, env = process.env) {
  if (isLocalEmailEnvironment(env) && [user, from, sender, envelopeFrom].some(containsBlockedMailbox)) {
    const error = new Error(`Local email from ${BLOCKED_LOCAL_MAILBOX} is prohibited. Configure a local SMTP mailbox.`);
    error.code = "LOCAL_EMAIL_SENDER_BLOCKED";
    throw error;
  }
}

// Every application SMTP path uses this factory. Check before creating the
// transport, and again before handing a message to Nodemailer (including retries).
export function resolveLocalEmailRecipient({ to, from, user, localFeedbackRecipient, localAdminLoginRecipient } = {}, env = process.env) {
  if (!isLocalEmailEnvironment(env)) return to;
  const allowlisted = String(env.LOCAL_CLAIM_FEEDBACK_RECIPIENT || "").trim().toLowerCase();
  const requested = String(to || "").trim().toLowerCase();
  const scoped = String(localFeedbackRecipient || "").trim().toLowerCase();
  const adminAllowlisted = String(env.LOCAL_ADMIN_LOGIN_RECIPIENT || "").trim().toLowerCase();
  const adminScoped = String(localAdminLoginRecipient || "").trim().toLowerCase();
  const fromAddress = String(from || "").match(/<([^>]+)>/)?.[1] || String(from || "").trim();
  const scopedRecipientAllowed = (allowlisted && allowlisted === requested && scoped === requested)
    || (adminAllowlisted && adminAllowlisted === requested && adminScoped === requested);
  if (scopedRecipientAllowed
    && String(user || "").toLowerCase() === LOCAL_DIRECT_EMAIL_SENDER
    && fromAddress.toLowerCase() === LOCAL_DIRECT_EMAIL_SENDER) return String(to).trim();
  return LOCAL_EMAIL_RECIPIENT;
}

export function createGuardedSmtpTransport(options, env = process.env, { localFeedbackRecipient, localAdminLoginRecipient } = {}) {
  assertLocalEmailSenderAllowed({ user: options.auth?.user }, env);
  const transport = nodemailer.createTransport(options);
  const originalSendMail = transport.sendMail.bind(transport);
  transport.sendMail = (message, callback) => {
    try {
      assertLocalEmailSenderAllowed({
        user: options.auth?.user,
        from: message.from,
        sender: message.sender,
        envelopeFrom: message.envelope?.from,
      }, env);
      if (isLocalEmailEnvironment(env)) {
        if (message.raw) throw new Error("Raw email is disabled locally; use a structured message for safe recipient redirection.");
        const recipient = resolveLocalEmailRecipient({ to: message.to, from: message.from, user: options.auth?.user, localFeedbackRecipient, localAdminLoginRecipient }, env);
        message = {
          ...message,
          to: recipient,
          cc: undefined,
          bcc: undefined,
          replyTo: recipient,
          envelope: { from: message.envelope?.from || message.from, to: [recipient] },
        };
      }
    } catch (error) {
      if (typeof callback === "function") return callback(error);
      return Promise.reject(error);
    }
    return originalSendMail(message, callback);
  };
  return transport;
}
