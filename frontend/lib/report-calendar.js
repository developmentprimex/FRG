// Calendar values are date keys, not timestamps in the browser's timezone.
export const calendarDate = key => new Date(`${key.length === 7 ? `${key}-01` : key}T12:00:00Z`);
export const calendarKey = date => date.toISOString().slice(0, 10);
export function normalizeCalendarValue(value, type = "date") {
  const key = String(value || "");
  if (!(type === "month" ? /^\d{4}-(0[1-9]|1[0-2])$/ : /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/).test(key)) return "";
  const date = calendarDate(key);
  return !Number.isNaN(date.getTime()) && calendarKey(date).startsWith(key) ? key : "";
}
export function shiftCalendarMonth(month, offset) {
  const date = calendarDate(month);
  date.setUTCMonth(date.getUTCMonth() + offset, 1);
  return calendarKey(date).slice(0, 7);
}
export function calendarDays(month) {
  const start = calendarDate(month);
  start.setUTCDate(1 - (start.getUTCDay() + 6) % 7);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    return calendarKey(date);
  });
}
export function calendarValueAllowed(value, min, max) {
  return (!min || value >= min) && (!max || value <= max);
}
