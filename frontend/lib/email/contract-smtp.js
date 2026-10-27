import { assertLocalEmailSenderAllowed, createGuardedSmtpTransport, isLocalEmailEnvironment } from "./local-email-safety.js";

/**
 * Some contract ranges are sent from a separate mailbox (SMTP_111_*, e.g.
 * 315primex.eu@gmail.com) instead of the customer-facing SMTP_* account
 * (nachkauf@myarchitecto.de):
 *   - order e-mails: contracts starting with 111 or 222
 *   - claim e-mails: contracts starting with 111 or 222
 * When SMTP_111_* is not configured, or that account refuses to send, the mail is
 * delivered through the default SMTP_* account in production. Local sending
 * never uses nachkauf@myarchitecto.de and never falls back after an internal failure.
 */
export const ORDER_INTERNAL_PREFIXES = Object.freeze(["111", "222"]);
export const CLAIM_INTERNAL_PREFIXES = Object.freeze(["111", "222"]);

export function isInternalContractNumber(contractNumber, prefixes = ORDER_INTERNAL_PREFIXES) {
  const normalized = String(contractNumber || "").trim().replace(/\s+/g, "");
  return prefixes.some((prefix) => normalized.startsWith(prefix));
}

function buildSmtpConfig(prefix, env, profile) {
  return {
    profile,
    host: String(env[`${prefix}HOST`] || "smtp.gmail.com").trim(),
    port: Number.parseInt(env[`${prefix}PORT`] || "587", 10),
    secure: env[`${prefix}SECURE`] === "true",
    user: String(env[`${prefix}USER`] || "").trim(),
    // Google shows app passwords in groups of four; SMTP expects them without spaces.
    pass: profile === "internal" ? String(env[`${prefix}PASS`] || "").replace(/\s+/g, "") : String(env[`${prefix}PASS`] || ""),
    from: String(env[`${prefix}FROM`] || (profile === "internal" ? env[`${prefix}USER`] : "") || "").trim(),
  };
}

export function resolveDefaultSmtpConfig(env = process.env) {
  const config = buildSmtpConfig("SMTP_", env, "default");
  try {
    assertLocalEmailSenderAllowed(config, env);
  } catch (error) {
    const internal = resolveInternalSmtpConfig(env);
    if (!internal) throw error;
    assertLocalEmailSenderAllowed(internal, env);
    return internal;
  }
  return config;
}

export function resolveInternalSmtpConfig(env = process.env) {
  const config = buildSmtpConfig("SMTP_111_", env, "internal");
  return config.user && config.pass && config.from ? config : null;
}

/** SMTP account to use for a contract: the internal one for the given prefixes when configured. */
export function resolveSmtpConfigForContract(contractNumber, env = process.env, prefixes = ORDER_INTERNAL_PREFIXES) {
  if (isInternalContractNumber(contractNumber, prefixes)) {
    const internal = resolveInternalSmtpConfig(env);
    if (internal) {
      try {
        assertLocalEmailSenderAllowed(internal, env);
        return internal;
      } catch {
        return resolveDefaultSmtpConfig(env);
      }
    }
  }
  return resolveDefaultSmtpConfig(env);
}

export function createSmtpTransport(config, env = process.env) {
  assertLocalEmailSenderAllowed(config, env);
  return createGuardedSmtpTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  }, env);
}

/**
 * Send `message` (without `from`) for a contract. `fromName` is the display name.
 * Falls back to the default account if the internal 111 account fails.
 * Returns { receipt, config } so callers can log/track which account was used.
 */
export async function sendMailForContract(contractNumber, message, { fromName = "Fragmento", env = process.env, createTransport = createSmtpTransport, prefixes = ORDER_INTERNAL_PREFIXES } = {}) {
  const primary = resolveSmtpConfigForContract(contractNumber, env, prefixes);
  const send = (config) => {
    assertLocalEmailSenderAllowed({ ...config, sender: message.sender, envelopeFrom: message.envelope?.from }, env);
    return createTransport(config, env).sendMail({ ...message, from: `"${fromName}" <${config.from}>` });
  };

  try {
    return { receipt: await send(primary), config: primary };
  } catch (error) {
    if (primary.profile !== "internal") throw error;
    if (isLocalEmailEnvironment(env)) throw error;
    const fallback = resolveDefaultSmtpConfig(env);
    console.warn(`Internal SMTP (${primary.user}) failed for contract ${contractNumber}; retrying via ${fallback.user}:`, error.message);
    return { receipt: await send(fallback), config: fallback };
  }
}
