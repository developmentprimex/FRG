"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAdminI18n } from "./admin-i18n";
import { AdminEntitySearch } from "./admin-entity-search";
import AdminSelect from "./admin-select";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS = {
  NEW: "#E6A23C",
  EMAILED: "#4A7DDA",
  CONFIRMED: "#3FA66B",
  CANCELLED: "#D95C5C",
};

const SERIES_COLORS = ["#6C8AE4", "#58BFA6", "#F08A5D", "#9B6EF3", "#E07A5F", "#5B8DEF", "#5FBF8F", "#F2A65A"];
const DISTRIBUTION_COLORS = ["#6C8AE4", "#58BFA6", "#F08A5D", "#9B6EF3", "#E07A5F", "#5B8DEF", "#5FBF8F", "#F2A65A"];
const ORDER_STATUSES = ["NEW", "EMAILED", "CONFIRMED", "CANCELLED"];
const MAX_TOP_ITEMS = 12;
const TOP_ITEM_AXIS_WIDTH = 420;
const TOP_ITEM_ROW_HEIGHT = 44;
const CHART_GRID = "#E5E1DC";
const CHART_TEXT = "#2B2B2B";
const CHART_MUTED = "#6F6F6F";
const CATEGORY_COLORS = {
  COMPONENT: "#5B8DEF",
  ACCESSORY: "#5FBF8F",
  SERVICE: "#F2A65A",
};
const mobileBarStyles = `
  .mobile-bar-list {
    display: grid;
    gap: 12px;
  }

  .mobile-bar-row {
    display: grid;
    gap: 7px;
  }

  .mobile-bar-row div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: baseline;
  }

  .mobile-bar-row strong {
    min-width: 0;
    color: #1f1f1f;
    font-size: 14px;
    font-weight: 850;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .mobile-bar-row span {
    flex: 0 0 auto;
    color: #2f2924;
    font-size: 13px;
    font-weight: 900;
  }

  .mobile-bar-row i {
    display: block;
    width: 100%;
    height: 12px;
    border-radius: 999px;
    background: #ece5dc;
    overflow: hidden;
  }

  .mobile-bar-row i::before {
    content: "";
    display: block;
    width: var(--bar-width);
    height: 100%;
    border-radius: inherit;
    background: var(--bar-color);
  }
`;
const KITCHEN_ELEMENT_LABEL_KEYS = {
  "built-in oven and hob": ["dashboard.catalogItemNames.ovenHob", "Built-in Oven and Hob"],
  "wall cabinet left": ["dashboard.catalogItemNames.wallCabinetLeft", "Wall Cabinet left"],
  "wall cabinet mid-left": ["dashboard.catalogItemNames.wallCabinetMidLeft", "Wall Cabinet mid-left"],
  "wall cabinet mid-right": ["dashboard.catalogItemNames.wallCabinetMidRight", "Wall Cabinet mid-right"],
  "wall cabinet mid-right + extractor hood": ["dashboard.catalogItemNames.wallCabinetMidRightExtractorHood", "Wall Cabinet mid-right + Extractor Hood"],
  "wall cabinet right": ["dashboard.catalogItemNames.wallCabinetRight", "Wall Cabinet right"],
  "oberschrank links": ["dashboard.catalogItemNames.wallCabinetLeft", "Wall Cabinet left"],
  "oberschrank mittig links": ["dashboard.catalogItemNames.wallCabinetMidLeft", "Wall Cabinet mid-left"],
  "oberschrank mittig rechts": ["dashboard.catalogItemNames.wallCabinetMidRight", "Wall Cabinet mid-right"],
  "oberschrank rechts": ["dashboard.catalogItemNames.wallCabinetRight", "Wall Cabinet right"],
  "oberschrank (links)": ["dashboard.catalogItemNames.wallCabinetLeft", "Wall Cabinet left"],
  "oberschrank (mittig links)": ["dashboard.catalogItemNames.wallCabinetMidLeft", "Wall Cabinet mid-left"],
  "oberschrank (mittig rechts)": ["dashboard.catalogItemNames.wallCabinetMidRight", "Wall Cabinet mid-right"],
  "oberschrank (rechts)": ["dashboard.catalogItemNames.wallCabinetRight", "Wall Cabinet right"],
  "hood wall cabinet": ["dashboard.catalogItemNames.hoodWallCabinet", "Upper Cabinet with Extractor Hood 60 cm"],
  "extractor hood upper cabinet": ["dashboard.catalogItemNames.hoodWallCabinet", "Upper Cabinet with Extractor Hood 60 cm"],
  "upper cabinet with extractor hood 60 cm": ["dashboard.catalogItemNames.hoodWallCabinet", "Upper Cabinet with Extractor Hood 60 cm"],
  "extractor hood": ["dashboard.catalogItemNames.extractorHood", "Extractor Hood"],
  dunstabzugshaube: ["dashboard.catalogItemNames.extractorHood", "Extractor Hood"],
  "fh664621e extractor hood": ["dashboard.catalogItemNames.extractorHood", "Extractor Hood"],
  "khf664611s chimney extractor hood": ["dashboard.catalogItemNames.chimneyExtractorHood", "Chimney Extractor Hood"],
  "chimney extractor hood": ["dashboard.catalogItemNames.chimneyExtractorHood", "Chimney Extractor Hood"],
  "led lighting set": ["dashboard.catalogItemNames.ledLightingSet", "LED Lighting Set"],
  "led-beleuchtungsset": ["dashboard.catalogItemNames.ledLightingSet", "LED Lighting Set"],
  "washing machine": ["dashboard.catalogItemNames.washingMachine", "Washing Machine"],
  waschmaschine: ["dashboard.catalogItemNames.washingMachine", "Washing Machine"],
  "sink base cabinet": ["dashboard.catalogItemNames.sinkBaseCabinet", "Sink Base Cabinet"],
  "spülenunterschrank": ["dashboard.catalogItemNames.sinkBaseCabinet", "Sink Base Cabinet"],
  "spuelenunterschrank": ["dashboard.catalogItemNames.sinkBaseCabinet", "Sink Base Cabinet"],
  dishwasher: ["dashboard.catalogItemNames.dishwasher", "Dishwasher"],
  "spülmaschine": ["dashboard.catalogItemNames.dishwasher", "Dishwasher"],
  "spuelmaschine": ["dashboard.catalogItemNames.dishwasher", "Dishwasher"],
  "geschirrspüler": ["dashboard.catalogItemNames.dishwasher", "Dishwasher"],
  "geschirrspueler": ["dashboard.catalogItemNames.dishwasher", "Dishwasher"],
  worktop: ["dashboard.catalogItemNames.worktop", "Worktop"],
  arbeitsplatte: ["dashboard.catalogItemNames.worktop", "Worktop"],
  "base storage cabinet": ["dashboard.catalogItemNames.baseStorageCabinet", "Base Storage Cabinet"],
  "base cabinet (2 drawers) left": ["dashboard.catalogItemNames.baseCabinetTwoDrawersLeft", "Base Cabinet (2 Drawers) Left"],
  "base cabinet (2 drawers) right": ["dashboard.catalogItemNames.baseCabinetTwoDrawersRight", "Base Cabinet (2 Drawers) Right"],
  "base cabinet (3 drawers)": ["dashboard.catalogItemNames.baseCabinetThreeDrawers", "Base Cabinet (3 Drawers)"],
  "unterschrank (2 schubladen) links": ["dashboard.catalogItemNames.baseCabinetTwoDrawersLeft", "Base Cabinet (2 Drawers) Left"],
  "unterschrank (2 schubladen) rechts": ["dashboard.catalogItemNames.baseCabinetTwoDrawersRight", "Base Cabinet (2 Drawers) Right"],
  "unterschrank (3 schubladen)": ["dashboard.catalogItemNames.baseCabinetThreeDrawers", "Base Cabinet (3 Drawers)"],
  refrigerator: ["dashboard.catalogItemNames.refrigerator", "Freestanding refrigerator 178 cm"],
  "freestanding refrigerator 178cm": ["dashboard.catalogItemNames.refrigerator", "Freestanding refrigerator 178 cm"],
  "freestanding refrigerator 178 cm": ["dashboard.catalogItemNames.refrigerator", "Freestanding refrigerator 178 cm"],
  kühlschrank: ["dashboard.catalogItemNames.refrigerator", "Freestanding refrigerator 178 cm"],
  kuehlschrank: ["dashboard.catalogItemNames.refrigerator", "Freestanding refrigerator 178 cm"],
  "standkühlschrank 178 cm": ["dashboard.catalogItemNames.refrigerator", "Freestanding refrigerator 178 cm"],
  "standkuehlschrank 178 cm": ["dashboard.catalogItemNames.refrigerator", "Freestanding refrigerator 178 cm"],
  "sink and waste system": ["dashboard.catalogItemNames.sinkAndWasteSystem", "Sink and Waste System"],
  "spüle und mülltrennsystem": ["dashboard.catalogItemNames.sinkAndWasteSystem", "Sink and Waste System"],
  "spuele und muelltrennsystem": ["dashboard.catalogItemNames.sinkAndWasteSystem", "Sink and Waste System"],
  "sink and worktop": ["dashboard.catalogItemNames.sinkAndWorktop", "Worktop"],
  "cutlery insert 60": ["dashboard.catalogItemNames.cutleryInsert60", "Cutlery Insert ZB60SG"],
  "besteckeinsatz zb60sg": ["dashboard.catalogItemNames.cutleryInsert60", "Cutlery Insert ZB60SG"],
  "mülltrennsystem": ["dashboard.catalogItemNames.wasteSeparationSystem", "Waste Separation System"],
  "muelltrennsystem": ["dashboard.catalogItemNames.wasteSeparationSystem", "Waste Separation System"],
  "waste separation system": ["dashboard.catalogItemNames.wasteSeparationSystem", "Waste Separation System"],
  "lieferung, vertragen, montage und anschluss": ["dashboard.catalogItemNames.deliveryAssemblyConnection", "Delivery, Carrying, Assembly and Connection"],
  "delivery, carrying, assembly and connection": ["dashboard.catalogItemNames.deliveryAssemblyConnection", "Delivery, Carrying, Assembly and Connection"],
};

export const EXAMPLE_DASHBOARD_MOCK_DATA = {
  kpis: [
    { label: "Total Orders", value: "128", trend: "+12% vs previous period" },
    { label: "Total Revenue", value: "84.230,00 €", trend: "+9% vs previous period" },
    { label: "Average Order Value", value: "658,05 €", trend: "+3% vs previous period" },
    { label: "Conversion Rate", value: "74%", trend: "emailed / total" },
  ],
  dailyStatus: [
    { date: "Apr 01", NEW: 4, EMAILED: 8, CONFIRMED: 2, CANCELLED: 1 },
    { date: "Apr 02", NEW: 2, EMAILED: 5, CONFIRMED: 6, CANCELLED: 0 },
  ],
  geography: [
    { country: "Germany", orders: 86, revenue: 54200, orderShare: 67 },
    { country: "Austria", orders: 22, revenue: 14800, orderShare: 17 },
    { country: "Hungary", orders: 20, revenue: 15230, orderShare: 16 },
  ],
};

