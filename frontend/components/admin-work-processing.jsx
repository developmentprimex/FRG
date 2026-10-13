"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import AdminSelect from "./admin-select";
import { useRouter } from "next/navigation";
import { AdminDateTime, AdminText, useAdminI18n } from "./admin-i18n";
import { workDateKey, workState } from "../lib/work-processing-rules";

export const workTones = {
  green: { color: "#176534", background: "#ecfdf3", borderColor: "#a7dfbc" },
  orange: { color: "#665500", background: "#fff9c4", borderColor: "#e5cf37" },
  red: { color: "#a51b28", background: "#fff0f0", borderColor: "#f0a9af" },
  done: { color: "var(--app-text-muted)", background: "var(--app-surface)", borderColor: "var(--app-border)" },
  cancelled: { color: "var(--app-text-muted)", background: "var(--app-surface)", borderColor: "var(--app-border)" },
};

export function WorkBadge({ item, compact = false }) {
  const router = useRouter();
  const state = workState(item);
  // Calendar boundaries update even if the worker keeps the dashboard open.
  useEffect(() => {
    let date = workDateKey();
    const timer = setInterval(() => {
      const next = workDateKey();
      if (next !== date) { date = next; router.refresh(); }
    }, 60000);
    return () => clearInterval(timer);
  }, [router]);
  const labels = { green: "On track", orange: "Needs attention", red: "Overdue", done: "Done", cancelled: "Cancelled" };
  return <div style={{ display: "grid", gap: 5, marginBlock: 6 }}>
    <span style={{ ...workTones[state.tone], borderWidth: 1, borderStyle: "solid", borderRadius: 12, padding: "5px 9px", fontSize: 12, fontWeight: 800, width: "fit-content", maxWidth: "100%", boxSizing: "border-box", whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.4 }}>
      {state.tone === "done" ? "✓ " : ""}<AdminText i18nKey={`workProcessing.${state.tone}`} fallback={labels[state.tone]} />
      {!compact && !['done', 'cancelled'].includes(state.tone) ? <> · <AdminText i18nKey="workProcessing.days" fallback="{count} days" values={{ count: state.days }} /></> : null}
    </span>
    {compact && !['done', 'cancelled'].includes(state.tone) ? <small style={{ color: "var(--app-text-muted)" }}><AdminText i18nKey="workProcessing.days" fallback="{count} days" values={{ count: state.days }} /></small> : null}
    {!compact && !["done", "cancelled"].includes(state.tone) ? <small><AdminText i18nKey="workProcessing.OPEN" fallback="Open" /></small> : null}
    {!compact && item.processing?.completedAt ? <small><AdminDateTime value={item.processing.completedAt} /> · {item.processing.completedBy}</small> : null}
  </div>;
}

export function WorkActions({ item, compact = false }) {
  const router = useRouter();
  const { translate } = useAdminI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (item.status === "CANCELLED") return null;
  const status = item.processing?.status || "OPEN";
  async function update(nextStatus) {
    if (pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/admin/work-processing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workType: item.workType, workId: item.id, status: nextStatus, expectedVersion: item.processing?.version || 0 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update processing.");
      router.refresh();
    } catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }
  const button = { border: "1px solid var(--app-border)", borderRadius: 8, padding: "9px 12px", minHeight: 38, fontSize: 13, background: "var(--app-surface)", color: "var(--app-accent)", cursor: pending ? "wait" : "pointer", fontWeight: 800, whiteSpace: "nowrap" };
  return <div style={{ display: "grid", gap: 8, ...(compact ? { width: "100%", minWidth: 0 } : {}) }}>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} aria-busy={pending}>
      {status === "DONE" ? <button type="button" disabled={pending} style={button} onClick={() => update("OPEN")}><AdminText i18nKey="workProcessing.reopen" fallback="Reopen" /></button> : <>
        <button type="button" disabled={pending} title={translate("workProcessing.markDone", "Mark as done")} style={{ ...button, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--app-accent-contrast)", background: "var(--color-primary)", border: "1px solid var(--color-primary)", boxShadow: "none", padding: "8px 10px", lineHeight: 1.3, whiteSpace: "nowrap", ...(compact ? { width: "100%", maxWidth: "100%", minWidth: 0 } : {}) }} onClick={() => update("DONE")}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m5 12 4 4L19 6" /></svg>
          <span><AdminText i18nKey={compact ? "workProcessing.doneAction" : "workProcessing.markDone"} fallback={compact ? "Done" : "Mark as done"} /></span>
        </button>
      </>}
    </div>
    {pending ? <small role="status"><AdminText i18nKey="workProcessing.saving" fallback="Saving…" /></small> : null}
    {error ? <small role="alert" style={{ color: "#a51b28" }}>{error}</small> : null}
  </div>;
}

export function WorkCell({ item }) {
  return <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
    <WorkBadge item={item} compact />
  </div>;
}

export function WorkFilter({ value = "" }) {
  const { translate } = useAdminI18n();
  const fieldRef = useRef(null);
  const normalizedValue = value === "ACTIVE" ? "OPEN" : value;
  const [selected, setSelected] = useState(normalizedValue);
  useEffect(() => { setSelected(normalizedValue); }, [normalizedValue]);
  function changeProcessing(event) {
    // Commit the hidden input before submitting the surrounding GET form.
    flushSync(() => setSelected(event.target.value));
    fieldRef.current?.closest("form")?.requestSubmit();
  }
  return <label ref={fieldRef} style={{ display: "grid", gap: 6, minWidth: 0, color: "var(--app-text-muted)", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
    <AdminText i18nKey="workProcessing.processing" fallback="Processing" />
    <AdminSelect name="processing" value={selected} onChange={changeProcessing} ariaLabelKey="workProcessing.processing" style={{ minHeight: 42, minWidth: 0, width: "100%", boxSizing: "border-box", fontSize: "0.92rem", fontWeight: 400, letterSpacing: "normal", textTransform: "none", padding: "9px 11px", border: "1px solid var(--app-border)", borderRadius: 8, background: "var(--app-surface)", color: "var(--app-text)" }}>
      {[["", "all", "All"], ["OPEN", "OPEN", "Open"], ["DONE", "DONE", "Done"], ["OVERDUE", "red", "Overdue"]].map(([key, label, fallback]) => <option key={key} value={key}>{translate(`workProcessing.${label}`, fallback)}</option>)}
    </AdminSelect>
  </label>;
}

export function WorkSummary({ counts }) {
  return <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "12px 0" }}>
    {[['OPEN', 'Open'], ['DONE', 'Done'], ['OVERDUE', 'Overdue']].map(([key, label]) => <span key={key} style={{ color: key === "OVERDUE" ? "#a51b28" : "var(--app-text)" }}><AdminText i18nKey={`workProcessing.${key}`} fallback={label} />: <strong>{counts[key]}</strong></span>)}
  </div>;
}

export function WorkActionStack({ children }) {
  return <div className="work-action-stack" style={{ display: "grid", gap: 6, width: "100%", maxWidth: 112 }}>
    {children}
    <style jsx global>{`
      .work-action-stack a, .work-action-stack button, .work-action-stack form {
        width: 100%; box-sizing: border-box; margin: 0;
      }
      .work-action-stack a, .work-action-stack button {
        height: 38px; min-height: 38px; padding: 8px 10px;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 13px; line-height: 1; white-space: nowrap;
      }
      .work-action-stack button:disabled { opacity: 0.6; cursor: wait; }
    `}</style>
  </div>;
}
