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
    <form action="/api/admin/users" method="post" style={formGridStyle} onSubmit={handleSubmit}>
      <FormField label={<AdminText i18nKey="usersAdmin.email" fallback="Email" />} wide>
        <input name="email" type="email" required autoComplete="off" style={inputStyle} disabled={isPending} />
        <span style={helperTextStyle}>
          <AdminText i18nKey="usersAdmin.emailHelper" fallback="Used as the login username." />
        </span>
      </FormField>

      <FormField label={<AdminText i18nKey="usersAdmin.password" fallback="Password" />} wide>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          style={inputStyle}
          disabled={isPending}
        />
        <span style={helperTextStyle}>
          <AdminText i18nKey="usersAdmin.passwordHelper" fallback="Minimum 8 characters." />
        </span>
      </FormField>

      <FormField label={<AdminText i18nKey="usersAdmin.confirmPassword" fallback="Confirm password" />} wide>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          style={inputStyle}
          disabled={isPending}
        />
        <span style={helperTextStyle}>
          <AdminText i18nKey="usersAdmin.confirmPasswordHelper" fallback="Re-enter the password to confirm." />
        </span>
      </FormField>

      <FormField label={<AdminText i18nKey="usersAdmin.role" fallback="Role" />} wide>
        <AdminSelect name="role" defaultValue="ADMIN" required disabled={isPending}>
          {ADMIN_ROLES.map((role) => (
            <option key={role} value={role}>
              {formatAdminRoleLabel(role)}
            </option>
          ))}
        </AdminSelect>
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
