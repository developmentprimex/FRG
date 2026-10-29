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
import { AdminDatePicker } from "../../../components/admin-date-picker";
import {
  AdminCountryName,
  AdminDateTime,
  AdminText,
} from "../../../components/admin-i18n";
import { requireSuperAdminPage } from "../../../lib/admin-role-guards";
import {
  loadContractAccessPageData,
  normalizePublicVisitReportFilters,
} from "../../../lib/public-visit-reports";

export const dynamic = "force-dynamic";

function AccessResultBadge({ eventType }) {
  const isAccepted = eventType === "CONTRACT_ACCEPTED";
  const isTest = eventType === "CONTRACT_TEST_ACCEPTED";
  const style = isAccepted ? acceptedStyle : isTest ? testStyle : failedStyle;
  const key = isAccepted
    ? "contractAccessAdmin.accessAccepted"
    : isTest
      ? "contractAccessAdmin.accessTest"
      : "contractAccessAdmin.accessRejected";
  const fallback = isAccepted ? "Accepted" : isTest ? "Test" : "Access failed";

  return <span style={style}><AdminText i18nKey={key} fallback={fallback} /></span>;
}

export default async function AdminContractAccessPage({ searchParams = {} }) {
  const admin = await requireSuperAdminPage();
  const params = (await searchParams) || {};
  const filters = normalizePublicVisitReportFilters(params);
  const { events, page, total, totalPages } = await loadContractAccessPageData(filters, params.page);
  function pageHref(targetPage) {
    const query = new URLSearchParams({ page: String(targetPage) });
    if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) query.set("dateTo", filters.dateTo);
    return `/admin/contract-access?${query}`;
  }

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="contractAccessAdmin.title" fallback="Contract access" />}
          description={(
            <AdminText
              i18nKey="contractAccessAdmin.description"
              fallback="Successful, test, and failed contract access attempts for the selected date range. Access logs are kept indefinitely."
            />
          )}
        >
          <form action="/admin/contract-access" method="get" style={filterPanelStyle}>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" /></span>
              <AdminDatePicker name="dateFrom" defaultValue={filters.dateFrom} style={filterInputStyle} labelKey="ordersAdmin.dateFrom" label="Date from" />
            </label>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" /></span>
              <AdminDatePicker name="dateTo" defaultValue={filters.dateTo} style={filterInputStyle} labelKey="ordersAdmin.dateTo" label="Date to" />
            </label>
            <div style={filterActionsStyle}>
              <button type="submit" style={filterApplyButtonStyle}>
                <AdminText i18nKey="dashboard.apply" fallback="Apply" />
              </button>
              <Link href="/admin/contract-access" scroll={false} style={filterClearLinkStyle}>
                <AdminText i18nKey="dashboard.clearFilters" fallback="Clear filters" />
              </Link>
            </div>
          </form>

          <div className="admin-contract-access-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="contractAccessAdmin.accessTime" fallback="Time" /></th>
                  <th style={thStyle}><AdminText i18nKey="contractAddressFields.country" fallback="Country" /></th>
                  <th style={thStyle}><AdminText i18nKey="contractAccessAdmin.source" fallback="Source" /></th>
                  <th style={thStyle}><AdminText i18nKey="contractAccessAdmin.device" fallback="Device" /></th>
                  <th style={thStyle}><AdminText i18nKey="contractAccessAdmin.contract" fallback="Contract" /></th>
                  <th style={thStyle}><AdminText i18nKey="contractAccessAdmin.project" fallback="Project" /></th>
                  <th style={thStyle}><AdminText i18nKey="contractAccessAdmin.result" fallback="Result" /></th>
                </tr>
              </thead>
              <tbody>
                {!events.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={7}>
                      <AdminText i18nKey="contractAccessAdmin.noContractAccess" fallback="No contract access events found." />
                    </td>
                  </tr>
                ) : null}
                {events.map((event) => {
                  const contract = event.kitchenContract;
                  const source = event.source || event.referrerHost || "direct";

                  return (
                    <tr key={event.id}>
                      <td style={tdStyle}><AdminDateTime value={event.createdAt} timeZone="Europe/Berlin" /></td>
                      <td style={tdStyle}><AdminCountryName code={event.countryCode} /></td>
                      <td style={tdStyle}>
                        <strong>
                          {source === "direct"
                            ? <AdminText i18nKey="contractAccessAdmin.directVisit" fallback="Direct visit" />
                            : source}
                        </strong>
                        {event.utmCampaign ? <span style={mutedLineStyle}>{event.utmCampaign}</span> : null}
                      </td>
                      <td style={tdStyle}>
                        {event.deviceType || <AdminText i18nKey="contractAccessAdmin.notCaptured" fallback="Not captured" />}
                        {event.browserFamily ? (
                          <span style={mutedLineStyle}>{event.browserFamily} · {event.operatingSystem}</span>
                        ) : null}
                      </td>
                      <td style={tdStyle}>
                        {contract ? (
                          <Link href={`/admin/contracts/${contract.id}`} style={contractLinkStyle}>{contract.contractNumber}</Link>
                        ) : event.contractNumber || (event.contractNumberLast4 ? `••••${event.contractNumberLast4}` : "-")}
                        {contract?.kitchen?.name ? <span style={mutedLineStyle}>{contract.kitchen.name}</span> : null}
                      </td>
                      <td style={tdStyle}>
                        {contract?.project?.name || "-"}
                        {contract?.project?.housingCompany?.name ? (
                          <span style={mutedLineStyle}>{contract.project.housingCompany.name}</span>
                        ) : null}
                      </td>
                      <td style={tdStyle}><AccessResultBadge eventType={event.eventType} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav style={filterActionsStyle} aria-label="Contract access pages">
            <span>
              <AdminText i18nKey="contractAccessAdmin.page" fallback="Page" /> {page} / {totalPages}
              {" · "}{total} <AdminText i18nKey="contractAccessAdmin.entries" fallback="entries" />
            </span>
            {page > 1 ? (
              <Link href={pageHref(page - 1)} scroll={false} style={filterClearLinkStyle}>
                <AdminText i18nKey="contractAccessAdmin.newer" fallback="Newer entries" />
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} scroll={false} style={filterClearLinkStyle}>
                <AdminText i18nKey="contractAccessAdmin.older" fallback="Older entries" />
              </Link>
            ) : null}
          </nav>
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

const acceptedStyle = {
  ...badgeBaseStyle,
  color: "#1f6f43",
  background: "rgba(42, 145, 85, 0.12)",
  borderColor: "rgba(42, 145, 85, 0.22)",
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
