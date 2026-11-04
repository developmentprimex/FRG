export function summarizeAscDashboard(rows) {
  const contracts = new Set();
  const cities = new Set();
  const days = new Map();
  let withAttachments = 0;
  const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" });
  for (const row of rows) {
    if (row.contractNumber) contracts.add(row.contractNumber.trim());
    if (row.clientCity?.trim()) cities.add(row.clientCity.trim().toLowerCase());
    try { const files = JSON.parse(row.attachmentsJson || "[]"); if (Array.isArray(files) && files.length) withAttachments++; } catch {}
    if (row.createdAt) {
      const day = dateFormat.format(new Date(row.createdAt));
      days.set(day, (days.get(day) || 0) + 1);
    }
  }
  return {
    total: rows.length, contracts: contracts.size, cities: cities.size, withAttachments,
    daily: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, claims]) => ({ date, claims })),
    recent: [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8).map(row => ({
      id: row.id, contractNumber: row.contractNumber, fullName: row.fullName, city: row.clientCity || "",
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    })),
  };
}
