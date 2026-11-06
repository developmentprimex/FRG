import { jsPDF } from "jspdf";
import { formatAdminDate } from "./admin-date-time.js";

const colors = { accent: "#71543E", text: "#252525", muted: "#746E68", border: "#DED8D1", soft: "#F6F3EF", green: "#7A8B80" };
const clean = value => String(value ?? "").replace(/[\u2010-\u2015]/g, "-").replace(/\u00a0/g, " ").replace(/\u2192/g, ">").trim();
const categoryKeys = ["cabinets", "electrical", "other", "unknown"];
const categoryLabels = { cabinets: "Cabinets", electrical: "Electrical appliances", other: "Other components", unknown: "Not recorded" };

export function buildAscDashboardPdf(summary, options = {}) {
  const language = options.language === "de" ? "de" : "en";
  const t = (key, fallback) => clean(options.translate?.(key, fallback) || fallback);
  const number = value => new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: 1 }).format(value);
  const date = (value, time = false) => value ? clean(new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", ...(time ? { timeStyle: "short" } : {}), timeZone: "Europe/Berlin" }).format(new Date(value))) : "-";
  const eventDate = value => value ? clean(formatAdminDate(value, language)) : "-";
  const productName = row => language === "de" ? row.nameDe || row.name : row.name;
  const category = key => t(`category_${key}`, categoryLabels[key]);
  const source = key => key === "unknown" ? t("unlinked", "Not linked to FRG / ARC") : key;
  const provenance = sources => sources.map(key => ({ claim: t("recordedClaim", "Recorded in claim"), inventory: t("savedInventory", "Saved contract inventory"), inventoryType: t("inventoryTypeMatch", "Current contract inventory - appliance type"), catalog: t("matchingCatalog", "Matching kitchen article") })[key] || t("category_unknown", "Not recorded")).join(" / ");
  const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "pt", compress: true });
  if (!options.fonts?.regular || !options.fonts?.bold) throw new Error("PDF fonts are required.");
  doc.addFileToVFS("LiberationSans-Regular.ttf", options.fonts.regular);
  doc.addFont("LiberationSans-Regular.ttf", "ReportSans", "normal");
  doc.addFileToVFS("LiberationSans-Bold.ttf", options.fonts.bold);
  doc.addFont("LiberationSans-Bold.ttf", "ReportSans", "bold");
  doc.setProperties({ title: t("title", "Claims overview"), subject: "ASC claims overview", author: "Fragmento", creator: "Fragmento admin" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 34, CW = W - M * 2, BOTTOM = H - 38;
  const generated = options.generatedAt || new Date();
  let y = 0;
  const font = (size = 10, bold = false, color = colors.text) => { doc.setFont("ReportSans", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(color); };
  const write = (value, x, baseline, size = 10, bold = false, color = colors.text) => { font(size, bold, color); doc.text(clean(value), x, baseline); };
  function page(first = false) {
    if (!first) doc.addPage();
    doc.setDrawColor(colors.border); doc.setLineWidth(.6);
    if (options.logo) doc.addImage(options.logo, "PNG", M, 24, 116, 25);
    else write("fragmento.", M, 45, 23, true, colors.accent);
    write("ASC / " + t("pdfReport", "CLAIMS REPORT"), W - M - 192, 36, 9, true, colors.accent);
    write(date(generated, true) + " / Europe/Berlin", W - M - 192, 50, 8, false, colors.muted);
    doc.line(M, 62, W - M, 62);
    y = 85;
    if (first) { write(t("title", "Claims overview"), M, y + 4, 24, true); y += 28; }
  }
  function ensure(height) { if (y + height > BOTTOM) page(); }
  function paragraph(value, size = 9, color = colors.muted) {
    font(size, false, color);
    const lines = doc.splitTextToSize(clean(value), CW);
    for (const line of lines) { ensure(size * 1.45); write(line, M, y, size, false, color); y += size * 1.45; }
    y += 7;
  }
  function heading(title, note = "", required = 130) {
    ensure(required); y += 6;
    write(title, M, y, 14, true); y += 19;
    if (note) paragraph(note, 8.5);
  }
  function cards(entries) {
    const gap = 10, width = (CW - gap * 3) / 4;
    for (let offset = 0; offset < entries.length; offset += 4) {
      ensure(66);
      entries.slice(offset, offset + 4).forEach(([label, value, detail], index) => {
        const x = M + index * (width + gap);
        doc.setFillColor(colors.soft); doc.setDrawColor(colors.border); doc.roundedRect(x, y, width, 59, 5, 5, "FD");
        font(8.4, false, colors.muted); const lines = doc.splitTextToSize(clean(label), width - 18);
        doc.text(lines.slice(0, 2), x + 10, y + 13);
        const valueSize = String(value).length > 12 ? 15 : 23;
        write(value, x + 10, y + 43, valueSize, true);
        if (detail) write(detail, x + 10, y + 54, 7.2, false, colors.muted);
      });
      y += 67;
    }
  }
  function table(headers, rows, weights, empty = t("empty", "No claims for these filters.")) {
    const total = weights.reduce((sum, value) => sum + value, 0), widths = weights.map(value => CW * value / total);
    const P = 7, size = 9, LH = 12;
    font(size, true);
    const headerLines = headers.map((header, index) => doc.splitTextToSize(clean(header).toLocaleUpperCase(language === "de" ? "de-DE" : "en-GB"), widths[index] - P * 2));
    const headerHeight = Math.max(...headerLines.map(lines => lines.length)) * LH + P * 2;
    function header() {
      let x = M;
      headerLines.forEach((lines, index) => {
        doc.setFillColor(colors.soft); doc.setDrawColor(colors.border); doc.rect(x, y, widths[index], headerHeight, "FD");
        font(size, true); doc.text(lines, x + P, y + P + size); x += widths[index];
      });
      y += headerHeight;
    }
    ensure(headerHeight + 30); header();
    if (!rows.length) {
      font(size); const lines = doc.splitTextToSize(clean(empty), CW - P * 2);
      const height = lines.length * LH + P * 2;
      if (y + height > BOTTOM) { page(); header(); }
      doc.setDrawColor(colors.border); doc.rect(M, y, CW, height);
      font(size, false, colors.muted); doc.text(lines, M + P, y + P + size);
      y += height + 17; return;
    }
    for (const row of rows) {
      font(size);
      const cells = headers.map((_, index) => doc.splitTextToSize(clean(row[index] ?? "-"), widths[index] - P * 2));
      let offset = 0, lineCount = Math.max(...cells.map(lines => lines.length));
      do {
        if (BOTTOM - y < P * 2 + LH) { page(); header(); }
        const available = Math.max(1, Math.floor((BOTTOM - y - P * 2) / LH));
        if (offset === 0 && lineCount <= 8 && lineCount > available) { page(); header(); continue; }
        const count = Math.min(lineCount - offset, Math.max(1, Math.floor((BOTTOM - y - P * 2) / LH)));
        const height = count * LH + P * 2;
        let x = M;
        cells.forEach((lines, index) => {
          doc.setDrawColor(colors.border); doc.rect(x, y, widths[index], height);
          font(size); const part = lines.slice(offset, offset + count);
          if (part.length) doc.text(part, x + P, y + P + size);
          x += widths[index];
        });
        y += height; offset += count;
        if (offset < lineCount) { page(); header(); }
      } while (offset < lineCount);
    }
    y += 17;
  }
  function activity() {
    const daily = summary.daily;
    if (!daily.length) { paragraph(t("empty", "No claims for these filters.")); return; }
    const span = (new Date(daily.at(-1).date) - new Date(daily[0].date)) / 86400000;
    const monthly = span > 90, weekly = !monthly && span > 30;
    const grouped = new Map();
    for (const row of daily) {
      let bucket = row.date;
      if (monthly) bucket = row.date.slice(0, 7);
      else if (weekly) { const day = new Date(`${row.date}T12:00:00Z`); day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7); bucket = day.toISOString().slice(0, 10); }
      grouped.set(bucket, (grouped.get(bucket) || 0) + row.claims);
    }
    const entries = [...grouped]; ensure(156);
    write(monthly ? t("pdfMonthly", "Monthly totals") : weekly ? t("pdfWeekly", "Weekly totals") : t("pdfDaily", "Daily totals"), M, y, 9, false, colors.muted); y += 10;
    const left = M + 25, top = y, height = 100, width = CW - 30, max = Math.max(4, Math.ceil(Math.max(...entries.map(([, value]) => value), 1) / 4) * 4);
    for (let step = 0; step <= 4; step++) {
      const lineY = top + height - height * step / 4;
      doc.setDrawColor(colors.border); doc.line(left, lineY, left + width, lineY);
      write(number(max * step / 4), M, lineY + 3, 7, false, colors.muted);
    }
    const slot = width / entries.length;
    entries.forEach(([day, value], index) => {
      const barWidth = Math.max(.5, Math.min(36, slot * .6)), barHeight = value / max * height;
      doc.setFillColor(colors.accent); doc.rect(left + index * slot + (slot - barWidth) / 2, top + height - barHeight, barWidth, barHeight, "F");
      if (index % Math.max(1, Math.ceil(entries.length / 12)) === 0) {
        const label = monthly ? `${day.slice(5)}/${day.slice(2, 4)}` : `${day.slice(8)}.${day.slice(5, 7)}`;
        write(label, left + index * slot, top + height + 13, 7, false, colors.muted);
      }
    });
    y = top + height + 32;
  }

  page(true);
  if (options.filters?.length) paragraph(options.filters.map(([label, value]) => `${label}: ${value}`).join(" | "), 9);
  if (options.onlyRepeats) paragraph(t("onlyRepeats", "Only kitchens with repeat claims") + " / " + t("kitchensTitle", "Claims per kitchen"), 9);
  cards([
    [t("total", "Total claims"), number(summary.total)], [category("cabinets"), number(summary.categories.cabinets)],
    [category("electrical"), number(summary.categories.electrical)], [t("repeatKitchens", "Kitchens with repeat claims"), number(summary.repeatKitchens)],
    [t("affectedKitchens", "Affected kitchens"), number(summary.kitchens)], [t("contracts", "Affected contracts"), number(summary.contracts)],
    [t("repeatClaims", "Cases after the first claim"), number(summary.repeatClaims)], [t("files", "Claims with attachments"), number(summary.withAttachments)],
  ]);
  if (summary.comparison) {
    heading(t("comparisonTitle", "Compared with the previous period"), "", 100);
    const comparison = summary.comparison;
    const range = (start, end) => `${date(start)} - ${date(new Date(new Date(end).getTime() - 1))}`;
    cards([[t("currentPeriod", "Current period"), number(comparison.current), range(comparison.start, comparison.end)], [t("previousPeriod", "Previous period"), number(comparison.previous), range(comparison.previousStart, comparison.previousEnd)], [t("changeCases", "Change in claims"), `${comparison.delta > 0 ? "+" : ""}${number(comparison.delta)}`], [t("changePercent", "Percentage change"), comparison.changePercent === null ? t("newActivity", "New activity") : `${comparison.changePercent > 0 ? "+" : ""}${number(comparison.changePercent)}%`]]);
  }
  heading(t("sourcesTitle", "FRG & ARC claims"), "", 155);
  table([t("pdfSource", "Source"), t("total", "Total claims"), t("affectedKitchens", "Affected kitchens"), ...categoryKeys.map(category)], summary.sources.map(row => [source(row.key), number(row.claims), number(row.kitchens), ...categoryKeys.map(key => number(row.categories[key]))]), [1.5, 1, 1, 1, 1.4, 1.1, 1]);
  paragraph(t("categoriesNote", "Each case counts once in every affected category.") + " " + t("pdfOverlap", "Category totals can exceed the total number of claims."), 8);

  page();
  heading(t("activity", "Claim activity"), "", 180); activity();
  heading(t("items", "Most reported items"));
  table([t("rowNumber", "No."), t("product", "Product"), t("category", "Claim category"), t("pdfCases", "Cases")], summary.items.map((row, index) => [number(index + 1), productName(row), category(row.category), number(row.claims)]), [.35, 3, 1.8, .65], t("emptyItems", "No reported items for these filters."));
  if (summary.cityRows.length <= 6) paragraph(t("cityTitle", "Claims by city") + ": " + (summary.cityRows.map(row => `${row.name} (${number(row.claims)})`).join(" | ") || t("emptyCities", "No city data for these filters.")), 9);
  else {
    heading(t("cityTitle", "Claims by city"));
    table([t("rowNumber", "No."), t("city", "City"), t("pdfCases", "Cases")], summary.cityRows.map((row, index) => [number(index + 1), row.name, number(row.claims)]), [.35, 4, .65]);
  }

  page();
  heading(t("kitchensTitle", "Claims per kitchen"), t("kitchensNote", "Kitchens ordered by their latest claim, newest first."));
  const kitchens = summary.kitchenRows.filter(row => !options.onlyRepeats || row.totalClaims > 1);
  table([t("rowNumber", "No."), t("kitchen", "Kitchen / contracts"), t("pdfSource", "Source"), t("pdfSelected", "Period"), t("history", "All time"), category("cabinets"), category("electrical"), t("lastClaim", "Latest claim - all time")], kitchens.map((row, index) => [number(index + 1), [row.name, ...row.contracts.filter(contract => contract !== row.name)].join("\n"), source(row.contractType), number(row.claims), number(row.totalClaims), number(row.categories.cabinets), number(row.categories.electrical), eventDate(row.lastAt)]), [.35, 1.9, .9, .65, .65, .8, 1.1, 1.45], options.onlyRepeats ? t("noRepeats", "No kitchens with repeat claims for these filters.") : undefined);
  heading(t("recurrenceTitle", "Repeated products within the same kitchen"));
  const recurrence = summary.productRecurrence;
  table([t("matchBasis", "Match evidence"), t("pdfCases", "Cases")], [[t("confirmedRepeat", "Same appliance - serial match"), recurrence.sameAppliance], [t("modelRepeat", "Same model / article"), recurrence.sameModel], [t("typeRepeat", "Same product type only"), recurrence.sameType], [t("differentProduct", "Different products / replacements"), recurrence.differentProduct], [t("unclearRepeat", "Not enough product information"), recurrence.unknown]], [4, 1]);
  if (recurrence.rows.length) table([t("rowNumber", "No."), t("kitchen", "Kitchen / contracts"), t("product", "Product"), t("matchBasis", "Match evidence"), t("productReference", "Serial / article"), t("pdfSelected", "Period"), t("history", "All time")], recurrence.rows.map((row, index) => [number(index + 1), row.kitchenName, productName(row), row.evidence === "serial" ? t("matchSerial", "Same serial number") : row.evidence === "article" ? t("matchArticle", "Same article / model") : t("matchType", "Same product type"), row.reference || "-", number(row.selectedClaims), number(row.totalClaims)]), [.3, 1.5, 1.5, 1.3, 1.3, .65, .65]);

  heading(t("manufacturersTitle", "Claims by manufacturer"));
  table([t("rowNumber", "No."), t("manufacturer", "Manufacturer"), t("pdfCases", "Cases"), t("dataSource", "Data source")], summary.productBreakdown.manufacturers.map((row, index) => [number(index + 1), row.name, number(row.claims), provenance(row.sources)]), [.3, 1.6, .7, 3], t("noManufacturers", "No manufacturer data recorded for these filters."));
  heading(t("modelsTitle", "Claims by model / article"));
  table([t("rowNumber", "No."), t("modelArticle", "Model / article"), t("manufacturer", "Manufacturer"), t("product", "Product"), t("pdfCases", "Cases"), t("dataSource", "Data source")], summary.productBreakdown.models.map((row, index) => [number(index + 1), row.model, row.manufacturer || category("unknown"), productName(row), number(row.claims), provenance(row.sources)]), [.3, 1.4, 1, 1, .5, 1.7], t("noModels", "No model or article data recorded for these filters."));

  heading(t("recent", "Latest claims"), t("recentNote", "The 8 latest cases matching the filters."), Math.min(370, 90 + summary.recent.length * 28));
  table([t("rowNumber", "No."), t("contract", "Contract"), t("pdfSource", "Source"), t("customer", "Customer"), t("category", "Claim category"), t("city", "City"), t("created", "Received")], summary.recent.map((row, index) => [number(index + 1), row.contractNumber, source(row.contractType), row.fullName, row.categories.map(category).join(" / "), row.city || "-", eventDate(row.createdAt)]), [.3, 1, .7, 1.4, 1.5, 1, 1.4]);
  heading(t("completeness", "Claim data completeness"), "", 100);
  const missing = [[t("missingFiles", "Without attachments"), summary.total - summary.withAttachments], [t("missingCategory", "With unclassified products / no category"), summary.categories.unknown], [t("unlinked", "Not linked to FRG / ARC"), summary.sources.find(row => row.key === "unknown")?.claims || 0], [t("missingCity", "Without a recorded city"), summary.missingCity], [t("pdfMissingManufacturer", "Missing manufacturer"), summary.productBreakdown.missingManufacturer], [t("pdfMissingModel", "Missing model / article"), summary.productBreakdown.missingModel]];
  for (let index = 0; index < missing.length; index += 2) paragraph(missing.slice(index, index + 2).map(([label, value]) => `${label}: ${number(value)}`).join(" | "), 9);

  const pages = doc.getNumberOfPages();
  for (let index = 1; index <= pages; index++) {
    doc.setPage(index); doc.setDrawColor(colors.border); doc.line(M, H - 28, W - M, H - 28);
    write("Fragmento / ASC", M, H - 16, 8, false, colors.muted);
    font(8, false, colors.muted); doc.text(`${t("pdfPage", "Page")} ${index} / ${pages}`, W - M, H - 16, { align: "right" });
  }
  return doc;
}

export async function downloadAscDashboardPdf(summary, options) {
  async function asset(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`PDF asset unavailable: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
    return btoa(binary);
  }
  const [regular, bold, logo] = await Promise.all([asset("/pdf-fonts/LiberationSans-Regular.ttf"), asset("/pdf-fonts/LiberationSans-Bold.ttf"), asset("/img/fragmentologo-cropped.png")]);
  const doc = buildAscDashboardPdf(summary, { ...options, fonts: { regular, bold }, logo: `data:image/png;base64,${logo}` });
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  doc.save(`claims-overview-${day}-${options.language === "de" ? "de" : "en"}.pdf`);
}
