"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { AdminText, useAdminI18n } from "./admin-i18n";

export function AdminBusinessReportPeriods({ periods, activePeriod }) {
  const router = useRouter();
  const { translate } = useAdminI18n();
  const [pending, startTransition] = useTransition();
  const [selectedPeriod, selectPeriod] = useOptimistic(activePeriod);

  function navigate(event, period, href) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (pending || period === activePeriod) return;
    startTransition(() => {
      selectPeriod(period);
      router.push(href, { scroll: false });
    });
  }

  return <nav aria-label={translate("businessReports.periodSelection", "Report period")} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
    {periods.map(({ period, href }) => {
      const selected = selectedPeriod === period;
      return <Link key={period} href={href} prefetch={false}
        aria-current={selected ? "true" : undefined}
        aria-disabled={pending || selected ? "true" : undefined}
        aria-busy={pending && selected ? "true" : undefined}
        onMouseEnter={() => router.prefetch(href)}
        onFocus={() => router.prefetch(href)}
        onClick={event => navigate(event, period, href)}
        style={{ ...periodStyle, ...(selected ? selectedStyle : {}), cursor: pending ? "wait" : selected ? "default" : "pointer" }}>
        <AdminText i18nKey={`businessReports.${period}`} fallback={period.replaceAll("_", " ")} />
        {selected && <span aria-hidden="true">{pending ? "…" : "✓"}</span>}
      </Link>;
    })}
    <span role="status" aria-live="polite" style={{ fontSize: 12, color: "var(--app-text-muted)" }}>
      {pending && <AdminText i18nKey="businessReports.updating" fallback="Updating report…" />}
    </span>
  </nav>;
}

const periodStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", minHeight: 34, padding: "6px 10px", borderRadius: 6, borderWidth: 1, borderStyle: "solid", borderColor: "var(--app-border)", color: "var(--app-accent)", background: "var(--app-surface)", fontSize: 13 };
const selectedStyle = { background: "var(--color-primary)", color: "var(--app-accent-contrast)", borderColor: "var(--color-primary)", fontWeight: 700 };
