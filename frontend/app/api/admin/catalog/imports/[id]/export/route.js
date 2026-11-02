import { withAdminPermission } from "../../../../../../../lib/auth";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdminApi } from "../../../../../../../lib/auth";
import { prisma } from "../../../../../../../lib/prisma";

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatBoolean(value) {
  return value ? "Yes" : "No";
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

function filenamePart(value) {
  return String(value || "catalog-price-list")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "catalog-price-list";
}

function appendPriceListSheets(workbook, rows) {
  const articles = rows.filter((row) => row.itemKind === "Article");
  const blenden = rows.filter((row) => row.itemKind === "Blende");
  const services = rows.filter((row) => row.itemKind === "Service");

  appendSheet(
    workbook,
    "Articles",
    [
      ["Article number", "Name", "German name", "Description", "Width mm", "Height mm", "Depth mm", "Item type", "Price", "Fixed package", "Active"],
      ...articles.map((row) => [
        row.articleNumber || row.identifier,
        row.name,
        row.nameDe || "",
        row.description || "",
        row.widthMm ?? "",
        row.heightMm ?? "",
        row.depthMm ?? "",
        row.itemType || "",
        formatMoney(row.price),
        formatBoolean(row.isFixedPricePackage),
        formatBoolean(row.isActive),
      ]),
    ],
    [26, 36, 36, 42, 12, 12, 12, 16, 12, 16, 12],
  );
  appendSheet(
    workbook,
    "Blenden",
    [
      ["Code", "Name", "German name", "Description", "Price", "Active"],
      ...blenden.map((row) => [
        row.code || row.identifier,
        row.name,
        row.nameDe || "",
        row.description || "",
        formatMoney(row.price),
        formatBoolean(row.isActive),
      ]),
    ],
    [18, 32, 32, 42, 12, 12],
  );
  appendSheet(
    workbook,
    "Services",
    [
      ["Code", "Name", "German name", "Description", "Price", "Active"],
      ...services.map((row) => [
        row.code || row.identifier,
        row.name,
        row.nameDe || "",
        row.description || "",
        formatMoney(row.price),
        formatBoolean(row.isActive),
      ]),
    ],
    [18, 44, 44, 42, 12, 12],
  );
}

async function listCurrentProgramPriceRows(programmId) {
  const [articles, blenden, services] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        'Article' AS "itemKind",
        ca."articleNumber" AS "identifier",
        ca."articleNumber",
        NULL::text AS "code",
        ca."name",
        ca."nameDe",
        ca."description",
        ca."widthMm",
        ca."heightMm",
        ca."depthMm",
        ca."itemType",
        COALESCE(capp."price", ca."price") AS "price",
        ca."isFixedPricePackage",
        COALESCE(capp."isActive", ca."isActive") AS "isActive"
      FROM "CatalogArticle" ca
      LEFT JOIN "CatalogArticleProgramPrice" capp
        ON capp."catalogArticleId" = ca."id"
        AND capp."programmId" = ${programmId}
      ORDER BY ca."itemType" ASC, ca."articleNumber" ASC
    `,
    prisma.$queryRaw`
      SELECT
        'Blende' AS "itemKind",
        cb."code" AS "identifier",
        NULL::text AS "articleNumber",
        cb."code",
        cb."name",
        cb."nameDe",
        cb."description",
        NULL::integer AS "widthMm",
        NULL::integer AS "heightMm",
        NULL::integer AS "depthMm",
        NULL::"ItemType" AS "itemType",
        COALESCE(cbp."price", cb."price") AS "price",
        NULL::boolean AS "isFixedPricePackage",
        COALESCE(cbp."isActive", cb."isActive") AS "isActive"
      FROM "CatalogBlende" cb
      LEFT JOIN "CatalogBlendeProgramPrice" cbp
        ON cbp."catalogBlendeId" = cb."id"
        AND cbp."programmId" = ${programmId}
      ORDER BY cb."code" ASC
    `,
    prisma.$queryRaw`
      SELECT
        'Service' AS "itemKind",
        cs."code" AS "identifier",
        NULL::text AS "articleNumber",
        cs."code",
        cs."name",
        cs."nameDe",
        cs."description",
        NULL::integer AS "widthMm",
        NULL::integer AS "heightMm",
        NULL::integer AS "depthMm",
        NULL::"ItemType" AS "itemType",
        COALESCE(csp."price", cs."price") AS "price",
        NULL::boolean AS "isFixedPricePackage",
        COALESCE(csp."isActive", cs."isActive") AS "isActive"
      FROM "CatalogService" cs
      LEFT JOIN "CatalogServiceProgramPrice" csp
        ON csp."catalogServiceId" = cs."id"
        AND csp."programmId" = ${programmId}
      ORDER BY cs."code" ASC
    `,
  ]);

  return [...articles, ...blenden, ...services];
}

async function handleGET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const entry = await prisma.catalogPriceListImport.findUnique({
    where: { id },
  });

  if (!entry) {
    return NextResponse.json({ error: "Import not found" }, { status: 404 });
  }

  const workbook = XLSX.utils.book_new();
  const rows = await prisma.$queryRaw`
    SELECT
      "itemKind",
      "identifier",
      "articleNumber",
      "code",
      "name",
      "nameDe",
      "description",
      "widthMm",
      "heightMm",
      "depthMm",
      "itemType",
      "price",
      "isFixedPricePackage",
      "isActive"
    FROM "CatalogPriceListImportRow"
    WHERE "importId" = ${id}
    ORDER BY "itemKind" ASC, "identifier" ASC
  `;

  appendPriceListSheets(
    workbook,
    rows.length ? rows : await listCurrentProgramPriceRows(entry.programmId || ""),
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = `${filenamePart(entry.programmId)}-${filenamePart(entry.label || entry.sourceName || entry.id)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
