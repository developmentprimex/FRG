import { withAdminPermission } from "../../../../../lib/auth";
import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import {
  applyCatalogPriceListImport,
  parseCatalogPriceListFile,
  previewCatalogPriceListImport,
} from "../../../../../lib/catalog-price-list-import";
import { prisma } from "../../../../../lib/prisma";

async function readImportFile(formData) {
  const file = formData.get("catalogFile");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    throw new Error("Please upload an Excel catalog price list.");
  }

  return {
    file,
    parsed: parseCatalogPriceListFile(new Uint8Array(await file.arrayBuffer())),
  };
}

function parseEffectiveFrom(formData) {
  const rawValue = String(formData.get("effectiveFrom") || "").trim();
  if (!rawValue) {
    throw new Error("Start date is required.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    throw new Error("Start date must be a valid date.");
  }
  const date = new Date(`${rawValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Start date must be a valid date.");
  }
  return date;
}

async function handlePOST(request) {
  const admin = await requireAdminApi();
  const formData = await request.formData();
  const intent = String(formData.get("_intent") || "preview");

  try {
    const { file, parsed } = await readImportFile(formData);
    const programmId = String(formData.get("programmId") || "").trim();
    if (!programmId) {
      throw new Error("Programm ID is required.");
    }
    const effectiveFrom = parseEffectiveFrom(formData);
    const preview = await previewCatalogPriceListImport(prisma, parsed, { programmId });

    if (intent === "preview") {
      return NextResponse.json(preview);
    }

    if (preview.validationErrors.length) {
      throw new Error(`Import has ${preview.validationErrors.length} validation error(s). Preview the file before applying it.`);
    }

    const result = await applyCatalogPriceListImport(prisma, parsed, {
      sourceName: file.name || "uploaded price list",
      programmId,
      effectiveFrom,
      label: String(formData.get("label") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      importedBy: admin.email || "",
      syncLinkedKitchenItems: formData.get("syncLinkedKitchenItems") === "true",
      includeLocked: false,
      includeTestKitchens: formData.get("includeTestKitchens") === "true",
    });

    const summary = result.summary;
    const actionLabel = summary.scheduled ? "Import scheduled" : "Import applied";
    return redirectWithFlash(
      request,
      "/admin/catalog/imports",
      "success",
      `${actionLabel}: ${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged, ${summary.syncedKitchenItems} kitchen item(s) synced.`,
    );
  } catch (error) {
    if (intent === "preview") {
      return NextResponse.json(
        { error: mapAdminMutationError(error, "Catalog import") },
        { status: error?.status || 400 },
      );
    }

    return redirectWithFlash(request, "/admin/catalog/imports", "error", mapAdminMutationError(error, "Catalog import"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);
