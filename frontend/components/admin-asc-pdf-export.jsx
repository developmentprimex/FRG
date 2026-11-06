"use client";

import { useState } from "react";
import { useAdminI18n } from "./admin-i18n";
import s from "./admin-asc-dashboard.module.css";

export function AdminAscPdfExport({ summary, filters, onlyRepeats = false }) {
  const { translate, language } = useAdminI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = (key, fallback) => translate(`ascDashboard.${key}`, fallback);
  async function download() {
    if (busy) return;
    setBusy(true); setError("");
    const options = { language, filters, onlyRepeats, generatedAt: new Date(), translate: t };
    try {
      const { downloadAscDashboardPdf } = await import("../lib/asc-dashboard-pdf.js");
      await downloadAscDashboardPdf(summary, options);
    } catch {
      setError(t("pdfError", "The PDF could not be created. Please try again."));
    } finally { setBusy(false); }
  }
  return <div className={s.pdfAction}>
    <button type="button" className={s.button} disabled={busy} aria-busy={busy} onClick={download}>
      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" /></svg>
      {busy ? t("pdfCreating", "Creating PDF...") : t("exportPdf", "Export PDF")}
    </button>
    {error && <span className={s.pdfError} role="alert">{error}</span>}
  </div>;
}
