export function hasSettingsChanges(elements) {
  return Array.from(elements).some((field) => {
    if (!field.name || field.disabled || field.type === "submit") return false;
    if (field.type === "checkbox" || field.type === "radio") {
      return field.checked !== field.defaultChecked;
    }
    return field.value !== field.defaultValue;
  });
}
