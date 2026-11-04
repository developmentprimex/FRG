import { AdminShell } from "../../../components/admin-shell";
import {
  FlashMessage,
  FormField,
  actionRowStyle,
  formGridStyle,
  inputStyle,
  pageGridStyle,
  AdminSection,
} from "../../../components/admin-ui";
import { AdminFormSubmitButton } from "../../../components/admin-form-submit-button";
import { AdminText } from "../../../components/admin-i18n";
import { formatAdminRoleLabel } from "../../../lib/admin-roles";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage({ searchParams }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection title={<AdminText i18nKey="accountAdmin.account" fallback="Account" />}>
          <div className="account-identity" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 24, padding: "20px 22px", borderRadius: 10, border: "1px solid var(--app-border-strong)", borderLeft: "4px solid var(--app-accent)", background: "var(--app-surface-muted)" }}>
            <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 48, height: 48, flexShrink: 0, borderRadius: 12, background: "var(--app-accent)", color: "var(--app-accent-contrast)" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
              </svg>
            </span>
            <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <strong style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--app-text)", overflowWrap: "anywhere" }}>{admin.email}</strong>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ width: "fit-content", padding: "5px 12px", borderRadius: 8, background: "var(--app-accent)", color: "var(--app-accent-contrast)", fontSize: "var(--admin-text-body, 0.875rem)", fontWeight: 600 }}>{formatAdminRoleLabel(admin.role)}</span>
            </div>
          </div>
        </AdminSection>

        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

        <div style={{ display: "grid", gap: 16 }}>
          <AdminSection
            title={<AdminText i18nKey="accountAdmin.changeEmail" fallback="Change email" />}
          >
            <form action="/api/admin/account" method="post" className="account-form" style={formGridStyle}>
              <FormField label={<AdminText i18nKey="accountAdmin.loginEmail" fallback="Login email" />}>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={admin.email}
                  autoComplete="email"
                  style={{ ...inputStyle, minHeight: 40, padding: "9px 12px", borderRadius: 8, fontSize: "var(--admin-text-body, 0.875rem)" }}
                />
              </FormField>

              <FormField label={<AdminText i18nKey="accountAdmin.currentPassword" fallback="Current password" />}>
                <input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle, minHeight: 40, padding: "9px 12px", borderRadius: 8, fontSize: "var(--admin-text-body, 0.875rem)" }}
                />
              </FormField>

              <div style={{ ...actionRowStyle, alignSelf: "end" }}>
                <AdminFormSubmitButton style={saveButtonStyle} pendingKey="accountAdmin.savingEmail" pendingLabel="Saving email...">
                  <AdminText i18nKey="accountAdmin.save" fallback="Save" />
                </AdminFormSubmitButton>
              </div>
            </form>
          </AdminSection>

          <AdminSection
            title={<AdminText i18nKey="accountAdmin.changePassword" fallback="Change password" />}
          >
            <form action="/api/admin/account" method="post" className="account-form" style={formGridStyle}>
              <input type="hidden" name="email" value={admin.email} />

              <FormField label={<AdminText i18nKey="accountAdmin.currentPassword" fallback="Current password" />}>
                <input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle, minHeight: 40, padding: "9px 12px", borderRadius: 8, fontSize: "var(--admin-text-body, 0.875rem)" }}
                />
              </FormField>

              <FormField label={<AdminText i18nKey="accountAdmin.newPassword" fallback="New password" />}>
                <input
                  name="newPassword"
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  style={{ ...inputStyle, minHeight: 40, padding: "9px 12px", borderRadius: 8, fontSize: "var(--admin-text-body, 0.875rem)" }}
                />
              </FormField>

              <FormField label={<AdminText i18nKey="accountAdmin.confirmNewPassword" fallback="Confirm new password" />}>
                <input
                  name="confirmPassword"
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  style={{ ...inputStyle, minHeight: 40, padding: "9px 12px", borderRadius: 8, fontSize: "var(--admin-text-body, 0.875rem)" }}
                />
              </FormField>

              <div style={{ ...actionRowStyle, alignSelf: "end" }}>
                <AdminFormSubmitButton style={saveButtonStyle} pendingKey="accountAdmin.savingPassword" pendingLabel="Saving password...">
                  <AdminText i18nKey="accountAdmin.save" fallback="Save" />
                </AdminFormSubmitButton>
              </div>
            </form>
          </AdminSection>
        </div>
      </div>
      <style>{`
        .account-form {
          grid-template-columns: minmax(0, 1fr) !important;
          width: 100%;
          max-width: 640px;
          gap: 18px !important;
        }
        .account-form > div:last-child { justify-content: flex-start; }
      `}</style>
    </AdminShell>
  );
}

const saveButtonStyle = {
  minHeight: 40,
  padding: "9px 16px",
  borderRadius: 8,
  fontSize: "var(--admin-text-meta, 0.8125rem)",
  boxShadow: "none",
};
