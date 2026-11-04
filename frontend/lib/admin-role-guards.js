import { redirect } from "next/navigation";
import { requireAdminApi, requireAdminPage } from "./auth";
import { hasFullAdminAccess, isSuperAdmin } from "./admin-roles";

export async function requireSuperAdminPage() {
  const admin = await requireAdminPage();
  if (!isSuperAdmin(admin)) {
    redirect("/admin");
  }
  return admin;
}

export async function requireSuperAdminApi() {
  const admin = await requireAdminApi();
  if (!isSuperAdmin(admin)) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
  return admin;
}

export async function requirePxAdminPage() {
  const admin = await requireAdminPage(["PX_FRG_VIEW", "PX_ASC_VIEW"]);
  if (!hasFullAdminAccess(admin)) redirect("/admin");
  return admin;
}

export async function requirePxAdminApi() {
  const admin = await requireAdminApi(["PX_FRG_VIEW", "PX_ASC_VIEW"]);
  if (!hasFullAdminAccess(admin)) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
  return admin;
}
