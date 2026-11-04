import { requireAdminApi, requireAdminPage } from "./auth";
import { hasPermission } from "./admin-permissions";

/** Page, API, and sidebar access for authenticated admins. */
export function hasAdminClaimsAccess(admin) {
  return hasPermission(admin, "ASC_VIEW");
}

export function showAdminClaimsInNav(admin) {
  return hasAdminClaimsAccess(admin);
}

export async function requireAdminClaimsPage(pxOnly = false) {
  return requireAdminPage(pxOnly ? "PX_ASC_VIEW" : "ASC_VIEW");
}

export async function requireAdminClaimsApi() {
  return requireAdminApi("ASC_VIEW");
}
