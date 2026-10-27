import { toTimeZoneWallClockDate } from "./admin-date-time.js";
import * as XLSX from "xlsx/xlsx.mjs";

const xml = (value) => String(value).replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[character]));
const pad = (value) => String(value).padStart(2, "0");
const dateStamp = (date) => pad(date.getUTCDate()) + "." + pad(date.getUTCMonth() + 1) + "." + date.getUTCFullYear();
const columnName = (index) => XLSX.utils.encode_col(index);
const isDate = (value) => Object.prototype.toString.call(value) === "[object Date]";

function makeStyles() {
  const borders = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
  const borderIds = new Map();
  const formats = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
  ];
  const formatIds = new Map();

  function cellStyle({ left, right, top, bottom, bold, numberFormat = 0 }) {
    const sides = [left, right, top, bottom];
    const borderKey = sides.join(":");
    if (!borderIds.has(borderKey)) {
      borderIds.set(borderKey, borders.length);
      borders.push("<border>" + ["left", "right", "top", "bottom"].map((side, index) => '<' + side + ' style="' + sides[index] + '"><color rgb="FF000000"/></' + side + '>').join("") + "<diagonal/></border>");
    }
    const borderId = borderIds.get(borderKey);
    const key = [borderId, bold ? 1 : 0, numberFormat].join(":");
    if (!formatIds.has(key)) {
      formatIds.set(key, formats.length);
      formats.push('<xf numFmtId="' + numberFormat + '" fontId="' + (bold ? 1 : 0) + '" fillId="0" borderId="' + borderId + '" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="left" vertical="bottom" wrapText="1"/></xf>');
    }
    return formatIds.get(key);
  }

  function stylesXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="4"><numFmt numFmtId="164" formatCode="#,##0"/><numFmt numFmtId="165" formatCode="#,##0.##"/><numFmt numFmtId="166" formatCode="#,##0.00"/><numFmt numFmtId="167" formatCode="dd.mm.yyyy hh:mm"/></numFmts>' +
      '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
      '<borders count="' + borders.length + '">' + borders.join("") + '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="' + formats.length + '">' + formats.join("") + '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }
  return { cellStyle, stylesXml };
}

function numericFormat(value, column, dataIndex, spec) {
  if (isDate(value)) return 167;
  if (typeof value !== "number") return 0;
  if (column > 0 && (spec.currencyColumns?.includes(column - 1) || spec.currencyRows?.includes(dataIndex))) return 166;
  return Number.isInteger(value) ? 164 : 165;
}

function prepareSheet(spec, timeZone) {
  const headers = ["NR", ...spec.headers.map((header) => String(header).toUpperCase())];
  const records = spec.rows.map((row, index) => [index + 1, ...row]);
  const lastDataRow = 6 + records.length;
  const finalRow = lastDataRow + 2;
  const rows = [[], [], [spec.title], [], [], headers, ...records, [records.length + 1], [records.length + 2]];
  const worksheet = XLSX.utils.aoa_to_sheet(rows.map((row) => row.map((value) => isDate(value) ? toTimeZoneWallClockDate(value, timeZone).getTime() / 86400000 + 25569 : value)));
  worksheet["!ref"] = "A1:" + columnName(headers.length - 1) + finalRow;
  worksheet["!merges"] = [{ s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } }];
  worksheet["!autofilter"] = { ref: "A6:" + columnName(headers.length - 1) + lastDataRow };
  worksheet["!cols"] = headers.map((header, column) => {
    if (column === 0) return { width: 6, wch: 6 };
    let longest = String(header).length;
    for (const row of records) {
      const value = isDate(row[column]) ? "00.00.0000 00:00" : String(row[column] ?? "");
      for (const line of value.split(/\r?\n/)) longest = Math.max(longest, line.length);
    }
    const width = Math.min(45, Math.max(10, longest + 2));
    return { width, wch: width };
  });
  return { spec, worksheet, rows, headers, lastDataRow, finalRow };
}

