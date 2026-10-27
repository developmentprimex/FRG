"use client";

import { useMemo, useState } from "react";
import { AdminText, useAdminI18n } from "./admin-i18n";

export function AdminIconKeySelect({
  name = "iconKey",
  defaultValue = "",
  iconKeys = [],
  iconMarkupByKey = {},
  selectStyle = {},
}) {
  const { translate } = useAdminI18n();
  const [value, setValue] = useState(String(defaultValue || "").trim());
  const options = useMemo(() => {
    const currentValue = String(defaultValue || "").trim();
    return currentValue && !iconKeys.includes(currentValue)
      ? [currentValue, ...iconKeys]
      : iconKeys;
  }, [defaultValue, iconKeys]);
  const iconMarkup = value ? iconMarkupByKey[value] || "" : "";

  return (
    <div style={wrapStyle}>
      <select
        name={name}
        defaultValue={String(defaultValue || "").trim()}
        onChange={(event) => setValue(event.target.value)}
        style={selectStyle}
      >
        <option value=""><AdminText i18nKey="kitchenEditorAdmin.noIcon" fallback="No icon" /></option>
        {options.map((iconKey) => (
          <option key={iconKey} value={iconKey}>
            {iconKey}
          </option>
        ))}
      </select>
      <span
        style={previewStyle}
        aria-label={value
          ? translate("kitchenEditorAdmin.iconPreview", "{value} icon preview").replace("{value}", value)
          : translate("kitchenEditorAdmin.noIconSelected", "No icon selected")}
      >
        {iconMarkup ? (
          <span style={iconStyle} dangerouslySetInnerHTML={{ __html: normalizeIconMarkup(iconMarkup) }} />
        ) : (
          <span style={emptyIconStyle}>{value ? "?" : "-"}</span>
        )}
      </span>
    </div>
  );
}

function normalizeIconMarkup(markup) {
  return String(markup || "")
    .replace(/<img\b([^>]*)>/i, (match, attrs) => {
      if (/style=/i.test(attrs)) {
        return `<img${attrs.replace(/style=(["'])(.*?)\1/i, (styleMatch, quote, value) => ` style=${quote}${value};max-width:100%;max-height:100%;display:block;object-fit:contain${quote}`)}>`;
      }

      return `<img${attrs} style="max-width:100%;max-height:100%;display:block;object-fit:contain">`;
    })
    .replace(/<svg\b([^>]*)>/i, (match, attrs) => {
      if (/style=/i.test(attrs)) {
        return `<svg${attrs.replace(/style=(["'])(.*?)\1/i, (styleMatch, quote, value) => ` style=${quote}${value};width:100%;height:100%;display:block${quote}`)}>`;
      }

      return `<svg${attrs} style="width:100%;height:100%;display:block">`;
    });
}

const wrapStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 44px",
  gap: 8,
  alignItems: "center",
};

const previewStyle = {
  width: 44,
  height: 44,
  border: "1px solid var(--app-border-strong)",
  borderRadius: 12,
  background: "var(--color-card)",
  color: "var(--app-accent)",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
};

const iconStyle = {
  width: 28,
  height: 28,
  display: "grid",
  placeItems: "center",
};

const emptyIconStyle = {
  color: "var(--app-text-muted)",
  fontWeight: 900,
  fontSize: 14,
};
