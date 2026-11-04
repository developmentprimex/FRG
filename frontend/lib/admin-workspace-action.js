"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminPage } from "./auth";
import { hasPermission } from "./admin-permissions";

export async function switchAdminWorkspace(formData) {
  const admin = await requireAdminPage();
  const scope = String(formData.get("scope") || "");
  if (!["FRG", "ASC"].includes(scope) || !hasPermission(admin, `${scope}_VIEW`)) {
    redirect("/admin/access-denied");
  }
  // Let the client transition commit the new view without a redirect that can
  // temporarily replace the current dashboard with an empty route.
  (await cookies()).set("adminWorkspace", scope, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 31536000,
  });
  return scope;
}
