"use client";

import { useState } from "react";
import {
  FormField,
  actionRowStyle,
  formGridStyle,
  inputStyle,
  primaryButtonStyle,
} from "./admin-ui";
import { AdminText, useAdminI18n } from "./admin-i18n";
import AdminSelect from "./admin-select";
import { ADMIN_ROLES, formatAdminRoleLabel } from "../lib/admin-roles";

const helperTextStyle = {
  display: "block",
  marginTop: 6,
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.5,
};

const errorTextStyle = {
  ...helperTextStyle,
  color: "var(--app-danger-text)",
  fontWeight: 700,
};

export default function AdminCreateUserForm() {
  const { translate } = useAdminI18n();
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  function handleSubmit(event) {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password.length < 8) {
      event.preventDefault();
      setErrorMessage(
        translate("usersAdmin.passwordTooShort", "Password must be at least 8 characters."),
      );
      return;
    }

    if (password !== confirmPassword) {
      event.preventDefault();
      setErrorMessage(
        translate("usersAdmin.passwordMismatch", "Password and confirmation do not match."),
      );
      return;
    }

    setErrorMessage("");
    setIsPending(true);
  }

  return (
    <form action="/api/admin/users" method="post" style={{ ...formGridStyle, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }} onSubmit={handleSubmit}>
      <FormField label={<AdminText i18nKey="usersAdmin.email" fallback="Email" />}>
        <input name="email" type="email" required autoComplete="off" style={compactInputStyle} disabled={isPending} />
        <span style={helperTextStyle}>
          <AdminText i18nKey="usersAdmin.emailHelper" fallback="Used as the login username." />
        </span>
      </FormField>

      <FormField label={<AdminText i18nKey="usersAdmin.role" fallback="Role" />}>
        <AdminSelect name="role" defaultValue="ADMIN" required disabled={isPending} style={compactInputStyle}>
          {ADMIN_ROLES.map((role) => (
            <option key={role} value={role}>{formatAdminRoleLabel(role)}</option>
          ))}
        </AdminSelect>
      </FormField>

      <FormField label={<AdminText i18nKey="usersAdmin.password" fallback="Password" />}>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          style={compactInputStyle}
          disabled={isPending}
        />
        <span style={helperTextStyle}>
          <AdminText i18nKey="usersAdmin.passwordHelper" fallback="Minimum 8 characters." />
        </span>
      </FormField>

      <FormField label={<AdminText i18nKey="usersAdmin.confirmPassword" fallback="Confirm password" />}>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          style={compactInputStyle}
          disabled={isPending}
        />
        <span style={helperTextStyle}>
          <AdminText i18nKey="usersAdmin.confirmPasswordHelper" fallback="Re-enter the password to confirm." />
        </span>
      </FormField>

      {errorMessage ? (
        <div style={{ ...errorTextStyle, gridColumn: "1 / -1" }}>{errorMessage}</div>
      ) : null}

      <div style={{ ...actionRowStyle, gridColumn: "1 / -1" }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            ...primaryButtonStyle,
            minHeight: 42,
            padding: "9px 14px",
            fontWeight: 600,
            opacity: isPending ? 0.72 : 1,
            cursor: isPending ? "wait" : "pointer",
          }}
        >
          {isPending ? (
            <AdminText i18nKey="usersAdmin.creatingUser" fallback="Creating user..." />
          ) : (
            <AdminText i18nKey="usersAdmin.createUserButton" fallback="Create user" />
          )}
        </button>
      </div>
    </form>
  );
}

const compactInputStyle = { ...inputStyle, minHeight: 42, padding: "9px 11px", borderRadius: 8, boxShadow: "none" };
