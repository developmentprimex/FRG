import nodemailer from "nodemailer";

const BLOCKED_LOCAL_MAILBOX = "nachkauf@myarchitecto.de";

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
export function createGuardedSmtpTransport(options, env = process.env) {
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
    } catch (error) {
      if (typeof callback === "function") return callback(error);
      return Promise.reject(error);
    }
    return originalSendMail(message, callback);
  };
  return transport;
}
