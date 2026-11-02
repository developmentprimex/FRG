"use client";

import { createContext, useContext, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminI18n } from "./admin-i18n";
import { buildAdminFilterHref, createFilterScheduler } from "../lib/admin-filter-navigation";

const FilterContext = createContext(null);
export const useAdminFilterChange = () => useContext(FilterContext);

export default function AdminFilterForm({ action, children, style, ...props }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { translate } = useAdminI18n();
  const form = useRef(null);
  const composing = useRef(false);
  const overrides = useRef(new Map());
  const run = useRef(null);
  const [pending, startTransition] = useTransition();
  const scheduler = useRef(null);
  if (!scheduler.current) scheduler.current = createFilterScheduler(() => run.current());

  function navigate() {
    scheduler.current.cancel();
    if (composing.current || !form.current?.reportValidity()) return;
    const data = new FormData(form.current);
    overrides.current.forEach((value, name) => data.set(name, value));
    const href = buildAdminFilterHref(action || pathname, data);
    const current = pathname + (searchParams.size ? `?${searchParams}` : "");
    if (href === current) return;
    startTransition(() => router.replace(href, { scroll: false }));
  }
  run.current = navigate;

  function customChange(name, value) {
    if (!name) return;
    overrides.current.set(name, value);
    scheduler.current.schedule(true);
  }

  useEffect(() => {
    function cancelForLink(event) {
      if (event.target.closest?.("a")) scheduler.current.cancel();
    }
    document.addEventListener("click", cancelForLink, true);
    return () => {
      scheduler.current.cancel();
      document.removeEventListener("click", cancelForLink, true);
    };
  }, []);
  const query = searchParams.toString();
  useEffect(() => {
    // Keep edited text while a newer search is waiting. Otherwise synchronize
    // uncontrolled text fields after Clear, presets, or browser navigation.
    if (scheduler.current.waiting || composing.current || pending) return;
    overrides.current.clear();
    form.current?.querySelectorAll('input:not([type="hidden"]), textarea').forEach(input => {
      if (!["checkbox", "radio", "submit"].includes(input.type)) input.value = input.defaultValue;
    });
  }, [query, pending]);

  return <FilterContext.Provider value={customChange}>
    <form {...props} ref={form} action={action} method="get" aria-busy={pending}
      style={{ ...style, position: "relative", minWidth: 0 }}
      onSubmit={event => { event.preventDefault(); navigate(); }}
      onChange={event => {
        const input = event.target;
        if (!input.name || composing.current || event.nativeEvent.isComposing) return;
        overrides.current.delete(input.name);
        scheduler.current.schedule(["select-one", "select-multiple", "checkbox", "radio", "date", "month"].includes(input.type));
      }}
      onCompositionStart={() => { composing.current = true; scheduler.current.cancel(); }}
      onCompositionEnd={() => { composing.current = false; scheduler.current.schedule(); }}
      onKeyDown={event => {
        if (event.key === "Enter" && event.target.tagName === "INPUT" && !composing.current && !event.nativeEvent.isComposing) {
          event.preventDefault(); navigate();
        }
      }}
      onClickCapture={event => {
        if (event.target.closest("a")) {
          scheduler.current.cancel();
          overrides.current.clear();
          form.current.reset();
        }
      }}>
      {children}
      <span role="status" aria-live="polite" style={{ position: "absolute", top: 0, left: 0, right: 0, height: pending ? 2 : 0, overflow: "hidden", background: "var(--app-accent)", borderRadius: 8, fontSize: 0 }}>
        {pending ? translate("adminShellLogin.loading", "Loading") : ""}
      </span>
    </form>
  </FilterContext.Provider>;
}
