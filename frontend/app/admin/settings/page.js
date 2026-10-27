import { AdminText } from "../../../components/admin-i18n";
import { AdminShell } from "../../../components/admin-shell";
import {
  AdminSection,
  FlashMessage,
  inputStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
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

function SettingsRow({ number, title, description, formId, action, children }) {
  return (
    <tr>
      <td style={rowNumberStyle}>{number}</td>
      <th scope="row" id={`${formId}-title`} style={settingCellStyle}>
        <div style={settingTitleStyle}>{title}</div>
        <p style={settingDescriptionStyle}>{description}</p>
      </th>
      <td style={settingsTdStyle}>
        <form id={formId} action={action} method="post" aria-labelledby={`${formId}-title`} style={formStyle}>
          {children}
        </form>
      </td>
      <td style={{ ...settingsTdStyle, textAlign: "right" }}>
        <button type="submit" form={formId} style={saveButtonStyle}>
          <AdminText i18nKey="settingsAdmin.saveSettings" fallback="Save settings" />
        </button>
      </td>
    </tr>
  );
}

function SettingToggle({ name, checked, titleId }) {
  return (
    <label style={toggleStyle}>
      <input name={name} type="checkbox" defaultChecked={checked} aria-labelledby={titleId} style={checkboxStyle} />
      <AdminText i18nKey="settingsAdmin.enabled" fallback="Enabled" />
    </label>
  );
}

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

        <AdminSection title={<AdminText i18nKey="settingsAdmin.settings" fallback="Settings" />}>
          <div className="admin-settings-table" style={{ ...tableWrapStyle, borderRadius: 4 }}>
            <table style={{ ...tableStyle, tableLayout: "auto", minWidth: 900 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ ...settingsThStyle, width: 48, textAlign: "center" }}><AdminText i18nKey="reportsAdmin.rowNumber" fallback="No." /></th>
                  <th scope="col" style={settingsThStyle}><AdminText i18nKey="settingsAdmin.setting" fallback="Setting" /></th>
                  <th scope="col" style={{ ...settingsThStyle, width: 280 }}><AdminText i18nKey="settingsAdmin.value" fallback="Value" /></th>
                  <th scope="col" style={{ ...settingsThStyle, width: 180, textAlign: "right" }}><AdminText i18nKey="settingsAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                <SettingsRow
                  number={1}
                  formId="order-confirmation-settings"
                  action="/api/admin/settings/order-confirmation"
                  title={<AdminText i18nKey="settingsAdmin.directOrderConfirmation" fallback="Send order confirmations automatically" />}
                  description={<AdminText i18nKey="settingsAdmin.directOrderConfirmationHelp" fallback="When enabled, the customer confirmation email is sent immediately after public checkout and the order is marked confirmed after the email succeeds. The agent webhook still runs." />}
                >
                  <SettingToggle name="directOrderConfirmationEnabled" checked={directOrderConfirmationEnabled} titleId="order-confirmation-settings-title" />
                </SettingsRow>
                <SettingsRow
                  number={2}
                  formId="login-verification-settings"
                  action="/api/admin/settings/login-verification"
                  title={<AdminText i18nKey="settingsAdmin.loginVerificationEnabled" fallback="Require verification code for admin login" />}
                  description={<AdminText i18nKey="settingsAdmin.loginVerificationEnabledHelp" fallback="When enabled, admins must enter the 6-digit code emailed after a valid password. When disabled, a valid password signs in directly." />}
                >
                  <SettingToggle name="adminLoginVerificationEnabled" checked={loginVerificationEnabled} titleId="login-verification-settings-title" />
                </SettingsRow>
                <SettingsRow
                  number={3}
                  formId="delivery-min-order-settings"
                  action="/api/admin/settings/delivery-min-order"
                  title={<AdminText i18nKey="settingsAdmin.deliveryMinOrderTitle" fallback="Delivery minimum order value" />}
                  description={<AdminText i18nKey="settingsAdmin.deliveryMinOrderEnabledHelp" fallback="When enabled, orders that include Delivery, Carry-in, Assembly and Installation must reach the minimum value below." />}
                >
                  <SettingToggle name="deliveryMinOrderEnabled" checked={deliveryMinOrderSettings.enabled} titleId="delivery-min-order-settings-title" />
                  <label style={amountLabelStyle}>
                    <span><AdminText i18nKey="settingsAdmin.deliveryMinOrderAmount" fallback="Minimum order value (€)" /></span>
                    <input name="deliveryMinOrderAmount" type="number" min="0" step="1" defaultValue={deliveryMinOrderSettings.amount} style={amountInputStyle} />
                  </label>
                </SettingsRow>
                <SettingsRow
                  number={4}
                  formId="delivery-lead-time-settings"
                  action="/api/admin/settings/delivery-lead-time"
                  title={<AdminText i18nKey="settingsAdmin.deliveryLeadTimeTitle" fallback="Delivery lead time" />}
                  description={(
                    <>
                      <AdminText i18nKey="settingsAdmin.deliveryLeadTimeDescription" fallback="Set how many weeks after an order the first available delivery week becomes." />
                      <span style={{ display: "block", marginTop: 4 }}><AdminText i18nKey="settingsAdmin.deliveryLeadTimeHelp" fallback="Example: 4 means customers can choose delivery after 4, 5, or 6 weeks." /></span>
                    </>
                  )}
                >
                  <label style={amountLabelStyle}>
                    <span><AdminText i18nKey="settingsAdmin.deliveryLeadTimeWeeks" fallback="Minimum weeks after order" /></span>
                    <input name="deliveryLeadTimeWeeks" type="number" min={DELIVERY_LEAD_TIME_MIN_WEEKS} step="1" defaultValue={deliveryLeadTimeWeeks} style={amountInputStyle} />
                  </label>
                </SettingsRow>
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const settingsThStyle = { ...thStyle, padding: "16px 20px", whiteSpace: "nowrap" };
const settingsTdStyle = { ...tdStyle, padding: "20px 16px", verticalAlign: "middle" };
const rowNumberStyle = { ...settingsTdStyle, textAlign: "center", color: "var(--app-text-muted)", fontSize: "var(--admin-text-label)", fontWeight: 500 };
const settingCellStyle = { ...settingsTdStyle, textAlign: "left", minWidth: 300, fontWeight: 400 };
const settingTitleStyle = { fontSize: "var(--admin-text-body)", fontWeight: 600 };
const settingDescriptionStyle = { ...mutedTextStyle, marginTop: 6, maxWidth: 680, fontSize: "var(--admin-text-meta)" };
const formStyle = { display: "grid", gap: 12 };
const toggleStyle = { display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "var(--admin-text-body)", fontWeight: 500 };
const checkboxStyle = { width: 18, height: 18, margin: 0, flexShrink: 0, accentColor: "var(--color-primary)" };
const amountLabelStyle = { display: "grid", gap: 6, fontSize: "var(--admin-text-meta)", color: "var(--app-text-muted)" };
const amountInputStyle = { ...inputStyle, width: 160, minHeight: 42, padding: "9px 11px", borderRadius: 8, boxShadow: "none" };
const saveButtonStyle = { ...primaryButtonStyle, minHeight: 42, padding: "9px 14px", borderRadius: 8, fontSize: "var(--admin-text-body)", fontWeight: 600, whiteSpace: "nowrap", boxShadow: "none" };
