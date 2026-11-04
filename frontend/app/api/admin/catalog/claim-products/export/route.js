import { withAdminPermission } from "../../../../../../lib/auth";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

function formatBoolean(value) {
  return value ? "Yes" : "No";
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function getClaimProductGroupKey(claimProduct) {
  const productCode = String(claimProduct.articleCode || claimProduct.partKey || "").trim().toLowerCase();
  const name = String(claimProduct.name || "").trim().toLowerCase();
  const nameDe = String(claimProduct.nameDe || "").trim().toLowerCase();
  return [productCode, name, nameDe].join("|");
}

function groupClaimProducts(claimProducts) {
  const groups = new Map();

  for (const claimProduct of claimProducts) {
    const key = getClaimProductGroupKey(claimProduct);
    const group = groups.get(key) || {
      ...claimProduct,
      partKeys: [],
      linkedKitchens: [],
      sourceKitchenItemCodes: [],
      sourceKitchenItemNames: [],
      sourceComponentKeys: [],
    };

    group.partKeys.push(claimProduct.partKey);
    group.linkedKitchens.push(
      [claimProduct.kitchenCode, claimProduct.kitchenSlug].filter(Boolean).join(" / ")
        || claimProduct.kitchenName,
    );
    group.sourceKitchenItemCodes.push(claimProduct.sourceKitchenItemCode);
    group.sourceKitchenItemNames.push(claimProduct.sourceKitchenItemName);
    group.sourceComponentKeys.push(claimProduct.sourceComponentKey);
    group.isActive = group.isActive || claimProduct.isActive;
    group.sortOrder = Math.min(Number(group.sortOrder || 0), Number(claimProduct.sortOrder || 0));
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    partKeys: uniqueValues(group.partKeys),
    linkedKitchens: uniqueValues(group.linkedKitchens),
    sourceKitchenItemCodes: uniqueValues(group.sourceKitchenItemCodes),
    sourceKitchenItemNames: uniqueValues(group.sourceKitchenItemNames),
    sourceComponentKeys: uniqueValues(group.sourceComponentKeys),
  }));
}

function appendSheet(workbook, sheetName, rows, widths) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = widths.map((width) => ({ wch: width }));
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(rows.length - 1, 0), c: Math.max((rows[0]?.length || 1) - 1, 0) },
    }),
  };
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

async function handleGET() {
  await requireAdminApi();

  const claimProducts = await prisma.$queryRaw`
    SELECT
      kcp."partKey",
      kcp."name",
      kcp."nameDe",
      kcp."articleCode",
      kcp."sourceKitchenItemCode",
      kcp."sourceComponentKey",
      kcp."isActive",
      kcp."sortOrder",
      k."name" AS "kitchenName",
      k."slug" AS "kitchenSlug",
      k."kitchenCode" AS "kitchenCode",
      ki."name" AS "sourceKitchenItemName"
    FROM "KitchenClaimPart" kcp
    INNER JOIN "Kitchen" k ON k."id" = kcp."kitchenId"
    LEFT JOIN "KitchenItem" ki ON ki."kitchenId" = kcp."kitchenId"
      AND ki."code" = kcp."sourceKitchenItemCode"
    ORDER BY k."name" ASC, kcp."sortOrder" ASC, kcp."partKey" ASC
  `;

  const workbook = XLSX.utils.book_new();
  appendSheet(
    workbook,
    "Claim products",
    [
      ["Linked kitchen count", "Linked kitchens", "Part key", "Article code", "Name", "German name", "Source item code(s)", "Source item name(s)", "Source component(s)", "Sort order", "Active"],
      ...groupClaimProducts(claimProducts).map((claimProduct) => [
        claimProduct.linkedKitchens.length,
        claimProduct.linkedKitchens.join(", "),
        claimProduct.partKeys.join(", "),
        claimProduct.articleCode || "",
        claimProduct.name,
        claimProduct.nameDe || "",
        claimProduct.sourceKitchenItemCodes.join(", "),
        claimProduct.sourceKitchenItemNames.join(", "),
        claimProduct.sourceComponentKeys.join(", "),
        claimProduct.sortOrder,
        formatBoolean(claimProduct.isActive),
      ]),
    ],
    [20, 60, 24, 18, 36, 36, 26, 42, 28, 12, 12],
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="fragmento-claim-products.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withAdminPermission("ASC_VIEW", handleGET);
