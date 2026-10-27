import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { withTrackingDatabase } from "./order-email-store.js";

export async function saveClaimEmailAttempt({ claimId, delivery }, client) {
  if (!claimId) return;
  const id = randomUUID();
  await withTrackingDatabase((tx) => tx.$executeRaw`
    INSERT INTO "ServiceClaimEmailAttempt" ("id", "claimId", "attemptedAt", "delivery")
    VALUES (${id}, ${claimId}, ${new Date(delivery.attemptedAt)}, ${JSON.stringify(delivery)}::jsonb)
  `, client);
}

export async function attachClaimEmailDelivery(claims, client) {
  const ids = claims.filter(Boolean).map((claim) => claim.id);
  if (!ids.length) return claims;
  try {
    const attempts = await withTrackingDatabase((tx) => tx.$queryRaw`
      SELECT DISTINCT ON ("claimId") "claimId", "delivery"
      FROM "ServiceClaimEmailAttempt"
      WHERE "claimId" IN (${Prisma.join(ids)})
      ORDER BY "claimId", "attemptedAt" DESC, "createdAt" DESC, "id" DESC
    `, client);
    const byClaim = new Map(attempts.map((attempt) => [attempt.claimId, attempt.delivery]));
    return claims.map((claim) => claim ? { ...claim, emailDelivery: byClaim.get(claim.id) || null } : claim);
  } catch {
    return claims;
  }
}
