"use client";

import { Fragment, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { StatusBadgeLabel } from "./admin-ui";
import de from "../locales/admin.de.json";
import en from "../locales/admin.en.json";
import { formatAdminDate } from "../lib/admin-date-time";

const STORAGE_KEY = "adminLanguage";
const dictionaries = { de, en };
const AdminI18nContext = createContext(null);

function isSupportedLanguage(value) {
  return value === "de" || value === "en";
}

function readSavedLanguage(fallbackLanguage = "en") {
  if (typeof window === "undefined") {
    return fallbackLanguage;
  }

  const savedLanguage = window.localStorage.getItem(STORAGE_KEY);
  if (isSupportedLanguage(savedLanguage)) {
    return savedLanguage;
  }

  const cookieLanguage = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${STORAGE_KEY}=`))
    ?.split("=")[1];

  return isSupportedLanguage(cookieLanguage) ? cookieLanguage : fallbackLanguage;
}

function readPath(source, path) {
  return path.split(".").reduce((value, part) => value?.[part], source);
}

function persistLanguage(language) {
  window.localStorage.setItem(STORAGE_KEY, language);
  document.cookie = `${STORAGE_KEY}=${language}; path=/admin; max-age=31536000; samesite=lax`;
}

export function AdminI18nProvider({ initialLanguage = "en", children }) {
  const safeInitialLanguage = isSupportedLanguage(initialLanguage) ? initialLanguage : "en";
  const [language, setLanguageState] = useState(safeInitialLanguage);

  useEffect(() => {
    const savedLanguage = readSavedLanguage(safeInitialLanguage);
    persistLanguage(savedLanguage);
    if (savedLanguage !== language) {
      setLanguageState(savedLanguage);
    }
  }, [language, safeInitialLanguage]);

  function setLanguage(nextLanguage) {
    const safeLanguage = nextLanguage === "de" ? "de" : "en";
    setLanguageState(safeLanguage);
    persistLanguage(safeLanguage);
  }

  const value = useMemo(() => {
    const dictionary = dictionaries[language] || dictionaries.en;

    return {
      language,
      setLanguage,
      translate(key, fallback = "") {
        return readPath(dictionary, key) || readPath(dictionaries.en, key) || fallback;
      },
    };
  }, [language]);

  return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>;
}

export function useAdminI18n() {
  const value = useContext(AdminI18nContext);
  if (!value) {
    throw new Error("useAdminI18n must be used inside AdminI18nProvider");
  }
  return value;
}

export function useOptionalAdminI18n() {
  return useContext(AdminI18nContext);
}

export function AdminText({ i18nKey, fallback = "", as: Component = Fragment, values }) {
  const { translate } = useAdminI18n();
  let text = translate(i18nKey, fallback);

  if (values) {
    Object.entries(values).forEach(([key, value]) => {
      text = text.replaceAll(`{${key}}`, value);
    });
  }

  return <Component>{text}</Component>;
}

export function AdminTranslation({ i18nKey, fallback = "", values }) {
  const { translate } = useAdminI18n();
  let text = translate(i18nKey, fallback);

  if (values) {
    Object.entries(values).forEach(([key, value]) => {
      text = text.replaceAll(`{${key}}`, value);
    });
  }

  return text;
}

export function AdminPluralText({
  count,
  singularKey,
  pluralKey,
  singularFallback = "",
  pluralFallback = "",
  values,
}) {
  const { translate } = useAdminI18n();
  const numericCount = Number(count || 0);
  const key = numericCount === 1 ? singularKey : pluralKey;
  const fallback = numericCount === 1 ? singularFallback : pluralFallback;
  let text = translate(key, fallback);
  const replacements = { count: numericCount, ...values };

  Object.entries(replacements).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, value);
  });

  return text;
}

export function AdminTranslatedInput({ placeholderKey, placeholderFallback = "", ...props }) {
  const { translate } = useAdminI18n();

  return <input {...props} placeholder={translate(placeholderKey, placeholderFallback)} />;
}

export function AdminTranslatedTextarea({ placeholderKey, placeholderFallback = "", ...props }) {
  const { translate } = useAdminI18n();

  return <textarea {...props} placeholder={translate(placeholderKey, placeholderFallback)} />;
}

export function AdminStatusBadge({ status }) {
  const { translate } = useAdminI18n();
  const statusKey = String(status || "").toLowerCase();
  const label = translate(`status.${statusKey}`, status === "CONFIRMED" ? "Confirmed / emailed" : status);

  return <StatusBadgeLabel status={status} label={label} />;
}

function getLocalizedKitchenDisplayName({ slug, name }, language = "en") {
  const normalizedSlug = String(slug || "").toLowerCase();
  const displayName = String(name || "").trim();
  const normalizedName = displayName.toLowerCase();
  const isArchivedKitchenPlan = normalizedName === "archived kitchen plan";
  const isTwoPartKitchen =
    normalizedSlug === "kitchen-model-c" ||
    ["two-part kitchen", "split kitchen", "zweiteilige küche", "zweiteilige kÃ¼che"].includes(normalizedName);
  const isStandardKitchen =
    normalizedSlug === "kitchen-model-b" ||
    ["standard kitchen", "linear kitchen", "standardküche", "standardkÃ¼che"].includes(normalizedName);

  if (language === "de") {
    if (isArchivedKitchenPlan) return "Küchenplan";
    if (isTwoPartKitchen) return "Zweiteilige Küche";
    if (isStandardKitchen) return "Standardküche";
  } else {
    if (isArchivedKitchenPlan) return "Kitchen plan";
    if (isTwoPartKitchen) return "Two-Part Kitchen";
    if (isStandardKitchen) return "Standard Kitchen";
  }

  if (language === "de") {
    if (normalizedSlug === "kitchen-model-c" || normalizedName === "two-part kitchen" || normalizedName === "split kitchen") {
      return "Zweiteilige Küche";
    }

    if (normalizedSlug === "kitchen-model-b" || normalizedName === "standard kitchen" || normalizedName === "linear kitchen") {
      return "Standardküche";
    }
  }

  if (normalizedSlug === "kitchen-model-c" || displayName === "Zweiteilige Küche") {
    return "Two-Part Kitchen";
  }

  if (normalizedSlug === "kitchen-model-b" || displayName === "Standardküche") {
    return "Standard Kitchen";
  }

  return displayName;
}

export function AdminDateTime({ value, timeZone = "UTC", numeric = false, stacked = false }) {
  const { language } = useAdminI18n();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatted = isMounted ? formatAdminDate(value, language, timeZone, numeric) : "";
  const separator = formatted.lastIndexOf(", ");
  if (stacked && separator >= 0) {
    return <span suppressHydrationWarning style={{ display: "grid", gap: 3, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{formatted.slice(0, separator)}</span>
      <span style={{ justifySelf: "start", padding: "2px 6px", borderRadius: 4, background: "var(--app-surface-muted, #f3f0eb)", color: "var(--app-text)", fontSize: 13, fontWeight: 600, lineHeight: 1.3, fontVariantNumeric: "tabular-nums" }}>{formatted.slice(separator + 2)}</span>
    </span>;
  }
  return <span suppressHydrationWarning>{formatted}</span>;
}

export function AdminCountryName({ code }) {
  const { language } = useAdminI18n();
  const normalizedCode = String(code || "").trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    return <span>{language === "de" ? "Nicht erfasst" : "Not captured"}</span>;
  }

  try {
    const names = new Intl.DisplayNames([language === "de" ? "de" : "en"], { type: "region" });
    return <span>{names.of(normalizedCode) || normalizedCode}</span>;
  } catch {
    return <span>{normalizedCode}</span>;
  }
}

export function AdminKitchenDisplayName({ slug, name }) {
  const { language } = useAdminI18n();

  return getLocalizedKitchenDisplayName({ slug, name }, language);
}

export function AdminLocalizedName({ name, nameDe, as: Component = Fragment }) {
  const { language } = useAdminI18n();
  const englishName = String(name || "").trim();
  const germanName = String(nameDe || "").trim();
  const localizedName = language === "de"
    ? (germanName || englishName)
    : (englishName || germanName);

  return <Component>{localizedName}</Component>;
}

export function AdminKitchenNameInput({ slug, name, style, required = false }) {
  const { language } = useAdminI18n();
  const localizedName = getLocalizedKitchenDisplayName({ slug, name }, language);
  const lastLocalizedNameRef = useRef(localizedName);
  const [value, setValue] = useState(localizedName);

  useEffect(() => {
    if (value === lastLocalizedNameRef.current) {
      setValue(localizedName);
    }
    lastLocalizedNameRef.current = localizedName;
  }, [localizedName, value]);

  return (
    <input
      name="name"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      style={style}
      required={required}
    />
  );
}

function FlagBadge({ country, active = false }) {
  const flagSrcByCountry = {
    de: "https://flagcdn.com/w40/de.png",
    gb: "https://flagcdn.com/w40/gb.png",
  };
  const flagSrc = flagSrcByCountry[country];

  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-block",
        width: 24,
        height: 24,
        borderRadius: "999px",
        overflow: "hidden",
        background: "#fff",
        boxShadow: active ? "none" : "0 4px 8px rgba(48, 34, 21, 0.08)",
      }}
    >
      {flagSrc ? (
        <img
          src={flagSrc}
          alt=""
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
    </span>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="8"
      viewBox="0 0 12 8"
      style={{
        display: "block",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 160ms ease",
      }}
    >
      <path
        d="M1.5 1.5L6 6L10.5 1.5"
        fill="none"
        stroke="#6b4f3a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminLanguageSwitcher() {
  const { language, setLanguage, translate } = useAdminI18n();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const languageOptions = [
    { value: "en", label: translate("adminShellLogin.english", "English"), country: "gb" },
    { value: "de", label: translate("adminShellLogin.german", "Deutsch"), country: "de" },
  ];
  const currentLanguage = languageOptions.find((option) => option.value === language) || languageOptions[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      className="admin-language-switcher"
      style={{
        position: "relative",
        zIndex: isOpen ? 40 : "auto",
        display: "inline-grid",
        gridTemplateColumns: "auto auto",
        alignItems: "center",
        gap: 12,
        minHeight: 48,
        padding: "8px 10px 8px 14px",
        border: "1px solid rgba(177, 145, 116, 0.24)",
        borderRadius: 8,
        background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,244,236,0.94) 100%)",
        boxShadow: "0 14px 30px rgba(84, 59, 40, 0.1)",
        backdropFilter: "blur(10px)",
      }}
    >
      <span
        className="admin-language-switcher__label"
        style={{
          color: "var(--app-text-muted, #6b6259)",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {translate("adminShellLogin.language", "Language")}
      </span>

      <div style={{ position: "relative", display: "inline-flex" }}>
        <button
          className="admin-language-switcher__trigger"
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            minHeight: 40,
            minWidth: 154,
            padding: "8px 12px 8px 10px",
            border: isOpen ? "1px solid rgba(122, 77, 39, 0.38)" : "1px solid rgba(122, 77, 39, 0.24)",
            borderRadius: 999,
            background: "rgba(255,255,255,0.98)",
            color: "#2e271f",
            boxShadow: isOpen
              ? "0 12px 26px rgba(122, 77, 39, 0.12), inset 0 1px 0 rgba(255,255,255,0.98)"
              : "inset 0 1px 0 rgba(255,255,255,0.92)",
            lineHeight: 1.1,
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <FlagBadge country={currentLanguage.country} />
            <span className="admin-language-switcher__current-label">{currentLanguage.label}</span>
          </span>
          <ChevronIcon open={isOpen} />
        </button>

        {isOpen ? (
          <div
            className="admin-language-switcher__menu"
            role="menu"
            aria-label={translate("adminShellLogin.language", "Language")}
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              zIndex: 20,
              display: "grid",
              gap: 8,
              minWidth: 228,
              padding: 12,
              border: "1px solid rgba(177, 145, 116, 0.24)",
              borderRadius: 8,
              background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,243,236,0.97) 100%)",
              boxShadow: "0 22px 42px rgba(84, 59, 40, 0.18)",
              backdropFilter: "blur(12px)",
            }}
          >
            {languageOptions.map((option) => {
              const isActive = option.value === language;

              return (
                <button
                  className="admin-language-switcher__option"
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    setLanguage(option.value);
                    setIsOpen(false);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    minHeight: 42,
                    padding: "8px 12px",
                    border: isActive ? "1px solid rgba(111, 90, 71, 0.24)" : "1px solid transparent",
                    borderRadius: 8,
                    background: isActive ? "linear-gradient(180deg, #8b7968 0%, #756353 100%)" : "transparent",
                    color: isActive ? "#fffdf8" : "#3f342a",
                    font: "inherit",
                    fontSize: 15,
                    fontWeight: isActive ? 800 : 700,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <FlagBadge country={option.country} active={isActive} />
                    <span className="admin-language-switcher__option-label">{option.label}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "999px",
                      background: isActive ? "#fff6ea" : "transparent",
                      boxShadow: isActive ? "0 0 0 3px rgba(255,246,234,0.16)" : "none",
                    }}
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
