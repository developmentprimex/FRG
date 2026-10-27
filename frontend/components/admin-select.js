"use client";

import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { useOptionalAdminI18n } from "./admin-i18n";

export default function AdminSelect({
  name,
  id,
  value,
  defaultValue = "",
  onChange,
  children,
  placeholder,
  disabled = false,
  required = false,
  style,
  className = "",
  "aria-label": ariaLabel,
  ariaLabelKey,
  ariaLabelValues,
  label,
  ...triggerProps
}) {
  const adminI18n = useOptionalAdminI18n();
  const generatedId = useId();
  const listboxId = `${id || generatedId}-listbox`;
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedValue = String(controlled ? value || "" : internalValue || "");

  const options = useMemo(() => {
    return Children.toArray(children)
      .filter(isValidElement)
      .filter((child) => child.type === "option")
      .map((child, index) => ({
        key: child.key ?? `${child.props.value ?? ""}-${index}`,
        value: String(child.props.value ?? ""),
        label: child.props.children,
        disabled: Boolean(child.props.disabled),
      }));
  }, [children]);

  const selectedOption = options.find((option) => option.value === selectedValue) || null;
  const displayLabel = selectedOption?.label || placeholder || options[0]?.label || "";
  let translatedAriaLabel = adminI18n?.translate(ariaLabelKey || "", ariaLabel || "") || ariaLabel || "";
  Object.entries(ariaLabelValues || {}).forEach(([key, replacement]) => {
    translatedAriaLabel = translatedAriaLabel.replaceAll(`{${key}}`, replacement);
  });

  useEffect(() => {
    if (!controlled) {
      setInternalValue(String(defaultValue || ""));
    }
  }, [controlled, defaultValue]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = options.findIndex((option) => option.value === selectedValue && !option.disabled);
    const firstEnabledIndex = options.findIndex((option) => !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : Math.max(firstEnabledIndex, 0));
  }, [open, options, selectedValue]);

  function emitChange(nextValue) {
    if (!controlled) {
      setInternalValue(nextValue);
    }

    onChange?.({
      target: { name, value: nextValue },
      currentTarget: { name, value: nextValue },
    });
  }

  function chooseOption(option) {
    if (!option || option.disabled) return;
    emitChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function moveActive(direction) {
    if (!options.length) return;
    let nextIndex = activeIndex;

    for (let step = 0; step < options.length; step += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex]?.disabled) {
        setActiveIndex(nextIndex);
        break;
      }
    }
  }

  function handleKeyDown(event) {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveActive(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveActive(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstEnabledIndex = options.findIndex((option) => !option.disabled);
      if (firstEnabledIndex >= 0) setActiveIndex(firstEnabledIndex);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastEnabledIndex = options.map((option) => !option.disabled).lastIndexOf(true);
      if (lastEnabledIndex >= 0) setActiveIndex(lastEnabledIndex);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        chooseOption(options[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <span className={`admin-select ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`} ref={menuRef}>
      <input type="hidden" name={name} value={selectedValue} disabled={disabled} required={required} />
      <button
        {...triggerProps}
        ref={buttonRef}
        id={id}
        type="button"
        className="admin-select__trigger"
        style={style}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={translatedAriaLabel || (typeof label === "string" ? label : undefined)}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className={`admin-select__value${selectedValue ? "" : " is-placeholder"}`}>{displayLabel}</span>
        <span className="admin-select__chevron" aria-hidden="true" />
      </button>
      {open ? (
        <span className="admin-select__menu" id={listboxId} role="listbox" aria-label={translatedAriaLabel || (typeof label === "string" ? label : undefined)}>
          {options.map((option, index) => {
            const selected = option.value === selectedValue;
            const active = index === activeIndex;

            return (
              <button
                type="button"
                key={option.key}
                className={`admin-select__option${selected ? " is-selected" : ""}${active ? " is-active" : ""}`}
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseOption(option)}
              >
                <span className="admin-select__option-label">{option.label}</span>
                <span className="admin-select__check" aria-hidden="true">{selected ? "✓" : ""}</span>
              </button>
            );
          })}
        </span>
      ) : null}
    </span>
  );
}
