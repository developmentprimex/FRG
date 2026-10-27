import { redirect } from "next/navigation";
import { requireAdminApi, requireAdminPage } from "./auth";
import { isSuperAdmin } from "./admin-roles";

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
