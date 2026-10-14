import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx/xlsx.mjs";
import { buildStandardExcelWorkbook } from "../lib/standard-excel.js";

function fixture(sheets) {
  return buildStandardExcelWorkbook({
    description: "Report Orders Claims",
    initials: "ab",
    now: new Date("2026-10-14T10:30:00Z"),
    sheets: sheets || [{
      name: "Report",
      title: "ORDERS AND CLAIMS",
      headers: ["Type", "Reference", "Created", "Customer", "Details", "Gross", "Net"],
      currencyColumns: [5, 6],
      rows: [
        ["Order", "6701-1", new Date("2026-10-07T09:53:00Z"), "Max", null, 119, 100],
        ["Claim", "6701", new Date("2026-10-08T06:48:00Z"), "Jane", "Oven does not heat", null, null],
      ],
    }],
  });
}

function readXml(buffer, name) {
  const archive = XLSX.CFB.read(buffer, { type: "buffer" });
  const index = archive.FullPaths.findIndex((path) => path.endsWith("/" + name));
  assert(index >= 0);
  return new TextDecoder().decode(archive.FileIndex[index].content);
}

test("standard workbook preserves data and uses title row 3 and table row 6", () => {
  const { buffer, filename } = fixture();
  const book = XLSX.read(buffer, { type: "buffer", cellNF: true });
  const sheet = book.Sheets.Report;
  assert.equal(filename, "REPORT_ORDERS_CLAIMS_14.10.2026_AB.xlsx");
  assert.equal(sheet.A3.v, "ORDERS AND CLAIMS");
  assert.equal(sheet.A6.v, "NR");
  assert.equal(sheet.B6.v, "TYPE");
  assert.equal(sheet.A7.v, 1);
  assert.equal(sheet.B7.v, "Order");
  assert.equal(sheet.B8.v, "Claim");
  assert.equal(sheet.F8.v, "Oven does not heat");
  assert.equal(sheet.G7.v, 119);
  assert.equal(sheet.G7.z, "#,##0.00");
  assert.equal(sheet.A7.z, "#,##0");
  assert.equal(sheet.G8?.v ?? null, null);
  assert.equal(sheet.D7.t, "n");
  assert.equal(sheet.D7.z, "dd.mm.yyyy hh:mm");
  const date = XLSX.SSF.parse_date_code(sheet.D7.v);
  assert.equal(date.y, 2026);
  assert.equal(date.m, 10);
  assert.equal(date.d, 7);
  assert.equal(date.H, 9);
  assert.equal(date.M, 53);
  assert.equal(sheet.A9.v, 3);
  assert.equal(sheet.A10.v, 4);
  assert.equal(sheet.B9?.v ?? null, null);
  assert.equal(sheet["!autofilter"].ref, "A6:H8");
  assert.equal(XLSX.utils.encode_range(sheet["!merges"][0]), "A3:H3");
});

test("standard workbook writes fonts, borders, freeze panes, and A4 print settings", () => {
  const { buffer } = fixture();
  const styles = readXml(buffer, "xl/styles.xml");
  const sheet = readXml(buffer, "xl/worksheets/sheet1.xml");
  const book = readXml(buffer, "xl/workbook.xml");
  assert(styles.includes('<font><sz val="11"/><name val="Calibri"/></font>'));
  assert(styles.includes('<font><b/><sz val="16"/><name val="Calibri"/></font>'));
  assert(styles.includes('horizontal="left" vertical="bottom" wrapText="1"'));
  assert(styles.includes('horizontal="center" vertical="center" wrapText="1"'));
  assert(styles.includes('style="medium"'));
  assert(styles.includes('style="thin"'));
  assert(sheet.includes('r="3" ht="24"'));
  assert(sheet.includes('showGridLines="0"'));
  assert(sheet.includes('xSplit="2" ySplit="6" topLeftCell="C7"'));
  assert(sheet.includes('paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"'));
  assert(sheet.includes('left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"'));
  assert(sheet.includes('14/10/2026 10:30'));
  assert(sheet.includes('&amp;P / &amp;N'));
  assert(sheet.includes('PUNOI: AB'));
  assert.equal((book.match(/<definedNames>/g) || []).length, 1);
  assert(book.includes('_xlnm.Print_Titles'));
  assert(book.includes('$6:$6'));
  assert(book.includes('$A$1:$H$10'));
});

