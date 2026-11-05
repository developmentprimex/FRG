import { Prisma } from "@prisma/client";
import { getAdminPagination } from "./admin-pagination.js";
import { attachWorkProcessing } from "./work-processing.js";
import { workDateKey, workDayStart } from "./work-processing-rules.js";

function dateFilter(value) {
  if (!value) return "";
  const date = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) return "";
  return date;
}

export function orderTicketConditions(filters, now = new Date()) {
  if (!["live", "px"].includes(filters.series)) throw new Error("Invalid ticket series.");
  const conditions = [Prisma.sql`t."ticketSeries" = ${filters.series}`];
  const query = String(filters.q || "").trim();
  if (query) {
    const search = `%${query}%`;
    const number = /^#?\d+$/.test(query) ? Number(query.replace("#", "")) : 0;
    const ticketNumber = Number.isSafeInteger(number) && number <= 2147483647 ? number : 0;
    conditions.push(Prisma.sql`(t."ticketNumber" = ${ticketNumber} OR t."contractNumber" ILIKE ${search}
      OR EXISTS (SELECT 1 FROM "OrderTicketSubmission" s WHERE s."ticketId" = t."id" AND (
        s."payload"->>'orderNumber' ILIKE ${search} OR
        concat_ws(' ', s."payload"->>'firstName', s."payload"->>'lastName') ILIKE ${search} OR
        s."payload"->>'email' ILIKE ${search})))`);
  }
  const from = dateFilter(filters.dateFrom), to = dateFilter(filters.dateTo);
  if (from) conditions.push(Prisma.sql`t."createdAt" AT TIME ZONE 'UTC' >= ${workDayStart(from)}`);
  if (to) {
    const next = new Date(`${to}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    conditions.push(Prisma.sql`t."createdAt" AT TIME ZONE 'UTC' < ${workDayStart(next.toISOString().slice(0, 10))}`);
  }
  const cutoff = new Date(`${workDateKey(now)}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 25);
  const overdue = Prisma.sql`COALESCE(wp."status", 'OPEN') <> 'DONE' AND t."createdAt" AT TIME ZONE 'UTC' < ${workDayStart(cutoff.toISOString().slice(0, 10))}`;
  return { where: Prisma.join(conditions, " AND "), overdue };
}

export async function getOrderTicketsPage(db, filters, page, now = new Date()) {
  const { where, overdue } = orderTicketConditions(filters, now);
  const join = Prisma.sql`FROM "OrderTicket" t LEFT JOIN "WorkProcessing" wp ON wp."workType" = 'ORDER' AND wp."workId" = t."id"`;
  const [counts] = await db.$queryRaw`SELECT COUNT(*)::integer AS "total",
    COUNT(*) FILTER (WHERE COALESCE(wp."status", 'OPEN') <> 'DONE')::integer AS "OPEN",
    COUNT(*) FILTER (WHERE wp."status" = 'DONE')::integer AS "DONE",
    COUNT(*) FILTER (WHERE ${overdue})::integer AS "OVERDUE" ${join} WHERE ${where}`;
  const selected = filters.processing === "DONE" ? Prisma.sql`wp."status" = 'DONE'`
    : filters.processing === "OVERDUE" ? overdue
    : ["OPEN", "ACTIVE"].includes(filters.processing) ? Prisma.sql`COALESCE(wp."status", 'OPEN') <> 'DONE'` : Prisma.sql`TRUE`;
  const total = counts?.[["OPEN", "DONE", "OVERDUE"].includes(filters.processing) ? filters.processing : filters.processing === "ACTIVE" ? "OPEN" : "total"] || 0;
  const pagination = getAdminPagination(total, page);
  const rows = await db.$queryRaw`SELECT t.* ${join} WHERE ${where} AND ${selected}
    ORDER BY t."createdAt" DESC, t."id" DESC LIMIT ${pagination.pageSize} OFFSET ${(pagination.page - 1) * pagination.pageSize}`;
  const tickets = await db.orderTicket.findMany({ where: { id: { in: rows.map(row => row.id) } }, include: {
    _count: { select: { submissions: true } },
    submissions: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 },
  } });
  const byId = new Map(tickets.map(ticket => [ticket.id, ticket]));
  return { pagination, counts: { OPEN: counts?.OPEN || 0, DONE: counts?.DONE || 0, OVERDUE: counts?.OVERDUE || 0 },
    items: await attachWorkProcessing(db, rows.map(row => byId.get(row.id)), "ORDER") };
}

export async function latestOrderTickets(db, orders, orderKind) {
  if (!orders.length) return new Map();
  const submissions = await db.orderTicketSubmission.findMany({
    where: { orderKind, orderId: { in: orders.map(order => order.id) } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], distinct: ["orderId"], include: { ticket: true },
  });
  const tracked = await attachWorkProcessing(db, submissions.map(submission => submission.ticket), "ORDER");
  return new Map(submissions.map((submission, index) => [submission.orderId, tracked[index]]));
}
