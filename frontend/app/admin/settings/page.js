import AdminSettingsForm from "../../../components/admin-settings-form";
import { AdminText } from "../../../components/admin-i18n";
import { AdminShell } from "../../../components/admin-shell";
import {
  AdminSection,
  FlashMessage,
  pageGridStyle,
} from "../../../components/admin-ui";
import { getFormMessage } from "../../../lib/admin-forms";
import {
  DELIVERY_LEAD_TIME_MIN_WEEKS,
  getAdminLoginVerificationEnabled,
  getDeliveryLeadTimeWeeks,
  getDeliveryMinOrderSettings,
  getDirectOrderConfirmationEnabled,
} from "../../../lib/admin-settings";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ searchParams }) {
  const admin = await requireAdminPage("SETTINGS_MANAGE");
  const resolvedSearchParams = (await searchParams) || {};
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const [
    directOrderConfirmationEnabled,
    loginVerificationEnabled,
    deliveryMinOrderSettings,
    deliveryLeadTimeWeeks,
  ] = await Promise.all([
    getDirectOrderConfirmationEnabled(),
    admin.role === "SUPERADMIN" ? getAdminLoginVerificationEnabled() : Promise.resolve(false),
    getDeliveryMinOrderSettings(),
    getDeliveryLeadTimeWeeks(),
  ]);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

        <AdminSection title={<AdminText i18nKey="settingsAdmin.settings" fallback="Settings" />} />

        <div className="settings-rows" style={settingsRowsStyle}>
          <AdminSection
            title={<AdminText i18nKey="settingsAdmin.directOrderConfirmation" fallback="Send order confirmations automatically" />}
          >
            <AdminSettingsForm action="/api/admin/settings/order-confirmation" style={formStyle}>
              <label style={toggleCardStyle}>
                <input
                  name="directOrderConfirmationEnabled"
                  type="checkbox"
                  defaultChecked={directOrderConfirmationEnabled}
                  style={checkboxStyle}
                />
                <span style={toggleTextStyle}>
                  <strong><AdminText i18nKey="settingsAdmin.directOrderConfirmation" fallback="Send order confirmations automatically" /></strong>
                </span>
              </label>

            </AdminSettingsForm>
          </AdminSection>



          <AdminSection
            title={<AdminText i18nKey="settingsAdmin.deliveryMinOrderTitle" fallback="Delivery minimum order value" />}
          >
            <AdminSettingsForm action="/api/admin/settings/delivery-min-order" style={formStyle}>
              <label style={toggleCardStyle}>
                <input
                  name="deliveryMinOrderEnabled"
                  type="checkbox"
                  defaultChecked={deliveryMinOrderSettings.enabled}
                  style={checkboxStyle}
                />
                <span style={toggleTextStyle}>
                  <strong><AdminText i18nKey="settingsAdmin.deliveryMinOrderEnabled" fallback="Enable minimum order value for delivery" /></strong>
                </span>
              </label>

              <div style={amountRowStyle}>
                <label style={amountLabelStyle}>
                  <span style={amountLabelTextStyle}>
                    <AdminText i18nKey="settingsAdmin.deliveryMinOrderAmount" fallback="Minimum order value (€)" />
                  </span>
                  <input
                    name="deliveryMinOrderAmount"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={deliveryMinOrderSettings.amount}
                    style={amountInputStyle}
                  />
                </label>
              </div>

            </AdminSettingsForm>
          </AdminSection>

          <AdminSection
            title={<AdminText i18nKey="settingsAdmin.deliveryLeadTimeTitle" fallback="Delivery lead time" />}
          >
            <AdminSettingsForm action="/api/admin/settings/delivery-lead-time" style={formStyle}>
              <div style={amountRowStyle}>
                <label style={amountLabelStyle}>
                  <span style={amountLabelTextStyle}>
                    <AdminText i18nKey="settingsAdmin.deliveryLeadTimeWeeks" fallback="Minimum weeks after order" />
                  </span>
                  <input
                    name="deliveryLeadTimeWeeks"
                    type="number"
                    min={DELIVERY_LEAD_TIME_MIN_WEEKS}
                    step="1"
                    defaultValue={deliveryLeadTimeWeeks}
                    style={amountInputStyle}
                  />
                </label>
              </div>

            </AdminSettingsForm>
          </AdminSection>
          {admin.role === "SUPERADMIN" ? (
          <AdminSection
            title={<AdminText i18nKey="settingsAdmin.loginVerificationTitle" fallback="Login verification" />}
          >
            <AdminSettingsForm action="/api/admin/settings/login-verification" style={formStyle}>
              <label style={toggleCardStyle}>
                <input
                  name="adminLoginVerificationEnabled"
                  type="checkbox"
                  defaultChecked={loginVerificationEnabled}
                  style={checkboxStyle}
                />
                <span style={toggleTextStyle}>
                  <strong><AdminText i18nKey="settingsAdmin.loginVerificationEnabled" fallback="Require verification code for admin login" /></strong>
                </span>
              </label>

            </AdminSettingsForm>
          </AdminSection>
          ) : null}
        </div>
      </div>
      <style>{`
        .settings-rows > section { min-width: 0; }
        .settings-rows form { display: grid !important; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 20px !important; }
        .settings-rows form[action$="delivery-min-order"] { grid-template-columns: minmax(0, 1fr) 180px auto; }
        .settings-rows form > div:last-child { margin-top: 0 !important; padding-top: 0 !important; }
        @media (max-width: 1100px) {
          .settings-rows form, .settings-rows form[action$="delivery-min-order"] { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>
    </AdminShell>
  );
}

const settingsRowsStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 16,
};


const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const toggleCardStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "var(--app-surface-muted)",
  padding: 14,
  cursor: "pointer",
};

const checkboxStyle = {
  width: 18,
  height: 18,
  flexShrink: 0,
  marginTop: 2,
  accentColor: "var(--color-primary)",
};

const toggleTextStyle = {
  display: "grid",
  gap: 6,
  fontSize: "var(--admin-text-body, 0.875rem)",
  lineHeight: 1.5,
};

const amountRowStyle = {
  padding: "4px 0",
};

const amountLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const amountLabelTextStyle = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--app-text)",
};

const amountInputStyle = {
  width: 180,
  maxWidth: "100%",
  boxSizing: "border-box",
  minHeight: 40,
  padding: "8px 12px",
  fontSize: "var(--admin-text-body, 0.875rem)",
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "var(--app-surface)",
  color: "var(--app-text)",
};

