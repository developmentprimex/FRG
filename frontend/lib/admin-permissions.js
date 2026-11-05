export const ADMIN_PERMISSIONS = ["FRG", "ASC"];

export function canViewTestContracts(admin) {
  return ["SUPERADMIN", "PX_ADMIN"].includes(admin?.role);
}

function permissionWorkspace(permission) {
  return /^(FRG|ASC)(?:_VIEW|_MANAGE)?$/.exec(permission)?.[1] || null;
}

export function hasPermission(admin, permission) {
  if (!admin) return false;
  if (admin.role === "SUPERADMIN") return true;
  if (permission === "SETTINGS_MANAGE") {
    return ["ADMIN", "PX_ADMIN"].includes(admin.role) && (hasPermission(admin, "FRG") || hasPermission(admin, "ASC"));
  }
  if (permission.startsWith("PX_")) {
    return admin.role === "PX_ADMIN" && hasPermission(admin, permission.slice(3));
  }
  const workspace = permissionWorkspace(permission);
  if (!workspace) return false;
  const permissions = Array.isArray(admin.permissions) ? admin.permissions : [];
  // Existing VIEW/MANAGE grants now represent full access to that workspace.
  return permissions.some(value => permissionWorkspace(value) === workspace);
}

export function canAccess(admin, required) {
  if (!required) return true;
  if (Array.isArray(required)) return required.some(permission => hasPermission(admin, permission));
  return hasPermission(admin, required);
}

export function parsePermissions(values) {
  if (values.some(value => !permissionWorkspace(value))) throw new Error("Invalid permission.");
  return [...new Set(values.map(permissionWorkspace))];
}

export function resolveWorkspace(admin, requested) {
  if (["FRG", "ASC"].includes(requested) && hasPermission(admin, `${requested}_VIEW`)) return requested;
  return ["FRG", "ASC"].find(scope => hasPermission(admin, `${scope}_VIEW`)) || null;
}

// Shared by server guards, navigation and route coverage tests.
export function routePermission(path, method = "GET") {
  const segment = path.replace(/^\/api/, "").split("/")[2];
  const view = method === "GET" || method === "HEAD";
  if (["login", "logout", "account", "access-denied", "workspace"].includes(segment)) return null;
  if (segment === "settings") return path.includes("/login-verification") ? "SUPERADMIN" : "SETTINGS_MANAGE";
  if (segment === "users") return "SUPERADMIN";
  if (segment === "contract-access") return "FRG_VIEW";
  if (segment === "claim-activity") return "ASC_VIEW";
  if (segment === "px-orders") return view ? "PX_FRG_VIEW" : "PX_FRG_MANAGE";
  if (segment === "px-claims") return view ? "PX_ASC_VIEW" : "PX_ASC_MANAGE";
  if (segment === "px-order-tickets") return view ? "PX_FRG_VIEW" : "PX_FRG_MANAGE";
  if (segment === "order-tickets") return view ? "FRG_VIEW" : "FRG_MANAGE";
  if (["claims"].includes(segment)) return view ? "ASC_VIEW" : "ASC_MANAGE";
  if (path.includes("/catalog/claim-products")) return view ? "ASC_VIEW" : "ASC_MANAGE";
  if (["orders", "px-orders", "order-cancellations", "search"].includes(segment)) return view ? "FRG_VIEW" : "FRG_MANAGE";
  if (["contracts", "kitchens", "property-owners", "property-objects", "catalog", "catalog-audit", "items", "product-info"].includes(segment)) return view ? "FRG_VIEW" : "FRG_MANAGE";
  if (segment === "reports") return path.includes("/asc") ? "ASC_VIEW" : path.includes("/frg") ? "FRG_VIEW" : ["FRG_VIEW", "ASC_VIEW"];
  return null;
}
