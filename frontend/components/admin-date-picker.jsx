"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAdminI18n } from "./admin-i18n";
import { calendarDate, calendarDays, calendarKey, calendarValueAllowed, normalizeCalendarValue, shiftCalendarMonth } from "../lib/report-calendar.js";
import styles from "./admin-date-picker.module.css";

export function AdminDatePicker({ name, defaultValue = "", max = "", min = "", type = "date", required = false, labelKey, label, style }) {
  const { language, translate } = useAdminI18n();
  const locale = language === "de" ? "de-DE" : "en-GB";
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
  const t = (key, fallback) => translate(`reportCalendar.${key}`, fallback);
  const id = useId();
  const trigger = useRef(null);
  const popup = useRef(null);
  const initialValue = normalizeCalendarValue(defaultValue, type);
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((initialValue || normalizeCalendarValue(max, type) || today).slice(0, 7));
  const [view, setView] = useState(type === "month" ? "months" : "days");
  const [position, setPosition] = useState({ left: 0, top: 0, visibility: "hidden" });
  const fieldLabel = translate(labelKey, label);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(calendarDate(month));
  const display = value ? new Intl.DateTimeFormat(locale, type === "month"
    ? { month: "long", year: "numeric", timeZone: "UTC" }
    : { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(calendarDate(value)) : t("selectDate", "Select date");
  const allowed = key => calendarValueAllowed(key, min, max);
  const enabledMonth = key => (!min || `${key}-31` >= min) && (!max || key <= max.slice(0, 7));

  useEffect(() => {
    setValue(initialValue);
    setOpen(false);
  }, [initialValue]);

  useEffect(() => {
    const form = trigger.current?.form;
    function reset() { setValue(initialValue); setOpen(false); }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initialValue]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function choose(next) {
    if (next && !allowed(next)) return;
    setValue(next);
    close();
  }
  function toggle() {
    if (open) return close();
    setMonth((value || max || today).slice(0, 7));
    setView(type === "month" ? "months" : "days");
    setPosition(current => ({ ...current, visibility: "hidden" }));
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current.getBoundingClientRect();
      const height = popup.current.offsetHeight;
      const width = popup.current.offsetWidth;
      const below = window.innerHeight - rect.bottom;
      const top = below >= height + 8 || below >= rect.top ? rect.bottom + 8 : rect.top - height - 8;
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: Math.max(8, Math.min(top, window.innerHeight - height - 8)), visibility: "visible" });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, view]);

  useEffect(() => {
    // Position the portal before moving focus; hidden elements cannot receive it.
    if (!open || position.visibility !== "visible") return;
    (popup.current.querySelector('[data-calendar-value][aria-pressed="true"]:not(:disabled)')
      || popup.current.querySelector("[data-calendar-value]:not(:disabled)") || popup.current).focus();
    function outside(event) {
      if (!popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, view, position.visibility]);

  function keyboard(event) {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    const buttons = [...popup.current.querySelectorAll("button:not(:disabled)")];
    if (event.key === "Tab") {
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
      return;
    }
    const key = event.target.dataset.calendarValue;
    if (!key) return;
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: view === "days" ? -7 : -3, ArrowDown: view === "days" ? 7 : 3 };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    let next;
    if (view === "months") next = shiftCalendarMonth(key, offsets[event.key]);
    else {
      const date = calendarDate(key);
      date.setUTCDate(date.getUTCDate() + offsets[event.key]);
      next = calendarKey(date);
    }
    if (view === "months" ? !enabledMonth(next) : !allowed(next)) return;
    setMonth(view === "days" ? next.slice(0, 7) : `${next.slice(0, 4)}-01`);
    requestAnimationFrame(() => popup.current?.querySelector(`[data-calendar-value="${next}"]`)?.focus());
  }

  const step = view === "months" ? 12 : 1;
  return <>
    <input type="hidden" name={name} value={value} />
    <button ref={trigger} type="button" className={styles.trigger} style={style} onClick={toggle}
      aria-label={`${fieldLabel}: ${display}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}>
      <span className={value ? "" : styles.placeholder}>{display}</span>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18" />
      </svg>
    </button>
    {open && createPortal(<div ref={popup} id={id} role="dialog" aria-modal="true" aria-label={fieldLabel} tabIndex={-1}
      className={styles.popup} style={position} onKeyDown={keyboard}>
      <div className={styles.caption}>{fieldLabel}</div>
      <div className={styles.header}>
        <button type="button" className={styles.nav} aria-label={view === "months" ? t("previousYear", "Previous year") : t("previousMonth", "Previous month")}
          disabled={!!min && (view === "months" ? shiftCalendarMonth(month, -12).slice(0, 4) < min.slice(0, 4) : !enabledMonth(shiftCalendarMonth(month, -1)))}
          onClick={() => setMonth(shiftCalendarMonth(month, -step))}>
          <Chevron />
        </button>
        <button type="button" className={styles.heading} onClick={() => type !== "month" && setView(view === "days" ? "months" : "days")}
          aria-label={view === "days" ? t("chooseMonth", "Choose month") : month.slice(0, 4)}>
          {view === "months" ? month.slice(0, 4) : monthLabel}
          {view === "days" && <span aria-hidden="true" className={styles.caret}>⌄</span>}
        </button>
        <button type="button" className={styles.nav} aria-label={view === "months" ? t("nextYear", "Next year") : t("nextMonth", "Next month")}
          disabled={!!max && (view === "months" ? shiftCalendarMonth(month, 12).slice(0, 4) > max.slice(0, 4) : !enabledMonth(shiftCalendarMonth(month, 1)))}
          onClick={() => setMonth(shiftCalendarMonth(month, step))}>
          <Chevron next />
        </button>
      </div>
      {view === "days" ? <>
        <div className={styles.weekdays} aria-hidden="true">{Array.from({ length: 7 }, (_, index) =>
          <span key={index}>{new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(calendarDate(`2026-06-${String(index + 1).padStart(2, "0")}`))}</span>)}</div>
        <div className={styles.days}>{calendarDays(month).map(day => <button key={day} type="button" data-calendar-value={day}
          className={`${styles.day} ${day.slice(0, 7) !== month ? styles.outside : ""}`} disabled={!allowed(day)}
          aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(calendarDate(day))}
          aria-pressed={day === value} aria-current={day === today ? "date" : undefined} onClick={() => choose(day)}>
          {Number(day.slice(-2))}
        </button>)}</div>
      </> : <div className={styles.months}>{Array.from({ length: 12 }, (_, index) => {
        const key = `${month.slice(0, 4)}-${String(index + 1).padStart(2, "0")}`;
        return <button key={key} type="button" className={styles.month} data-calendar-value={key} disabled={!enabledMonth(key)}
          aria-pressed={key === value.slice(0, 7)} aria-current={key === today.slice(0, 7) ? "date" : undefined}
          onClick={() => { if (type === "month") choose(key); else { setMonth(key); setView("days"); } }}>
          {new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(calendarDate(key))}
        </button>;
      })}</div>}
      <div className={styles.footer}>
        {!required && <button type="button" className={styles.action} onClick={() => choose("")}>{t("clear", "Clear")}</button>}
        <button type="button" className={styles.action} disabled={!allowed(type === "month" ? today.slice(0, 7) : today)}
          onClick={() => choose(type === "month" ? today.slice(0, 7) : today)}>{type === "month" ? t("thisMonth", "This month") : t("today", "Today")}</button>
      </div>
    </div>, document.body)}
  </>;
}

function Chevron({ next = false }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" style={next ? { transform: "rotate(180deg)" } : undefined}><path d="m14 6-6 6 6 6" /></svg>;
}
