"use client";

import { useMemo, useRef, useState } from "react";
import { useAdminI18n } from "./admin-i18n";

function asLines(value) {
  return (Array.isArray(value) ? value : [])
    .map((line) => String(line || "").trim())
    .filter(Boolean);
}

export function AdminProductInfoPdfManager({
  initialPdfPath = "",
  initialSummary = "",
  initialKeyFacts = [],
  initialExtractedText = "",
  compact = false,
}) {
  const { translate } = useAdminI18n();
  const fileInputRef = useRef(null);
  const [pdfPath, setPdfPath] = useState(initialPdfPath || "");
  const [summary, setSummary] = useState(initialSummary || "");
  const [keyFacts, setKeyFacts] = useState(asLines(initialKeyFacts).join("\n"));
  const [extractedText, setExtractedText] = useState(initialExtractedText || "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const fieldStyle = useMemo(() => ({
    width: "100%",
    minHeight: compact ? 38 : 52,
    borderRadius: compact ? 12 : 14,
    border: "1px solid var(--app-border-strong)",
    background: "var(--color-card)",
    padding: compact ? "6px 10px" : "13px 15px",
    color: "var(--app-text)",
    fontSize: compact ? "0.92rem" : "0.98rem",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
  }), [compact]);
  const textareaStyle = useMemo(() => ({
    ...fieldStyle,
    minHeight: compact ? 42 : 72,
    resize: "vertical",
    lineHeight: 1.35,
  }), [compact, fieldStyle]);

  async function extractPdf() {
    const file = fileInputRef.current?.files?.[0];
    setError("");
    setStatus("");

    if (!file) {
      setError(translate("kitchenDetailAdmin.choosePdfFirst", "Choose a PDF file first."));
      return;
    }

    const formData = new FormData();
    formData.set("pdf", file);
    setIsExtracting(true);

    try {
      const response = await fetch("/api/admin/product-info/extract", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "PDF extraction failed.");
      }

      setPdfPath(payload.pdfPath || "");
      setSummary(payload.summary || "");
      setKeyFacts(asLines(payload.keyFacts).join("\n"));
      setExtractedText(payload.extractedText || "");
      setStatus(
        payload.aiEnhanced
          ? translate("kitchenDetailAdmin.pdfAiExtractedReviewBeforeSave", "PDF extracted and AI-structured. Review the chatbot data, edit if needed, then click Save item.")
          : translate("kitchenDetailAdmin.pdfExtractedReviewBeforeSave", "PDF extracted. Review the chatbot data, edit if needed, then click Save item."),
      );
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "PDF extraction failed.");
    } finally {
      setIsExtracting(false);
    }
  }

  function clearPdfData() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setPdfPath("");
    setSummary("");
    setKeyFacts("");
    setExtractedText("");
    setError("");
    setStatus(translate("kitchenDetailAdmin.pdfDataClearedSaveToApply", "PDF and chatbot fields cleared. Click Save item to apply."));
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <style>{`
        @media (max-width: 760px) {
          .admin-product-info-pdf-manager__upload-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <details open style={panelStyle}>
        <summary style={summaryStyle}>{translate("kitchenDetailAdmin.pdfManager", "PDF manager")}</summary>
        <div style={panelBodyStyle}>
          <div style={{ display: "grid", gap: 8, color: "var(--app-text)", fontWeight: 700 }}>
            <span>{translate("kitchenDetailAdmin.productInfoPdfPath", "PDF Path")}</span>
            <input
              name="productInfoPdfPath"
              value={pdfPath}
              onChange={(event) => setPdfPath(event.target.value)}
              placeholder="/product-info/example.pdf"
              spellCheck={false}
              style={fieldStyle}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12 }}>
              <span style={{ color: pdfPath ? "var(--app-success-text)" : "var(--app-text-muted)", fontWeight: 800 }}>
                {pdfPath ? translate("kitchenDetailAdmin.pathAdded", "Path added") : translate("kitchenDetailAdmin.missingPath", "Missing path")}
              </span>
              {pdfPath ? (
                <a href={pdfPath} target="_blank" rel="noreferrer" style={{ color: "var(--app-accent)", fontWeight: 800 }}>
                  {translate("kitchenDetailAdmin.openPath", "Open")}
                </a>
              ) : null}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div className="admin-product-info-pdf-manager__upload-row" style={uploadRowStyle}>
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" style={fileInputStyle} />
              <button type="button" onClick={extractPdf} disabled={isExtracting} style={buttonStyle}>
                {isExtracting
                  ? translate("kitchenDetailAdmin.extractingPdf", "Extracting...")
                  : translate("kitchenDetailAdmin.extractPdfData", "Extract PDF data")}
              </button>
              <button type="button" onClick={clearPdfData} style={secondaryButtonStyle}>
                {translate("kitchenDetailAdmin.deletePdfData", "Delete PDF data")}
              </button>
            </div>
            {status ? <p style={statusStyle}>{status}</p> : null}
            {error ? <p style={errorStyle}>{error}</p> : null}
          </div>
        </div>
      </details>

      <details open style={panelStyle}>
        <summary style={summaryStyle}>{translate("kitchenDetailAdmin.chatbotReviewData", "Chatbot review data")}</summary>
        <div style={panelBodyStyle}>
          <label style={labelStyle}>
            <span>{translate("kitchenDetailAdmin.productInfoSummary", "Intro Summary")}</span>
            <textarea name="productInfoSummary" value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} spellCheck={false} style={textareaStyle} />
          </label>

          <label style={labelStyle}>
            <span>{translate("kitchenDetailAdmin.productInfoKeyFacts", "Key Facts")}</span>
            <textarea name="productInfoKeyFacts" value={keyFacts} onChange={(event) => setKeyFacts(event.target.value)} rows={8} spellCheck={false} style={textareaStyle} />
          </label>
        </div>
      </details>

      <details style={panelStyle}>
        <summary style={summaryStyle}>{translate("kitchenDetailAdmin.productInfoExtractedText", "Extracted Product Text")}</summary>
        <div style={panelBodyStyle}>
          <label style={labelStyle}>
            <span>{translate("kitchenDetailAdmin.rawTextFallback", "Raw fallback text")}</span>
            <textarea name="productInfoExtractedText" value={extractedText} onChange={(event) => setExtractedText(event.target.value)} rows={12} spellCheck={false} style={textareaStyle} />
          </label>
        </div>
      </details>
    </div>
  );
}

const panelStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.58)",
  overflow: "hidden",
};

const summaryStyle = {
  cursor: "pointer",
  listStyle: "none",
  padding: "10px 12px",
  color: "var(--app-accent)",
  fontWeight: 900,
};

const panelBodyStyle = {
  display: "grid",
  gap: 10,
  padding: "0 12px 12px",
};

const labelStyle = {
  display: "grid",
  gap: 8,
  color: "var(--app-text)",
  fontWeight: 700,
};

const uploadRowStyle = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "minmax(220px, 1fr) auto auto",
  alignItems: "center",
};

const fileInputStyle = {
  width: "100%",
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid var(--app-border-strong)",
  background: "var(--color-card)",
  padding: "8px 10px",
  color: "var(--app-text)",
  fontSize: "0.92rem",
};

const buttonStyle = {
  border: "1px solid var(--color-primary)",
  borderRadius: 12,
  minHeight: 42,
  padding: "9px 13px",
  background: "var(--color-primary)",
  color: "var(--app-accent-contrast)",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  border: "1px solid var(--app-border-strong)",
  borderRadius: 12,
  minHeight: 42,
  padding: "9px 13px",
  background: "var(--color-card)",
  color: "var(--app-accent)",
  fontWeight: 800,
  cursor: "pointer",
};

const statusStyle = {
  margin: 0,
  color: "var(--app-success-text)",
  fontSize: 12,
  fontWeight: 800,
};

const errorStyle = {
  margin: 0,
  color: "var(--app-danger-text)",
  fontSize: 12,
  fontWeight: 800,
};
