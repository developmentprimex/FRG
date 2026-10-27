"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminText, useAdminI18n } from "./admin-i18n";

function normalizeMime(value) {
  return String(value || "").toLowerCase().split(";")[0].trim();
}

function inferMimeFromFilename(filename) {
  const ext = String(filename || "").toLowerCase().split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "bmp") return "image/bmp";
  if (ext === "tif" || ext === "tiff") return "image/tiff";
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt") return "text/plain";
  return "";
}

function getPreviewContentType(file) {
  const declared = normalizeMime(file?.contentType);
  if (declared && declared !== "application/octet-stream") {
    return declared;
  }
  return inferMimeFromFilename(file?.filename);
}

function isInlineImage(contentType) {
  const m = normalizeMime(contentType);
  return m.startsWith("image/") && m !== "image/svg+xml";
}

function isPdf(contentType) {
  return normalizeMime(contentType) === "application/pdf";
}

function isPlainText(contentType) {
  return normalizeMime(contentType) === "text/plain";
}

function attachmentViewerUrl(claimId, index) {
  return `/api/admin/claims/${claimId}/attachments/${index}?view=1`;
}

function attachmentDownloadUrl(claimId, index) {
  return `/api/admin/claims/${claimId}/attachments/${index}`;
}

export function AdminClaimUploadsPanel({ claimId, files }) {
  const { translate } = useAdminI18n();
  const [preview, setPreview] = useState(null);
  const [textBody, setTextBody] = useState("");
  const [textError, setTextError] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const localizeMeta = (meta) => String(meta || "")
    .replace(/^file(?=\s|$)/, translate("claimsAdmin.file", "File"))
    .replace(/\bserial number\b/g, translate("claimsAdmin.serialNumber", "Serial number"));

  const close = useCallback(() => {
    setPreview(null);
    setTextBody("");
    setTextError("");
    setTextLoading(false);
    setMediaError(false);
  }, []);

  useEffect(() => {
    if (!preview) {
      return undefined;
    }
    const onKey = (event) => {
      if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [preview, close]);

  useEffect(() => {
    if (!preview || !isPlainText(preview.contentType)) {
      return undefined;
    }
    const url = attachmentViewerUrl(claimId, preview.index);
    let cancelled = false;
    setTextLoading(true);
    setTextError("");
    setTextBody("");
    fetch(url, { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) {
          throw new Error(String(res.status));
        }
        return res.text();
      })
      .then((text) => {
        if (!cancelled) {
          setTextBody(text);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTextError("load_failed");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTextLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [preview, claimId]);

  if (!files?.length) {
    return (
      <p style={detailTextStyle}>
        <AdminText i18nKey="claimsAdmin.noUploadedFiles" fallback="No files were uploaded with this claim." />
      </p>
    );
  }

  return (
    <>
      <ul style={attachmentListStyle}>
        {files.map((file) => (
          <li key={`${file.filename}-${file.index}`} style={attachmentItemStyle}>
            {isInlineImage(getPreviewContentType(file)) ? (
              <button
                type="button"
                aria-label={`${translate("claimsAdmin.viewAttachment", "View")}: ${file.filename}`}
                onClick={() => {
                  setMediaError(false);
                  setPreview({ index: file.index, filename: file.filename, contentType: getPreviewContentType(file) });
                }}
                style={{ display: "block", padding: 0, marginBottom: 8, border: "1px solid var(--app-border)", borderRadius: 10, background: "#fff", cursor: "pointer", overflow: "hidden", maxWidth: "100%" }}
              >
                <img
                  src={attachmentViewerUrl(claimId, file.index)}
                  alt={file.filename}
                  loading="lazy"
                  style={{ display: "block", width: 240, maxWidth: "100%", height: 160, objectFit: "contain" }}
                />
              </button>
            ) : null}
            <div style={attachmentRowStyle}>
              <span style={attachmentFilenameStyle}>{file.filename}</span>
              <span style={attachmentActionsStyle}>
                <button
                  type="button"
                  onClick={() => {
                    setMediaError(false);
                    setPreview({
                      index: file.index,
                      filename: file.filename,
                      contentType: getPreviewContentType(file),
                    });
                  }}
                  style={attachmentButtonPrimaryStyle}
                >
                  <AdminText i18nKey="claimsAdmin.viewAttachment" fallback="View" as="span" />
                </button>
                <span style={attachmentActionSepStyle} aria-hidden>
                  ·
                </span>
                <a
                  href={attachmentDownloadUrl(claimId, file.index)}
                  style={attachmentSecondaryLinkStyle}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AdminText i18nKey="claimsAdmin.downloadAttachment" fallback="Download" as="span" />
                </a>
              </span>
            </div>
            <span style={attachmentMetaStyle}>{localizeMeta(file.meta)}</span>
          </li>
        ))}
      </ul>

      {preview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="claim-upload-preview-title"
          style={modalRootStyle}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}
        >
          <div style={modalCardStyle} onMouseDown={(event) => event.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h2 id="claim-upload-preview-title" style={modalTitleStyle}>
                {preview.filename}
              </h2>
              <div style={modalHeaderActionsStyle}>
                <a
                  href={attachmentDownloadUrl(claimId, preview.index)}
                  style={modalDownloadLinkStyle}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AdminText i18nKey="claimsAdmin.downloadAttachment" fallback="Download" as="span" />
                </a>
                <button
                  type="button"
                  onClick={close}
                  style={modalCloseStyle}
                  aria-label={translate("claimsAdmin.closePreview", "Close preview")}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={modalBodyStyle}>
              {isInlineImage(preview.contentType) && !mediaError ? (
                <img
                  src={attachmentViewerUrl(claimId, preview.index)}
                  alt=""
                  style={modalImageStyle}
                  onError={() => setMediaError(true)}
                />
              ) : null}
              {isPdf(preview.contentType) ? (
                <iframe
                  title={preview.filename}
                  src={attachmentViewerUrl(claimId, preview.index)}
                  style={modalIframeStyle}
                />
              ) : null}
              {isPlainText(preview.contentType) ? (
                <div style={modalTextWrapStyle}>
                  {textLoading ? (
                    <p style={modalMutedStyle}>
                      <AdminText i18nKey="claimsAdmin.previewLoading" fallback="Loading…" as="span" />
                    </p>
                  ) : null}
                  {textError ? (
                    <p style={modalErrorStyle}>
                      <AdminText
                        i18nKey="claimsAdmin.previewLoadFailed"
                        fallback="Could not load this file. Try Download instead."
                        as="span"
                      />
                    </p>
                  ) : null}
                  {!textLoading && !textError ? <pre style={modalPreStyle}>{textBody}</pre> : null}
                </div>
              ) : null}
              {mediaError ? (
                <p style={modalErrorStyle}>
                  <AdminText
                    i18nKey="claimsAdmin.previewLoadFailed"
                    fallback="Could not load this file. Try Download instead."
                    as="span"
                  />
                </p>
              ) : null}
              {!isInlineImage(preview.contentType) && !isPdf(preview.contentType) && !isPlainText(preview.contentType) ? (
                <p style={modalMutedStyle}>
                  <AdminText
                    i18nKey="claimsAdmin.previewNotAvailable"
                    fallback="No in-page preview for this file type. Use Download to open it."
                    as="span"
                  />
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const detailTextStyle = {
  margin: 0,
  color: "var(--app-text)",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
};

const attachmentListStyle = {
  margin: "8px 0 0",
  paddingLeft: 20,
  color: "var(--app-text)",
  lineHeight: 1.65,
};

const attachmentItemStyle = {
  marginBottom: 12,
};

const attachmentRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: "8px 12px",
};

const attachmentFilenameStyle = {
  fontWeight: 700,
  color: "var(--app-text)",
};

const attachmentActionsStyle = {
  display: "inline-flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  fontSize: 14,
};

const attachmentActionSepStyle = {
  color: "var(--app-text-muted)",
  userSelect: "none",
};

const attachmentButtonPrimaryStyle = {
  font: "inherit",
  fontWeight: 600,
  color: "var(--app-accent)",
  textDecoration: "underline",
  textUnderlineOffset: 3,
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

const attachmentSecondaryLinkStyle = {
  fontWeight: 600,
  color: "var(--app-text-muted)",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

const attachmentMetaStyle = {
  display: "block",
  fontSize: 13,
  color: "var(--app-text-muted)",
  marginTop: 4,
};

const modalRootStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 10050,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "rgba(15, 12, 10, 0.55)",
  backdropFilter: "blur(4px)",
};

const modalCardStyle = {
  width: "min(960px, 100%)",
  maxHeight: "min(90vh, 900px)",
  display: "flex",
  flexDirection: "column",
  background: "var(--color-card, #fffdf9)",
  borderRadius: 18,
  border: "1px solid var(--app-border)",
  boxShadow: "var(--app-shadow, 0 24px 48px rgba(40, 28, 20, 0.18))",
  overflow: "hidden",
};

const modalHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 18px",
  borderBottom: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,243,236,0.9))",
};

const modalTitleStyle = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: 700,
  color: "var(--app-text)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  minWidth: 0,
};

const modalHeaderActionsStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 12,
  flexShrink: 0,
};

const modalDownloadLinkStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--app-accent)",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

const modalCloseStyle = {
  font: "inherit",
  lineHeight: 1,
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.9)",
  color: "var(--app-text)",
  cursor: "pointer",
  fontSize: "1.35rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalBodyStyle = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  padding: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(247, 244, 239, 0.5)",
};

const modalImageStyle = {
  maxWidth: "100%",
  maxHeight: "min(72vh, 780px)",
  width: "auto",
  height: "auto",
  objectFit: "contain",
  borderRadius: 8,
  boxShadow: "0 8px 28px rgba(40, 28, 20, 0.12)",
};

const modalIframeStyle = {
  width: "100%",
  minHeight: "min(72vh, 720px)",
  height: "min(72vh, 720px)",
  border: "none",
  borderRadius: 8,
  background: "#fff",
};

const modalTextWrapStyle = {
  width: "100%",
  alignSelf: "stretch",
};

const modalPreStyle = {
  margin: 0,
  padding: 14,
  borderRadius: 12,
  border: "1px solid var(--app-border)",
  background: "#fff",
  color: "var(--app-text)",
  fontSize: 13,
  lineHeight: 1.5,
  overflow: "auto",
  maxHeight: "min(70vh, 680px)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const modalMutedStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  fontSize: 15,
  lineHeight: 1.6,
  textAlign: "center",
  maxWidth: 420,
};

const modalErrorStyle = {
  ...modalMutedStyle,
  color: "var(--app-danger-text, #a94442)",
};
