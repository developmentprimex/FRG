import Link from "next/link";
import {
  AdminSection,
  inputStyle,
  pageGridStyle,
  primaryButtonStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import {
  AdminCountryName,
  AdminDateTime,
  AdminText,
} from "../../../components/admin-i18n";
import { requireSuperAdminPage } from "../../../lib/admin-role-guards";
import { ORDER_KIND_TEST } from "../../../lib/order-kind";
import {
  loadRecentServiceVisitData,
  loadServiceVisitSummary,
  normalizePublicVisitReportFilters,
} from "../../../lib/public-visit-reports";
import { PUBLIC_VISIT_EVENT_TYPES } from "../../../lib/public-visit-tracking";

export const dynamic = "force-dynamic";

function isTestEvent(event) {
  return event?.metadata?.orderKind === ORDER_KIND_TEST;
}

function ClaimActivityResultBadge({ event }) {
  if (event.eventType === PUBLIC_VISIT_EVENT_TYPES.SERVICE_CLAIM_SUBMITTED) {
    return (
      <span style={isTestEvent(event) ? testStyle : claimStyle}>
        <AdminText
          i18nKey={isTestEvent(event) ? "claimActivityAdmin.resultClaimTest" : "claimActivityAdmin.resultClaim"}
          fallback={isTestEvent(event) ? "Claim (test)" : "Claim submitted"}
        />
      </span>
    );
  }

  if (event.eventType === PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_FOUND) {
    return (
      <span style={isTestEvent(event) ? testStyle : foundStyle}>
        <AdminText
          i18nKey={isTestEvent(event) ? "claimActivityAdmin.resultTest" : "claimActivityAdmin.resultFound"}
          fallback={isTestEvent(event) ? "Test" : "Found"}
        />
      </span>
    );
  }

  return (
    <span style={failedStyle}>
      <AdminText i18nKey="claimActivityAdmin.resultNotFound" fallback="Not found" />
    </span>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={summaryCardStyle}>
      <div style={summaryLabelStyle}>{label}</div>
      <strong style={summaryValueStyle}>{value}</strong>
    </div>
  );
}

export default async function AdminClaimActivityPage({ searchParams = {} }) {
  const admin = await requireSuperAdminPage();
  const filters = normalizePublicVisitReportFilters((await searchParams) || {});
  const [summary, events] = await Promise.all([
    loadServiceVisitSummary(filters),
    loadRecentServiceVisitData(filters),
  ]);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="claimActivityAdmin.title" fallback="Claim activity" />}
          description={(
            <AdminText
              i18nKey="claimActivityAdmin.description"
              fallback="Successful contract lookups and submitted claims on the public /service page for the selected date range."
            />
          )}
        >
          <form action="/admin/claim-activity" method="get" style={filterPanelStyle}>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" /></span>
              <input name="dateFrom" type="date" defaultValue={filters.dateFrom} style={filterInputStyle} />
            </label>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" /></span>
              <input name="dateTo" type="date" defaultValue={filters.dateTo} style={filterInputStyle} />
            </label>
            <div style={filterActionsStyle}>
              <button type="submit" style={filterApplyButtonStyle}>
                <AdminText i18nKey="dashboard.apply" fallback="Apply" />
              </button>
              <Link href="/admin/claim-activity" scroll={false} style={filterClearLinkStyle}>
                <AdminText i18nKey="dashboard.clearFilters" fallback="Clear filters" />
              </Link>
            </div>
          </form>

          <div style={summaryGridStyle}>
            <SummaryCard
              label={<AdminText i18nKey="claimActivityAdmin.uniqueVisitors" fallback="Estimated daily visitors" />}
              value={summary.uniqueVisitors}
            />
            <SummaryCard
              label={<AdminText i18nKey="claimActivityAdmin.pageOpens" fallback="Page opens" />}
              value={summary.opened}
            />
            <SummaryCard
              label={<AdminText i18nKey="claimActivityAdmin.lookups" fallback="Contract lookups" />}
              value={summary.lookups}
            />
            <SummaryCard
              label={<AdminText i18nKey="claimActivityAdmin.found" fallback="Found" />}
              value={summary.found}
            />
            <SummaryCard
              label={<AdminText i18nKey="claimActivityAdmin.notFound" fallback="Not found" />}
              value={summary.notFound}
            />
            <SummaryCard
              label={<AdminText i18nKey="claimActivityAdmin.claimsSubmitted" fallback="Claims submitted" />}
              value={summary.claimsSubmitted}
            />
            <SummaryCard
              label={<AdminText i18nKey="claimActivityAdmin.testLookups" fallback="Test lookups" />}
              value={summary.testLookups}
            />
          </div>

          <div className="admin-claim-activity-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="claimActivityAdmin.accessTime" fallback="Time" /></th>
                  <th style={thStyle}><AdminText i18nKey="contractAddressFields.country" fallback="Country" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimActivityAdmin.source" fallback="Source" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimActivityAdmin.device" fallback="Device" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimActivityAdmin.contract" fallback="Contract" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimActivityAdmin.project" fallback="Project" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimActivityAdmin.result" fallback="Result" /></th>
                </tr>
              </thead>
              <tbody>
                {!events.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={7}>
                      <AdminText i18nKey="claimActivityAdmin.noEvents" fallback="No claim activity events found." />
                    </td>
                  </tr>
                ) : null}
                {events.map((event) => {
                  const contract = event.kitchenContract;
                  const source = event.source || event.referrerHost || "direct";

                  return (
                    <tr key={event.id}>
                      <td style={tdStyle}><AdminDateTime value={event.createdAt} /></td>
                      <td style={tdStyle}><AdminCountryName code={event.countryCode} /></td>
                      <td style={tdStyle}>
                        <strong>
                          {source === "direct"
                            ? <AdminText i18nKey="claimActivityAdmin.directVisit" fallback="Direct visit" />
                            : source}
                        </strong>
                        {event.utmCampaign ? <span style={mutedLineStyle}>{event.utmCampaign}</span> : null}
                      </td>
                      <td style={tdStyle}>
                        {event.deviceType || <AdminText i18nKey="claimActivityAdmin.notCaptured" fallback="Not captured" />}
                        {event.browserFamily ? (
                          <span style={mutedLineStyle}>{event.browserFamily} · {event.operatingSystem}</span>
                        ) : null}
                      </td>
                      <td style={tdStyle}>
                        {contract ? (
                          <Link href={`/admin/contracts/${contract.id}`} style={contractLinkStyle}>{contract.contractNumber}</Link>
                        ) : event.contractNumberLast4 ? `••••${event.contractNumberLast4}` : "-"}
                        {contract?.kitchen?.name ? <span style={mutedLineStyle}>{contract.kitchen.name}</span> : null}
                      </td>
                      <td style={tdStyle}>
                        {contract?.project?.name || "-"}
                        {contract?.project?.housingCompany?.name ? (
                          <span style={mutedLineStyle}>{contract.project.housingCompany.name}</span>
                        ) : null}
                      </td>
                      <td style={tdStyle}><ClaimActivityResultBadge event={event} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const filterPanelStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  alignItems: "end",
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.16)",
  background: "linear-gradient(180deg, rgba(255,247,241,0.82), rgba(255,255,255,0.72))",
  padding: 14,
};

const filterFieldStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const filterInputStyle = {
  ...inputStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 11px",
  background: "rgba(255,255,255,0.94)",
  fontSize: "0.92rem",
  boxShadow: "none",
};

const filterActionsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "end",
  flexWrap: "wrap",
};

const filterApplyButtonStyle = {
  ...primaryButtonStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: "0.92rem",
  whiteSpace: "nowrap",
};

const filterClearLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  minHeight: 42,
  padding: "9px 12px",
  background: "rgba(255,255,255,0.88)",
  color: "var(--app-accent)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  fontWeight: 800,
  fontSize: "0.92rem",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};

const summaryGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  marginTop: 16,
  marginBottom: 18,
};

const summaryCardStyle = {
  borderRadius: 10,
  border: "1px solid rgba(143, 62, 44, 0.14)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,247,241,0.72))",
  padding: "14px 16px",
};

const summaryLabelStyle = {
  color: "var(--app-text-muted)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 8,
};

const summaryValueStyle = {
  fontSize: "1.7rem",
  letterSpacing: "-0.03em",
  color: "var(--app-text)",
};

const badgeBaseStyle = {
  display: "inline-flex",
  borderRadius: 999,
  padding: "6px 9px",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
  border: "1px solid transparent",
  whiteSpace: "nowrap",
};

const foundStyle = {
  ...badgeBaseStyle,
  color: "#1f6f43",
  background: "rgba(42, 145, 85, 0.12)",
  borderColor: "rgba(42, 145, 85, 0.22)",
};

const claimStyle = {
  ...badgeBaseStyle,
  color: "#1f4f7b",
  background: "rgba(47, 122, 186, 0.12)",
  borderColor: "rgba(47, 122, 186, 0.22)",
};

const testStyle = {
  ...badgeBaseStyle,
  color: "#7b5a11",
  background: "rgba(207, 145, 36, 0.12)",
  borderColor: "rgba(207, 145, 36, 0.22)",
};

const failedStyle = {
  ...badgeBaseStyle,
  color: "var(--app-danger-text)",
  background: "rgba(217, 92, 92, 0.12)",
  borderColor: "rgba(217, 92, 92, 0.22)",
};

const contractLinkStyle = {
  color: "var(--app-text)",
  textDecoration: "none",
  fontWeight: 900,
};

const mutedLineStyle = {
  display: "block",
  color: "var(--app-text-muted)",
  fontSize: 13,
  marginTop: 5,
};
