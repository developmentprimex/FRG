"use client";

import { AdminText } from "./admin-i18n";
import { primaryButtonStyle } from "./admin-ui";

export default function AdminContractEditButton() {
  function openEditor() {
    const editor = document.getElementById("edit-contract");
    if (!editor) return;
    editor.open = true;
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
    editor.querySelector("summary")?.focus({ preventScroll: true });
  }

  return (
    <button type="button" aria-controls="edit-contract" onClick={openEditor} style={{ ...primaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" />
        <path d="m13 6 5 5" />
      </svg>
      <AdminText i18nKey="contractDetailAdmin.editContract" fallback="Edit contract" />
    </button>
  );
}
