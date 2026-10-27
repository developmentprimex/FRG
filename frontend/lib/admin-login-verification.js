import crypto from "crypto";
import { createGuardedSmtpTransport } from "./email/local-email-safety.js";
import { prisma } from "./prisma";

export const ADMIN_LOGIN_CODE_TTL_MS = 15 * 60 * 1000;
export const ADMIN_LOGIN_MAX_ATTEMPTS = 5;

export function generateAdminLoginCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashAdminLoginCode(code) {
  return crypto.createHash("sha256").update(String(code || "")).digest("hex");
}

export function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function maskAdminEmail(email) {
  const normalized = String(email || "").trim();
  const atIndex = normalized.indexOf("@");
  if (atIndex <= 0) {
    return normalized;
  }

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const visible = local.slice(0, Math.min(1, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

export async function beginAdminLoginVerification(adminId) {
  const code = generateAdminLoginCode();
  const expiresAt = new Date(Date.now() + ADMIN_LOGIN_CODE_TTL_MS);

  await prisma.adminUser.update({
    where: { id: adminId },
    data: {
      loginVerificationCodeHash: hashAdminLoginCode(code),
      loginVerificationExpiresAt: expiresAt,
      loginVerificationAttempts: 0,
    },
  });

  return { code, expiresAt };
}

export async function clearAdminLoginVerification(adminId) {
  await prisma.adminUser.update({
    where: { id: adminId },
    data: {
      loginVerificationCodeHash: null,
      loginVerificationExpiresAt: null,
      loginVerificationAttempts: 0,
    },
  });
}

export async function verifyAdminLoginCode(adminId, code) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) {
    return { ok: false, error: "This sign-in request is no longer valid." };
  }

  if (!admin.loginVerificationCodeHash || !admin.loginVerificationExpiresAt) {
    return { ok: false, error: "This sign-in request is incomplete. Please sign in again." };
  }

  if (admin.loginVerificationExpiresAt.getTime() < Date.now()) {
    await clearAdminLoginVerification(adminId);
    return { ok: false, error: "This verification code has expired. Please sign in again." };
  }

  if (admin.loginVerificationAttempts >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    await clearAdminLoginVerification(adminId);
    return { ok: false, error: "Too many incorrect verification attempts. Please sign in again." };
  }

  const normalizedCode = String(code || "").replace(/\s+/g, "");
  const isCodeValid = timingSafeEqualText(
    hashAdminLoginCode(normalizedCode),
    admin.loginVerificationCodeHash,
  );

  if (!isCodeValid) {
    await prisma.adminUser.update({
      where: { id: adminId },
      data: { loginVerificationAttempts: { increment: 1 } },
    });
    return { ok: false, error: "The verification code is incorrect." };
  }

  await clearAdminLoginVerification(adminId);
  return { ok: true, admin };
}

export async function sendAdminLoginVerificationEmail({ to, code }) {
  const smtpHost = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const smtpFrom = String(process.env.SMTP_FROM || "").trim();

  if (!to || !smtpHost || !smtpFrom || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[admin-login] Verification code for ${to}: ${code}`);
      return;
    }

    const error = new Error("Email verification is not configured. Please contact support.");
    error.status = 503;
    throw error;
  }

  const transporter = createGuardedSmtpTransport({
    host: smtpHost,
    port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Fragmento" <${smtpFrom}>`,
    to,
    subject: "Your Fragmento admin sign-in code",
    text: [
      "Fragmento admin sign-in verification",
      "",
      `Your verification code is: ${code}`,
      "",
      "This code expires in 15 minutes. If you did not try to sign in, ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#333;line-height:1.5;">
        <h2 style="margin:0 0 12px;">Fragmento admin sign-in verification</h2>
        <p style="margin:0 0 8px;">Your verification code is:</p>
        <p style="margin:0 0 18px;font-size:28px;font-weight:700;letter-spacing:0.16em;">${code}</p>
        <p style="margin:0;color:#666;">This code expires in 15 minutes. If you did not try to sign in, ignore this email.</p>
      </div>
    `,
  });
}
