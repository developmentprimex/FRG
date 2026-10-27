"use client";

import { useEffect, useState } from "react";
import { AdminText } from "./admin-i18n";

export function AdminOrderAs400Form({ orderId, initialValue = "", initialSaved = false }) {
  const normalizedInitialValue = String(initialValue || "");
  const [value, setValue] = useState(normalizedInitialValue);
  const [showSaved, setShowSaved] = useState(Boolean(initialSaved));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!initialSaved || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.delete("as400Saved");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [initialSaved]);

  function handleChange(event) {
    const nextValue = event.target.value;
    setValue(nextValue);

    if (nextValue !== normalizedInitialValue) {
      setShowSaved(false);
    }
  }

  function handleSubmit() {
    setIsSubmitting(true);
  }

  return (
    <form action={`/api/admin/orders/${orderId}`} method="post" onSubmit={handleSubmit} style={as400HeaderFormStyle}>
      <input type="hidden" name="_intent" value="update-as400" />
      <label htmlFor="as400Number" style={as400InlineLabelStyle}>
        <AdminText i18nKey="orderDetailAdmin.as400Number" fallback="AS 400" />
      </label>
      <div style={as400EditorStyle}>
        <input
          id="as400Number"
          name="as400Number"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={50}
          value={value}
          onChange={handleChange}
          placeholder="123456"
          aria-label="AS 400"
          style={as400InputStyle}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            ...as400SaveButtonStyle,
            opacity: isSubmitting ? 0.62 : 1,
            cursor: isSubmitting ? "wait" : "pointer",
          }}
        >
          <AdminText
            i18nKey={isSubmitting ? "orderDetailAdmin.savingAs400" : "orderDetailAdmin.saveAs400"}
            fallback={isSubmitting ? "Saving..." : "Save"}
          />
        </button>
      </div>
      {showSaved ? (
        <span role="status" aria-live="polite" style={as400SavedStyle}>
          <span aria-hidden="true">&#10003;</span>
          <AdminText i18nKey="orderDetailAdmin.as400Saved" fallback="Saved" />
        </span>
      ) : null}
    </form>
  );
}

const as400EditorStyle = {
  display: "flex",
  gap: 8,
  alignItems: "stretch",
  minWidth: 0,
};

const as400HeaderFormStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "fit-content",
  maxWidth: "100%",
  margin: "-4px 0 4px",
  padding: "8px 10px 8px 12px",
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.62)",
  flexWrap: "wrap",
};

const as400InlineLabelStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  whiteSpace: "nowrap",
};

const as400InputStyle = {
  width: 210,
  minWidth: 120,
  border: "1px solid var(--app-border-strong)",
  borderRadius: 9,
  background: "#fff",
  color: "var(--app-text)",
  padding: "8px 10px",
  font: "inherit",
};

const as400SaveButtonStyle = {
  border: "1px solid var(--app-accent)",
  borderRadius: 9,
  background: "var(--app-accent)",
  color: "#fff",
  padding: "8px 14px",
  fontWeight: 800,
};

const as400SavedStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  color: "var(--app-success-text)",
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
};
