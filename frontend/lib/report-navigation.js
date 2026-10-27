export function getReportsReturnHref(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || !/^\/admin\/reports(?:\?|$)/.test(raw)) return "";
  const url = new URL(raw, "http://localhost");
  if (url.pathname !== "/admin/reports") return "";
  const params = new URLSearchParams();
  for (const key of ["dateFrom", "dateTo", "type", "status", "groupBy", "contractType", "period"]) {
    if (url.searchParams.has(key)) params.set(key, url.searchParams.get(key));
  }
  return "/admin/reports" + (params.size ? "?" + params.toString() : "");
}
