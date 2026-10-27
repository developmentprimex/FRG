import { AdminShell } from "../../../components/admin-shell";
import {
  FlashMessage,
  FormField,
  PageHero,
  TypeBadge,
  actionRowStyle,
  formGridStyle,
  inputStyle,
  mutedTextStyle,
  pageGridStyle,
  splitGridStyle,
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
        <PageHero
          eyebrow={<AdminText i18nKey="accountAdmin.adminAccess" fallback="Admin access" />}
          title={<AdminText i18nKey="accountAdmin.accountSettings" fallback="Account settings" />}
          description={
            <AdminText
              i18nKey="accountAdmin.manageAdminLoginEmailAndRotatePassword"
              fallback="Manage the admin login email and rotate the password from one place."
            />
          }
        />

        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

        <div style={splitGridStyle}>
          <AdminSection
            title={<AdminText i18nKey="accountAdmin.profile" fallback="Profile" />}
            description={
              <AdminText
                i18nKey="accountAdmin.profileDescription"
                fallback="Your current login identity and access level."
              />
            }
          >
            <div style={profileGridStyle}>
              <div style={profileItemStyle}>
                <span style={profileLabelStyle}>
                  <AdminText i18nKey="accountAdmin.currentAdminEmail" fallback="Current admin email" />
                </span>
                <strong style={profileValueStyle}>{admin.email}</strong>
                <p style={mutedTextStyle}>
                  <AdminText
                    i18nKey="accountAdmin.usernameUsesEmailAddress"
                    fallback="This admin uses the email address as the login username."
                  />
                </p>
              </div>

              <div style={profileItemStyle}>
                <span style={profileLabelStyle}>
                  <AdminText i18nKey="accountAdmin.currentRole" fallback="Current role" />
                </span>
                <div>
                  <TypeBadge label={formatAdminRoleLabel(admin.role)} />
                </div>
                <p style={mutedTextStyle}>
                  <AdminText
                    i18nKey={`accountAdmin.roleDescription.${admin.role}`}
                    fallback={roleDescriptionFallback(admin.role)}
                  />
                </p>
              </div>
            </div>
          </AdminSection>

          <AdminSection
            title={<AdminText i18nKey="accountAdmin.securityNotes" fallback="Security notes" />}
            description={
              <AdminText
                i18nKey="accountAdmin.securityNotesDescription"
                fallback="The current password is required before any email or password change is accepted."
              />
            }
          >
            <ul style={notesListStyle}>
              <li>
                <AdminText
                  i18nKey="accountAdmin.leaveNewPasswordBlank"
                  fallback="Leave the new password fields empty if you only want to change the login email."
                />
              </li>
              <li>
                <AdminText
                  i18nKey="accountAdmin.newPasswordMustBeAtLeast8Characters"
                  fallback="Any new password must be at least 8 characters long."
                />
              </li>
              <li>
                <AdminText
                  i18nKey="accountAdmin.signOutAfterChanges"
                  fallback="You stay signed in after changes, but use the new email on your next login."
                />
              </li>
            </ul>
          </AdminSection>
        </div>

        <div style={splitGridStyle}>
          <AdminSection
            title={<AdminText i18nKey="accountAdmin.changeEmail" fallback="Change email" />}
            description={
              <AdminText
                i18nKey="accountAdmin.changeEmailDescription"
                fallback="Update the email address used to sign in."
              />
            }
          >
            <form action="/api/admin/account" method="post" style={formGridStyle}>
              <FormField label={<AdminText i18nKey="accountAdmin.loginEmail" fallback="Login email" />} wide>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={admin.email}
                  autoComplete="email"
                  style={inputStyle}
                />
              </FormField>

              <FormField label={<AdminText i18nKey="accountAdmin.currentPassword" fallback="Current password" />} wide>
                <input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="********"
                  style={inputStyle}
                />
                <span style={helperTextStyle}>
                  <AdminText
                    i18nKey="accountAdmin.currentPasswordRequiredForEmail"
                    fallback="Required to confirm this change."
                  />
                </span>
              </FormField>

              <div style={{ ...actionRowStyle, gridColumn: "1 / -1" }}>
                <AdminFormSubmitButton pendingKey="accountAdmin.savingEmail" pendingLabel="Saving email...">
                  <AdminText i18nKey="accountAdmin.saveEmail" fallback="Save email" />
                </AdminFormSubmitButton>
              </div>
            </form>
          </AdminSection>

          <AdminSection
            title={<AdminText i18nKey="accountAdmin.changePassword" fallback="Change password" />}
            description={
              <AdminText
                i18nKey="accountAdmin.changePasswordDescription"
                fallback="Set a new password for this admin account."
              />
            }
          >
            <form action="/api/admin/account" method="post" style={formGridStyle}>
              <input type="hidden" name="email" value={admin.email} />

              <FormField label={<AdminText i18nKey="accountAdmin.currentPassword" fallback="Current password" />} wide>
                <input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="********"
                  style={inputStyle}
                />
              </FormField>

              <FormField label={<AdminText i18nKey="accountAdmin.newPassword" fallback="New password" />}>
                <input
                  name="newPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="********"
                  style={inputStyle}
                />
              </FormField>

              <FormField label={<AdminText i18nKey="accountAdmin.confirmNewPassword" fallback="Confirm new password" />}>
                <input
                  name="confirmPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="********"
                  style={inputStyle}
                />
              </FormField>

              <div style={{ ...actionRowStyle, gridColumn: "1 / -1" }}>
                <AdminFormSubmitButton pendingKey="accountAdmin.savingPassword" pendingLabel="Saving password...">
                  <AdminText i18nKey="accountAdmin.savePassword" fallback="Save password" />
                </AdminFormSubmitButton>
              </div>
            </form>
          </AdminSection>
        </div>
      </div>
    </AdminShell>
  );
}

function roleDescriptionFallback(role) {
  switch (role) {
    case "SUPERADMIN":
      return "Full access, including user management.";
    case "ADMIN":
      return "Standard admin access to the current dashboard.";
    case "USER":
      return "Basic admin access with the same workflows for now.";
    default:
      return "";
  }
}

const profileGridStyle = {
  display: "grid",
  gap: 20,
};

const profileItemStyle = {
  display: "grid",
  gap: 8,
  padding: "16px 18px",
  borderRadius: 16,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface-muted)",
};

const profileLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--app-text-muted)",
};

const profileValueStyle = {
  fontSize: "1.15rem",
  color: "var(--app-text)",
};

const notesListStyle = {
  margin: 0,
  paddingLeft: 18,
  color: "var(--app-text-muted)",
  lineHeight: 1.7,
  display: "grid",
  gap: 10,
};

const helperTextStyle = {
  display: "block",
  marginTop: 6,
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.5,
};
