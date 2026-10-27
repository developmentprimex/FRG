import { REPORT_TIME_ZONE } from "./admin-date-time.js";

export function reportDateKey(value = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid report date.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"].map((key) => parts.find((part) => part.type === key).value).join("-");
}

export function reportDayStart(dateKey) {
  const midnightUtc = new Date(`${dateKey}T00:00:00.000Z`);
  if (!Number.isFinite(midnightUtc.getTime())) throw new Error("Invalid report date.");
  const zone = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE, timeZoneName: "shortOffset", hour: "2-digit",
  }).formatToParts(midnightUtc).find((part) => part.type === "timeZoneName")?.value;
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zone || "");
  if (!match) throw new Error("Unsupported report time zone offset.");
  const offsetMinutes = (Number(match[2]) * 60 + Number(match[3] || 0)) * (match[1] === "+" ? 1 : -1);
  return new Date(midnightUtc.getTime() - offsetMinutes * 60000);
}

