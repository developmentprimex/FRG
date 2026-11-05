import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { JOURNEY_STEPS } from "./visit-journey-steps.js";

function sessionSummaryQuery(source) {
  const ranks = Prisma.join(Object.entries(JOURNEY_STEPS).map(([step, definition]) => Prisma.sql`WHEN ${step} THEN ${definition.rank}`), " ");
  const screenSteps = Object.entries(JOURNEY_STEPS).filter(([, definition]) => !definition.server).map(([step]) => step);
  return Prisma.sql`
    SELECT s.*, last_screen."step" AS "lastStep", furthest."step" AS "furthestStep"
    FROM (${source}) s
    LEFT JOIN LATERAL (
      SELECT "step" FROM "VisitJourneyEvent" WHERE "sessionId" = s."id" AND "step" IN (${Prisma.join(screenSteps)})
      ORDER BY "occurredAt" DESC, "sequence" DESC, "createdAt" DESC LIMIT 1
    ) last_screen ON true
    LEFT JOIN LATERAL (
      SELECT "step" FROM "VisitJourneyEvent" WHERE "sessionId" = s."id"
      ORDER BY CASE "step" ${ranks} ELSE 0 END DESC, "occurredAt" DESC, "sequence" DESC LIMIT 1
    ) furthest ON true
    ORDER BY s."lastSeenAt" DESC, s."id" DESC
  `;
}

export async function loadJourneySessionsByIds(ids) {
  if (!ids.length) return [];
  return prisma.$queryRaw(sessionSummaryQuery(Prisma.sql`SELECT * FROM "VisitJourneySession" WHERE "id"::text IN (${Prisma.join(ids)})`));
}

export async function loadJourneyReport(flow, filters, params = {}) {
  const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const until = filters.dateTo ? new Date(new Date(filters.dateTo).getTime() + 86400000) : null;
  const where = Prisma.sql`"flow" = ${flow}
    ${filters.excludeTestContracts ? Prisma.sql`AND "isTest" = false` : Prisma.empty}
    ${from ? Prisma.sql`AND "lastSeenAt" >= ${from}` : Prisma.empty}
    ${until ? Prisma.sql`AND "lastSeenAt" < ${until}` : Prisma.empty}`;
  const [count] = await prisma.$queryRaw`SELECT COUNT(*) AS total FROM "VisitJourneySession" WHERE ${where}`;
  const total = Number(count.total);
  const pages = Math.max(1, Math.ceil(total / 50));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.journeyPage, 10) || 1));
  const sessions = await prisma.$queryRaw(sessionSummaryQuery(Prisma.sql`SELECT * FROM "VisitJourneySession" WHERE ${where}
      ORDER BY "lastSeenAt" DESC, "id" DESC LIMIT 50 OFFSET ${(page - 1) * 50}`));
  // Detail access uses the same permission and date-filtered session list.
  const selected = sessions.find(session => session.id === params.visit);
  const events = selected ? await prisma.visitJourneyEvent.findMany({
    where: { sessionId: selected.id }, orderBy: [{ occurredAt: "asc" }, { sequence: "asc" }, { createdAt: "asc" }],
  }) : [];
  return { sessions, total, page, pages, selected, events };
}
