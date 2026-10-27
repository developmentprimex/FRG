"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminI18n } from "./admin-i18n";
import { primaryButtonStyle, secondaryButtonStyle } from "./admin-ui";

const BATCH_SIZE = 10;
const ANALYSIS_CONCURRENCY = 2;
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;

async function responseJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

function selectedPrefixes(prefixes) {
  return Object.entries(prefixes).filter(([, selected]) => selected).map(([prefix]) => prefix);
}

function actionTone(action) {
  if (action === "create") return { color: "#21663d", background: "#e8f7ee" };
  if (action === "update") return { color: "#7a4b00", background: "#fff3d6" };
  if (action === "conflict") return { color: "#922", background: "#fdeaea" };
  return { color: "#555", background: "#eee" };
}

export default function AdminArcPdfImport() {
  const { translate } = useAdminI18n();
  const router = useRouter();
  const objectUrls = useRef(new Set());
  const [rows, setRows] = useState([]);
  const [prefixes, setPrefixes] = useState({ 111: true, 670: true });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [message, setMessage] = useState(null);

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function registerPreview(blob) {
    const url = URL.createObjectURL(blob);
    objectUrls.current.add(url);
    return url;
  }

  function replacePreview(oldUrl, blob) {
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
      objectUrls.current.delete(oldUrl);
    }
    return registerPreview(blob);
  }

  async function loadProcessor() {
    return import("../lib/arc-pdf-processor");
  }

  async function fetchPlan(nextRows, nextPrefixes = prefixes) {
    const images = nextRows
      .filter((row) => row.phase === "ready" && row.product)
      .map((row) => ({
        abCode: row.abCode,
        fileName: row.outputFileName,
        byteLength: row.product.byteLength,
        sha256: row.product.sha256,
      }));
    const activePrefixes = selectedPrefixes(nextPrefixes);
    if (!images.length || !activePrefixes.length) return { entries: [], summary: {} };
    const response = await fetch("/api/admin/contracts/arc-import/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, prefixes: activePrefixes }),
    });
    return responseJson(response);
  }

  function applyPlan(nextRows, plan) {
    const byAbCode = new Map();
    for (const entry of plan.entries || []) {
      const entries = byAbCode.get(entry.abCode) || [];
      entries.push(entry);
      byAbCode.set(entry.abCode, entries);
    }
    return nextRows.map((row) => {
      const contracts = byAbCode.get(row.abCode) || [];
      const hasDatabaseChange = contracts.some((entry) => entry.action === "create" || entry.action === "update");
      return {
        ...row,
        contracts,
        // Rows that are already current (or only conflict) remain visible for
        // verification, but must not look as if they will be imported again.
        selected: contracts.length && !hasDatabaseChange ? false : row.selected,
      };
    });
  }

  async function planAndSet(nextRows, nextPrefixes = prefixes) {
    try {
      const plan = await fetchPlan(nextRows, nextPrefixes);
      const plannedRows = applyPlan(nextRows, plan);
      setRows(plannedRows);
      return plannedRows;
    } catch (error) {
      setRows(nextRows);
      setMessage({ tone: "error", text: error.message });
      return nextRows;
    }
  }

  async function handleFolder(event) {
    const pdfFiles = [...(event.target.files || [])]
      .filter((file) => /\.pdf$/i.test(file.name))
      .sort((left, right) => (left.webkitRelativePath || left.name).localeCompare(right.webkitRelativePath || right.name));
    setMessage(null);
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
    if (!pdfFiles.length) {
      setRows([]);
      setMessage({ tone: "error", text: translate("contractsAdmin.arcImport.noPdfs", "No PDF files were found in this folder.") });
      return;
    }

    const { analyzeArcPdf, createArcProductImage, parseAbCodeFromPdfName } = await loadProcessor();
    const codeCounts = new Map();
    const prepared = pdfFiles.map((file, index) => {
      const abCode = parseAbCodeFromPdfName(file.name);
      if (abCode) codeCounts.set(abCode, (codeCounts.get(abCode) || 0) + 1);
      return {
        id: `${index}-${file.webkitRelativePath || file.name}`,
        file,
        path: file.webkitRelativePath || file.name,
        abCode,
        outputFileName: abCode ? `AB-${abCode}_product.jpg` : "",
        cropMode: "tight",
        selected: Boolean(abCode),
        phase: abCode ? "queued" : "invalid",
        error: abCode ? "" : translate("contractsAdmin.arcImport.invalidName", "Filename must contain one unique six-digit AB code."),
        contracts: [],
      };
    }).map((row) => (
      row.abCode && codeCounts.get(row.abCode) > 1
        ? { ...row, selected: false, phase: "invalid", error: translate("contractsAdmin.arcImport.duplicateCode", "Duplicate AB code in the selected folder.") }
        : row
    ));

    setRows(prepared);
    setBusy(true);
    setProgress({ done: 0, total: prepared.filter((row) => row.phase === "queued").length, label: translate("contractsAdmin.arcImport.analyzing", "Analyzing PDFs") });
    const results = [...prepared];
    const queueIndexes = prepared.map((row, index) => row.phase === "queued" ? index : -1).filter((index) => index >= 0);
    let cursor = 0;
    let completed = 0;

    async function worker() {
      while (cursor < queueIndexes.length) {
        const index = queueIndexes[cursor];
        cursor += 1;
        const row = results[index];
        try {
          const analysis = await analyzeArcPdf(row.file);
          const selectedPage = analysis.candidates[0] || null;
          if (!selectedPage) {
            results[index] = { ...row, ...analysis, selected: false, selectedPage: null, phase: "needs-page" };
          } else {
            const product = await createArcProductImage(row.file, selectedPage, row.cropMode);
            if (product.byteLength > MAX_PREVIEW_BYTES) {
              throw new Error(translate("contractsAdmin.arcImport.imageTooLarge", "Generated JPG exceeds the 8 MB sketch limit."));
            }
            results[index] = {
              ...row,
              ...analysis,
              selectedPage,
              product,
              previewUrl: registerPreview(product.blob),
              phase: "ready",
            };
          }
        } catch (error) {
          results[index] = { ...row, selected: false, phase: "invalid", error: error.message };
        }
        completed += 1;
        setProgress((current) => ({ ...current, done: completed }));
        setRows([...results]);
      }
    }

    await Promise.all(Array.from({ length: Math.min(ANALYSIS_CONCURRENCY, queueIndexes.length) }, () => worker()));
    await planAndSet(results);
    setBusy(false);
    setProgress({ done: queueIndexes.length, total: queueIndexes.length, label: translate("contractsAdmin.arcImport.ready", "Ready for review") });
  }

  async function regenerate(rowId, values) {
    const current = rows.find((row) => row.id === rowId);
    if (!current) return;
    const nextPage = Number(values.selectedPage ?? current.selectedPage);
    const nextCrop = values.cropMode ?? current.cropMode;
    setBusy(true);
    setMessage(null);
    setRows((items) => items.map((row) => row.id === rowId ? { ...row, phase: "processing", selectedPage: nextPage, cropMode: nextCrop } : row));
    try {
      const { createArcProductImage } = await loadProcessor();
      const product = await createArcProductImage(current.file, nextPage, nextCrop);
      if (product.byteLength > MAX_PREVIEW_BYTES) {
        throw new Error(translate("contractsAdmin.arcImport.imageTooLarge", "Generated JPG exceeds the 8 MB sketch limit."));
      }
      const nextRows = rows.map((row) => row.id === rowId ? {
        ...row,
        selected: true,
        selectedPage: nextPage,
        cropMode: nextCrop,
        product,
        previewUrl: replacePreview(row.previewUrl, product.blob),
        phase: "ready",
        error: "",
      } : row);
      await planAndSet(nextRows);
    } catch (error) {
      setRows((items) => items.map((row) => row.id === rowId ? { ...row, selected: false, phase: "invalid", error: error.message } : row));
    } finally {
      setBusy(false);
    }
  }

  async function changePrefixes(prefix) {
    const nextPrefixes = { ...prefixes, [prefix]: !prefixes[prefix] };
    setPrefixes(nextPrefixes);
    setMessage(null);
    if (!selectedPrefixes(nextPrefixes).length) {
      setRows((items) => items.map((row) => ({ ...row, contracts: [] })));
      return;
    }
    setBusy(true);
    await planAndSet(rows, nextPrefixes);
    setBusy(false);
  }

  async function importSelected() {
    const activePrefixes = selectedPrefixes(prefixes);
    const selectedRows = rows.filter((row) => (
      row.selected
      && row.phase === "ready"
      && row.product
      && row.contracts?.some((entry) => entry.action === "create" || entry.action === "update")
    ));
    if (!selectedRows.length || !activePrefixes.length) return;
    const question = translate("contractsAdmin.arcImport.confirm", "Import the selected ARC kitchen sketches?");
    if (!window.confirm(question)) return;
    setBusy(true);
    setMessage(null);
    setProgress({ done: 0, total: selectedRows.length, label: translate("contractsAdmin.arcImport.importing", "Importing ARC contracts") });
    const importedEntries = [];
    const failures = [];

    for (let start = 0; start < selectedRows.length; start += BATCH_SIZE) {
      const batch = selectedRows.slice(start, start + BATCH_SIZE);
      try {
        const manifest = {
          prefixes: activePrefixes,
          images: batch.map((row) => ({
            abCode: row.abCode,
            fileName: row.outputFileName,
            byteLength: row.product.byteLength,
            sha256: row.product.sha256,
          })),
        };
        const body = new FormData();
        body.set("manifest", JSON.stringify(manifest));
        batch.forEach((row) => body.append("images", row.product.blob, row.outputFileName));
        const response = await fetch("/api/admin/contracts/arc-import", { method: "POST", body });
        const result = await responseJson(response);
        importedEntries.push(...(result.entries || []));
      } catch (error) {
        failures.push(...batch.map((row) => ({ path: row.path, error: error.message })));
      }
      setProgress((current) => ({ ...current, done: Math.min(start + batch.length, selectedRows.length) }));
    }

    const summary = importedEntries.reduce((result, entry) => {
      result[entry.action] = (result[entry.action] || 0) + 1;
      return result;
    }, { create: 0, update: 0, unchanged: 0, conflict: 0 });
    const summaryText = `${translate("contractsAdmin.arcImport.created", "Created")}: ${summary.create}; ${translate("contractsAdmin.arcImport.updated", "Updated")}: ${summary.update}; ${translate("contractsAdmin.arcImport.unchanged", "Unchanged")}: ${summary.unchanged}; ${translate("contractsAdmin.arcImport.conflicts", "Conflicts")}: ${summary.conflict}; ${translate("contractsAdmin.arcImport.failed", "Failed")}: ${failures.length}.`;
    setMessage({ tone: failures.length ? "error" : "success", text: summaryText });
    await planAndSet(rows);
    setBusy(false);
    router.refresh();
  }

  const importableCount = rows.filter((row) => (
    row.selected
    && row.phase === "ready"
    && row.contracts?.some((entry) => entry.action === "create" || entry.action === "update")
  )).length;
  const progressPercent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={rootStyle}>
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>{translate("contractsAdmin.arcImport.title", "Import ARC from PDF folder")}</h3>
          <p style={hintStyle}>{translate("contractsAdmin.arcImport.description", "PDFs are processed in this browser. Review every generated JPG before importing.")}</p>
        </div>
        <label style={{ ...secondaryButtonStyle, ...folderButtonStyle, opacity: busy ? 0.55 : 1 }}>
          {translate("contractsAdmin.arcImport.chooseFolder", "Choose PDF folder")}
          <input
            type="file"
            accept="application/pdf,.pdf"
            multiple
            directory=""
            webkitdirectory=""
            disabled={busy}
            onChange={handleFolder}
            style={hiddenInputStyle}
          />
        </label>
      </div>

      <div style={optionsStyle}>
        <strong>{translate("contractsAdmin.arcImport.prefixes", "Contract prefixes")}</strong>
        {["111", "670"].map((prefix) => (
          <label key={prefix} style={checkLabelStyle}>
            <input type="checkbox" checked={prefixes[prefix]} disabled={busy} onChange={() => changePrefixes(prefix)} />
            {prefix}
          </label>
        ))}
        <span style={hintStyle}>{translate("contractsAdmin.arcImport.pdfPrivacy", "Original PDFs stay on this device; only the generated JPGs are uploaded.")}</span>
      </div>

      {progress.total ? (
        <div style={progressWrapStyle}>
          <div style={progressMetaStyle}><span>{progress.label}</span><strong>{progress.done}/{progress.total}</strong></div>
          <progress value={progress.done} max={progress.total} style={progressStyle}>{progressPercent}%</progress>
        </div>
      ) : null}

      {message ? <div role="status" style={message.tone === "success" ? successStyle : errorStyle}>{message.text}</div> : null}

      {rows.length ? (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{translate("contractsAdmin.arcImport.use", "Use")}</th>
                <th style={thStyle}>PDF / AB</th>
                <th style={thStyle}>{translate("contractsAdmin.arcImport.page", "Render page")}</th>
                <th style={thStyle}>{translate("contractsAdmin.arcImport.crop", "Crop")}</th>
                <th style={thStyle}>{translate("contractsAdmin.arcImport.preview", "JPG preview")}</th>
                <th style={thStyle}>{translate("contractsAdmin.arcImport.result", "Planned result")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={row.phase === "invalid" ? invalidRowStyle : undefined}>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={row.selected}
                      disabled={row.phase !== "ready" || busy}
                      onChange={() => setRows((items) => items.map((item) => item.id === row.id ? { ...item, selected: !item.selected } : item))}
                      aria-label={`${translate("contractsAdmin.arcImport.use", "Use")} ${row.path}`}
                    />
                  </td>
                  <td style={tdStyle}>
                    <strong style={fileNameStyle}>{row.path}</strong>
                    <span style={metaStyle}>{row.abCode ? `AB ${row.abCode}` : "—"}</span>
                    {row.error ? <span style={rowErrorStyle}>{row.error}</span> : null}
                    {row.phase === "needs-page" ? <span style={warningStyle}>{translate("contractsAdmin.arcImport.selectPageHint", "No render was detected. Select a page manually.")}</span> : null}
                  </td>
                  <td style={tdStyle}>
                    {row.pageCount ? (
                      <select
                        value={row.selectedPage || ""}
                        disabled={busy}
                        onChange={(event) => regenerate(row.id, { selectedPage: Number(event.target.value) })}
                        style={selectStyle}
                      >
                        <option value="">{translate("contractsAdmin.arcImport.selectPage", "Select page")}</option>
                        {Array.from({ length: row.pageCount }, (_, index) => index + 1).map((pageNumber) => (
                          <option key={pageNumber} value={pageNumber}>
                            {pageNumber}{row.candidates?.includes(pageNumber) ? " •" : ""}
                          </option>
                        ))}
                      </select>
                    ) : <span style={metaStyle}>{row.phase === "queued" || row.phase === "processing" ? "…" : "—"}</span>}
                  </td>
                  <td style={tdStyle}>
                    {row.abCode ? (
                      <select
                        value={row.cropMode}
                        disabled={busy || !row.selectedPage}
                        onChange={(event) => regenerate(row.id, { cropMode: event.target.value })}
                        style={selectStyle}
                      >
                        <option value="tight">Tight crop</option>
                        <option value="full">Full product</option>
                      </select>
                    ) : "—"}
                  </td>
                  <td style={tdStyle}>
                    {row.previewUrl ? <img src={row.previewUrl} alt={`AB ${row.abCode}`} style={previewStyle} /> : <span style={metaStyle}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    <div style={contractResultStyle}>
                      {(row.contracts || []).map((entry) => (
                        <span key={entry.contractNumber} title={entry.reason || ""} style={{ ...resultPillStyle, ...actionTone(entry.action) }}>
                          {entry.contractNumber}: {entry.action.toUpperCase()}
                        </span>
                      ))}
                      {row.phase === "ready" && !row.contracts?.length ? <span style={metaStyle}>—</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {rows.length ? (
        <div style={actionsStyle}>
          <button
            type="button"
            onClick={importSelected}
            disabled={busy || !importableCount || !selectedPrefixes(prefixes).length}
            style={{ ...primaryButtonStyle, opacity: busy || !importableCount ? 0.55 : 1 }}
          >
            {translate("contractsAdmin.arcImport.importButton", "Import selected ARC kitchens")} ({importableCount})
          </button>
        </div>
      ) : null}
    </div>
  );
}

const rootStyle = { display: "grid", gap: 16 };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const titleStyle = { margin: 0, fontSize: 20, color: "var(--app-text)" };
const hintStyle = { margin: "4px 0 0", color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.45 };
const folderButtonStyle = { position: "relative", overflow: "hidden", cursor: "pointer", display: "inline-flex" };
const hiddenInputStyle = { position: "absolute", inset: 0, opacity: 0, cursor: "pointer" };
const optionsStyle = { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: 12, borderRadius: 8, background: "var(--app-surface-muted)" };
const checkLabelStyle = { display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800 };
const progressWrapStyle = { display: "grid", gap: 6 };
const progressMetaStyle = { display: "flex", justifyContent: "space-between", gap: 12, color: "var(--app-text-muted)", fontSize: 13 };
const progressStyle = { width: "100%", height: 12, accentColor: "var(--app-accent)" };
const successStyle = { padding: 12, borderRadius: 8, background: "#e8f7ee", color: "#21663d", fontWeight: 800 };
const errorStyle = { padding: 12, borderRadius: 8, background: "#fdeaea", color: "#922", fontWeight: 800 };
const tableWrapStyle = { overflowX: "auto", border: "1px solid var(--app-border)", borderRadius: 8 };
const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 940, background: "rgba(255,255,255,0.86)" };
const thStyle = { padding: "10px 12px", textAlign: "left", color: "var(--app-text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid var(--app-border)" };
const tdStyle = { padding: 12, verticalAlign: "top", borderBottom: "1px solid var(--app-border)", fontSize: 13 };
const invalidRowStyle = { background: "rgba(180,45,45,.035)" };
const fileNameStyle = { display: "block", maxWidth: 260, overflowWrap: "anywhere" };
const metaStyle = { display: "block", marginTop: 4, color: "var(--app-text-muted)", fontSize: 12 };
const rowErrorStyle = { display: "block", marginTop: 6, color: "#922", maxWidth: 280 };
const warningStyle = { display: "block", marginTop: 6, color: "#7a4b00", maxWidth: 280 };
const selectStyle = { minHeight: 36, padding: "6px 8px", border: "1px solid var(--app-border)", borderRadius: 6, background: "#fff", color: "var(--app-text)" };
const previewStyle = { display: "block", width: 180, height: 112, objectFit: "contain", background: "#fff", border: "1px solid var(--app-border)", borderRadius: 6 };
const contractResultStyle = { display: "grid", gap: 6, minWidth: 190 };
const resultPillStyle = { display: "inline-flex", width: "fit-content", padding: "4px 7px", borderRadius: 999, fontSize: 11, fontWeight: 900 };
const actionsStyle = { display: "flex", justifyContent: "flex-end" };
