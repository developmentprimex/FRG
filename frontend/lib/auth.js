import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./prisma";
import { canAccess } from "./admin-permissions";

const SESSION_COOKIE = "fragmento_admin_session";
const PENDING_LOGIN_COOKIE = "fragmento_admin_login_pending";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PENDING_LOGIN_TTL_SECONDS = 15 * 60;

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error("ADMIN_SESSION_SECRET must be set and at least 16 characters long.");
  }
  return secret;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function signValue(value) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function encodeSession(payload) {
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${base}.${signValue(base)}`;
}

function decodeSession(token) {
  if (!token) return null;
  const [base, signature] = token.split(".");
  if (!base || !signature || !safeEqual(signValue(base), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(base, "base64url").toString("utf8"));
    if (!payload?.adminId || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function setSignedCookie(cookieStore, name, payload, maxAgeSeconds) {
  cookieStore.set(name, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function createPendingAdminLogin(adminId) {
  const exp = Math.floor(Date.now() / 1000) + PENDING_LOGIN_TTL_SECONDS;
  const cookieStore = await cookies();
  setSignedCookie(cookieStore, PENDING_LOGIN_COOKIE, { adminId, exp }, PENDING_LOGIN_TTL_SECONDS);
}

export async function getPendingAdminLogin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_LOGIN_COOKIE)?.value;
  const payload = decodeSession(token);
  if (!payload?.adminId) {
    return null;
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.adminId },
    select: {
      id: true,
      email: true,
      isActive: true,
      loginVerificationCodeHash: true,
      loginVerificationExpiresAt: true,
    },
  });

  if (!admin || admin.isActive === false) {
    return null;
  }

  return admin;
}

export async function clearPendingAdminLogin() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_LOGIN_COOKIE);
}

export async function createAdminSession(adminId) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const cookieStore = await cookies();
  setSignedCookie(cookieStore, SESSION_COOKIE, { adminId, exp }, SESSION_TTL_SECONDS);
  cookieStore.delete(PENDING_LOGIN_COOKIE);
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(PENDING_LOGIN_COOKIE);
}

export const getAdminSession = cache(async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = decodeSession(token);
  if (!payload) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.adminId },
  });
  if (!admin || admin.isActive === false) {
    return null;
  }

  const access = await prisma.appSetting.findUnique({ where: { key: `admin.permissions.${admin.id}` } });
  let permissions = [];
  try { permissions = JSON.parse(access?.value || "[]"); } catch {}
  return { ...admin, permissions: Array.isArray(permissions) ? permissions : [] };
});

export async function requireAdminPage(required) {
  try {
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/admin/login");
  }
  if (!canAccess(admin, required)) redirect("/admin/access-denied");
  return admin;
  } catch (error) {
    if (error instanceof Error && error.message.includes("ADMIN_SESSION_SECRET")) {
      redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}

export async function requireAdminApi(required) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      const error = new Error("Unauthorized");
      error.status = 401;
      throw error;
    }
    if (!canAccess(admin, required)) {
      const error = new Error("Forbidden");
      error.status = 403;
      throw error;
    }
    return admin;
  } catch (error) {
    if (error instanceof Error && error.message.includes("ADMIN_SESSION_SECRET")) {
      error.status = 500;
    }
    throw error;
  }
}

export function withAdminPermission(required, handler) {
  return async (...args) => {
    try {
      const admin = await requireAdminApi(required);
      const claimId = (await args[1]?.params)?.id;
      if (claimId && ["ASC_VIEW", "ASC_MANAGE"].includes(required) && !["SUPERADMIN", "PX_ADMIN"].includes(admin.role)) {
        const rows = await prisma.$queryRaw`SELECT "contractNumber" FROM "ServiceClaim" WHERE "id" = ${claimId}`;
        if (String(rows[0]?.contractNumber || "").replace(/\s/g, "").startsWith("111")) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      return await handler(...args);
    }
    catch (error) {
      if (error?.status === 401 || error?.status === 403) return Response.json({ error: error.message }, { status: error.status });
      throw error;
    }
  };
}