function formatSheet(sheetXml, prepared, styles, now, initials) {
  const { spec, rows, headers, finalRow } = prepared;
  const existingCells = new Map();
  for (const match of sheetXml.matchAll(/<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/g)) {
    const address = match[0].match(/\br="([^"]+)"/)?.[1];
    if (address) existingCells.set(address, match[0]);
  }
  const title = existingCells.get("A3").replace(/<c\b/, '<c s="1"');
  let sheetData = '<sheetData><row r="3" ht="24" customHeight="1">' + title + '</row>';
  for (let row = 6; row <= finalRow; row += 1) {
    let maxLines = 1;
    let cells = "";
    for (let column = 0; column < headers.length; column += 1) {
      const address = columnName(column) + row;
      const value = rows[row - 1]?.[column];
      const width = prepared.worksheet["!cols"][column].wch;
      const text = isDate(value) ? "00.00.0000 00:00" : String(value ?? "");
      const usableWidth = Math.max(width - (row === 6 ? 5 : 3), 1);
      const lineCount = text.split(/\r?\n/).reduce((count, line) => count + Math.max(1, Math.ceil(line.length / usableWidth)), 0);
      maxLines = Math.max(maxLines, lineCount);
      const style = styles.cellStyle({
        left: column === 0 ? "medium" : "thin",
        right: column === headers.length - 1 ? "medium" : "thin",
        top: row === 6 ? "medium" : "thin",
        bottom: row === 6 || row === finalRow ? "medium" : "thin",
        bold: row === 6,
        numberFormat: numericFormat(value, column, row - 7, spec),
      });
      const existing = existingCells.get(address);
      cells += existing ? existing.replace(/\ss="[^"]*"/g, "").replace(/<c\b/, '<c s="' + style + '"') : '<c r="' + address + '" s="' + style + '"/>';
    }
    const height = Math.min(409, Math.max(row === 6 ? 36 : 21, maxLines * 15 + 6));
    sheetData += '<row r="' + row + '" ht="' + height + '" customHeight="1">' + cells + '</row>';
  }
  sheetData += '</sheetData>';
  sheetXml = sheetXml.replace(/<autoFilter ref="[^"]*"\/>/, '<autoFilter ref="' + prepared.worksheet["!autofilter"].ref + '"/>');
  sheetXml = sheetXml.replace(/<sheetData>[\s\S]*?<\/sheetData>/, sheetData);
  sheetXml = sheetXml.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/, '<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane xSplit="2" ySplit="6" topLeftCell="C7" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="C7" sqref="C7"/></sheetView></sheetViews>');
  const header = pad(now.getUTCDate()) + "/" + pad(now.getUTCMonth() + 1) + "/" + now.getUTCFullYear() + " " + pad(now.getUTCHours()) + ":" + pad(now.getUTCMinutes());
  const headerText = xml("&R" + header);
  const footerText = xml("&C&P / &N&RPUNOI: " + initials);
  const printSettings = '<printOptions/>' +
    '<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>' +
    '<pageSetup paperSize="9" orientation="' + (headers.length > 7 ? "landscape" : "portrait") + '" fitToWidth="1" fitToHeight="0"/>' +
    '<headerFooter differentOddEven="0" differentFirst="0"><oddHeader>' + headerText + '</oddHeader><oddFooter>' + footerText + '</oddFooter><evenHeader>' + headerText + '</evenHeader><evenFooter>' + footerText + '</evenFooter><firstHeader>' + headerText + '</firstHeader><firstFooter>' + footerText + '</firstFooter></headerFooter>';
  sheetXml = sheetXml.replace(/<worksheet([^>]*)>/, '<worksheet$1><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
  // Print elements must precede ignoredErrors in the worksheet schema.
  return sheetXml.includes('<ignoredErrors>') ? sheetXml.replace('<ignoredErrors>', printSettings + '<ignoredErrors>') : sheetXml.replace('</worksheet>', printSettings + '</worksheet>');
}

/** Apply the supplied document standards, including print settings omitted by SheetJS CE. */
export function buildStandardExcelWorkbook({ sheets, description, initials = "", now = new Date(), timeZone = "UTC" }) {
  const cleanInitials = String(initials).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const displayNow = toTimeZoneWallClockDate(now, timeZone);
  const prepared = sheets.map((sheet) => prepareSheet(sheet, timeZone));
  const workbook = XLSX.utils.book_new();
  for (const sheet of prepared) XLSX.utils.book_append_sheet(workbook, sheet.worksheet, sheet.spec.name);
  const archive = XLSX.CFB.read(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
  const styles = makeStyles();
  const entry = (name) => {
    const index = archive.FullPaths.findIndex((path) => path.endsWith("/" + name));
    if (index < 0) throw new Error("Missing workbook entry: " + name);
    return archive.FileIndex[index];
  };
  const readXml = (name) => new TextDecoder().decode(entry(name).content);
  const writeXml = (name, text) => {
    const file = entry(name);
    file.content = new TextEncoder().encode(text);
    file.size = file.content.length;
  };
  prepared.forEach((sheet, index) => {
    const name = "xl/worksheets/sheet" + (index + 1) + ".xml";
    writeXml(name, formatSheet(readXml(name), sheet, styles, displayNow, cleanInitials));
  });
  writeXml("xl/styles.xml", styles.stylesXml());
  const definedNames = prepared.map((sheet, index) => {
    const sheetName = "'" + sheet.spec.name.replace(/'/g, "''") + "'!";
    return '<definedName name="_xlnm._FilterDatabase" localSheetId="' + index + '" hidden="1">' + xml(sheetName + sheet.worksheet["!autofilter"].ref) + '</definedName>' +
      '<definedName name="_xlnm.Print_Titles" localSheetId="' + index + '">' + xml(sheetName + "$6:$6") + '</definedName>' +
      '<definedName name="_xlnm.Print_Area" localSheetId="' + index + '">' + xml(sheetName + "$A$1:$" + columnName(sheet.headers.length - 1) + "$" + sheet.finalRow) + '</definedName>';
  }).join("");
  const workbookXml = readXml("xl/workbook.xml").replace(/<definedName name="_xlnm\._FilterDatabase"[^>]*>[\s\S]*?<\/definedName>/g, "");
  writeXml("xl/workbook.xml", workbookXml.includes("<definedNames>")
    ? workbookXml.replace("</definedNames>", definedNames + "</definedNames>")
    : workbookXml.replace("</sheets>", "</sheets><definedNames>" + definedNames + "</definedNames>"));
  const cleanDescription = String(description || "REPORT").replace(/[^a-zA-Z0-9_-]+/g, "_").toUpperCase();
  return {
    buffer: XLSX.CFB.write(archive, { type: "buffer", fileType: "zip", compression: true }),
    filename: cleanDescription + "_" + dateStamp(displayNow) + "_" + cleanInitials + ".xlsx",
  };
}
