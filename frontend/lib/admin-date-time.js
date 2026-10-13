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
