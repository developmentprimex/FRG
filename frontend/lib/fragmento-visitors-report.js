import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { kitchenContractInclude, liveVisitSqlWhere } from "./public-visit-reports.js";
import { loadJourneySessionsByIds } from "./visit-journey-report.js";

export async function loadFragmentoVisitors(filters, params = {}) {
  const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const until = filters.dateTo ? new Date(new Date(filters.dateTo).getTime() + 86400000) : null;
  const sessionWhere = Prisma.sql`"flow" = 'FRG'
    ${filters.excludeTestContracts ? Prisma.sql`AND "isTest" = false` : Prisma.empty}
    ${from ? Prisma.sql`AND "lastSeenAt" >= ${from}` : Prisma.empty}
    ${until ? Prisma.sql`AND "lastSeenAt" < ${until}` : Prisma.empty}`;
  // Linked access attempts enrich one visit row rather than becoming duplicates.
  // Unlinked historical records remain individual rows; no identity is inferred.
  const combined = Prisma.sql`
    SELECT "id"::text AS "id", 'visit' AS "kind", "lastSeenAt" AS "activityAt"
    FROM "VisitJourneySession" WHERE ${sessionWhere}
    UNION ALL
    SELECT "id", 'access' AS "kind", "createdAt" AS "activityAt" FROM "PublicVisitEvent"
    WHERE "eventType" IN ('CONTRACT_ACCEPTED', 'CONTRACT_TEST_ACCEPTED', 'CONTRACT_REJECTED')
      AND ${liveVisitSqlWhere(filters)}
      ${from ? Prisma.sql`AND "createdAt" >= ${from}` : Prisma.empty}
      ${until ? Prisma.sql`AND "createdAt" < ${until}` : Prisma.empty}
      AND NOT EXISTS (SELECT 1 FROM "VisitJourneySession" linked
        WHERE linked."id"::text = "PublicVisitEvent"."metadata"->>'journeySessionId' AND linked."flow" = 'FRG')
  `;
  const [count] = await prisma.$queryRaw`SELECT COUNT(*) AS total FROM (${combined}) rows`;
  const total = Number(count.total);
  const totalPages = Math.max(1, Math.ceil(total / 100));
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(params.page, 10) || 1));
  const keys = await prisma.$queryRaw`SELECT * FROM (${combined}) rows ORDER BY "activityAt" DESC, "id" DESC LIMIT 100 OFFSET ${(page - 1) * 100}`;
  const sessionIds = keys.filter(row => row.kind === "visit").map(row => row.id);
  const accessIds = keys.filter(row => row.kind === "access").map(row => row.id);
  const latestIds = sessionIds.length ? await prisma.$queryRaw`
    SELECT DISTINCT ON ("metadata"->>'journeySessionId') "id"
    FROM "PublicVisitEvent"
    WHERE "metadata"->>'journeySessionId' IN (${Prisma.join(sessionIds)})
      AND ${liveVisitSqlWhere(filters)}
    ORDER BY "metadata"->>'journeySessionId',
      CASE WHEN "eventType" IN ('CONTRACT_ACCEPTED', 'CONTRACT_TEST_ACCEPTED', 'CONTRACT_REJECTED') THEN 0 ELSE 1 END,
      "createdAt" DESC, "id" DESC
  ` : [];
  const [sessions, accessEvents] = await Promise.all([
    loadJourneySessionsByIds(sessionIds),
    prisma.publicVisitEvent.findMany({ where: { id: { in: [...accessIds, ...latestIds.map(row => row.id)] } }, include: kitchenContractInclude }),
  ]);
  const contracts = await prisma.kitchenContract.findMany({
    where: { contractNumber: { in: sessions.map(row => row.contractNumber).filter(Boolean) } },
    select: kitchenContractInclude.kitchenContract.select,
  });
  const sessionsById = new Map(sessions.map(row => [row.id, row]));
  const accessById = new Map(accessEvents.map(row => [row.id, row]));
  const accessBySession = new Map(accessEvents.filter(row => latestIds.some(value => value.id === row.id)).map(row => [row.metadata.journeySessionId, row]));
  const rows = keys.map(key => {
    if (key.kind === "access") return { ...accessById.get(key.id), kind: "access", activityAt: key.activityAt };
    const session = sessionsById.get(key.id);
    const access = accessBySession.get(key.id);
    return {
      ...access, ...session, kind: "visit", activityAt: key.activityAt,
      kitchenContract: contracts.find(contract => contract.contractNumber === session.contractNumber) || null,
      eventType: ["CONTRACT_ACCEPTED", "CONTRACT_TEST_ACCEPTED", "CONTRACT_REJECTED"].includes(access?.eventType) ? access.eventType : session.contractNumber
        ? session.isTest ? "CONTRACT_TEST_ACCEPTED" : "CONTRACT_ACCEPTED" : null,
    };
  });
  const selected = sessionsById.get(params.visit);
  const history = selected ? await prisma.visitJourneyEvent.findMany({
    where: { sessionId: selected.id }, orderBy: [{ occurredAt: "asc" }, { sequence: "asc" }, { createdAt: "asc" }],
  }) : [];
  return { rows, page, total, totalPages, selected, history };
}