export function AdminDashboardCharts({
  showClaimsLink = false,
  kpis,
  periodOptions,
  selectedPeriod,
  kitchens,
  selectedKitchenId,
  statusOptions,
  selectedStatus,
  dailyStatusData,
  claimElementData,
  claimCityData,
  topItemsByQuantity,
  topItemsByRevenue,
  itemTypeData,
  paymentData,
  geographyData,
  companyAnalytics,
  projectAnalytics,
}) {
  const { translate } = useAdminI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [statusMode, setStatusMode] = useState("volume");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState("overview");
  const translateText = (key, fallback, values) => interpolateText(translate(key, fallback), values);

  const statusChartData = useMemo(() => {
    if (statusMode === "volume") return dailyStatusData;

    return dailyStatusData.map((row) => {
      const total = ORDER_STATUSES.reduce((sum, status) => sum + Number(row[status] || 0), 0);
      return {
        ...row,
        ...ORDER_STATUSES.reduce((acc, status) => {
          acc[status] = total ? Math.round((Number(row[status] || 0) / total) * 100) : 0;
          return acc;
        }, {}),
      };
    });
  }, [dailyStatusData, statusMode]);

  const mobileKpis = kpis.slice(0, 4);
  const mobileTabs = [
    { value: "overview", label: translate("dashboard.mobileTabOverview", "Overview") },
    { value: "claims", label: translate("dashboard.mobileTabClaims", "Claims") },
    { value: "orders", label: translate("dashboard.mobileTabOrders", "Orders") },
    { value: "housing", label: translate("dashboard.mobileTabHousing", "Housing") },
    { value: "products", label: translate("dashboard.mobileTabProducts", "Products") },
  ];
  function handleFilterChange(event) {
    const { name, value } = event.target;
    const params = new URLSearchParams({
      period: name === "period" ? value : selectedPeriod,
      kitchenId: name === "kitchenId" ? value : (selectedKitchenId || ""),
      status: name === "status" ? value : (selectedStatus || ""),
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  const renderFilterForm = (className = "filter-form desktop-filter-form") => (
    <form className={className}>
      <label>
        {translate("dashboard.dateRange", "Date range")}
        <AdminSelect name="period" defaultValue={selectedPeriod} onChange={handleFilterChange}>
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {translate(option.labelKey || "", option.fallbackLabel || option.value)}
            </option>
          ))}
        </AdminSelect>
      </label>
      <label>
        {translate("dashboard.kitchen", "Kitchen")}
        <AdminSelect name="kitchenId" defaultValue={selectedKitchenId} onChange={handleFilterChange}>
          <option value="">{translate("dashboard.allKitchens", "All kitchens")}</option>
          {kitchens.map((kitchen) => (
            <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>
          ))}
        </AdminSelect>
      </label>
      <label>
        {translate("dashboard.status", "Status")}
        <AdminSelect name="status" defaultValue={selectedStatus} onChange={handleFilterChange}>
          <option value="">{translate("dashboard.allStatuses", "All statuses")}</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>{translateStatus(status, translate)}</option>
          ))}
        </AdminSelect>
      </label>
      <Link href="/admin" prefetch={false} className="toolbar-link">{translate("dashboard.clearFilters", "Clear filters")}</Link>
    </form>
  );

  return (
    <div className="analytics-dashboard">
      <section className="dashboard-toolbar">
        <div>
          <p className="eyebrow deploy-test-heading">{translate("dashboard.analyticsOverview", "Analytics overview").toUpperCase()}</p>
          <h1 className="deploy-test-heading">{translate("dashboard.orderDashboard", "Order dashboard").toUpperCase()}</h1>
          <p>{translate("dashboard.monitorSalesWorkflowMovementKitchenDemandAndItemPerformance", "Track orders, workflow, kitchens, and item performance.")}</p>
        </div>
        {renderFilterForm()}
      </section>

      <section className="kpi-grid desktop-dashboard-section" aria-label={translate("dashboard.dashboardKpis", "Dashboard KPIs")}>
        {kpis.map((kpi) => (
          <article key={kpi.labelKey || kpi.fallbackLabel || kpi.value} className="kpi-card">
            <span>{translate(kpi.labelKey || "", kpi.fallbackLabel || "")}</span>
            <strong>{kpi.value}</strong>
            {kpi.breakdown ? (
              kpi.breakdown.map((line) => (
                <small key={line.labelKey}>
                  {translate(line.labelKey || "", line.fallbackLabel || "")}: {line.value}
                </small>
              ))
            ) : (
              <small>{translateText(kpi.trendKey || "", kpi.trendFallback || "", kpi.trendValues)}</small>
            )}
          </article>
        ))}
      </section>

      <div className="desktop-dashboard-section">
        <AdminEntitySearch period={selectedPeriod} kitchenId={selectedKitchenId} status={selectedStatus} />
      </div>

      <section className="mobile-dashboard">
        <div className="mobile-kpi-grid" aria-label={translate("dashboard.dashboardKpis", "Dashboard KPIs")}>
          {mobileKpis.map((kpi) => (
            <article key={kpi.labelKey || kpi.fallbackLabel || kpi.value} className="mobile-kpi-card">
              <span>{translate(kpi.labelKey || "", kpi.fallbackLabel || "")}</span>
              <strong>{kpi.value}</strong>
              {kpi.breakdown ? (
                kpi.breakdown.map((line) => (
                  <small key={line.labelKey}>
                    {translate(line.labelKey || "", line.fallbackLabel || "")}: {line.value}
                  </small>
                ))
              ) : (
                <small>{translateText(kpi.trendKey || "", kpi.trendFallback || "", kpi.trendValues)}</small>
              )}
            </article>
          ))}
        </div>

        <div className="mobile-actions-row">
          <button type="button" className="mobile-filter-button" onClick={() => setIsMobileFiltersOpen(true)}>
            {translate("dashboard.openFilters", "Filter öffnen")}
          </button>
        </div>

        <div className={`mobile-filter-backdrop${isMobileFiltersOpen ? " is-open" : ""}`} onClick={() => setIsMobileFiltersOpen(false)} />
        <aside className={`mobile-filter-sheet${isMobileFiltersOpen ? " is-open" : ""}`} aria-hidden={!isMobileFiltersOpen}>
          <div className="mobile-filter-sheet__header">
            <div>
              <span>{translate("dashboard.filters", "Filters")}</span>
              <strong>{translate("dashboard.refineDashboard", "Refine dashboard")}</strong>
            </div>
            <button type="button" onClick={() => setIsMobileFiltersOpen(false)} aria-label={translate("dashboard.closeFilters", "Close filters")}>x</button>
          </div>
          {renderFilterForm("mobile-filter-form")}
        </aside>

        <div className="mobile-search-section">
          <AdminEntitySearch
            period={selectedPeriod}
            kitchenId={selectedKitchenId}
            status={selectedStatus}
            compact
            placeholderFallback="Search by company, project, contract number"
          />
        </div>

        <nav className="mobile-dashboard-tabs" aria-label={translate("dashboard.mobileDashboardSections", "Dashboard sections")}>
          {mobileTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={mobileSection === tab.value ? "is-active" : ""}
              onClick={() => setMobileSection(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mobile-tab-panel">
          {mobileSection === "overview" ? (
            <>
              <MobileStatusBars data={dailyStatusData} />
            </>
          ) : null}

          {mobileSection === "claims" ? (
            <section className="mobile-chart-card mobile-chart-card--claims">
              <ChartHeader
                eyebrow={translate("dashboard.claimElementOverview", "Claims by item")}
                title={translate("dashboard.claimsBySelectedElementAndCity", "Claims by selected item and city")}
              />
              <MobileClaimBars
                title={translate("dashboard.selectedElements", "Selected items")}
                data={claimElementData}
                emptyLabel={translate("dashboard.noClaimElementDataForSelectedFilters", "No item-level claim data for the current filters.")}
                translateElementLabels
              />
              <MobileClaimBars
                title={translate("dashboard.submittedCities", "Submitted cities")}
                data={claimCityData}
                emptyLabel={translate("dashboard.noClaimCityDataForSelectedFilters", "No submitted city data for the current filters.")}
              />
              {showClaimsLink ? (
                <Link className="mobile-panel-link" href="/admin/claims" prefetch={false}>
                  {translate("dashboard.viewAllClaims", "View all claims")}
                </Link>
              ) : null}
            </section>
          ) : null}

          {mobileSection === "orders" ? (
            <>
              <MobileStatusBars data={dailyStatusData} />
              <MobileGeographyBars data={geographyData} />
            </>
          ) : null}

          {mobileSection === "housing" ? (
            <MobileHousingSection companyAnalytics={companyAnalytics} />
          ) : null}

          {mobileSection === "products" ? (
            <>
              <MobileTopItems topItemsByQuantity={topItemsByQuantity} topItemsByRevenue={topItemsByRevenue} />
              <DistributionSection itemTypeData={itemTypeData} paymentData={paymentData} />
            </>
          ) : null}
        </div>
      </section>

      <section className="chart-card chart-card--compact chart-card--claims desktop-dashboard-section">
        <ChartHeader
          eyebrow={translate("dashboard.claimElementOverview", "Claims by item")}
          title={translate("dashboard.claimsBySelectedElementAndCity", "Claims by selected item and city")}
          detail={translate("dashboard.claimsBySelectedElementAndCityDetail", "Ranked by selected kitchen items and the city submitted in the service request form.")}
        />
        <div className="claim-overview-grid">
          <ClaimBreakdownChart
            title={translate("dashboard.selectedElements", "Selected items")}
            data={claimElementData}
            emptyLabel={translate("dashboard.noClaimElementDataForSelectedFilters", "No item-level claim data for the current filters.")}
            translateElementLabels
            yAxisWidth={154}
            maxRows={5}
            compact
          />
          <ClaimBreakdownChart
            title={translate("dashboard.submittedCities", "Submitted cities")}
            data={claimCityData}
            emptyLabel={translate("dashboard.noClaimCityDataForSelectedFilters", "No submitted city data for the current filters.")}
            yAxisWidth={104}
            maxRows={6}
            compact
          />
          {showClaimsLink ? (
            <div className="claim-action-row">
              <Link className="claim-action-row__link" href="/admin/claims" prefetch={false}>
                {translate("dashboard.viewAllClaims", "View all claims")}
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="chart-card chart-card--status desktop-dashboard-section">
        <ChartHeader
          eyebrow={translate("dashboard.dailyStatusBreakdown", "Daily status breakdown")}
          title={translate("dashboard.ordersByStatus", "Orders by status")}
          detail={translate("dashboard.stackedByWorkflowStateUsingOrderCreationDate", "Stacked by workflow state using order creation date.")}
          actions={(
            <div className="segmented-control" aria-label={translate("dashboard.statusChartMode", "Status chart mode")}>
              <button className={statusMode === "volume" ? "is-active" : ""} type="button" onClick={() => setStatusMode("volume")}>{translate("dashboard.volumeView", "Volume View")}</button>
              <button className={statusMode === "percentage" ? "is-active" : ""} type="button" onClick={() => setStatusMode("percentage")}>{translate("dashboard.percentageView", "Percentage View")}</button>
            </div>
          )}
        />
        <div className="chart-frame">
          {statusChartData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusChartData} margin={{ top: 12, right: 20, left: -10, bottom: 4 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} domain={statusMode === "percentage" ? [0, 100] : undefined} tickFormatter={(value) => statusMode === "percentage" ? `${value}%` : value} />
                <Tooltip content={<StatusTooltip mode={statusMode} />} />
                <Legend formatter={(value) => translateStatus(value, translate)} wrapperStyle={{ color: CHART_TEXT }} />
                {ORDER_STATUSES.map((status) => (
                  <Bar key={status} dataKey={status} stackId="orders" fill={STATUS_COLORS[status]} radius={status === "CANCELLED" ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={translate("dashboard.noStatusDataForSelectedFilters", "No status data for the selected filters.")} />
          )}
        </div>
      </section>

      <section className="dashboard-grid desktop-dashboard-section">
        <GeographySection data={geographyData} />

        <DistributionSection
          itemTypeData={itemTypeData}
          paymentData={paymentData}
        />
      </section>

      <div className="desktop-dashboard-section">
        <TopItemsSection
          topItemsByQuantity={topItemsByQuantity}
          topItemsByRevenue={topItemsByRevenue}
        />
      </div>

      <div className="desktop-dashboard-section">
        <CompanyProjectAnalyticsSection companyAnalytics={companyAnalytics} projectAnalytics={projectAnalytics} />
      </div>

      <style jsx>{`
        .dashboard-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .filter-form {
          display: grid;
          grid-template-columns: repeat(4, minmax(130px, auto));
          gap: 10px;
          align-items: end;
        }

        .mobile-dashboard {
          display: none;
        }

        .chart-card--status {
          min-height: 360px;
        }

        .chart-card--compact {
          min-height: 360px;
        }

        .chart-card--claims {
          gap: 6px;
          min-height: 0;
          padding: 14px 16px 12px;
        }

        .chart-card--claims :global(.chart-header) {
          gap: 10px;
        }

        .chart-card--claims :global(.chart-header span) {
          font-size: 11px;
          letter-spacing: 0.06em;
        }

        .chart-card--claims :global(.chart-header h2) {
          margin-top: 4px;
          font-size: 1rem;
          line-height: 1.2;
        }

        .chart-frame {
          min-height: 280px;
          min-width: 0;
        }

        .claim-overview-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
          gap: 16px;
          align-items: start;
        }

        .claim-action-row {
          grid-column: 1 / -1;
          display: flex;
          justify-content: flex-end;
          padding-top: 2px;
        }

        .claim-action-row__link {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--app-border-strong);
          border-radius: 8px;
          background: var(--color-primary);
          color: #fff;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          box-shadow: var(--app-shadow-soft);
        }

        .claim-action-row__link:hover,
        .claim-action-row__link:focus-visible {
          background: var(--color-primary-dark);
          outline: none;
        }

        @media (max-width: 1100px) {
          .filter-form {
            grid-template-columns: repeat(2, minmax(150px, 1fr));
          }

          .claim-overview-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .desktop-dashboard-section,
          .desktop-filter-form,
          .dashboard-toolbar .filter-form,
          .dashboard-toolbar p:not(.eyebrow) {
            display: none !important;
          }

          .dashboard-toolbar {
            display: block;
          }

          .dashboard-toolbar h1 {
            font-size: 1.72rem;
            line-height: 1.08;
          }

          .mobile-dashboard {
            display: grid;
            gap: 14px;
          }

          .mobile-kpi-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .mobile-kpi-card {
            display: grid;
            gap: 6px;
            min-height: 112px;
            border: 1px solid rgba(107, 79, 58, 0.18);
            border-radius: 10px;
            background: #fffdf9;
            padding: 13px;
            box-shadow: 0 8px 22px rgba(84, 59, 40, 0.08);
          }

          .mobile-kpi-card span {
            color: #5c5046;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.07em;
            line-height: 1.25;
            text-transform: uppercase;
          }

          .mobile-kpi-card strong {
            color: #151515;
            font-size: 1.35rem;
            line-height: 1.05;
          }

          .mobile-kpi-card small {
            color: #217546;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.35;
          }

          .mobile-actions-row {
            display: flex;
            justify-content: flex-end;
          }

          .mobile-filter-button,
          .mobile-panel-link {
            min-height: 42px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--color-primary);
            border-radius: 8px;
            background: var(--color-primary);
            color: #fff;
            padding: 10px 14px;
            font: inherit;
            font-weight: 900;
            text-decoration: none;
            cursor: pointer;
          }

          .mobile-filter-backdrop {
            position: fixed;
            inset: 0;
            z-index: 90;
            background: rgba(27, 23, 20, 0.32);
            opacity: 0;
            pointer-events: none;
            transition: opacity 180ms ease;
          }

          .mobile-filter-backdrop.is-open {
            opacity: 1;
            pointer-events: auto;
          }

          .mobile-filter-sheet {
            position: fixed;
            right: 0;
            bottom: 0;
            left: 0;
            z-index: 100;
            display: grid;
            gap: 16px;
            max-height: 86dvh;
            overflow-y: auto;
            border-radius: 18px 18px 0 0;
            border: 1px solid rgba(107, 79, 58, 0.18);
            background: #fffdf9;
            padding: 18px 16px 22px;
            box-shadow: 0 -18px 42px rgba(84, 59, 40, 0.22);
            transform: translateY(104%);
            visibility: hidden;
            pointer-events: none;
            transition: transform 220ms ease, visibility 220ms ease;
            box-sizing: border-box;
          }

          .mobile-filter-sheet.is-open {
            transform: translateY(0);
            visibility: visible;
            pointer-events: auto;
          }

          .mobile-filter-sheet__header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
          }

          .mobile-filter-sheet__header div {
            display: grid;
            gap: 3px;
          }

          .mobile-filter-sheet__header span {
            color: var(--color-text-muted);
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .mobile-filter-sheet__header strong {
            color: var(--color-text);
            font-size: 1.05rem;
          }

          .mobile-filter-sheet__header button {
            width: 38px;
            height: 38px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-card);
            color: var(--color-text);
            font-size: 18px;
            font-weight: 900;
            cursor: pointer;
          }

          .mobile-filter-form {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .mobile-filter-form label {
            display: grid;
            gap: 7px;
            color: var(--color-text-muted);
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }

          .mobile-filter-form .toolbar-link {
            min-height: 46px;
            border-radius: 8px;
            font-weight: 900;
          }

          .mobile-filter-form .toolbar-link {
            border: 1px solid var(--color-border);
            background: var(--color-card);
            color: var(--color-text);
            text-decoration: none;
          }

          .mobile-search-section :global(.search-workspace) {
            border-radius: 10px;
            padding: 12px;
            gap: 10px;
          }

          .mobile-search-section :global(.finder-footer) {
            display: none;
          }

          .mobile-search-section :global(.matches-panel) {
            padding: 10px;
            border-radius: 10px;
          }

          .mobile-dashboard-tabs {
            position: sticky;
            top: 0;
            z-index: 15;
            display: flex;
            gap: 6px;
            overflow-x: auto;
            padding: 5px;
            border: 1px solid rgba(107, 79, 58, 0.14);
            border-radius: 10px;
            background: rgba(255, 253, 249, 0.96);
            box-shadow: 0 8px 20px rgba(84, 59, 40, 0.07);
            backdrop-filter: blur(12px);
          }

          .mobile-dashboard-tabs button {
            flex: 0 0 auto;
            min-height: 36px;
            border: 0;
            border-radius: 8px;
            background: transparent;
            color: #5c5046;
            padding: 8px 11px;
            font: inherit;
            font-size: 13px;
            font-weight: 900;
            cursor: pointer;
          }

          .mobile-dashboard-tabs button.is-active {
            background: var(--color-primary);
            color: #fff;
          }

          .mobile-tab-panel {
            display: grid;
            gap: 14px;
          }

          .mobile-chart-card,
          .mobile-tab-panel :global(.chart-card),
          .mobile-tab-panel :global(.project-card) {
            border-radius: 10px !important;
            border-color: rgba(107, 79, 58, 0.18) !important;
            background: #fffdf9 !important;
            padding: 14px !important;
            box-shadow: 0 8px 22px rgba(84, 59, 40, 0.08) !important;
          }

          .mobile-chart-card {
            display: grid;
            gap: 14px;
          }

          .mobile-tab-panel :global(.chart-header) {
            gap: 8px !important;
          }

          .mobile-tab-panel :global(.chart-header h2) {
            font-size: 1rem !important;
            line-height: 1.2 !important;
          }

          .mobile-tab-panel :global(.segmented-control) {
            width: 100%;
            overflow-x: auto;
          }

          .mobile-tab-panel :global(.chart-frame),
          .mobile-tab-panel :global(.country-chart-frame),
          .mobile-tab-panel :global(.donut-frame),
          .mobile-tab-panel :global(.project-chart-frame),
          .mobile-tab-panel :global(.owner-chart-frame) {
            min-height: 240px !important;
          }

          .mobile-tab-panel :global(.claim-breakdown .chart-frame) {
            min-height: 170px !important;
          }

          .mobile-tab-panel :global(.donut-layout) {
            gap: 8px !important;
            align-items: start !important;
          }

          .mobile-tab-panel :global(.donut-frame) {
            min-height: 180px !important;
          }

          .mobile-tab-panel :global(.donut-frame .recharts-responsive-container) {
            max-height: 190px !important;
          }

          .mobile-tab-panel :global(.legend-list) {
            gap: 7px !important;
          }

          .filter-form {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 380px) {
          .mobile-kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function ChartHeader({ eyebrow, title, actions }) {
  return (
    <div className="chart-header">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {actions}
      <style jsx>{`
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }

        span {
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h2 {
          margin: 6px 0 0;
          color: var(--color-text);
          font-size: 1.2rem;
        }

      `}</style>
    </div>
  );
}

function MobileStatusBars({ data }) {
  const { translate } = useAdminI18n();
  const totals = ORDER_STATUSES.map((status) => ({
    key: status,
    label: translateStatus(status, translate),
    value: data.reduce((sum, row) => sum + Number(row[status] || 0), 0),
    color: STATUS_COLORS[status],
  }));
  const maxValue = Math.max(1, ...totals.map((item) => item.value));

  return (
    <section className="mobile-chart-card">
      <ChartHeader
        eyebrow={translate("dashboard.dailyStatusBreakdown", "Daily status breakdown")}
        title={translate("dashboard.ordersByStatus", "Orders by status")}
      />
      <div className="mobile-bar-list">
        {totals.map((item) => (
          <div key={item.key} className="mobile-bar-row">
            <div>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </div>
            <i style={{ "--bar-width": `${Math.max(4, (item.value / maxValue) * 100)}%`, "--bar-color": item.color }} />
          </div>
        ))}
      </div>
      <style jsx>{mobileBarStyles}</style>
    </section>
  );
}

function MobileTopItems({ topItemsByQuantity, topItemsByRevenue }) {
  const { translate } = useAdminI18n();
  const [mode, setMode] = useState("quantity");
  const source = mode === "quantity" ? topItemsByQuantity : topItemsByRevenue;
  const rows = source
    .map((item) => ({
      ...item,
      displayName: formatTopItemLabel(item, translate),
      value: Number(item[mode] || 0),
    }))
    .sort(compareItemsByMetric)
    .slice(0, 5);
  const maxValue = Math.max(1, ...rows.map((item) => item.value));
  const formatter = mode === "quantity"
    ? (value) => translate("dashboard.itemCountValue", "{count} item(s)").replace("{count}", String(value))
    : formatCurrency;

  return (
    <section className="mobile-chart-card">
      <ChartHeader
        eyebrow={translate("dashboard.topItems", "Top items")}
        title={translate("dashboard.topItems", "Top items")}
        actions={(
          <div className="segmented-control" aria-label={translate("dashboard.topItemsMode", "Top items mode")}>
            <button className={mode === "quantity" ? "is-active" : ""} type="button" onClick={() => setMode("quantity")}>{translate("dashboard.byQuantity", "By Quantity")}</button>
            <button className={mode === "revenue" ? "is-active" : ""} type="button" onClick={() => setMode("revenue")}>{translate("dashboard.byRevenue", "By Revenue")}</button>
          </div>
        )}
      />
      {rows.length ? (
        <div className="mobile-bar-list">
          {rows.map((item, index) => (
            <div key={`${mode}-${item.code || item.name}-${index}`} className="mobile-bar-row">
              <div>
                <strong>{item.displayName}</strong>
                <span>{formatter(item.value)}</span>
              </div>
              <i style={{ "--bar-width": `${Math.max(4, (item.value / maxValue) * 100)}%`, "--bar-color": SERIES_COLORS[index % SERIES_COLORS.length] }} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart label={translate("dashboard.noItemDataForSelectedFilters", "No item data for the selected filters.")} />
      )}
      <style jsx>{mobileBarStyles}</style>
    </section>
  );
}

function MobileClaimBars({ title, data, emptyLabel, translateElementLabels = false }) {
  const { translate } = useAdminI18n();
  const rows = Array.isArray(data)
    ? data.slice(0, 5).map((item) => ({
        label: translateElementLabels ? translateKitchenElementLabel(item.name, translate) : item.name,
        value: Number(item.claims || item.value || 0),
      }))
    : [];
  const maxValue = Math.max(1, ...rows.map((item) => item.value));

  return (
    <section className="mobile-subsection">
      <h3>{title}</h3>
      {rows.length ? (
        <div className="mobile-bar-list">
          {rows.map((item, index) => (
            <div key={`${item.label}-${index}`} className="mobile-bar-row">
              <div>
                <strong>{item.label || translate("dashboard.notCaptured", "Not captured")}</strong>
                <span>{translate("dashboard.claimCountValue", "{count} claims").replace("{count}", String(item.value))}</span>
              </div>
              <i style={{ "--bar-width": `${Math.max(4, (item.value / maxValue) * 100)}%`, "--bar-color": SERIES_COLORS[index % SERIES_COLORS.length] }} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart label={emptyLabel} />
      )}
      <style jsx>{`
        .mobile-subsection {
          display: grid;
          gap: 10px;
        }

        h3 {
          margin: 0;
          color: var(--color-text);
          font-size: 0.95rem;
        }

        ${mobileBarStyles}
      `}</style>
    </section>
  );
}

function MobileGeographyBars({ data }) {
  const { translate } = useAdminI18n();
  const rows = Array.isArray(data)
    ? data.slice(0, 5).map((item) => ({
        label: item.city || item.label || item.country || translate("dashboard.notCaptured", "Not captured"),
        detail: [item.postalCode, item.country].filter(Boolean).join(" | "),
        value: Number(item.orders || 0),
      }))
    : [];
  const maxValue = Math.max(1, ...rows.map((item) => item.value));

  return (
    <section className="mobile-chart-card">
      <ChartHeader
        eyebrow={translate("dashboard.geography", "Geography")}
        title={translate("dashboard.ordersByCountryAndCity", "Orders by country and city")}
      />
      {rows.length ? (
        <div className="mobile-bar-list">
          {rows.map((item, index) => (
            <div key={`${item.label}-${index}`} className="mobile-bar-row">
              <div>
                <strong>{item.label}</strong>
                <span>{translate("dashboard.orderCountValue", "{count} orders").replace("{count}", String(item.value))}</span>
              </div>
              {item.detail ? <small>{item.detail}</small> : null}
              <i style={{ "--bar-width": `${Math.max(4, (item.value / maxValue) * 100)}%`, "--bar-color": SERIES_COLORS[index % SERIES_COLORS.length] }} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart label={translate("dashboard.noCountryOrderDataForSelectedFilters", "No country order data for the selected filters.")} />
      )}
      <style jsx>{`
        ${mobileBarStyles}

        .mobile-bar-row small {
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 700;
        }
      `}</style>
    </section>
  );
}

function MobileHousingSection({ companyAnalytics }) {
  const { translate } = useAdminI18n();
  const companies = companyAnalytics?.companies || [];
  const [selectedOwnerId, setSelectedOwnerId] = useState(companyAnalytics?.defaultCompanyId || companies[0]?.id || "");
  const [showCompanies, setShowCompanies] = useState(false);
  const selectedCompany = companies.find((owner) => owner.id === selectedOwnerId) || companies[0] || null;
  const selectedTimeline = selectedCompany ? (companyAnalytics?.timelineByCompany?.[selectedCompany.id] || []) : [];
  const selectedTopItems = selectedCompany ? (companyAnalytics?.topItemsByCompany?.[selectedCompany.id] || []) : [];
  const topItems = selectedTopItems
    .map((item) => ({
      label: formatTopItemLabel(item, translate),
      value: Number(item.quantity || 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const maxItemValue = Math.max(1, ...topItems.map((item) => item.value));

  useEffect(() => {
    if (!companies.length) {
      setSelectedOwnerId("");
      return;
    }

    setSelectedOwnerId((current) => (
      current && companies.some((owner) => owner.id === current)
        ? current
        : companyAnalytics?.defaultCompanyId || companies[0].id
    ));
  }, [companyAnalytics, companies]);

  return (
    <section className="mobile-chart-card mobile-housing">
      <ChartHeader
        eyebrow={translate("dashboard.ownerPerformance", "Owner performance")}
        title={translate("dashboard.propertyOwnerKitchenActivity", "Property owner kitchen activity")}
      />

      <label className="mobile-owner-select">
        <span>{translate("dashboard.selectCompany", "Housing company")}</span>
        <AdminSelect
          value={selectedCompany?.id || ""}
          onChange={(event) => setSelectedOwnerId(event.target.value)}
          disabled={!companies.length}
          aria-label={translate("dashboard.selectCompany", "Housing company")}
        >
          {companies.length ? companies.map((owner) => (
            <option key={owner.id} value={owner.id}>{owner.name}</option>
          )) : (
            <option value="">{translate("dashboard.noCompaniesAvailable", "No companies available")}</option>
          )}
        </AdminSelect>
      </label>

      {selectedCompany ? (
        <>
          <div className="mobile-owner-kpis">
            <article>
              <span>{translate("dashboard.totalRevenue", "Total revenue")}</span>
              <strong>{formatCurrency(selectedCompany.totalRevenue)}</strong>
            </article>
            <article>
              <span>{translate("ordersAdmin.orders", "Orders")}</span>
              <strong>{selectedCompany.orderCount}</strong>
            </article>
            <article>
              <span>{translate("propertyOwnersAdmin.contracts", "Contracts")}</span>
              <strong>{selectedCompany.contractCount}</strong>
            </article>
            <article>
              <span>{translate("dashboard.averageOrderShort", "Avg. order")}</span>
              <strong>{formatCurrency(selectedCompany.averageOrderValue)}</strong>
            </article>
          </div>

          <section className="mobile-inner-card">
            <h3>{translate("dashboard.companyTimeline", "Company timeline")}</h3>
            {selectedTimeline.some((row) => row.orders || row.revenue) ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={selectedTimeline} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} tick={{ fill: CHART_MUTED }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} tick={{ fill: CHART_MUTED }} />
                  <Tooltip content={<CompanyTimelineTooltip />} />
                  <Line type="monotone" dataKey="orders" name={translate("ordersAdmin.orders", "Orders")} stroke="#5B8DEF" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label={translate("dashboard.noCompanyTimelineData", "No timeline data for the selected housing company.")} />
            )}
          </section>

          <section className="mobile-inner-card">
            <h3>{translate("dashboard.companyTopItems", "Top items for selected housing company")}</h3>
            {topItems.length ? (
              <div className="mobile-bar-list">
                {topItems.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="mobile-bar-row">
                    <div>
                      <strong>{item.label}</strong>
                      <span>{translate("dashboard.itemCountValue", "{count} item(s)").replace("{count}", String(item.value))}</span>
                    </div>
                    <i style={{ "--bar-width": `${Math.max(4, (item.value / maxItemValue) * 100)}%`, "--bar-color": SERIES_COLORS[index % SERIES_COLORS.length] }} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyChart label={translate("dashboard.noCompanyItemData", "No item data for the selected housing company.")} />
            )}
          </section>

          <section className="mobile-inner-card">
            <button type="button" className="mobile-collapse-button" onClick={() => setShowCompanies((current) => !current)}>
              {translate("dashboard.companyList", "Housing companies")} <span>{showCompanies ? "-" : "+"}</span>
            </button>
            {showCompanies ? (
              <div className="mobile-company-list">
                {companies.map((owner) => (
                  <button key={owner.id} type="button" onClick={() => setSelectedOwnerId(owner.id)}>
                    <strong>{owner.name}</strong>
                    <span>{owner.orderCount} {translate("ordersAdmin.orders", "Orders")} | {formatCurrency(owner.totalRevenue)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : (
        <EmptyChart label={translate("dashboard.noOwnerDataForSelectedFilters", "No owner contract or order data matches the current filters.")} />
      )}

      <style jsx>{`
        .mobile-housing {
          gap: 12px;
        }

        .mobile-owner-select {
          display: grid;
          gap: 7px;
        }

        .mobile-owner-select span,
        .mobile-owner-kpis span {
          color: var(--color-text-muted);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .mobile-owner-kpis {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .mobile-owner-kpis article,
        .mobile-inner-card {
          border: 1px solid rgba(107, 79, 58, 0.14);
          border-radius: 8px;
          background: #fff;
          padding: 10px;
        }

        .mobile-owner-kpis article {
          display: grid;
          gap: 4px;
        }

        .mobile-owner-kpis strong {
          color: var(--color-text);
          line-height: 1.2;
        }

        .mobile-inner-card {
          display: grid;
          gap: 10px;
        }

        h3 {
          margin: 0;
          color: var(--color-text);
          font-size: 0.95rem;
        }

        .mobile-collapse-button,
        .mobile-company-list button {
          width: 100%;
          border: 0;
          background: transparent;
          color: var(--color-text);
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .mobile-collapse-button {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 0;
          font-weight: 900;
        }

        .mobile-company-list {
          display: grid;
          gap: 8px;
        }

        .mobile-company-list button {
          display: grid;
          gap: 3px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 10px;
          background: var(--color-card);
        }

        .mobile-company-list span {
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 700;
        }

        ${mobileBarStyles}
      `}</style>
    </section>
  );
}

function StatusTooltip({ active, payload, label, mode }) {
  const { translate } = useAdminI18n();
  if (!active || !payload?.length) return null;

  return (
    <div className="tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {translateStatus(item.dataKey, translate)}: {item.value}{mode === "percentage" ? "%" : ""}
        </span>
      ))}
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-card);
          padding: 10px 12px;
          box-shadow: var(--app-shadow-soft);
        }

        strong,
        span {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function ClaimElementTooltip({ active, payload, label }) {
  const { translate } = useAdminI18n();
  if (!active || !payload?.length) return null;

  const labels = {
    claims: translate("dashboard.claims", "Claims"),
    claimsWithAttachments: translate("dashboard.claimsWithFiles", "Claims with files"),
  };

  return (
    <div className="tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {labels[item.dataKey] || item.name}: {item.value}
        </span>
      ))}
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-card);
          padding: 10px 12px;
          box-shadow: var(--app-shadow-soft);
        }

        strong,
        span {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function ClaimBreakdownChart({ title, data, emptyLabel, yAxisWidth, translateElementLabels = false, maxRows = 10, compact = false }) {
  const { translate } = useAdminI18n();
  const visibleData = Array.isArray(data)
    ? data.slice(0, maxRows).map((item) => ({
        ...item,
        displayName: translateElementLabels ? translateKitchenElementLabel(item.name, translate) : item.name,
      }))
    : [];
  const rowHeight = compact ? 28 : 40;
  const height = Math.max(compact ? 132 : 170, visibleData.length * rowHeight + (compact ? 26 : 42));

  return (
    <div className="claim-breakdown">
      <h3>{title}</h3>
      <div className="chart-frame">
        {visibleData.length ? (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={visibleData} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={compact ? 10 : 12} tick={{ fill: CHART_MUTED }} />
              <YAxis type="category" dataKey="displayName" width={yAxisWidth} tickLine={false} axisLine={false} fontSize={compact ? 10 : 12} tick={{ fill: CHART_MUTED }} tickFormatter={(value) => truncateLabel(value, compact ? 20 : 24)} />
              <Tooltip content={<ClaimElementTooltip />} />
              <Bar dataKey="claims" name={translate("dashboard.claims", "Claims")} fill="#8C6D4F" radius={[0, 5, 5, 0]} barSize={compact ? 24 : 48} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label={emptyLabel} />
        )}
      </div>
      <style jsx>{`
        .claim-breakdown {
          min-width: 0;
        }

        .chart-frame {
          min-height: 0;
          min-width: 0;
        }

        h3 {
          margin: 0 0 4px;
          color: var(--color-text);
          font-size: ${compact ? "13px" : "15px"};
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}

function CompanyProjectAnalyticsSection({ companyAnalytics, projectAnalytics }) {
  const { translate } = useAdminI18n();
  const [mode, setMode] = useState("company");
  const modeSwitcher = (
    <div className="analytics-mode-switch" aria-label={translate("dashboard.analyticsFocus", "Analytics focus")}>
      <button className={mode === "company" ? "is-active" : ""} type="button" onClick={() => setMode("company")}>
        {translate("dashboard.companyView", "Company")}
      </button>
      <button className={mode === "project" ? "is-active" : ""} type="button" onClick={() => setMode("project")}>
        {translate("dashboard.projectView", "Project")}
      </button>
      <style jsx>{`
        .analytics-mode-switch {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: var(--color-primary-soft);
        }

        .analytics-mode-switch button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--color-text-muted);
          padding: 7px 12px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .analytics-mode-switch button.is-active {
          background: var(--color-card);
          color: var(--color-primary);
          box-shadow: 0 5px 14px rgba(84, 59, 40, 0.1);
        }
      `}</style>
    </div>
  );

  return mode === "company"
    ? <PropertyOwnerAnalyticsSection analytics={companyAnalytics} modeSwitcher={modeSwitcher} />
    : <ProjectAnalyticsSection analytics={projectAnalytics} modeSwitcher={modeSwitcher} />;
}

function PropertyOwnerAnalyticsSection({ analytics, modeSwitcher = null }) {
  const { translate } = useAdminI18n();
  const companies = analytics?.companies || [];
  const translateText = (key, fallback, values) => interpolateText(translate(key, fallback), values);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [itemMode, setItemMode] = useState("quantity");
  const selectedCompany = useMemo(
    () => companies.find((owner) => owner.id === selectedOwnerId) || companies[0] || null,
    [companies, selectedOwnerId],
  );
  const selectedTimeline = selectedCompany ? (analytics?.timelineByCompany?.[selectedCompany.id] || []) : [];
  const selectedTopItems = useMemo(
    () => selectedCompany ? (analytics?.topItemsByCompany?.[selectedCompany.id] || []) : [],
    [analytics, selectedCompany],
  );

  useEffect(() => {
    if (!companies.length) {
      setSelectedOwnerId("");
      return;
    }

    setSelectedOwnerId((current) => (
      current && companies.some((owner) => owner.id === current)
        ? current
        : analytics?.defaultCompanyId || companies[0].id
    ));
  }, [analytics, companies]);

  const itemConfig = itemMode === "quantity"
    ? {
        formatter: (value) => interpolateText(translate("dashboard.itemCountValue", "{count} item(s)"), { count: String(value) }),
        data: selectedTopItems
          .map((item) => ({
            ...item,
            chartValue: Number(item.quantity || 0),
            displayName: formatTopItemLabel(item, translate),
            axisLabel: buildTopItemAxisLabel(item, translate),
            displayIdentifier: item.articleNumber || item.code || "",
          }))
          .sort(compareItemsByMetric),
      }
    : {
        formatter: formatCurrency,
        data: selectedTopItems
          .map((item) => ({
            ...item,
            chartValue: Number(item.revenue || 0),
            displayName: formatTopItemLabel(item, translate),
            axisLabel: buildTopItemAxisLabel(item, translate),
            displayIdentifier: item.articleNumber || item.code || "",
          }))
          .sort(compareItemsByMetric),
      };
  const topItemChartData = itemConfig.data.slice(0, MAX_TOP_ITEMS);
  const hasCompanyData = Boolean(selectedCompany);
  const topItemsChartHeight = Math.max(250, topItemChartData.length * TOP_ITEM_ROW_HEIGHT + 42);
  const topItemsMaxValue = topItemChartData.reduce((max, item) => Math.max(max, item.chartValue), 0);
  const topItemsXAxisMax = itemMode === "quantity"
    ? Math.max(1, Math.ceil(topItemsMaxValue * 1.12))
    : Math.max(1, topItemsMaxValue * 1.12);

  return (
    <section className="chart-card">
      <ChartHeader
        eyebrow={translate("dashboard.ownerPerformance", "Owner performance")}
        title={translate("dashboard.propertyOwnerKitchenActivity", "Property owner kitchen activity")}
        actions={(
          <div className="owner-actions">
            {modeSwitcher}
            <label className="owner-select-wrap">
              <span>{translate("dashboard.selectCompany", "Housing company")}</span>
              <AdminSelect
                value={selectedCompany?.id || ""}
                onChange={(event) => setSelectedOwnerId(event.target.value)}
                disabled={!companies.length}
                aria-label={translate("dashboard.selectCompany", "Housing company")}
              >
                {companies.length ? companies.map((owner) => (
                  <option key={owner.id} value={owner.id}>{owner.name}</option>
                )) : (
                  <option value="">{translate("dashboard.noCompaniesAvailable", "No companies available")}</option>
                )}
              </AdminSelect>
            </label>
            <Link className="panel-link" href={selectedCompany ? `/admin/property-owners/${selectedCompany.id}` : "/admin/property-owners"} prefetch={false}>
              {selectedCompany
                ? translate("dashboard.openCompanyWorkspace", "Open company workspace")
                : translate("dashboard.manageOwners", "Manage owners")}
            </Link>
          </div>
        )}
      />
      <div className="owner-stats-grid">
        {hasCompanyData ? (
          <>
            <article className="owner-analytics-panel">
              <div className="owner-stat-header">
                <div>
                  <strong>{selectedCompany.name}</strong>
                </div>
              </div>
              <div className="owner-kpi-grid">
                <article>
                  <span>{translate("dashboard.totalRevenue", "Total revenue")}</span>
                  <strong>{formatCurrency(selectedCompany.totalRevenue)}</strong>
                </article>
                <article>
                  <span>{translate("ordersAdmin.orders", "Orders")}</span>
                  <strong>{selectedCompany.orderCount}</strong>
                </article>
                <article>
                  <span>{translate("propertyOwnersAdmin.contracts", "Contracts")}</span>
                  <strong>{selectedCompany.contractCount}</strong>
                </article>
                <article>
                  <span>{translate("adminShellLogin.kitchens", "Kitchens")}</span>
                  <strong>{selectedCompany.kitchenCount}</strong>
                </article>
                <article>
                  <span>{translate("dashboard.averageOrderShort", "Avg. order")}</span>
                  <strong>{formatCurrency(selectedCompany.averageOrderValue)}</strong>
                </article>
              </div>
              <div className="owner-chart-card owner-chart-card--timeline">
                <div className="owner-chart-heading">
                  <div>
                    <strong>{translate("dashboard.companyTimeline", "Company timeline")}</strong>
                  </div>
                </div>
                <div className="owner-chart-frame">
                  {selectedTimeline.some((row) => row.orders || row.revenue) ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={selectedTimeline} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid stroke={CHART_GRID} vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                        <YAxis yAxisId="orders" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                        <YAxis yAxisId="revenue" orientation="right" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} tickFormatter={compactCurrency} />
                        <Tooltip content={<CompanyTimelineTooltip />} />
                        <Legend wrapperStyle={{ color: CHART_TEXT }} />
                        <Line yAxisId="orders" type="monotone" dataKey="orders" name={translate("ordersAdmin.orders", "Orders")} stroke="#5B8DEF" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                        <Line yAxisId="revenue" type="monotone" dataKey="revenue" name={translate("dashboard.revenueLabel", "Revenue")} stroke="#3FA66B" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart label={translate("dashboard.noCompanyTimelineData", "No timeline data for the selected housing company.")} />
                  )}
                </div>
              </div>

              <div className="owner-chart-card">
                <div className="owner-chart-heading">
                  <div>
                    <strong>{translate("dashboard.companyTopItems", "Top items for selected housing company")}</strong>
                  </div>
          <div className="segmented-control" aria-label={translate("dashboard.selectedCompanyTopItemsMode", "Selected company top items mode")}>
                    <button className={itemMode === "quantity" ? "is-active" : ""} type="button" onClick={() => setItemMode("quantity")}>{translate("dashboard.byQuantity", "By Quantity")}</button>
                    <button className={itemMode === "revenue" ? "is-active" : ""} type="button" onClick={() => setItemMode("revenue")}>{translate("dashboard.byRevenue", "By Revenue")}</button>
                  </div>
                </div>
                <div className="owner-chart-frame">
                  {topItemChartData.length ? (
                    <div className="top-items-scroll">
                      <ResponsiveContainer width="100%" height={topItemsChartHeight}>
                        <BarChart data={topItemChartData} layout="vertical" margin={{ top: 8, right: 76, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                          <XAxis
                            type="number"
                            domain={[0, topItemsXAxisMax]}
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                            tickFormatter={itemMode === "revenue" ? compactCurrency : undefined}
                          />
                          <YAxis
                            type="category"
                            dataKey="axisLabel"
                            width={TOP_ITEM_AXIS_WIDTH}
                            interval={0}
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                            tick={<TopItemsAxisTick />}
                          />
                          <Tooltip content={<TopItemsTooltip />} />
                          <Bar
                            dataKey="chartValue"
                            radius={[0, 8, 8, 0]}
                            label={{
                              position: "right",
                              fill: CHART_TEXT,
                              fontSize: 12,
                              fontWeight: 800,
                              formatter: itemConfig.formatter,
                            }}
                          >
                            {topItemChartData.map((item, index) => (
                              <Cell key={`${itemMode}-${item.code || item.name}-${item.name}`} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart label={translate("dashboard.noCompanyItemData", "No item data for the selected housing company.")} />
                  )}
                </div>
              </div>
            </article>

            <aside className="owner-summary-list" aria-label={translate("dashboard.companyList", "Housing companies")}>
              {companies.map((owner) => {
                const isSelected = owner.id === selectedCompany.id;
                return (
                  <button
                    key={owner.id}
                    type="button"
                    className={`owner-summary-row${isSelected ? " is-selected" : ""}`}
                    onClick={() => setSelectedOwnerId(owner.id)}
                  >
                    <div>
                      <strong>{owner.name}</strong>
                      <span>{translateText("dashboard.companyMetricsSummary", "{objects} objects, {contracts} contracts, {orders} orders", {
                        objects: String(owner.objectCount),
                        contracts: String(owner.contractCount),
                        orders: String(owner.orderCount),
                      })}</span>
                    </div>
                    <b>{formatCurrency(owner.totalRevenue)}</b>
                  </button>
                );
              })}
            </aside>
          </>
        ) : (
          <div className="empty-owner-stats">{translate("dashboard.noOwnerDataForSelectedFilters", "No owner contract or order data matches the current filters.")}</div>
        )}
      </div>
      <style jsx>{`
        .chart-card {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: var(--app-shadow-soft);
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .owner-stats-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.9fr);
          gap: 12px;
        }

        .owner-analytics-panel {
          display: grid;
          gap: 14px;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 14px;
          background: #fbfaf7;
        }

        .owner-actions {
          display: flex;
          gap: 10px;
          align-items: end;
          flex-wrap: wrap;
        }

        .owner-select-wrap {
          display: grid;
          gap: 6px;
          min-width: 220px;
        }

        .owner-select-wrap span {
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .owner-select-wrap select {
          min-height: 42px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-text);
          padding: 9px 12px;
          font: inherit;
        }

        .owner-stat-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .owner-stat-header div,
        .owner-chart-heading div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .owner-stat-header strong {
          color: var(--color-text);
          font-size: 1rem;
        }

        .owner-stat-header span,
        .owner-kpi-grid span,
        .owner-chart-heading span {
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .owner-stat-header b {
          color: var(--color-confirmed);
          white-space: nowrap;
        }

        .owner-kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
        }

        .owner-kpi-grid article {
          display: grid;
          gap: 4px;
          border-radius: 8px;
          background: var(--color-card);
          padding: 10px;
          border: 1px solid var(--color-border);
        }

        .owner-kpi-grid strong,
        .owner-chart-heading strong,
        .owner-status-list strong {
          color: var(--color-text);
          line-height: 1.35;
        }

        .owner-chart-card {
          display: grid;
          gap: 12px;
          border-radius: 8px;
          background: var(--color-card);
          padding: 12px;
          border: 1px solid var(--color-border);
        }

        .owner-chart-card--timeline {
          background: var(--color-card);
        }

        .owner-chart-heading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .owner-chart-frame {
          min-height: 220px;
          min-width: 0;
        }

        .top-items-scroll {
          max-height: 280px;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
        }

        .segmented-control {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: var(--color-primary-soft);
        }

        .segmented-control button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--color-text-muted);
          padding: 7px 10px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .segmented-control button.is-active {
          background: var(--color-card);
          color: var(--color-primary);
          box-shadow: 0 5px 14px rgba(84, 59, 40, 0.1);
        }

        .owner-summary-list {
          display: grid;
          gap: 8px;
          align-content: start;
          max-height: 100%;
          overflow: auto;
        }

        .owner-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          text-align: left;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 12px;
          background: var(--color-card);
          cursor: pointer;
        }

        .owner-summary-row div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .owner-summary-row strong,
        .owner-summary-row b {
          color: var(--color-text);
        }

        .owner-summary-row span {
          color: var(--color-text-muted);
          font-size: 12px;
          line-height: 1.4;
        }

        .owner-summary-row.is-selected {
          border-color: rgba(107, 79, 58, 0.18);
          background: var(--color-primary-soft);
          box-shadow: inset 0 0 0 1px rgba(107, 79, 58, 0.1);
        }

        .empty-owner-stats {
          min-height: 120px;
          display: grid;
          place-items: center;
          border: 1px dashed var(--color-border);
          border-radius: 12px;
          color: var(--color-text-muted);
          background: #fbfaf7;
          text-align: center;
          padding: 20px;
        }

        .panel-link {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          border-radius: 8px;
          border: 1px solid var(--color-primary);
          background: var(--color-primary);
          color: #ffffff;
          padding: 9px 12px;
          font-weight: 800;
          text-decoration: none;
        }

        @media (max-width: 760px) {
          .owner-stats-grid {
            grid-template-columns: 1fr;
          }

          .owner-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </section>
  );
}

function ProjectAnalyticsSection({ analytics, modeSwitcher = null }) {
  const { translate } = useAdminI18n();
  const projects = analytics?.projects || [];
  const translateText = (key, fallback, values) => interpolateText(translate(key, fallback), values);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [itemMode, setItemMode] = useState("quantity");
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId],
  );
  const selectedTimeline = selectedProject ? (analytics?.timelineByProject?.[selectedProject.id] || []) : [];
  const selectedContracts = selectedProject ? (analytics?.contractsByProject?.[selectedProject.id] || []) : [];
  const selectedLocations = selectedProject ? (analytics?.locationsByProject?.[selectedProject.id] || []) : [];
  const selectedKitchens = selectedProject ? (analytics?.kitchenBreakdownByProject?.[selectedProject.id] || []) : [];
  const selectedStatuses = selectedProject ? (analytics?.statusBreakdownByProject?.[selectedProject.id] || []) : [];
  const selectedTopItems = useMemo(
    () => selectedProject ? (analytics?.topItemsByProject?.[selectedProject.id] || []) : [],
    [analytics, selectedProject],
  );

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId("");
      return;
    }

    setSelectedProjectId((current) => (
      current && projects.some((project) => project.id === current)
        ? current
        : analytics?.defaultProjectId || projects[0].id
    ));
  }, [analytics, projects]);

  const itemConfig = itemMode === "quantity"
    ? {
        formatter: (value) => interpolateText(translate("dashboard.itemCountValue", "{count} item(s)"), { count: String(value) }),
        data: selectedTopItems
          .map((item) => ({
            ...item,
            chartValue: Number(item.quantity || 0),
            displayName: formatTopItemLabel(item, translate),
            axisLabel: buildTopItemAxisLabel(item, translate),
            displayIdentifier: item.articleNumber || item.code || "",
          }))
          .sort(compareItemsByMetric),
      }
    : {
        formatter: formatCurrency,
        data: selectedTopItems
          .map((item) => ({
            ...item,
            chartValue: Number(item.revenue || 0),
            displayName: formatTopItemLabel(item, translate),
            axisLabel: buildTopItemAxisLabel(item, translate),
            displayIdentifier: item.articleNumber || item.code || "",
          }))
          .sort(compareItemsByMetric),
      };
  const topItemChartData = itemConfig.data.slice(0, MAX_TOP_ITEMS);
  const topItemsChartHeight = Math.max(240, topItemChartData.length * TOP_ITEM_ROW_HEIGHT + 42);
  const topItemsMaxValue = topItemChartData.reduce((max, item) => Math.max(max, item.chartValue), 0);
  const topItemsXAxisMax = itemMode === "quantity"
    ? Math.max(1, Math.ceil(topItemsMaxValue * 1.12))
    : Math.max(1, topItemsMaxValue * 1.12);

  return (
    <section className="project-card">
      <ChartHeader
        eyebrow={translate("dashboard.projectPerformance", "Project performance")}
        title={translate("dashboard.projectStatistics", "Project statistics")}
        detail={translate("dashboard.projectStatisticsDetail", "Review contract numbers, locations, order flow, and item demand for one project.")}
        actions={(
          <div className="project-actions">
            {modeSwitcher}
            <label className="project-select-wrap">
              <span>{translate("dashboard.selectProject", "Project")}</span>
              <AdminSelect
                value={selectedProject?.id || ""}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                disabled={!projects.length}
                aria-label={translate("dashboard.selectProject", "Project")}
              >
                {projects.length ? projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectCode ? `${project.projectCode} - ` : ""}{project.name}
                  </option>
                )) : (
                  <option value="">{translate("dashboard.noProjectsAvailable", "No projects available")}</option>
                )}
              </AdminSelect>
            </label>
            <Link className="panel-link" href={selectedProject ? `/admin/property-owners/${selectedProject.housingCompanyId}` : "/admin/property-owners"} prefetch={false}>
              {selectedProject
                ? translate("dashboard.openCompanyWorkspace", "Open company workspace")
                : translate("dashboard.manageOwners", "Manage owners")}
            </Link>
          </div>
        )}
      />

      {selectedProject ? (
        <div className="project-grid">
          <article className="project-main">
            <div className="project-heading">
              <div>
                <strong>{selectedProject.projectCode ? `${selectedProject.projectCode} - ` : ""}{selectedProject.name}</strong>
                <span>{selectedProject.housingCompanyName || translate("dashboard.notCaptured", "Not captured")}</span>
                <small>{[
                  selectedProject.propertyObjectName,
                  selectedProject.objectAddress,
                  [selectedProject.objectPostalCode, selectedProject.objectCity].filter(Boolean).join(" "),
                  selectedProject.objectCountry,
                ].filter(Boolean).join(" | ")}</small>
              </div>
              <b>{formatProjectStatus(selectedProject.status)}</b>
            </div>

            <div className="project-kpi-grid">
              <article>
                <span>{translate("dashboard.totalRevenue", "Total revenue")}</span>
                <strong>{formatCurrency(selectedProject.totalRevenue)}</strong>
              </article>
              <article>
                <span>{translate("ordersAdmin.orders", "Orders")}</span>
                <strong>{selectedProject.orderCount}</strong>
              </article>
              <article>
                <span>{translate("propertyOwnersAdmin.contracts", "Contracts")}</span>
                <strong>{selectedProject.contractCount}</strong>
              </article>
              <article>
                <span>{translate("dashboard.usedContracts", "Used contracts")}</span>
                <strong>{selectedProject.usedContractCount}</strong>
              </article>
              <article>
                <span>{translate("dashboard.unusedContracts", "Unused contracts")}</span>
                <strong>{selectedProject.unusedContractCount}</strong>
              </article>
              <article>
                <span>{translate("dashboard.averageOrderShort", "Avg. order")}</span>
                <strong>{formatCurrency(selectedProject.averageOrderValue)}</strong>
              </article>
              <article>
                <span>{translate("dashboard.cities", "Cities")}</span>
                <strong>{selectedProject.cityCount}</strong>
              </article>
            </div>

            <div className="project-chart-card">
              <div className="project-chart-heading">
                <strong>{translate("dashboard.projectTimeline", "Project timeline")}</strong>
              </div>
              <div className="project-chart-frame">
                {selectedTimeline.some((row) => row.orders || row.revenue) ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={selectedTimeline} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_GRID} vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                      <YAxis yAxisId="orders" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
                      <YAxis yAxisId="revenue" orientation="right" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} tickFormatter={compactCurrency} />
                      <Tooltip content={<CompanyTimelineTooltip />} />
                      <Legend wrapperStyle={{ color: CHART_TEXT }} />
                      <Line yAxisId="orders" type="monotone" dataKey="orders" name={translate("ordersAdmin.orders", "Orders")} stroke="#5B8DEF" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                      <Line yAxisId="revenue" type="monotone" dataKey="revenue" name={translate("dashboard.revenueLabel", "Revenue")} stroke="#3FA66B" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart label={translate("dashboard.noProjectTimelineData", "No timeline data for the selected project.")} />
                )}
              </div>
            </div>

            <div className="project-split">
              <ProjectListPanel
                title={translate("dashboard.projectLocations", "Cities and addresses")}
                emptyLabel={translate("dashboard.noProjectLocationData", "No location data for the selected project.")}
                rows={selectedLocations}
                renderRow={(location) => (
                  <>
                    <div>
                      <strong>{location.label}</strong>
                      <span>{translate("ordersAdmin.orders", "Orders")}: {location.orders}</span>
                    </div>
                    <b>{formatCurrency(location.revenue)}</b>
                  </>
                )}
              />
              <ProjectListPanel
                title={translate("dashboard.projectKitchenBreakdown", "Kitchen breakdown")}
                emptyLabel={translate("dashboard.noProjectKitchenData", "No kitchen data for the selected project.")}
                rows={selectedKitchens}
                renderRow={(kitchen) => (
                  <>
                    <div>
                      <strong>{kitchen.kitchenName}</strong>
                      <span>{translate("ordersAdmin.orders", "Orders")}: {kitchen.orders}</span>
                    </div>
                    <b>{formatCurrency(kitchen.revenue)}</b>
                  </>
                )}
              />
            </div>

            <div className="project-chart-card">
              <div className="project-chart-heading">
                <strong>{translate("dashboard.projectTopItems", "Top items for selected project")}</strong>
          <div className="segmented-control" aria-label={translate("dashboard.selectedProjectTopItemsMode", "Selected project top items mode")}>
                  <button className={itemMode === "quantity" ? "is-active" : ""} type="button" onClick={() => setItemMode("quantity")}>{translate("dashboard.byQuantity", "By Quantity")}</button>
                  <button className={itemMode === "revenue" ? "is-active" : ""} type="button" onClick={() => setItemMode("revenue")}>{translate("dashboard.byRevenue", "By Revenue")}</button>
                </div>
              </div>
              <div className="project-chart-frame">
                {topItemChartData.length ? (
                  <div className="top-items-scroll">
                    <ResponsiveContainer width="100%" height={topItemsChartHeight}>
                      <BarChart data={topItemChartData} layout="vertical" margin={{ top: 8, right: 76, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                        <XAxis
                          type="number"
                          domain={[0, topItemsXAxisMax]}
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                          tickFormatter={itemMode === "revenue" ? compactCurrency : undefined}
                        />
                        <YAxis
                          type="category"
                          dataKey="axisLabel"
                          width={TOP_ITEM_AXIS_WIDTH}
                          interval={0}
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                          tick={<TopItemsAxisTick />}
                        />
                        <Tooltip content={<TopItemsTooltip />} />
                        <Bar
                          dataKey="chartValue"
                          radius={[0, 8, 8, 0]}
                          label={{
                            position: "right",
                            fill: CHART_TEXT,
                            fontSize: 12,
                            fontWeight: 800,
                            formatter: itemConfig.formatter,
                          }}
                        >
                          {topItemChartData.map((item, index) => (
                            <Cell key={`${itemMode}-${item.code || item.name}-${item.name}`} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart label={translate("dashboard.noProjectItemData", "No item data for the selected project.")} />
                )}
              </div>
            </div>
          </article>

          <aside className="project-side">
            <ProjectListPanel
              title={translate("dashboard.contractNumbers", "Contract numbers")}
              emptyLabel={translate("dashboard.noProjectContracts", "No contract numbers for the selected project.")}
              rows={selectedContracts}
              renderRow={(contract) => (
                <>
                  <div>
                    <strong>{contract.contractNumber}</strong>
                    <span>{contract.kitchenName}</span>
                    {contract.unitLabel ? <span>{contract.unitLabel}</span> : null}
                    {contract.latestOrderAt ? <span>{translate("dashboard.latestOrder", "Latest order")}: {contract.latestOrderAt}</span> : null}
                  </div>
                  <b>{translateText("dashboard.contractOrderCount", "{count} order(s) linked", { count: String(contract.orderCount) })}</b>
                </>
              )}
            />
            <ProjectListPanel
              title={translate("dashboard.projectStatusDistribution", "Status distribution")}
              emptyLabel={translate("dashboard.noProjectStatusData", "No status data for the selected project.")}
              rows={selectedStatuses}
              renderRow={(status) => (
                <>
                  <div>
                    <strong>{translateStatus(status.status, translate)}</strong>
                  </div>
                  <b>{status.count}</b>
                </>
              )}
            />
            <div className="project-summary-list" aria-label={translate("dashboard.projectList", "Projects")}>
              {projects.map((project) => {
                const isSelected = project.id === selectedProject.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    className={`project-summary-row${isSelected ? " is-selected" : ""}`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <div>
                      <strong>{project.projectCode ? `${project.projectCode} - ` : ""}{project.name}</strong>
                      <span>{translateText("dashboard.projectMetricsSummary", "{contracts} contracts, {orders} orders", {
                        contracts: String(project.contractCount),
                        orders: String(project.orderCount),
                      })}</span>
                    </div>
                    <b>{formatCurrency(project.totalRevenue)}</b>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      ) : (
        <div className="empty-project-stats">{translate("dashboard.noProjectDataForSelectedFilters", "No project, contract, or order data matches the current filters.")}</div>
      )}

      <style jsx>{`
        .project-card {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: var(--app-shadow-soft);
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .project-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.9fr);
          gap: 12px;
        }

        .project-main,
        .project-side {
          display: grid;
          gap: 14px;
          align-content: start;
        }

        .project-main {
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 14px;
          background: #fbfaf7;
        }

        .project-actions {
          display: flex;
          gap: 10px;
          align-items: end;
          flex-wrap: wrap;
        }

        .project-select-wrap {
          display: grid;
          gap: 6px;
          min-width: 240px;
        }

        .project-select-wrap span,
        .project-kpi-grid span,
        .project-heading span {
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .project-select-wrap select {
          min-height: 42px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-text);
          padding: 9px 12px;
          font: inherit;
        }

        .project-heading,
        .project-chart-heading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .project-heading div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .project-heading strong,
        .project-chart-heading strong {
          color: var(--color-text);
        }

        .project-heading small {
          color: var(--color-text-muted);
          line-height: 1.45;
        }

        .project-heading b {
          color: var(--color-confirmed);
          text-transform: capitalize;
        }

        .project-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .project-kpi-grid article,
        .project-chart-card,
        .project-list-panel {
          border-radius: 8px;
          background: var(--color-card);
          padding: 10px;
          border: 1px solid var(--color-border);
        }

        .project-kpi-grid article {
          display: grid;
          gap: 4px;
        }

        .project-kpi-grid strong {
          color: var(--color-text);
          line-height: 1.25;
        }

        .project-chart-card,
        .project-list-panel {
          display: grid;
          gap: 12px;
        }

        .project-chart-frame {
          min-height: 220px;
          min-width: 0;
        }

        .project-split {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .top-items-scroll {
          max-height: 280px;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
        }

        .segmented-control {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: var(--color-primary-soft);
        }

        .segmented-control button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--color-text-muted);
          padding: 7px 10px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .segmented-control button.is-active {
          background: var(--color-card);
          color: var(--color-primary);
          box-shadow: 0 5px 14px rgba(84, 59, 40, 0.1);
        }

        .panel-link {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          border-radius: 8px;
          border: 1px solid var(--color-primary);
          background: var(--color-primary);
          color: #ffffff;
          padding: 9px 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .project-summary-list {
          display: grid;
          gap: 8px;
          align-content: start;
          max-height: 430px;
          overflow: auto;
        }

        .project-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          text-align: left;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 12px;
          background: var(--color-card);
          cursor: pointer;
        }

        .project-summary-row div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .project-summary-row strong,
        .project-summary-row b {
          color: var(--color-text);
        }

        .project-summary-row span {
          color: var(--color-text-muted);
          font-size: 12px;
          line-height: 1.4;
        }

        .project-summary-row.is-selected {
          border-color: rgba(107, 79, 58, 0.18);
          background: var(--color-primary-soft);
          box-shadow: inset 0 0 0 1px rgba(107, 79, 58, 0.1);
        }

        .empty-project-stats {
          min-height: 120px;
          display: grid;
          place-items: center;
          border: 1px dashed var(--color-border);
          border-radius: 12px;
          color: var(--color-text-muted);
          background: #fbfaf7;
          text-align: center;
          padding: 20px;
        }

        @media (max-width: 900px) {
          .project-grid,
          .project-split {
            grid-template-columns: 1fr;
          }

          .project-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </section>
  );
}

function ProjectListPanel({ title, emptyLabel, rows, renderRow }) {
  return (
    <div className="project-list-panel">
      <strong className="project-list-title">{title}</strong>
      {rows.length ? (
        <div className="project-list-rows">
          {rows.map((row, index) => (
            <div key={row.id || row.contractNumber || row.label || row.status || row.kitchenName || index} className="project-list-row">
              {renderRow(row)}
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart label={emptyLabel} />
      )}
      <style jsx>{`
        .project-list-panel {
          display: grid;
          gap: 10px;
          min-width: 0;
          border-radius: 8px;
          background: var(--color-card);
          padding: 10px;
          border: 1px solid var(--color-border);
        }

        .project-list-title {
          color: var(--color-text);
        }

        .project-list-rows {
          display: grid;
          gap: 8px;
          max-height: 280px;
          overflow: auto;
        }

        .project-list-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: #fbfaf7;
          padding: 10px;
        }

        .project-list-row :global(div) {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .project-list-row :global(strong),
        .project-list-row :global(b) {
          color: var(--color-text);
          font-size: 13px;
        }

        .project-list-row :global(span) {
          color: var(--color-text-muted);
          font-size: 12px;
          line-height: 1.4;
        }

        .project-list-row :global(b) {
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

function CompanyTimelineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {item.dataKey === "revenue" ? formatCurrency(item.value) : item.value}
        </span>
      ))}
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-card);
          padding: 10px 12px;
          box-shadow: var(--app-shadow-soft);
        }

        strong,
        span {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function TopItemsSection({ topItemsByQuantity, topItemsByRevenue }) {
  const { translate } = useAdminI18n();
  const [mode, setMode] = useState("quantity");
  const translateText = (key, fallback, values) => interpolateText(translate(key, fallback), values);
  const config = mode === "quantity"
    ? {
        title: translate("dashboard.topItems", "Top items"),
        detail: translate("dashboard.topItemsSortedBySelectedPerformanceMetric", "Top items sorted by the selected performance metric."),
        data: topItemsByQuantity,
        formatter: (value) => translateText("dashboard.itemCountValue", "{count} item(s)", { count: String(value) }),
      }
    : {
        title: translate("dashboard.topItems", "Top items"),
        detail: translate("dashboard.topItemsSortedBySelectedPerformanceMetric", "Top items sorted by the selected performance metric."),
        data: topItemsByRevenue,
        formatter: formatCurrency,
      };

  const fullData = useMemo(() => config.data
    .map((item) => ({
      ...item,
      displayName: formatTopItemLabel(item, translate),
      axisLabel: buildTopItemAxisLabel(item, translate),
      displayIdentifier: item.articleNumber || item.code || "",
      chartValue: Number(item[mode] || 0),
      quantity: Number(item.quantity || 0),
      revenue: Number(item.revenue || 0),
    }))
    .sort(compareItemsByMetric), [config.data, mode, translate]);
  const data = fullData;

  const chartHeight = Math.max(260, data.length * TOP_ITEM_ROW_HEIGHT + 44);
  const maxChartValue = data.reduce((max, item) => Math.max(max, item.chartValue), 0);
  const xAxisMax = mode === "quantity"
    ? Math.max(1, Math.ceil(maxChartValue * 1.12))
    : Math.max(1, maxChartValue * 1.12);

  return (
    <section className="chart-card">
      <ChartHeader
        eyebrow={translate("dashboard.topItems", "Top items")}
        title={config.title}
        detail={config.detail}
        actions={(
          <div className="segmented-control" aria-label={translate("dashboard.topItemsMode", "Top items mode")}>
            <button className={mode === "quantity" ? "is-active" : ""} type="button" onClick={() => setMode("quantity")}>{translate("dashboard.byQuantity", "By Quantity")}</button>
            <button className={mode === "revenue" ? "is-active" : ""} type="button" onClick={() => setMode("revenue")}>{translate("dashboard.byRevenue", "By Revenue")}</button>
          </div>
        )}
      />
      <div className="top-items-frame">
        {data.length ? (
          <div className="top-items-scroll">
            <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              key={mode}
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 76, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={CHART_GRID} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, xAxisMax]}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={mode === "revenue" ? compactCurrency : undefined}
              />
              <YAxis
                type="category"
                dataKey="axisLabel"
                width={TOP_ITEM_AXIS_WIDTH}
                interval={0}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tick={<TopItemsAxisTick />}
              />
              <Tooltip content={<TopItemsTooltip />} />
              <Bar
                dataKey="chartValue"
                radius={[0, 8, 8, 0]}
                isAnimationActive
                animationDuration={320}
                label={{
                  position: "right",
                  fill: CHART_TEXT,
                  fontSize: 12,
                  fontWeight: 800,
                  formatter: config.formatter,
                }}
              >
                {data.map((item, index) => (
                  <Cell key={`${mode}-${item.articleNumber || item.code || item.name}-${item.name}`} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyChart label={translate("dashboard.noItemDataForSelectedFilters", "No item data for the selected filters.")} />}
      </div>
      <style jsx>{`
        .chart-card {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: var(--app-shadow-soft);
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .top-items-frame {
          min-width: 0;
          min-height: 260px;
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .top-items-scroll {
          max-height: 280px;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
        }

        .segmented-control {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: var(--color-primary-soft);
        }

        .segmented-control button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--color-text-muted);
          padding: 7px 10px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .segmented-control button.is-active {
          background: var(--color-card);
          color: var(--color-primary);
          box-shadow: 0 5px 14px rgba(84, 59, 40, 0.1);
        }
      `}</style>
    </section>
  );
}

function TopItemsAxisTick({ x, y, payload }) {
  const row = payload?.payload || {};
  const [axisName, axisIdentifier = ""] = String(payload?.value || "").split("\n");
  const name = String(row.displayName || axisName || "");
  const identifier = String(row.displayIdentifier || axisIdentifier || "");

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-(TOP_ITEM_AXIS_WIDTH - 12)} y={-20} width={TOP_ITEM_AXIS_WIDTH - 20} height={40}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: "3px",
            width: "100%",
            height: "100%",
            textAlign: "right",
            lineHeight: 1.2,
          }}
        >
          <span
            style={{
              color: CHART_TEXT,
              fontSize: "12px",
              fontWeight: 800,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            }}
          >
            {name}
          </span>
          {identifier ? (
            <span
              style={{
                color: CHART_MUTED,
                fontSize: "10px",
                fontWeight: 700,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              }}
            >
              {identifier}
            </span>
          ) : null}
        </div>
      </foreignObject>
    </g>
  );
}

function TopItemsTooltip({ active, payload }) {
  const { translate } = useAdminI18n();
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;
  return (
    <div className="tooltip">
      <strong>{item.displayName || item.name}</strong>
      <span>{translate("dashboard.categoryLabel", "Category")}: {item.itemType || translate("dashboard.notCaptured", "Not captured")}</span>
      <span>{translate("dashboard.codeLabel", "Code")}: {item.code || translate("dashboard.notCaptured", "Not captured")}</span>
      <span>{translate("kitchenDetailAdmin.articleNo", "Article no.")}: {item.articleNumber || "-"}</span>
      <span>{translate("orderDetailAdmin.quantity", "Quantity")}: {item.quantity}</span>
      <span>{translate("dashboard.revenueLabel", "Revenue")}: {formatCurrency(item.revenue)}</span>
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-card);
          padding: 10px 12px;
          box-shadow: var(--app-shadow-soft);
        }

        strong,
        span {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function DistributionSection({ itemTypeData, paymentData }) {
  const { translate } = useAdminI18n();
  const [mode, setMode] = useState("itemTypes");
  const config = mode === "itemTypes"
    ? {
        title: translate("dashboard.distribution", "Distribution"),
        detail: translate("dashboard.distributionBySelectedCategory", "Distribution by selected category."),
        data: itemTypeData,
      }
    : {
        title: translate("dashboard.distribution", "Distribution"),
        detail: translate("dashboard.distributionBySelectedCategory", "Distribution by selected category."),
        data: paymentData,
      };

  const data = useMemo(() => config.data
    .map((entry) => ({
      label: entry.label?.trim() || translate("dashboard.notCaptured", "Not captured"),
      value: Number(entry.value || 0),
    }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value), [config.data]);

  const colors = mode === "itemTypes"
    ? data.map((entry, index) => getDistributionColor(entry.label, index))
    : data.map((_, index) => DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]);

  return (
    <section className="chart-card">
      <ChartHeader
        eyebrow={translate("dashboard.distribution", "Distribution")}
        title={config.title}
        detail={config.detail}
        actions={(
          <div className="segmented-control" aria-label={translate("dashboard.distributionMode", "Distribution mode")}>
            <button className={mode === "itemTypes" ? "is-active" : ""} type="button" onClick={() => setMode("itemTypes")}>{translate("dashboard.itemTypes", "Item Types")}</button>
            <button className={mode === "paymentMethods" ? "is-active" : ""} type="button" onClick={() => setMode("paymentMethods")}>{translate("dashboard.paymentMethods", "Payment Methods")}</button>
          </div>
        )}
      />
      <div className="donut-layout">
        <div className="donut-frame">
          {data.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart key={mode}>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={70}
                  outerRadius={104}
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={320}
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.label} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart label={translate("dashboard.noDistributionDataForSelectedFilters", "No distribution data for the selected filters.")} />}
        </div>
        <div className="legend-list">
          {data.map((entry, index) => (
            <div key={entry.label}>
              <span style={{ background: colors[index] }} />
              <strong>{entry.label}</strong>
              <small>{entry.value}</small>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .chart-card {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: var(--app-shadow-soft);
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .donut-layout {
          display: grid;
          grid-template-columns: minmax(180px, 1fr) minmax(160px, 0.9fr);
          gap: 14px;
          align-items: center;
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .donut-frame {
          min-width: 0;
        }

        .legend-list {
          display: grid;
          gap: 10px;
        }

        .legend-list div {
          display: grid;
          grid-template-columns: 10px 1fr auto;
          gap: 9px;
          align-items: center;
        }

        .legend-list span {
          width: 10px;
          height: 10px;
          border-radius: 999px;
        }

        .legend-list strong {
          min-width: 0;
          overflow: hidden;
          color: var(--color-text);
          font-size: 14px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .legend-list small {
          color: var(--color-text-muted);
          font-weight: 800;
        }

        .segmented-control {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 8px;
          background: var(--color-primary-soft);
        }

        .segmented-control button {
          min-height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--color-text-muted);
          padding: 7px 10px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .segmented-control button.is-active {
          background: var(--color-card);
          color: var(--color-primary);
          box-shadow: 0 5px 14px rgba(84, 59, 40, 0.1);
        }

        @media (max-width: 700px) {
          .donut-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function GeographySection({ data }) {
  const { translate } = useAdminI18n();
  return (
    <section className="chart-card">
      <ChartHeader
        eyebrow={translate("dashboard.geography", "Geography")}
        title={translate("dashboard.ordersByCountryAndCity", "Orders by country and city")}
        detail={translate("dashboard.locationsRankedByNumberOfOrders", "Locations ranked by number of orders.")}
      />

      <div className="country-chart-frame">
        {data.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART_MUTED }} />
              <YAxis type="category" dataKey="label" width={136} tickLine={false} axisLine={false} tick={<CountryAxisTick />} />
              <Tooltip content={<CountryTooltip />} />
              <Bar dataKey="orders" fill="#5B8DEF" radius={[0, 8, 8, 0]} label={{ position: "right", fill: CHART_TEXT, fontSize: 12, fontWeight: 800 }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label={translate("dashboard.noCountryOrderDataForSelectedFilters", "No country order data for the selected filters.")} />
        )}
      </div>

      <style jsx>{`
        .chart-card {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: var(--app-shadow-soft);
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .country-chart-frame {
          min-width: 0;
          min-height: 280px;
        }
      `}</style>
    </section>
  );
}

function CountryAxisTick({ x, y, payload }) {
  const [city, country] = splitLocationLabel(payload?.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end">
        <tspan x={0} dy="-0.18em" fill={CHART_TEXT} fontSize="12" fontWeight="700">
          {truncateLabel(city, 18)}
        </tspan>
        <tspan x={0} dy="1.18em" fill={CHART_MUTED} fontSize="11">
          {truncateLabel(country, 18)}
        </tspan>
      </text>
    </g>
  );
}

function CountryTooltip({ active, payload }) {
  const { translate } = useAdminI18n();
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;
  return (
    <div className="tooltip">
      <strong>{row.label}</strong>
      <span>{translate("contractAddressFields.city", "City")}: {row.city}</span>
      <span>{translate("contractAddressFields.postalCode", "Postal code")}: {row.postalCode || translate("dashboard.notCaptured", "Not captured")}</span>
      <span>{translate("contractAddressFields.country", "Country")}: {row.country}</span>
      <span>{translate("ordersAdmin.orders", "Orders")}: {row.orders}</span>
      <span>{translate("dashboard.revenueLabel", "Revenue")}: {formatCurrency(row.revenue)}</span>
      <span>{translate("dashboard.shareLabel", "Share")}: {Math.round(Number(row.orderShare || 0))}%</span>
      <style jsx>{`
        .tooltip {
          display: grid;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-card);
          padding: 10px 12px;
          box-shadow: var(--app-shadow-soft);
        }

        strong,
        span {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function EmptyChart({ label }) {
  return <div className="empty-chart">{label}<style jsx>{`
    .empty-chart {
      min-height: 180px;
      display: grid;
      place-items: center;
      border: 1px dashed var(--color-border);
      border-radius: 12px;
      color: var(--color-text-muted);
      background: #fbfaf7;
      text-align: center;
      padding: 20px;
    }
  `}</style></div>;
}

function truncateLabel(value, maxLength = 24) {
  const label = String(value || "");
  return label.length > maxLength ? `${label.slice(0, maxLength - 3)}...` : label;
}

function stripKitchenElementSize(value) {
  return String(value || "")
    .trim()
    .replace(/\s*\(\s*\d+(\s*[x×]\s*\d+){1,2}\s*mm\s*\)/gi, "")
    .replace(/\s+\d+(\s*[x×]\s*\d+){1,2}\s*mm\s*$/i, "")
    .replace(/\s+/g, " ");
}

function normalizeKitchenElementLabel(value) {
  return stripKitchenElementSize(value)
    .toLowerCase();
}

function translateKitchenElementLabel(value, translate) {
  const labelConfig = KITCHEN_ELEMENT_LABEL_KEYS[normalizeKitchenElementLabel(value)];
  return labelConfig ? translate(labelConfig[0], labelConfig[1]) : stripKitchenElementSize(value);
}

function formatTopItemLabel(item, translate) {
  const translatedName = translateKitchenElementLabel(item?.name, translate);
  return String(translatedName || item?.name || "").trim();
}

function compareItemsByMetric(a, b) {
  const metricCompare = Number(b?.chartValue || b?.value || 0) - Number(a?.chartValue || a?.value || 0);
  if (metricCompare) return metricCompare;

  const leftArticle = String(a?.articleNumber || a?.code || "").trim();
  const rightArticle = String(b?.articleNumber || b?.code || "").trim();
  const articleCompare = leftArticle.localeCompare(rightArticle, undefined, { numeric: true, sensitivity: "base" });
  if (articleCompare) return articleCompare;

  const nameCompare = String(a?.displayName || a?.name || "").localeCompare(
    String(b?.displayName || b?.name || ""),
    undefined,
    { numeric: true, sensitivity: "base" },
  );
  if (nameCompare) return nameCompare;

  return Number(b?.chartValue || b?.quantity || 0) - Number(a?.chartValue || a?.quantity || 0);
}

function buildTopItemAxisLabel(item, translate) {
  return [formatTopItemLabel(item, translate), String(item?.articleNumber || item?.code || "").trim()]
    .filter(Boolean)
    .join("\n");
}

function interpolateText(template, values) {
  let text = String(template || "");
  if (!values) return text;

  Object.entries(values).forEach(([key, value]) => {
    text = text.replaceAll(`{${key}}`, String(value));
  });

  return text;
}

function translateStatus(status, translate) {
  const keys = {
    NEW: "dashboard.statusNew",
    EMAILED: "dashboard.statusEmailed",
    CONFIRMED: "dashboard.statusConfirmed",
    CANCELLED: "dashboard.statusCancelled",
  };

  return translate(keys[status] || "", status);
}

function splitLocationLabel(value) {
  const label = String(value || "");
  const separatorIndex = label.lastIndexOf(", ");
  if (separatorIndex === -1) return [label, ""];
  return [label.slice(0, separatorIndex), label.slice(separatorIndex + 2)];
}

function formatProjectStatus(value) {
  return String(value || "active").replace(/_/g, " ");
}

function getDistributionColor(label, index) {
  const normalized = String(label || "").trim().toUpperCase();
  if (CATEGORY_COLORS[normalized]) {
    return CATEGORY_COLORS[normalized];
  }
  return DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length];
}

function compactCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}
