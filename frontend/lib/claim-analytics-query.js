import { Prisma } from "@prisma/client";
import { attachWorkProcessing } from "./work-processing.js";

// JSON extraction keeps older databases with optional claim fields readable.
export async function loadClaimAnalyticsRows(db, { startDate = null, kitchenId = "" } = {}) {
  const conditions = [Prisma.sql`REGEXP_REPLACE(sc."contractNumber", '\\s', '', 'g') NOT LIKE '111%'`];
  if (startDate) conditions.push(Prisma.sql`sc."createdAt" >= ${startDate}`);
  if (kitchenId) conditions.push(Prisma.sql`kc."kitchenId" = ${kitchenId}`);
  const [claims, history] = await Promise.all([
    db.$queryRaw`
      SELECT sc."id", sc."contractNumber", sc."fullName", sc."email", sc."phone", sc."createdAt", sc."problemDescription",
        to_jsonb(sc)->>'problemAreasJson' AS "problemAreasJson",
        to_jsonb(sc)->>'attachmentsJson' AS "attachmentsJson",
        to_jsonb(sc)->>'clientCity' AS "clientCity",
        kc."kitchenId", k."name" AS "kitchenName", p."id" AS "projectId", p."name" AS "projectName",
        hc."id" AS "companyId", hc."name" AS "companyName"
      FROM "ServiceClaim" sc
      LEFT JOIN "KitchenContract" kc ON kc."contractNumber" = sc."contractNumber"
      LEFT JOIN "Kitchen" k ON k."id" = kc."kitchenId"
      LEFT JOIN "Project" p ON p."id" = kc."projectId"
      LEFT JOIN "HousingCompany" hc ON hc."id" = p."housingCompanyId"
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY sc."createdAt" DESC
    `,
    db.$queryRaw`
      SELECT sc."email", sc."phone", sc."createdAt", sc."contractNumber", kc."kitchenId",
        wp."status" AS "processingStatus", wp."completedAt"
      FROM "ServiceClaim" sc
      LEFT JOIN "KitchenContract" kc ON kc."contractNumber" = sc."contractNumber"
      LEFT JOIN "WorkProcessing" wp ON wp."workType" = 'CLAIM' AND wp."workId" = sc."id"
      WHERE REGEXP_REPLACE(sc."contractNumber", '\\s', '', 'g') NOT LIKE '111%'
    `,
  ]);
  return { claims: await attachWorkProcessing(db, claims, "CLAIM"), history };
}
