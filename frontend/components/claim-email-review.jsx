"use client";

import { useEffect, useRef, useState } from "react";
import { AdminText, useAdminI18n } from "./admin-i18n";

const buttonStyle = { border: "1px solid var(--app-border)", borderRadius: 8, padding: "8px 12px", background: "var(--app-surface)", color: "var(--app-accent)", fontSize: 13, fontWeight: 600, cursor: "pointer" };

export function ClaimEmailReview({ claimId, submissionId }) {
  const dialogRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("notification");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { translate } = useAdminI18n();
  const t = (key, fallback) => translate("claimEmailReview." + key, fallback);

  useEffect(() => {
    if (open && !dialogRef.current.open) dialogRef.current.showModal();
    if (!open && dialogRef.current.open) dialogRef.current.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError(""); setPreview(null);
    const query = submissionId ? "?submission=" + encodeURIComponent(submissionId) : "";
    fetch("/api/admin/claims/" + encodeURIComponent(claimId) + "/email-preview" + query, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || t("loadError", "Unable to load the email preview."));
        setPreview(result);
      }).catch(failure => { if (failure.name !== "AbortError") setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, claimId, submissionId]);

  const email = preview?.[kind];
  const document = email ? "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline';\"><style>body{margin:16px;font-family:Arial,sans-serif;overflow-wrap:anywhere}img{max-width:100%}table{max-width:100%}</style></head><body>" + email.html + "</body></html>" : "";

  return <>
    <button type="button" style={buttonStyle} onClick={() => { setKind("notification"); setOpen(true); }}><AdminText i18nKey="claimEmailReview.review" fallback="Review email" /></button>
    <dialog ref={dialogRef} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} aria-labelledby="claim-email-review-title" style={{ width: "min(1100px, calc(100vw - 32px))", maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", padding: 0, border: "1px solid var(--app-border)", borderRadius: 16, color: "var(--app-text)", background: "var(--app-surface)" }}>
      <div style={{ padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--app-border)" }}>
        <h2 id="claim-email-review-title" style={{ margin: 0, fontSize: 20 }}>{t("review", "Review email")}</h2>
        <button type="button" style={buttonStyle} onClick={() => setOpen(false)}>{t("close", "Close")}</button>
      </div>
      <div style={{ padding: 18 }}>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--app-text-muted)" }}>{t("previewNote", "Preview rebuilt from saved details using the current email template.")}</p>
        {loading && <p role="status">{t("loading", "Loading email…")}</p>}
        {error && <p role="alert" style={{ color: "var(--app-danger-text)" }}>{error}</p>}
        {!loading && email && <>
          <dl style={{ display: "grid", gridTemplateColumns: "80px minmax(0,1fr)", gap: "6px 12px", margin: "0 0 14px", fontSize: 13, overflowWrap: "anywhere" }}>
            {[["from", "From", email.from], ["to", "To", email.to], ["cc", "CC", email.cc], ["replyTo", "Reply-To", email.replyTo], ["subject", "Subject", email.subject]].filter(([key,, value]) => value || key === "to").map(([key, label, value]) => <div key={key} style={{ display: "contents" }}><dt style={{ color: "var(--app-text-muted)" }}>{t(key, label)}</dt><dd style={{ margin: 0, fontWeight: key === "subject" ? 600 : 400 }}>{value || "—"}</dd></div>)}
          </dl>
          {open && <iframe title={t("emailContent", "Email content")} sandbox="allow-same-origin" srcDoc={document} style={{ width: "100%", height: "55vh", minHeight: 280, border: "1px solid var(--app-border)", borderRadius: 8, background: "#fff" }} />}
          {email.attachments?.length > 0 && <div style={{ marginTop: 14 }}><strong style={{ fontSize: 13 }}>{t("attachments", "Attachments")}</strong><ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>{email.attachments.map((file, index) => <li key={index} style={{ marginTop: 4, fontSize: 13 }}><a href={file.url} target="_blank" rel="noreferrer" style={{ color: "var(--app-accent)" }}>{file.filename}</a></li>)}</ul></div>}
        </>}
      </div>
    </dialog>
    <style jsx>{`dialog::backdrop { background: rgba(0, 0, 0, 0.35); }`}</style>
  </>;
}
