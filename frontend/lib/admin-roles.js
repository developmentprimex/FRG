export const ADMIN_ROLES = ["SUPERADMIN", "PX_ADMIN", "ADMIN", "USER"];

export function isSuperAdmin(admin) {
  return admin?.role === "SUPERADMIN";
}

export function parseAdminRole(value) {
  const role = String(value || "").trim().toUpperCase();
  return ADMIN_ROLES.includes(role) ? role : null;
}

export function formatAdminRoleLabel(role) {
  switch (role) {
    case "SUPERADMIN":
      return "Superadmin";
    case "PX_ADMIN":
      return "PX Admin";
    case "ADMIN":
      return "Admin";
    case "USER":
      return "User";
    default:
      return role || "Unknown";
  }
}
