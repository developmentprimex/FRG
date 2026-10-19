import { prisma } from "../../../../lib/prisma";
import { authorizeAbSync, readAbRequest, validateAbUpload } from "../../../../lib/kitchen-ab-validation.js";
import { recordAbSyncRun, saveKitchenAb } from "../../../../lib/kitchen-ab-store.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  if (!authorizeAbSync(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let input;
  try {
    input = await readAbRequest(request);
    if (!["start", "finish", "document"].includes(input.operation)) throw new Error("Invalid sync operation.");
    if (input.operation === "document") input.upload = validateAbUpload(input);
  } catch (error) {
    return Response.json({ error: error.message || "Invalid upload." }, { status: 400 });
  }
  try {
    const result = input.operation === "document" ? await saveKitchenAb(prisma, input.upload) : await recordAbSyncRun(prisma, input);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AB synchronization failed:", error.code || error.name);
    return Response.json({ error: "AB synchronization is unavailable. Retry after checking the server logs." }, { status: 503 });
  }
}
