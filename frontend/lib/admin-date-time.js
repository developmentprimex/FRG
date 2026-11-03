export const REPORT_TIME_ZONE = "Europe/Berlin";

export function formatAdminMonth(value, language = "en") {
  if (!value) return "-";
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${value}-01T12:00:00Z`));
}

export function formatAdminDate(value, language = "en", timeZone = "UTC", numeric = false) {
  if (!value) return "-";

  const formatter = new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    day: numeric ? "2-digit" : "numeric",
    month: numeric ? "2-digit" : "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    // Legacy admin timestamps use wall-clock values; access events store UTC
    // instants and explicitly select the timezone in which to display them.
    timeZone,
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]));

  if (numeric) {
    return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
  }

  if (language === "de") {
    return `${parts.day}. ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
  }

  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
}

// Excel dates have no timezone. Encode the selected local clock as a UTC-backed
// Date solely for workbook serialization; never use this as an event timestamp.
export function toTimeZoneWallClockDate(value, timeZone = "UTC") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (timeZone === "UTC") return date;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second), date.getUTCMilliseconds()));
}
