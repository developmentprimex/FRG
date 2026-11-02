"use client";

import { useState } from "react";
import { AdminText } from "./admin-i18n";
import { primaryButtonStyle } from "./admin-ui";

export default function AdminCreateUserPanel({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <button
          type="button"
          style={{ ...primaryButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 52, minWidth: 190, padding: "14px 24px", fontSize: 15, boxShadow: "0 4px 12px rgba(80, 56, 35, 0.18)" }}
          aria-expanded={isOpen}
          aria-controls="create-user-panel"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span aria-hidden="true" style={{ marginRight: 8 }}>{isOpen ? "−" : "+"}</span>
          <AdminText i18nKey="usersAdmin.createUser" fallback="Create user" />
        </button>
      </div>
      <div id="create-user-panel" hidden={!isOpen} style={{ maxWidth: 860, width: "100%", minWidth: 0 }}>
        {isOpen ? children : null}
      </div>
    </div>
  );
}
