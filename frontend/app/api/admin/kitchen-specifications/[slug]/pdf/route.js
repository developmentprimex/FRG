import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAdminApi } from "../../../../../../lib/auth";
import { getKitchenSpecification } from "../../../../../../lib/order-kitchen-specifications";
import { prisma } from "../../../../../../lib/prisma";
import { readKitchenAb, readKitchenAbVersion } from "../../../../../../lib/kitchen-ab-store.js";
import { requireSuperAdminApi } from "../../../../../../lib/admin-role-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    await requireAdminApi();
    const { slug } = await params;
    const version = new URL(request.url).searchParams.get("documentId");
    let saved;
    if (version) {
      await requireSuperAdminApi();
      saved = await readKitchenAbVersion(prisma, { slug }, version);
      if (!saved) return Response.json({ error: "AB version not found." }, { status: 404 });
    } else saved = await readKitchenAb(prisma, { slug }, { includePdf: true });
    const reference = saved?.metadata || getKitchenSpecification({ slug });
    if (!reference) return Response.json({ error: "Kitchen AB not found." }, { status: 404 });
    // Filename comes exclusively from the generated, trusted source manifest.
    const bytes = saved?.pdfBytes || await readFile(path.join(process.cwd(), "data", "kitchen-specifications", "pdfs", reference.sourceFile));
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(bytes, { headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${disposition}; filename="AB-${reference.kitchenSlug.slice(3)}.pdf"; filename*=UTF-8''${encodeURIComponent(reference.sourceFile)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    const status = error.status || (error.code === "ENOENT" ? 404 : 500);
    return Response.json({ error: status === 401 ? "Unauthorized" : "Kitchen AB is unavailable." }, { status });
  }
}
