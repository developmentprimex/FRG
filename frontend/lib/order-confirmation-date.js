// Preserve the original sale date across repeat confirmations and later edits.
// Existing confirmed orders without a date stay explicitly unknown.
export function orderStatusUpdateData(status, order = {}, now = new Date()) {
  return { status, ...(status === "CONFIRMED" && order.status !== "CONFIRMED" && !order.confirmedAt
    ? { confirmedAt: now } : {}) };
}