test("empty exports retain header, numbered blank rows, and portrait printing", () => {
  const { buffer } = fixture([{ name: "Empty", title: "EMPTY REPORT", headers: ["Type"], rows: [] }]);
  const sheet = XLSX.read(buffer, { type: "buffer" }).Sheets.Empty;
  assert.equal(sheet.A7.v, 1);
  assert.equal(sheet.A8.v, 2);
  assert.equal(sheet["!autofilter"].ref, "A6:B6");
  assert.equal(sheet["!ref"], "A1:B8");
  assert(readXml(buffer, "xl/worksheets/sheet1.xml").includes('orientation="portrait"'));
});

test("summary money remains numeric and each sheet has its own print area", () => {
  const { buffer } = fixture([
    { name: "Report", title: "REPORT", headers: ["Type"], rows: [["Order"]] },
    { name: "Summary", title: "SUMMARY", headers: ["Metric", "Value"], rows: [["Orders", 1], ["Net", 100]], currencyRows: [1] },
  ]);
  const sheet = XLSX.read(buffer, { type: "buffer", cellNF: true }).Sheets.Summary;
  assert.equal(sheet.C7.z, "#,##0");
  assert.equal(sheet.C8.v, 100);
  assert.equal(sheet.C8.z, "#,##0.00");
  assert.equal(sheet.A8.z, "#,##0");
  assert.equal((readXml(buffer, "xl/workbook.xml").match(/name="_xlnm.Print_Area"/g) || []).length, 2);
});

test("multiline order and claim details remain complete and increase row height", () => {
  const orderDetails = "2 × Upper Cabinet [H6002]\n1 × Worktop [TOP]\n1 × Sink [SINK]";
  const claimDetails = "Oven does not heat.\nThe display shows an error.\nPlease contact me.";
  const { buffer } = fixture([{ name: "Report", title: "REPORT", headers: ["Type", "Details"], rows: [["Order", orderDetails], ["Claim", claimDetails]] }]);
  const sheet = XLSX.read(buffer, { type: "buffer" }).Sheets.Report;
  assert.equal(sheet.C7.v, orderDetails);
  assert.equal(sheet.C8.v, claimDetails);
  const xml = readXml(buffer, "xl/worksheets/sheet1.xml");
  assert(Number(xml.match(/<row r="7" ht="([^"]+)"/)[1]) >= 51);
  assert(Number(xml.match(/<row r="8" ht="([^"]+)"/)[1]) >= 51);
  assert(Number(xml.match(/<row r="6" ht="([^"]+)"/)[1]) >= 36);
});

test("Berlin export dates, filename and printed timestamp follow local summer and winter time", () => {
  const { buffer, filename } = buildStandardExcelWorkbook({
    description: "REPORT", initials: "AB", timeZone: "Europe/Berlin", now: new Date("2026-10-14T22:30:00Z"),
    sheets: [{ name: "Report", title: "REPORT", headers: ["Created"], rows: [[new Date("2026-10-12T07:44:00Z")], [new Date("2026-12-12T07:44:00Z")]] }],
  });
  const sheet = XLSX.read(buffer, { type: "buffer" }).Sheets.Report;
  const summer = XLSX.SSF.parse_date_code(sheet.B7.v);
  const winter = XLSX.SSF.parse_date_code(sheet.B8.v);
  assert.equal(summer.H, 9);
  assert.equal(summer.M, 44);
  assert.equal(winter.H, 8);
  assert.equal(winter.M, 44);
  assert.equal(filename, "REPORT_15.10.2026_AB.xlsx");
  assert(readXml(buffer, "xl/worksheets/sheet1.xml").includes("15/10/2026 00:30"));
});
