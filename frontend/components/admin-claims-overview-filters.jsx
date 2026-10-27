"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminI18n } from "./admin-i18n";

const periods = [
  ["7d", "dashboard.last7Days", "Last 7 days"],
  ["30d", "dashboard.last30Days", "Last 30 days"],
  ["90d", "dashboard.last90Days", "Last 90 days"],
  ["all", "dashboard.allTime", "All time"],
];

export function AdminClaimsOverviewFilters({ selectedPeriod, selectedKitchenId, dateFrom, dateTo, kitchens }) {
  const { translate } = useAdminI18n();
  const router = useRouter();
  const claimsHref = `/admin/claims?${new URLSearchParams({ ...(dateFrom ? { dateFrom } : {}), dateTo, ...(selectedKitchenId ? { kitchenId: selectedKitchenId } : {}) }).toString()}`;
  function change(name, value) {
    const query = new URLSearchParams({ period: name === "period" ? value : selectedPeriod, kitchenId: name === "kitchenId" ? value : selectedKitchenId });
    router.push(`/admin/claims-overview?${query.toString()}`);
  }
  return <div className="claims-overview-filters">
    <label>{translate("dashboard.dateRange", "Date range")}
      <select value={selectedPeriod} onChange={(event) => change("period", event.target.value)}>
        {periods.map(([value, key, fallback]) => <option key={value} value={value}>{translate(key, fallback)}</option>)}
      </select>
    </label>
    <label>{translate("dashboard.kitchen", "Kitchen")}
      <select value={selectedKitchenId} onChange={(event) => change("kitchenId", event.target.value)}>
        <option value="">{translate("dashboard.allKitchens", "All kitchens")}</option>
        {kitchens.map((kitchen) => <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>)}
      </select>
    </label>
    <Link href="/admin/claims-overview">{translate("dashboard.clearFilters", "Clear filters")}</Link>
    <Link className="claims-list-link" href={claimsHref}>{translate("claimOverview.viewClaims", "View selected claims")}</Link>
    <style jsx>{`
      .claims-overview-filters { display: flex; align-items: flex-end; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
      label { display: grid; gap: 6px; color: var(--app-text-muted); font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
      select { min-height: 42px; min-width: 150px; border: 1px solid var(--app-border-strong); border-radius: 8px; padding: 9px 12px; background: var(--color-primary); color: var(--app-accent-contrast); font: inherit; font-size: 13px; font-weight: 700; letter-spacing: 0; text-transform: none; cursor: pointer; }
      .claims-overview-filters :global(a) { min-height: 42px; display: inline-flex; align-items: center; border: 1px solid var(--app-border); border-radius: 8px; padding: 9px 14px; background: var(--app-surface); color: var(--app-text); text-decoration: none; font-size: 13px; font-weight: 700; }
      .claims-overview-filters :global(a.claims-list-link) { background: var(--color-primary); border-color: var(--color-primary); color: var(--app-accent-contrast); }
      @media (max-width: 700px) { .claims-overview-filters { justify-content: flex-start; }.claims-overview-filters label { flex: 1; min-width: 140px; }.claims-overview-filters select { width: 100%; min-width: 0; } }
    `}</style>
  </div>;
}
