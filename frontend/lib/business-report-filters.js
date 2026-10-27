import { normalizeActivityReportFilters, buildActivityReportQuery } from "./admin-activity-reports.js";
import { workDateKey } from "./work-processing-rules.js";

export const BUSINESS_REPORT_PERIODS = ["TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_MONTH", "ALL"];
export const BUSINESS_REPORT_GROUPS = ["DAY", "WEEK", "MONTH"];

export function shiftReportDate(key, days) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function normalizeBusinessReportFilters(input = {}, now = new Date()) {
  const activity = normalizeActivityReportFilters(input);
  const one = value => String(Array.isArray(value) ? value[0] || "" : value || "").toUpperCase();
  const requestedPeriod = one(input.period);
  const period = [...BUSINESS_REPORT_PERIODS, "CUSTOM"].includes(requestedPeriod) ? requestedPeriod
    : activity.dateFrom || activity.dateTo ? "CUSTOM" : "THIS_MONTH";
  const groupBy = BUSINESS_REPORT_GROUPS.includes(one(input.groupBy)) ? one(input.groupBy) : "DAY";
  const today = workDateKey(now);
  let { dateFrom, dateTo } = activity;
  if (period === "ALL") dateFrom = dateTo = "";
  if (period === "TODAY") dateFrom = dateTo = today;
  if (period === "THIS_WEEK") {
    dateFrom = shiftReportDate(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
    dateTo = today;
  }
  if (period === "THIS_MONTH") { dateFrom = today.slice(0, 7) + "-01"; dateTo = today; }
  if (period === "LAST_MONTH") {
    dateTo = shiftReportDate(today.slice(0, 7) + "-01", -1);
    dateFrom = dateTo.slice(0, 7) + "-01";
  }
  if (dateFrom && dateTo && dateFrom > dateTo) [dateFrom, dateTo] = [dateTo, dateFrom];
  return { dateFrom, dateTo, contractType: activity.contractType, groupBy, period };
}

export function buildBusinessReportQuery(business, activity = {}) {
  const params = new URLSearchParams(buildActivityReportQuery({ ...activity, ...business }));
  params.set("groupBy", business.groupBy);
  // Explicitly preserve all-time; an empty range otherwise defaults to this month.
  params.set("period", business.period === "ALL" ? "ALL" : "CUSTOM");
  const preset = BUSINESS_REPORT_PERIODS.includes(business.period) ? business.period : business.preset;
  if (BUSINESS_REPORT_PERIODS.includes(preset)) params.set("preset", preset);
  return params.toString();
}

export function getActiveBusinessReportPeriod(filters, preferredPreset = "", now = new Date()) {
  const preferred = Array.isArray(preferredPreset) ? preferredPreset[0] : preferredPreset;
  const candidates = [...new Set([preferred, filters.period, ...BUSINESS_REPORT_PERIODS])];
  for (const period of candidates) {
    if (!BUSINESS_REPORT_PERIODS.includes(period)) continue;
    const range = normalizeBusinessReportFilters({ period }, now);
    if (range.dateFrom === filters.dateFrom && range.dateTo === filters.dateTo) return period;
  }
  return "CUSTOM";
}
