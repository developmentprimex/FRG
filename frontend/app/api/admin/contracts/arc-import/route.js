import { withAdminPermission } from "../../../../../lib/auth";
import { NextResponse } from "next/server";
import arcImportCore from "../../../../../lib/arc-kitchen-import-core.cjs";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

const { applyImport, parseArcImageFileName } = arcImportCore;

function errorResponse(error) {
  const status = Number(error?.status) || 400;
  return NextResponse.json({ error: error?.message || "ARC import failed." }, { status });
}

function parseManifest(formData) {
  try {
    return JSON.parse(String(formData.get("manifest") || ""));
  } catch {
    throw new Error("The ARC import manifest is invalid.");
  }
}

async function handlePOST(request) {
  try {
    await requireAdminApi();
    const formData = await request.formData();
    const manifest = parseManifest(formData);
    const metadataByFileName = new Map(
      (Array.isArray(manifest?.images) ? manifest.images : []).map((image) => [image.fileName, image]),
    );
    const files = formData.getAll("images").filter((file) => file && typeof file.arrayBuffer === "function");
    if (!files.length || files.length !== metadataByFileName.size) {
      throw new Error("The ARC import images do not match the manifest.");
    }

    const images = await Promise.all(files.map(async (file) => {
      const parsed = parseArcImageFileName(file.name);
      const metadata = metadataByFileName.get(file.name);
      if (!parsed || !metadata || metadata.abCode !== parsed.abCode) {
        throw new Error(`Unexpected ARC import image: ${file.name}.`);
      }
      return {
        ...metadata,
        fileName: file.name,
        abCode: parsed.abCode,
        bytes: Buffer.from(await file.arrayBuffer()),
      };
    }));
    const result = await applyImport(prisma, images, manifest?.prefixes);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);
