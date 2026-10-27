"use client";

import { useState } from "react";
import { useAdminI18n } from "./admin-i18n";

export default function AdminFileInput({
  style,
  chooseFileKey = "catalogImportsAdmin.chooseFile",
  noFileChosenKey = "catalogImportsAdmin.noFileChosen",
  ...props
}) {
  const { translate } = useAdminI18n();
  const [fileName, setFileName] = useState("");

  return (
    <label style={{ ...fileInputStyle, ...style }}>
      <span style={chooseButtonStyle}>
        {translate(chooseFileKey, "Choose file")}
      </span>
      <span style={fileNameStyle}>
        {fileName || translate(noFileChosenKey, "No file chosen")}
      </span>
      <input
        {...props}
        type="file"
        aria-label={translate(chooseFileKey, "Choose file")}
        onChange={(event) => setFileName(event.target.files?.[0]?.name || "")}
        style={nativeInputStyle}
      />
    </label>
  );
}

const fileInputStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  minWidth: 0,
  overflow: "hidden",
  cursor: "pointer",
};

const chooseButtonStyle = {
  flex: "0 0 auto",
  padding: "7px 10px",
  border: "1px solid var(--app-border)",
  borderRadius: 6,
  background: "var(--app-surface)",
  color: "var(--app-text)",
  fontSize: 13,
  fontWeight: 800,
};

const fileNameStyle = {
  minWidth: 0,
  padding: "0 10px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "var(--app-text-muted)",
  fontSize: 13,
};

const nativeInputStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "pointer",
};
