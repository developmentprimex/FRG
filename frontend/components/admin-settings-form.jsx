"use client";

import { useState } from "react";
import { AdminText } from "./admin-i18n";
import { primaryButtonStyle } from "./admin-ui";
import { hasSettingsChanges } from "../lib/admin-settings-form-state";

export default function AdminSettingsForm({ action, children, style }) {
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const disabled = !dirty || pending;

  function trackChanges(event) {
    setDirty(hasSettingsChanges(event.currentTarget.elements));
  }

  return (
    <form
      action={action}
      method="post"
      style={style}
      onChange={trackChanges}
      onInput={trackChanges}
      onReset={() => setDirty(false)}
      onSubmit={(event) => {
        if (disabled) event.preventDefault();
        else setPending(true);
      }}
    >
      {children}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="submit"
          disabled={disabled}
          style={{
            ...primaryButtonStyle,
            minHeight: 38,
            padding: "9px 14px",
            borderRadius: 8,
            fontSize: "var(--admin-text-meta, 0.8125rem)",
            boxShadow: "none",
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <AdminText i18nKey="accountAdmin.save" fallback="Save" />
        </button>
      </div>
    </form>
  );
}
