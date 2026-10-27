import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireAdminClaimsApi } from "../../../../../../../lib/admin-claims-access";
import { findReferencePlanMarkersInSnapshot, renderReferencePlanMarkersPng } from "../../../../../../../lib/claim-kitchen-preview";
import { getPublicContractClaimPlanAsset } from "../../../../../../../lib/contract-claim-plan-assets";
import { prisma } from "../../../../../../../lib/prisma";
import { queryServiceClaimById } from "../../../../../../../lib/service-claim-admin-query";
import { readServiceClaimAttachmentBytes } from "../../../../../../../lib/service-claim-attachments-storage";
import { getServiceClaimKitchenPlan } from "../../../../../../../lib/service-claim-kitchen-plan";
import { normalizeServiceClaimPlanPreviewPath } from "../../../../../../../lib/service-claim-reference-plan";

function parseAttachmentsJson(raw) {
  if (raw == null || raw === "") {
    return [];
  }
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function asciiDispositionFilename(name) {
  const s = String(name || "file").replace(/[^\x20-\x7E]+/g, "_");
  return s.replace(/"/g, "_") || "file";
}

function inferContentTypeFromFilename(filename) {
  const ext = String(filename || "").toLowerCase().split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "bmp") return "image/bmp";
  if (ext === "tif" || ext === "tiff") return "image/tiff";
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt") return "text/plain; charset=utf-8";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "xls") return "application/vnd.ms-excel";
  if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "";
}

function wantsInlineView(request) {
  const url = new URL(request.url);
  const view = url.searchParams.get("view");
  if (view === "1" || view === "true") {
    return true;
  }
  const disposition = url.searchParams.get("disposition");
  return String(disposition || "").toLowerCase() === "inline";
}

async function readReferencePlanPreview(contractNumber, previewImagePath) {
  const previewPath = normalizeServiceClaimPlanPreviewPath(previewImagePath);
  if (!previewPath) return null;
  if (previewPath.startsWith("/api/service-claims/contracts/")) {
    const asset = await getPublicContractClaimPlanAsset(prisma, contractNumber, "preview");
    return asset?.bytes ? Buffer.from(asset.bytes) : null;
  }
  const publicRoot = path.resolve(process.cwd(), "public");
  const assetPath = path.resolve(publicRoot, decodeURIComponent(previewPath).replace(/^[/\\]+/, ""));
  if (!assetPath.startsWith(`${publicRoot}${path.sep}`)) return null;
  return readFile(assetPath).catch(() => null);
}

export async function GET(request, { params }) {
  try {
    await requireAdminClaimsApi();
  } catch (error) {
    const status = error.status || 401;
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status },
    );
  }

  const { id, index: indexParam } = await params;
  const index = Number.parseInt(String(indexParam), 10);
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Invalid attachment index." }, { status: 400 });
  }

  const rows = await queryServiceClaimById(prisma, id);
  const claim = rows[0];
  if (!claim) {
    return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  }

  const attachments = parseAttachmentsJson(claim.attachmentsJson);
  if (index >= attachments.length) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }

  const meta = attachments[index] || {};
  let buffer = await readServiceClaimAttachmentBytes(id, index);
  if (!buffer) {
    return NextResponse.json(
      {
        error:
          "File data is not available for this attachment (older submission or storage unavailable).",
      },
      { status: 404 },
    );
  }

  const filename = typeof meta.filename === "string" ? meta.filename : `attachment-${index}`;
  const declaredContentType =
    typeof meta.contentType === "string" && meta.contentType.trim()
      ? meta.contentType.trim()
      : "";
  let contentType =
    declaredContentType && declaredContentType.toLowerCase().split(";")[0].trim() !== "application/octet-stream"
      ? declaredContentType
      : inferContentTypeFromFilename(filename) || "application/octet-stream";
  const asciiName = asciiDispositionFilename(filename);
  const starName = encodeURIComponent(filename);
  const inline = wantsInlineView(request);
  if (inline && meta.role === "kitchen_preview" && new URL(request.url).searchParams.get("compactMarkers") === "1") {
    const compactPreview = await (async () => {
      const plan = await getServiceClaimKitchenPlan(claim.contractNumber);
      if (plan?.selectionMode !== "reference-pdf") return null;
      const markers = await findReferencePlanMarkersInSnapshot(buffer);
      if (!markers.length) return null;
      const source = await readReferencePlanPreview(claim.contractNumber, plan.previewImagePath);
      return source?.length ? renderReferencePlanMarkersPng({ content: source, markers }) : null;
    })().catch(() => null);
    if (compactPreview) {
      buffer = compactPreview;
      contentType = "image/png";
    }
  }
  const dispositionType = inline ? "inline" : "attachment";

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${dispositionType}; filename="${asciiName}"; filename*=UTF-8''${starName}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
