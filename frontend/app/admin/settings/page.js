import { AdminText } from "../../../components/admin-i18n";
import { AdminShell } from "../../../components/admin-shell";
import {
  AdminSection,
  FlashMessage,
  actionRowStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
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
  const admin = await requireAdminPage();
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
    getAdminLoginVerificationEnabled(),
    getDeliveryMinOrderSettings(),
    getDeliveryLeadTimeWeeks(),
  ]);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

        <div style={compactWrapStyle}>
          <AdminSection
            title={<AdminText i18nKey="settingsAdmin.settings" fallback="Settings" />}
            description={<AdminText i18nKey="settingsAdmin.orderConfirmationDescription" fallback="Control how public kitchen orders are confirmed." />}
          >
            <form action="/api/admin/settings/order-confirmation" method="post" style={formStyle}>
              <label style={toggleCardStyle}>
                <input
                  name="directOrderConfirmationEnabled"
                  type="checkbox"
                  defaultChecked={directOrderConfirmationEnabled}
                  style={checkboxStyle}
                />
                <span style={toggleTextStyle}>
                  <strong><AdminText i18nKey="settingsAdmin.directOrderConfirmation" fallback="Send order confirmations automatically" /></strong>
                  <span style={mutedTextStyle}>
                    <AdminText
                      i18nKey="settingsAdmin.directOrderConfirmationHelp"
                      fallback="When enabled, the customer confirmation email is sent immediately after public checkout and the order is marked confirmed after the email succeeds. The agent webhook still runs."
                    />
                  </span>
                </span>
              </label>

              <div style={actionRowStyle}>
                <button type="submit" style={primaryButtonStyle}>
                  <AdminText i18nKey="settingsAdmin.saveSettings" fallback="Save settings" />
                </button>
              </div>
            </form>
          </AdminSection>

          <AdminSection
            title={<AdminText i18nKey="settingsAdmin.loginVerificationTitle" fallback="Login verification" />}
            description={<AdminText i18nKey="settingsAdmin.loginVerificationDescription" fallback="Control whether admin sign-in requires an emailed verification code after the password step." />}
          >
            <form action="/api/admin/settings/login-verification" method="post" style={formStyle}>
              <label style={toggleCardStyle}>
                <input
                  name="adminLoginVerificationEnabled"
                  type="checkbox"
                  defaultChecked={loginVerificationEnabled}
                  style={checkboxStyle}
                />
                <span style={toggleTextStyle}>
                  <strong><AdminText i18nKey="settingsAdmin.loginVerificationEnabled" fallback="Require verification code for admin login" /></strong>
                  <span style={mutedTextStyle}>
                    <AdminText
                      i18nKey="settingsAdmin.loginVerificationEnabledHelp"
                      fallback="When enabled, admins must enter the 6-digit code emailed after a valid password. When disabled, a valid password signs in directly."
                    />
                  </span>
                </span>
              </label>

              <div style={actionRowStyle}>
                <button type="submit" style={primaryButtonStyle}>
                  <AdminText i18nKey="settingsAdmin.saveSettings" fallback="Save settings" />
                </button>
              </div>
            </form>
          </AdminSection>

          <AdminSection
            title={<AdminText i18nKey="settingsAdmin.deliveryMinOrderTitle" fallback="Delivery minimum order value" />}
            description={<AdminText i18nKey="settingsAdmin.deliveryMinOrderDescription" fallback="Set a minimum order value required when the customer selects Delivery, Carry-in, Assembly and Installation." />}
          >
            <form action="/api/admin/settings/delivery-min-order" method="post" style={formStyle}>
              <label style={toggleCardStyle}>
                <input
                  name="deliveryMinOrderEnabled"
                  type="checkbox"
                  defaultChecked={deliveryMinOrderSettings.enabled}
                  style={checkboxStyle}
                />
                <span style={toggleTextStyle}>
                  <strong><AdminText i18nKey="settingsAdmin.deliveryMinOrderEnabled" fallback="Enable minimum order value for delivery" /></strong>
                  <span style={mutedTextStyle}>
                    <AdminText
                      i18nKey="settingsAdmin.deliveryMinOrderEnabledHelp"
                      fallback="When enabled, orders that include Delivery, Carry-in, Assembly and Installation must reach the minimum value below."
                    />
                  </span>
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

              <div style={actionRowStyle}>
                <button type="submit" style={primaryButtonStyle}>
                  <AdminText i18nKey="settingsAdmin.saveSettings" fallback="Save settings" />
                </button>
              </div>
            </form>
          </AdminSection>

          <AdminSection
            title={<AdminText i18nKey="settingsAdmin.deliveryLeadTimeTitle" fallback="Delivery lead time" />}
            description={<AdminText i18nKey="settingsAdmin.deliveryLeadTimeDescription" fallback="Set how many weeks after an order the first available delivery week becomes." />}
          >
            <form action="/api/admin/settings/delivery-lead-time" method="post" style={formStyle}>
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
                <p style={mutedHelpStyle}>
                  <AdminText
                    i18nKey="settingsAdmin.deliveryLeadTimeHelp"
                    fallback="Example: 4 means customers can choose delivery after 4, 5, or 6 weeks."
                  />
                </p>
              </div>

              <div style={actionRowStyle}>
                <button type="submit" style={primaryButtonStyle}>
                  <AdminText i18nKey="settingsAdmin.saveSettings" fallback="Save settings" />
                </button>
              </div>
            </form>
          </AdminSection>
        </div>
      </div>
    </AdminShell>
  );
}

const compactWrapStyle = {
  maxWidth: 860,
};

const formStyle = {
  display: "grid",
  gap: 18,
};

const toggleCardStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "var(--app-surface)",
  padding: 18,
  cursor: "pointer",
};

const checkboxStyle = {
  width: 22,
  height: 22,
  marginTop: 2,
  accentColor: "var(--color-primary)",
};

const toggleTextStyle = {
  display: "grid",
  gap: 8,
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
  width: 160,
  padding: "8px 12px",
  fontSize: 15,
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "var(--app-surface)",
  color: "var(--app-text)",
};

const mutedHelpStyle = {
  ...mutedTextStyle,
  margin: "8px 0 0",
};
