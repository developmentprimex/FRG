"use client";

import { Children, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  menuPortal = false,
  style,
  wrapperStyle,
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
  const portalMenuRef = useRef(null);
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState(null);
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
      if (!menuRef.current?.contains(event.target) && !portalMenuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !menuPortal) return;

    function updatePosition() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const width = Math.min(Math.max(rect.width, 180), viewportWidth - 24);
      const spaceBelow = viewportHeight - rect.bottom - 20;
      const spaceAbove = rect.top - 20;
      const openAbove = spaceBelow < Math.min(options.length * 40 + 14, 200) && spaceAbove > spaceBelow;
      const computedStyle = window.getComputedStyle(button);

      setMenuPosition({
        position: "fixed",
        left: Math.max(12, Math.min(rect.left, viewportWidth - width - 12)),
        top: openAbove ? "auto" : rect.bottom + 8,
        bottom: openAbove ? viewportHeight - rect.top + 8 : "auto",
        width,
        maxHeight: Math.max(40, Math.min(320, openAbove ? spaceAbove : spaceBelow)),
        boxSizing: "border-box",
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
        lineHeight: computedStyle.lineHeight,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, menuPortal, options.length]);

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

    if (event.key === "Tab") setOpen(false);
  }

  const menu = (
    <span ref={portalMenuRef} style={menuPortal ? menuPosition : undefined} onKeyDown={handleKeyDown} className="admin-select__menu" id={listboxId} role="listbox" aria-label={translatedAriaLabel || (typeof label === "string" ? label : undefined)}>
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
            tabIndex={-1}
            onFocus={() => setActiveIndex(index)}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => chooseOption(option)}
          >
            <span className="admin-select__option-label">{option.label}</span>
            <span className="admin-select__check" aria-hidden="true">{selected ? "✓" : ""}</span>
          </button>
        );
      })}
    </span>
  );

  return (
    <span className={`admin-select ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`} ref={menuRef} style={wrapperStyle}>
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
      {open ? (menuPortal ? (menuPosition ? createPortal(menu, document.body) : null) : menu) : null}
    </span>
  );
}
