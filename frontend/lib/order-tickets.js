import { lockWorkProcessing } from "./work-processing.js";
import { orderTicketSeries } from "./order-ticket-reference.js";

// The caller holds the completion lock throughout checkout and snapshot creation.
export async function findOrCreateOrderTicket(tx, contractNumber, orderKind) {
  const normalized = String(contractNumber || "").replace(/\s+/g, "");
  if (!normalized) throw new Error("Contract number is required.");
  const ticketSeries = orderTicketSeries(orderKind);
  const rows = await tx.$queryRaw`
    SELECT t.* FROM "OrderTicket" t
    LEFT JOIN "WorkProcessing" wp ON wp."workType" = 'ORDER' AND wp."workId" = t."id"
    WHERE t."contractNumber" = ${normalized} AND t."ticketSeries" = ${ticketSeries}
      AND COALESCE(wp."status", 'OPEN') <> 'DONE'
    ORDER BY t."createdAt", t."id" LIMIT 2
  `;
  if (rows.length > 1) throw Object.assign(new Error("This contract has several open order tickets. Please contact customer service."), { status: 409 });
  if (rows[0]) return rows[0];
  const previous = await tx.orderTicket.aggregate({
    where: { ticketSeries, contractNumber: normalized }, _max: { ticketSequence: true },
  });
  return tx.orderTicket.create({ data: {
    ticketSeries, contractNumber: normalized, ticketSequence: (previous._max.ticketSequence || 0) + 1,
  } });
}

export function buildOrderTicketSnapshot(order) {
  const fields = ["orderNumber", "firstName", "lastName", "email", "phone", "address1", "address2", "postalCode", "city", "country", "notes", "preferredDeliveryDate", "paymentMethod"];
  return {
    ...Object.fromEntries(fields.map(key => [key, order[key] instanceof Date ? order[key].toISOString() : order[key] ?? null])),
    totalPrice: Number(order.totalPrice),
    items: (order.items || []).map(item => ({
      itemType: item.itemType, code: item.code, nameSnapshot: item.nameSnapshot,
      nameDeSnapshot: item.nameDeSnapshot || null, articleNumberSnapshot: item.articleNumberSnapshot || null,
      priceSnapshot: Number(item.priceSnapshot), quantity: item.quantity,
    })),
  };
}

export async function saveOrderTicketSubmission(tx, ticket, order, orderKind) {
  return tx.orderTicketSubmission.create({ data: {
    ticketId: ticket.id, orderId: order.id, orderKind, payload: buildOrderTicketSnapshot(order),
  } });
}

export async function recordOrderTicketSubmission(tx, order, orderKind) {
  const ticket = await findOrCreateOrderTicket(tx, order.contractNumber, orderKind);
  const submission = await saveOrderTicketSubmission(tx, ticket, order, orderKind);
  return { ...ticket, submissionId: submission.id };
}

export { lockWorkProcessing as lockOrderTickets };
