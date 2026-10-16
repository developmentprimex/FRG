export const ADMIN_PAGE_SIZE = 20;

export function normalizeAdminPage(value) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(String(rawValue || "1"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function paginateAdminItems(items = [], requestedPage = 1, pageSize = ADMIN_PAGE_SIZE) {
  const pagination = getAdminPagination(items.length, requestedPage, pageSize);
  const start = (pagination.page - 1) * pageSize;
  return { ...pagination, items: items.slice(start, start + pageSize) };
}

export function getAdminPagination(totalItems, requestedPage = 1, pageSize = ADMIN_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(normalizeAdminPage(requestedPage), totalPages);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}

export function buildAdminPageHref(basePath, searchParams = {}, page = 1) {
  const params = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, rawValue]) => {
    if (key === "page") return;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value != null && String(value).trim()) params.set(key, String(value));
  });

  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
