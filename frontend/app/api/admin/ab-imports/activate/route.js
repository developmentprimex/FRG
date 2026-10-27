import { requireSuperAdminApi } from "../../../../../lib/admin-role-guards";
import { prisma } from "../../../../../lib/prisma";
import { activateKitchenAb } from "../../../../../lib/kitchen-ab-store.js";

export async function POST(request) {
  try {
    const admin = await requireSuperAdminApi();
    const url = new URL(request.url);
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || url.protocol.slice(0, -1);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() || request.headers.get("host") || url.host;
    const origin = new URL(`${protocol}://${host}`).origin;
    if (request.headers.get("origin") && request.headers.get("origin") !== origin) {
      return Response.json({ error: "Invalid origin." }, { status: 403 });
    }
    const form = await request.formData();
    const id = String(form.get("documentId") || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Invalid AB document ID." }, { status: 400 });
    await activateKitchenAb(prisma, id, admin.email);
    return Response.redirect(new URL("/admin/ab-imports?saved=1", origin), 303);
  } catch (error) {
    return Response.json({ error: error.status ? "Unauthorized" : "AB activation failed." }, { status: error.status || 500 });
  }
}
