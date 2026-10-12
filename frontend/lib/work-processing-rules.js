export const WORK_TIME_ZONE = "Europe/Berlin";
export const WORK_STATUSES = ["OPEN", "DONE"];
export const WORK_TYPES = ["ORDER", "TEST_ORDER", "CLAIM"];
const DAY_MS = 86400000;

export function workUiItem(item) {
  return { id: item.id, workType: item.workType, createdAt: item.createdAt, status: item.status || null, processing: item.processing || null };
}

export function workRowStyle(item, now = new Date()) {
  const colors = { green: "#39a76b", orange: "#e69a35", red: "#dc5965", done: "var(--app-border)", cancelled: "var(--app-border)" };
  return { borderLeft: `4px solid ${colors[workState(item, now).tone]}` };
}

export function workDateKey(value = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid work date.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WORK_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"].map((key) => parts.find((part) => part.type === key).value).join("-");
}

export function workAgeDays(createdAt, now = new Date()) {
  return Math.max(0, Math.round((Date.parse(workDateKey(now)) - Date.parse(workDateKey(createdAt))) / DAY_MS));
}

export function workState(item, now = new Date()) {
  const processing = item.processing || {};
  const status = processing.status === "DONE" ? "DONE" : "OPEN";
  const days = workAgeDays(item.createdAt, now);
  const tone = item.status === "CANCELLED" ? "cancelled" : status === "DONE" ? "done" : days > 25 ? "red" : days > 10 ? "orange" : "green";
  return { status, days, tone, overdue: tone === "red" };
}

export function reminderDue(item, now = new Date()) {
  if (item.workType === "TEST_ORDER" || String(item.contractNumber || "").replace(/\s+/g, "").startsWith("111")) return false;
  if (!workState(item, now).overdue) return false;
  return !item.processing?.lastReminderAt || workAgeDays(item.processing.lastReminderAt, now) >= 7;
}

export function filterAndSortWork(items, filter = "", now = new Date()) {
  return items.filter((item) => {
    const state = workState(item, now);
    if (filter === "OVERDUE") return state.overdue;
    if (filter === "ACTIVE") return !["done", "cancelled"].includes(state.tone);
    return !WORK_STATUSES.includes(filter) || (item.status !== "CANCELLED" && state.status === filter);
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function summarizeWork(items, now = new Date()) {
  return items.reduce((counts, item) => {
    const state = workState(item, now);
    if (state.tone !== "cancelled") counts[state.status]++;
    if (state.overdue) counts.OVERDUE++;
    return counts;
  }, { OPEN: 0, DONE: 0, OVERDUE: 0 });
}
