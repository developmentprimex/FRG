import crypto from "crypto";
import { safelySaveJourneyEvent } from "../../../../lib/visit-journey-server.js";
import { isTestContractNumber } from "../../../../lib/order-kind.js";
import { NextResponse } from "next/server";
import { isMissingKitchenRegistrationTableError, kitchenRegistrationUnavailableMessage } from "../../../../lib/kitchen-registration-db";
import { prisma } from "../../../../lib/prisma";
import { enforceRateLimit, getRequestClientIp } from "../../../../lib/rate-limit";

function requiredString(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    const error = new Error(`${fieldName} is required.`);
    error.status = 400;
    throw error;
  }
  return normalized;
}

function hashVerificationCode(code) {
  return crypto.createHash("sha256").update(String(code || "")).digest("hex");
}

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function formatVerificationError(error) {
  return String(error?.message || "").trim() || "Registration verification failed.";
}

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`kitchen-registration-verify:${clientIp}`, {
      limit: 12,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const registrationId = requiredString(body?.registrationId, "Registration id");
    const code = requiredString(body?.code, "Verification code").replace(/\s+/g, "");

    const registration = await prisma.kitchenRegistration.findUnique({
      where: { id: registrationId },
      include: {
        kitchenContract: {
          include: { kitchen: true },
        },
      },
    });

    if (!registration || registration.deactivatedAt || registration.verifiedAt || registration.isActive) {
      return NextResponse.json(
        { error: "This verification request is no longer valid." },
        { status: 400 },
      );
    }

    if (!registration.verificationCodeHash || !registration.verificationExpiresAt) {
      return NextResponse.json(
        { error: "This verification request is incomplete. Please register again." },
        { status: 400 },
      );
    }

    if (registration.verificationExpiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This verification code has expired. Please register again." },
        { status: 400 },
      );
    }

    if (registration.verificationAttempts >= 5) {
      await prisma.kitchenRegistration.update({
        where: { id: registration.id },
        data: { deactivatedAt: new Date() },
      });
      return NextResponse.json(
        { error: "Too many incorrect verification attempts. Please register again." },
        { status: 429 },
      );
    }

    const isCodeValid = timingSafeEqualText(
      hashVerificationCode(code),
      registration.verificationCodeHash,
    );

    if (!isCodeValid) {
      await prisma.kitchenRegistration.update({
        where: { id: registration.id },
        data: { verificationAttempts: { increment: 1 } },
      });
      return NextResponse.json(
        { error: "The verification code is incorrect." },
        { status: 400 },
      );
    }

    const activated = await prisma.$transaction(async (tx) => {
      await tx.kitchenRegistration.updateMany({
        where: {
          kitchenContractId: registration.kitchenContractId,
          isActive: true,
          id: { not: registration.id },
        },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
        },
      });

      return tx.kitchenRegistration.update({
        where: { id: registration.id },
        data: {
          isActive: true,
          verifiedAt: new Date(),
          verificationCodeHash: null,
          verificationExpiresAt: null,
          verificationAttempts: 0,
        },
      });
    });

    await safelySaveJourneyEvent({ request, step: "service_registered", path: "/api/kitchen-registrations/verify",
      id: `registration:${activated.id}`, contractNumber: registration.kitchenContract.contractNumber,
      isTest: isTestContractNumber(registration.kitchenContract.contractNumber),
    });
    return NextResponse.json({
      success: true,
      message: "This kitchen is now registered to you. Previous active registrations for this contract were closed.",
      registration: {
        id: activated.id,
        contractNumber: registration.kitchenContract.contractNumber,
        kitchenName: registration.kitchenContract.kitchen.name,
        kitchenSlug: registration.kitchenContract.kitchen.slug,
        fullName: activated.fullName,
        email: activated.email,
        phone: activated.phone,
        registeredAt: activated.registeredAt,
      },
    });
  } catch (error) {
    console.error("Kitchen registration verification error:", error);
    if (isMissingKitchenRegistrationTableError(error)) {
      return NextResponse.json({ error: kitchenRegistrationUnavailableMessage() }, { status: 503 });
    }
    return NextResponse.json(
      { error: formatVerificationError(error) },
      { status: error.status || 500 },
    );
  }
}
