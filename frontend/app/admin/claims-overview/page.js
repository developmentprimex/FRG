import { AdminShell } from "../../../components/admin-shell";
import { AdminClaimsOverview } from "../../../components/admin-claims-overview";
import { AdminClaimsOverviewFilters } from "../../../components/admin-claims-overview-filters";
import { requireAdminClaimsPage } from "../../../lib/admin-claims-access";
import { listKitchensForAdmin } from "../../../lib/catalog";
import { buildClaimAnalytics } from "../../../lib/claim-analytics";
import { loadClaimAnalyticsRows } from "../../../lib/claim-analytics-query";
import { prisma } from "../../../lib/prisma";
import { workDateKey, workDayStart } from "../../../lib/work-processing-rules";

export const dynamic = "force-dynamic";

const periods = { "7d": 7, "30d": 30, "90d": 90, all: null };

function param(value) {
  return String(Array.isArray(value) ? value[0] || "" : value || "");
}

export default async function ClaimsOverviewPage({ searchParams = {} }) {
  const admin = await requireAdminClaimsPage();
  const params = await searchParams;
  const requestedPeriod = param(params.period);
  const selectedPeriod = Object.hasOwn(periods, requestedPeriod) ? requestedPeriod : "30d";
  const kitchens = await listKitchensForAdmin();
  const requestedKitchenId = param(params.kitchenId);
  const kitchenId = kitchens.some((kitchen) => kitchen.id === requestedKitchenId) ? requestedKitchenId : "";
  const now = new Date();
  const dateTo = workDateKey(now);
  const startKey = periods[selectedPeriod] == null ? null : new Date(Date.parse(`${dateTo}T12:00:00Z`) - (periods[selectedPeriod] - 1) * 86400000).toISOString().slice(0, 10);
  const startDate = startKey ? workDayStart(startKey) : null;
  const { claims, history } = await loadClaimAnalyticsRows(prisma, { startDate, kitchenId });
  const analytics = buildClaimAnalytics(claims, { history, now, startDate, kitchenId });

  return <AdminShell adminEmail={admin.email}>
    <AdminClaimsOverview
      analytics={analytics}
      dateFrom={startKey}
      dateTo={dateTo}
      kitchenId={kitchenId}
      filters={<AdminClaimsOverviewFilters selectedPeriod={selectedPeriod} selectedKitchenId={kitchenId} dateFrom={startKey} dateTo={dateTo} kitchens={kitchens.map(({ id, name }) => ({ id, name }))} />}
    />
  </AdminShell>;
}
