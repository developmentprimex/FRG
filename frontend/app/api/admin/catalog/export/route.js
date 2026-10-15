import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { DEFAULT_KITCHEN_PROGRAMM_ID } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatBoolean(value) {
  return value ? "Yes" : "No";
}

function formatDimensionPart(value) {
  if (value === null || value === undefined || value === "") return "";
  const cm = Number(value) / 10;
  if (!Number.isFinite(cm) || cm <= 0) return "";
  return Number.isInteger(cm)
    ? String(cm)
    : String(Number(cm.toFixed(2))).replace(/\.0+$/, "");
}

function formatDimensions(row) {
  const parts = [
    formatDimensionPart(row.widthMm),
    formatDimensionPart(row.heightMm),
    formatDimensionPart(row.depthMm),
  ].filter(Boolean);
  return parts.length ? `${parts.join(" x ")} cm` : "";
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

function getProgramSheetLabel(programmId) {
  const normalized = String(programmId || "").trim().toUpperCase();
  if (normalized === "IP 2200") return "Impuls";
  if (normalized === "BURGER CINDY") return "Burger - Cindy Type";
  return String(programmId || "Program").trim() || "Program";
}

function getSheetName(category, programLabel = "") {
  const rawName = programLabel ? `${category} - ${programLabel}` : category;
  return rawName.replace(/[\\/*?:[\]]/g, "-").slice(0, 31) || category;
}

function getProgramSheetName(programmId) {
  return getProgramSheetLabel(programmId).replace(/[\\/*?:[\]]/g, "-").slice(0, 31) || "Program";
}

function appendCatalogSheets(workbook, programLabel, articles, blenden, services) {
  const suffix = programLabel ? getProgramSheetLabel(programLabel) : "";

  appendSheet(
    workbook,
    getSheetName("Articles", suffix),
    [
      ["No.", "Program", "Article number", "Name", "German name", "Description", "Width cm", "Height cm", "Depth cm", "Dimensions W x H x D", "Item type", "Price", "Fixed package", "Active", "Linked KitchenItems"],
      ...articles.map((article, index) => [
        index + 1,
        article.programmId,
        article.articleNumber,
        article.name,
        article.nameDe || "",
        article.description || "",
        formatDimensionPart(article.widthMm),
        formatDimensionPart(article.heightMm),
        formatDimensionPart(article.depthMm),
        formatDimensions(article),
        article.itemType,
        formatMoney(article.price),
        formatBoolean(article.isFixedPricePackage),
        formatBoolean(article.isActive),
        article.linkedKitchenItems,
      ]),
    ],
    [8, 18, 26, 36, 36, 42, 12, 12, 12, 24, 16, 12, 16, 12, 20],
  );

  appendSheet(
    workbook,
    getSheetName("Blenden", suffix),
    [
      ["No.", "Program", "Code", "Name", "German name", "Description", "Price", "Active", "Linked KitchenItems"],
      ...blenden.map((blende, index) => [
        index + 1,
        blende.programmId,
        blende.code,
        blende.name,
        blende.nameDe || "",
        blende.description || "",
        formatMoney(blende.price),
        formatBoolean(blende.isActive),
        blende.linkedKitchenItems,
      ]),
    ],
    [8, 18, 18, 32, 32, 42, 12, 12, 20],
  );

  appendSheet(
    workbook,
    getSheetName("Services", suffix),
    [
      ["No.", "Program", "Code", "Name", "German name", "Description", "Price", "Active", "Linked KitchenItems"],
      ...services.map((service, index) => [
        index + 1,
        service.programmId,
        service.code,
        service.name,
        service.nameDe || "",
        service.description || "",
        formatMoney(service.price),
        formatBoolean(service.isActive),
        service.linkedKitchenItems,
      ]),
    ],
    [8, 18, 18, 44, 44, 42, 12, 12, 20],
  );
}

function appendCombinedProgramSheet(workbook, programmId, articles, blenden, services) {
  const rows = [
    ...articles.map((article) => [
      "Article",
      article.programmId,
      article.articleNumber,
      "",
      article.name,
      article.nameDe || "",
      article.description || "",
      formatDimensionPart(article.widthMm),
      formatDimensionPart(article.heightMm),
      formatDimensionPart(article.depthMm),
      formatDimensions(article),
      article.itemType,
      formatMoney(article.price),
      formatBoolean(article.isFixedPricePackage),
      formatBoolean(article.isActive),
      article.linkedKitchenItems,
    ]),
    ...blenden.map((blende) => [
      "Blende",
      blende.programmId,
      "",
      blende.code,
      blende.name,
      blende.nameDe || "",
      blende.description || "",
      "",
      "",
      "",
      "",
      "",
      formatMoney(blende.price),
      "",
      formatBoolean(blende.isActive),
      blende.linkedKitchenItems,
    ]),
    ...services.map((service) => [
      "Service",
      service.programmId,
      "",
      service.code,
      service.name,
      service.nameDe || "",
      service.description || "",
      "",
      "",
      "",
      "",
      "",
      formatMoney(service.price),
      "",
      formatBoolean(service.isActive),
      service.linkedKitchenItems,
    ]),
  ];

  appendSheet(
    workbook,
    getProgramSheetName(programmId),
    [
      ["No.", "Type", "Program", "Article number", "Code", "Name", "German name", "Description", "Width cm", "Height cm", "Depth cm", "Dimensions W x H x D", "Item type", "Price", "Fixed package", "Active", "Linked KitchenItems"],
      ...rows.map((row, index) => [index + 1, ...row]),
    ],
    [8, 14, 18, 26, 18, 36, 36, 42, 12, 12, 12, 24, 16, 12, 16, 12, 20],
  );
}

export async function GET(request) {
  await requireAdminApi();
  const searchParams = new URL(request.url).searchParams;
  const programmId = searchParams.get("programmId")?.trim() || DEFAULT_KITCHEN_PROGRAMM_ID;
  const includeAllPrograms = ["1", "true", "yes", "all"].includes(
    searchParams.get("includeAllPrograms")?.trim().toLowerCase(),
  );

  const [articles, blenden, services] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        ca."articleNumber",
        ca."name",
        ca."nameDe",
        ca."description",
        ca."widthMm",
        ca."heightMm",
        ca."depthMm",
        capp."programmId",
        capp."price",
        ca."itemType",
        ca."isFixedPricePackage",
        capp."isActive",
        COUNT(ki."id")::int AS "linkedKitchenItems"
      FROM "CatalogArticle" ca
      INNER JOIN "CatalogArticleProgramPrice" capp
        ON capp."catalogArticleId" = ca."id"
        AND (${includeAllPrograms} OR capp."programmId" = ${programmId})
      LEFT JOIN "KitchenItem" ki ON ki."catalogArticleId" = ca."id"
        AND EXISTS (
          SELECT 1 FROM "Kitchen" linked_kitchen
          WHERE linked_kitchen."id" = ki."kitchenId"
            AND (${includeAllPrograms} OR linked_kitchen."programmId" = capp."programmId")
        )
      GROUP BY ca."id", capp."programmId", capp."price", capp."isActive"
      ORDER BY capp."programmId" ASC, ca."itemType" ASC, ca."articleNumber" ASC
    `,
    prisma.$queryRaw`
      SELECT
        cb."code",
        cb."name",
        cb."nameDe",
        cb."description",
        cbp."programmId",
        cbp."price",
        cbp."isActive",
        COUNT(ki."id")::int AS "linkedKitchenItems"
      FROM "CatalogBlende" cb
      INNER JOIN "CatalogBlendeProgramPrice" cbp
        ON cbp."catalogBlendeId" = cb."id"
        AND (${includeAllPrograms} OR cbp."programmId" = ${programmId})
      LEFT JOIN "KitchenItem" ki ON ki."catalogBlendeId" = cb."id"
        AND EXISTS (
          SELECT 1 FROM "Kitchen" linked_kitchen
          WHERE linked_kitchen."id" = ki."kitchenId"
            AND (${includeAllPrograms} OR linked_kitchen."programmId" = cbp."programmId")
        )
      GROUP BY cb."id", cbp."programmId", cbp."price", cbp."isActive"
      ORDER BY cbp."programmId" ASC, cb."code" ASC
    `,
    prisma.$queryRaw`
      SELECT
        cs."code",
        cs."name",
        cs."nameDe",
        cs."description",
        csp."programmId",
        csp."price",
        csp."isActive",
        COUNT(ki."id")::int AS "linkedKitchenItems"
      FROM "CatalogService" cs
      INNER JOIN "CatalogServiceProgramPrice" csp
        ON csp."catalogServiceId" = cs."id"
        AND (${includeAllPrograms} OR csp."programmId" = ${programmId})
      LEFT JOIN "KitchenItem" ki ON ki."catalogServiceId" = cs."id"
        AND EXISTS (
          SELECT 1 FROM "Kitchen" linked_kitchen
          WHERE linked_kitchen."id" = ki."kitchenId"
            AND (${includeAllPrograms} OR linked_kitchen."programmId" = csp."programmId")
        )
      GROUP BY cs."id", csp."programmId", csp."price", csp."isActive"
      ORDER BY csp."programmId" ASC, cs."code" ASC
    `,
  ]);

  const workbook = XLSX.utils.book_new();
  if (includeAllPrograms) {
    const rowsByProgram = new Map();
    for (const [rows, rowType] of [[articles, "articles"], [blenden, "blenden"], [services, "services"]]) {
      for (const row of rows) {
        const rowProgramId = String(row.programmId || "").trim();
        if (!rowProgramId) continue;
        if (!rowsByProgram.has(rowProgramId)) {
          rowsByProgram.set(rowProgramId, { articles: [], blenden: [], services: [] });
        }
        rowsByProgram.get(rowProgramId)[rowType].push(row);
      }
    }

    for (const [rowProgramId, programRows] of [...rowsByProgram.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      appendCombinedProgramSheet(workbook, rowProgramId, programRows.articles, programRows.blenden, programRows.services);
    }
  } else {
    appendCatalogSheets(workbook, "", articles, blenden, services);
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fragmento-catalog-${includeAllPrograms ? "all-programs" : programmId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
