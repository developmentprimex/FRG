import { Prisma } from "@prisma/client";

// Retain history for repeat-kitchen counts. Period/category filters apply to the
// original case creation date in summarizeAscDashboard, never to follow-up dates.
export async function loadAscDashboardRows(db) {
  const rows = await db.$queryRaw`
    SELECT sc.id, sc."contractNumber", sc."fullName", sc."createdAt", sc."problemDescription",
      to_jsonb(sc)->>'problemAreasJson' AS "problemAreasJson",
      to_jsonb(sc)->>'attachmentsJson' AS "attachmentsJson",
      to_jsonb(sc)->>'clientCity' AS "clientCity",
      to_jsonb(sc)->>'ticketSeries' AS "ticketSeries",
      kc.id AS "contractId", kc."contractType", kc."kitchenId", k.name AS "kitchenName"
    FROM "ServiceClaim" sc
    LEFT JOIN LATERAL (
      SELECT c.id, c."contractType", c."kitchenId" FROM "KitchenContract" c
      WHERE REGEXP_REPLACE(c."contractNumber", '[[:space:]]+', '', 'g') = REGEXP_REPLACE(sc."contractNumber", '[[:space:]]+', '', 'g')
      ORDER BY (c."contractNumber" = sc."contractNumber") DESC, c.id LIMIT 1
    ) kc ON TRUE
    LEFT JOIN "Kitchen" k ON k.id = kc."kitchenId"
    WHERE REGEXP_REPLACE(sc."contractNumber", '[[:space:]]+', '', 'g') NOT LIKE '111%'
      AND COALESCE(to_jsonb(sc)->>'ticketSeries', 'live') <> 'test'
    ORDER BY sc."createdAt", sc.id
  `;
  if (!rows.length) return [];
  const [table] = await db.$queryRaw`SELECT to_regclass('"ServiceClaimSubmission"')::text AS relation`;
  const submissions = table?.relation ? await db.$queryRaw`
    SELECT id, "claimId", payload, "createdAt" FROM "ServiceClaimSubmission"
    WHERE "claimId" IN (${Prisma.join(rows.map(row => row.id))}) ORDER BY "createdAt", id
  ` : [];
  const byCase = new Map();
  for (const submission of submissions) {
    if (!byCase.has(submission.claimId)) byCase.set(submission.claimId, []);
    byCase.get(submission.claimId).push(submission);
  }
  const contractIds = [...new Set(rows.map(row => row.contractId).filter(Boolean))];
  const contracts = contractIds.length ? await db.kitchenContract.findMany({
    where: { id: { in: contractIds } },
    select: { id: true, contractType: true,
      appliances: { select: { applianceType: true, brand: true, articleNumber: true, isPresent: true } },
      kitchen: { select: { items: { select: { code: true, name: true, articleNumber: true,
        catalogArticle: { select: { articleNumber: true, name: true, nameDe: true } } } } } },
    },
  }) : [];
  const byContract = new Map(contracts.map(contract => [contract.id, contract]));
  return rows.map(row => ({ ...row, contract: byContract.get(row.contractId) || null, submissions: byCase.get(row.id) || [] }));
}
