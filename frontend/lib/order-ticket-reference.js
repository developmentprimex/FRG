export function formatOrderTicketReference(ticket) {
  const number = Number(ticket.ticketNumber);
  const sequence = Number(ticket.ticketSequence);
  const prefix = Number.isSafeInteger(number) && number >= 1000 ? `#${number} ` : "";
  return `${prefix}${String(ticket.contractNumber || "").trim()} NK ${String(Number.isSafeInteger(sequence) && sequence > 0 ? sequence : 1).padStart(2, "0")}`;
}

export function orderTicketSeries(orderKind) {
  if (!["live", "test"].includes(orderKind)) throw new Error("Invalid order kind.");
  return orderKind === "test" ? "px" : "live";
}
