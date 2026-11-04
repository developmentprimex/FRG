import { withAdminPermission } from "../../../../../../lib/auth";
import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { getKitchenById } from "../../../../../../lib/catalog";
import { buildKitchenCatalogWorkbook, parseKitchenCatalogSheet } from "../../../../../../lib/kitchen-catalog-sheet";
import { prisma } from "../../../../../../lib/prisma";

async function handleGET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const kitchen = await getKitchenById(id);

  if (!kitchen) {
    return NextResponse.json({ error: "Kitchen not found" }, { status: 404 });
  }

  const workbook = buildKitchenCatalogWorkbook(kitchen);

  return new NextResponse(workbook, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${kitchen.slug}-catalog.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

async function handlePOST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;

  try {
    const kitchen = await getKitchenById(id);
    if (!kitchen) {
      throw new Error("Kitchen not found.");
    }

    const formData = await request.formData();
    const file = formData.get("catalogFile");

    if (!file || typeof file === "string" || typeof file.text !== "function") {
      throw new Error("Please upload the catalog file exported from this kitchen.");
    }

    const importedRows = parseKitchenCatalogSheet(new Uint8Array(await file.arrayBuffer()), file.name);
    if (!importedRows.length) {
      throw new Error("The catalog file has no item rows to import.");
    }

    const existingById = new Map(kitchen.items.map((item) => [item.id, item]));
    const existingByCode = new Map(kitchen.items.map((item) => [item.code, item]));
    let updatedCount = 0;
    const nextCodesByItemId = new Map(kitchen.items.map((item) => [item.id, item.code]));
    const seenImportedRowKeys = new Set();

    for (const row of importedRows) {
      const existingItem = (row.id && existingById.get(row.id)) || existingByCode.get(row.code);
      if (!existingItem) {
        continue;
      }

      if (seenImportedRowKeys.has(existingItem.id)) {
        throw new Error(`The catalog file contains "${existingItem.name}" more than once.`);
      }

      seenImportedRowKeys.add(existingItem.id);
      nextCodesByItemId.set(existingItem.id, row.data.code);
    }

    const codeOwners = new Map();
    for (const [itemId, code] of nextCodesByItemId) {
      if (codeOwners.has(code)) {
        const firstItem = existingById.get(codeOwners.get(code));
        const secondItem = existingById.get(itemId);
        throw new Error(
          `Item code "${code}" is used by both "${firstItem?.name || "one item"}" and "${secondItem?.name || "another item"}". Article numbers must be unique.`,
        );
      }

      codeOwners.set(code, itemId);
    }

    await prisma.$transaction(async (tx) => {
      for (const row of importedRows) {
        const existingItem = (row.id && existingById.get(row.id)) || existingByCode.get(row.code);
        if (!existingItem) {
          continue;
        }

        await tx.kitchenItem.update({
          where: { id: existingItem.id },
          data: row.data,
        });
        updatedCount += 1;
      }
    });

    if (!updatedCount) {
      throw new Error("No matching kitchen items were found. Re-import the file exported from this kitchen.");
    }

    return redirectWithFlash(
      request,
      `/admin/kitchens/${id}`,
      "success",
      `${updatedCount} item(s) updated from the spreadsheet.`,
    );
  } catch (error) {
    return redirectWithFlash(request, `/admin/kitchens/${id}`, "error", mapAdminMutationError(error, "Catalog import"));
  }
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
export const POST = withAdminPermission("FRG_MANAGE", handlePOST);
