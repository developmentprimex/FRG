import { REPORT_TIME_ZONE } from "../../../../../../lib/admin-date-time";
import { NextResponse } from "next/server";
import {
  loadActivityReportData,
  normalizeActivityReportFilters,
} from "../../../../../../lib/admin-activity-reports";
import { requireAdminApi } from "../../../../../../lib/auth";
import { loadPublicVisitReportData } from "../../../../../../lib/public-visit-reports";
import { buildStandardExcelWorkbook } from "../../../../../../lib/standard-excel";
import { loadBusinessReportData, getBusinessReportSheets } from "../../../../../../lib/admin-business-reports";
import { normalizeBusinessReportFilters } from "../../../../../../lib/business-report-filters";
import { loadBusinessReportDetails, buildBusinessReportDetailSheet } from "../../../../../../lib/business-report-details";
import { prisma } from "../../../../../../lib/prisma";

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function excelDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getInitials(email) {
  return String(email || "").split("@")[0].split(/[._\s-]+/).filter(Boolean).slice(0, 3).map((part) => part[0]).join("").toUpperCase();
}

function excelResponse({ buffer, filename }) {
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="' + filename + '"',
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request) {
  const admin = await requireAdminApi();
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const businessFilters = normalizeBusinessReportFilters(params);
  const scope = String(params.scope || "").trim().toUpperCase();
  if (scope && !["FRG", "ASC"].includes(scope)) {
    return NextResponse.json({ error: "Invalid report scope." }, { status: 400 });
  }
  if (scope) {
    // Summary and individual records must represent the same database snapshot.
    const { report, details } = await prisma.$transaction(async db => {
      const [report, details] = await Promise.all([
        loadBusinessReportData(businessFilters, db),
        loadBusinessReportDetails(businessFilters, scope, db),
      ]);
      return { report, details };
    }, { isolationLevel: "RepeatableRead" });
    const sheetName = scope === "FRG" ? "Fragmento" : "ASC";
    return excelResponse(buildStandardExcelWorkbook({
      description: `REPORT_${scope}`,
      timeZone: REPORT_TIME_ZONE,
      initials: getInitials(admin?.email),
      sheets: [
        ...getBusinessReportSheets(report).filter(sheet => sheet.name === sheetName),
        buildBusinessReportDetailSheet(details, scope, report.filters),
      ],
    }));
  }
  const filters = normalizeActivityReportFilters({ ...params, ...businessFilters });
  const [{ rows: activityRows, summary }, visitReport, businessReport] = await Promise.all([
    loadActivityReportData(filters),
    loadPublicVisitReportData(filters),
    loadBusinessReportData(businessFilters),
  ]);
  const { summary: visits } = visitReport;
  const { buffer, filename } = buildStandardExcelWorkbook({
    description: "REPORT_FRAGMENTO_ASC",
    timeZone: REPORT_TIME_ZONE,
    initials: getInitials(admin?.email),
    sheets: [
      ...getBusinessReportSheets(businessReport),
      {
        name: "Report",
        title: "ORDERS AND CLAIMS REPORT",
        headers: ["Type", "Reference", "Created at", "Status", "Customer", "Email", "Phone", "Contract number", "City", "Country", "Details", "Serial number", "Request type", "Payment status", "Item count", "Gross", "Net without VAT", "VAT (19%)"],
        currencyColumns: [15, 16, 17],
        rows: activityRows.map((row) => [
          row.type === "ORDER" ? "Order" : "Claim",
          row.reference,
          excelDate(row.createdAt),
          row.status,
          row.customer,
          row.email,
          row.phone,
          row.contractNumber,
          row.city,
          row.country,
          row.type === "ORDER" ? row.orderDetails : row.issue,
          row.serialNumber,
          row.requestType,
          row.paymentStatus,
          row.itemCount,
          row.gross === null ? null : money(row.gross),
          row.net === null ? null : money(row.net),
          row.vat === null ? null : money(row.vat),
        ]),
      },
      {
        name: "Summary",
        title: "REPORT SUMMARY",
        headers: ["Metric", "Value"],
        currencyRows: [7, 8, 9],
        rows: [
          ["Date from", filters.dateFrom || "All"],
          ["Date to", filters.dateTo || "All"],
          ["Type", filters.type || "All"],
          ["Status", filters.status || "All"],
          ["Total records", summary.totalRecords],
          ["Total claims", summary.totalClaims],
          ["Total orders", summary.totalOrders],
          ["Net without VAT — confirmed orders", money(summary.confirmedNet)],
          ["VAT total (19%) — confirmed orders", money(summary.confirmedVat)],
          ["Total with VAT — confirmed orders", money(summary.confirmedGross)],
          ["Done orders", summary.doneOrders],
          ["Not done / unpaid orders", summary.notDoneUnpaidOrders],
          ["Estimated daily visitors", visits.uniqueVisitors],
          ["Opened site", visits.opened],
          ["Entered contract", visits.submitted],
          ["Worked", visits.accepted],
          ["Test", visits.testAccepted],
          ["Did not work", visits.rejected],
          ["Success rate", Number(visits.successRate || 0).toFixed(1) + "%"],
        ],
      },
    ],
  });

  return excelResponse({ buffer, filename });
}
