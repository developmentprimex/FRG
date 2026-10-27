import { redirect } from "next/navigation";
import { requireAdminApi, requireAdminPage } from "./auth";
import { hasFullAdminAccess } from "./admin-roles";

export async function requireSuperAdminPage() {
  const admin = await requireAdminPage();
  if (!hasFullAdminAccess(admin)) {
    redirect("/admin");
  }
  return admin;
}

export async function requireSuperAdminApi() {
  const admin = await requireAdminApi();
  if (!hasFullAdminAccess(admin)) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
  return admin;
}

export const requirePxAdminPage = requireSuperAdminPage;
export const requirePxAdminApi = requireSuperAdminApi;
