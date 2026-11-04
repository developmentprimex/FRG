import { ADMIN_PERMISSIONS, hasPermission } from "../lib/admin-permissions";
import { AdminText } from "./admin-i18n";

const labels = { FRG: "FRG access — view and manage", ASC: "ASC access — view and manage" };
export function AdminPermissionFields({ permissions = [], disabled = false, compact = false, form }) {
  return (
    <fieldset disabled={disabled} style={fieldsetStyle}>
      <legend style={compact ? { ...legendStyle, position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" } : legendStyle}>
        <AdminText i18nKey="permissions.title" fallback="Workspace permissions" />
      </legend>
      <div style={{ display: compact ? "flex" : "grid", gap: compact ? 8 : 10, flexWrap: "wrap" }}>
        {ADMIN_PERMISSIONS.map((permission) => (
          <label key={permission} style={{ ...optionStyle, ...(compact ? { minHeight: 32, padding: "6px 8px", borderRadius: 8, gap: 8 } : {}), cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.65 : 1 }}>
            <input
              type="checkbox"
              name="permissions"
              form={form}
              value={permission}
              defaultChecked={hasPermission({ permissions }, permission)}
              style={{ width: 18, height: 18, margin: 0, flexShrink: 0, accentColor: "var(--app-accent)", cursor: "inherit" }}
            />
            <span style={{ lineHeight: 1.5, fontSize: 13, fontWeight: 500 }}>
              {compact ? permission : <AdminText i18nKey={`permissions.${permission}`} fallback={labels[permission]} />}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const fieldsetStyle = {
  gridColumn: "1 / -1",
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
  margin: 0,
  padding: 0,
  border: 0,
};

const legendStyle = {
  padding: 0,
  marginBottom: 10,
  fontSize: 14,
  fontWeight: 700,
  color: "var(--app-text)",
};

const optionStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minHeight: 48,
  padding: "12px 14px",
  border: "1px solid var(--app-border-strong)",
  borderRadius: 12,
  background: "var(--app-surface-muted)",
  color: "var(--app-text)",
};
