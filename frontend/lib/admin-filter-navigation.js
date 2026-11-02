export const ADMIN_FILTER_SEARCH_DELAY = 700;

export function buildAdminFilterHref(action, entries) {
  const params = new URLSearchParams();
  for (const [name, value] of entries) {
    // A changed filter always starts at the first page.
    if (name === "page" || typeof value !== "string" || !value.trim()) continue;
    params.append(name, value.trim());
  }
  const query = params.toString();
  return action + (query ? `?${query}` : "");
}

export function createFilterScheduler(run, delay = ADMIN_FILTER_SEARCH_DELAY) {
  let timer;
  return {
    cancel() { clearTimeout(timer); timer = undefined; },
    schedule(immediate = false) {
      this.cancel();
      // Even immediate changes wait for the custom control's React update.
      timer = setTimeout(() => { timer = undefined; run(); }, immediate ? 0 : delay);
    },
    get waiting() { return timer !== undefined; },
  };
}
