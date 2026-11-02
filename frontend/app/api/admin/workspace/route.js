import { cookies } from "next/headers";
import { requireAdminApi, withAdminPermission } from "../../../../lib/auth";
import { hasPermission } from "../../../../lib/admin-permissions";

export const POST = withAdminPermission(null, async request => {
  const admin = await requireAdminApi();
  const form = await request.formData();
  const scope = String(form.get("scope") || "");
  if (!["FRG", "ASC"].includes(scope) || !hasPermission(admin, `${scope}_VIEW`)) return Response.json({ error: "Forbidden" }, { status: 403 });
  (await cookies()).set("adminWorkspace", scope, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 });
  if (request.headers.get("accept") === "application/json") return new Response(null, { status: 204 });
  return Response.redirect(new URL("/admin", request.url), 303);
});
