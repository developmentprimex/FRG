import Link from "next/link";
import {
  AdminSection,
  FlashMessage,
  pageGridStyle,
  inputStyle,
  primaryButtonStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminText, AdminTranslatedInput } from "../../../components/admin-i18n";
import { CancellationRequestsTable } from "../../../components/admin-order-cancellation-panel";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { listCancellationRequestsForAdmin } from "../../../lib/order-cancellations";

export const dynamic = "force-dynamic";

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

const STATUS_FILTERS = [
  { status: "RECEIVED", key: "orderCancellationsAdmin.filterOpen", fallback: "Open" },
  { status: "APPROVED", key: "orderCancellationsAdmin.filterApproved", fallback: "Approved" },
  { status: "REJECTED", key: "orderCancellationsAdmin.filterRejected", fallback: "Rejected" },
  { status: "ALL", key: "orderCancellationsAdmin.filterAll", fallback: "All" },
];

function getFilterHref(status, q = "") {
  const params = new URLSearchParams();
  if (status && status !== "RECEIVED") params.set("status", status);
  if (q) params.set("q", q);
  return `/admin/order-cancellations${params.size ? `?${params}` : ""}`;
}

export default async function AdminOrderCancellationsPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const requestedStatus = normalizeParam(resolvedSearchParams.status).trim().toUpperCase();
  const activeStatus = ["RECEIVED", "APPROVED", "REJECTED", "ALL"].includes(requestedStatus) ? requestedStatus : "RECEIVED";
  const q = normalizeParam(resolvedSearchParams.q).trim();

  const allRequests = await listCancellationRequestsForAdmin();
  const matchingRequests = allRequests.filter((request) => !q || [request.referenceNumber, request.consumerName, request.confirmationEmail, request.submittedContractNumber, request.order?.orderNumber].some((value) => String(value || "").toLocaleLowerCase().includes(q.toLocaleLowerCase())));
  const counts = matchingRequests.reduce(
    (summary, request) => {
      const status = String(request.status).toUpperCase();
      if (Object.prototype.hasOwnProperty.call(summary, status)) summary[status] += 1;
      return summary;
    },
    { RECEIVED: 0, APPROVED: 0, REJECTED: 0 },
  );
  const requests = activeStatus === "ALL"
    ? matchingRequests
    : matchingRequests.filter((request) => String(request.status).toUpperCase() === activeStatus);

  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="orderCancellationsAdmin.title" fallback="Cancellation requests" />}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action="/admin/order-cancellations" method="get" style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", padding: 14, border: "1px solid var(--app-border)", borderRadius: 8, background: "var(--app-surface-muted)" }}>
            <input type="hidden" name="status" value={activeStatus} />
            <label style={{ display: "grid", gap: 6, flex: "1 1 280px", fontSize: "var(--admin-text-label)", color: "var(--app-text-muted)" }}>
              <AdminText i18nKey="contractsAdmin.search" fallback="Search" />
              <AdminTranslatedInput name="q" defaultValue={q} placeholderKey="orderCancellationsAdmin.searchPlaceholder" placeholderFallback="Reference, customer, email, order or contract number..." style={{ ...inputStyle, minHeight: 42, borderRadius: 8, padding: "9px 11px" }} />
            </label>
            <button type="submit" style={{ ...primaryButtonStyle, minHeight: 42, borderRadius: 8, padding: "9px 14px" }}><AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" /></button>
            <Link href={getFilterHref(activeStatus)} style={{ ...filterStyle, borderRadius: 8, minHeight: 42 }}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
          </form>

          <div style={filterRowStyle}>
            {STATUS_FILTERS.map((filter) => {
              const isActive = activeStatus === filter.status;
              return (
                <Link
                  key={filter.status}
                  href={getFilterHref(filter.status, q)}
                  scroll={false}
                  style={isActive ? filterActiveStyle : filterStyle}
                >
                  <AdminText i18nKey={filter.key} fallback={filter.fallback} />
                  <span style={filterCountStyle}>{filter.status === "ALL" ? matchingRequests.length : counts[filter.status]}</span>
                </Link>
              );
            })}
          </div>

          <CancellationRequestsTable requests={requests} returnPath={getFilterHref(activeStatus, q)} />
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const filterRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const filterStyle = {
  textDecoration: "none",
  borderRadius: 999,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.82)",
  color: "var(--app-text-muted)",
  minHeight: 34,
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  padding: "7px 12px",
  fontSize: "var(--admin-text-meta)",
  fontWeight: 600,
};

const filterCountStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  minHeight: 22,
  borderRadius: 999,
  background: "rgba(143, 62, 44, 0.09)",
  fontSize: "var(--admin-text-label)",
};

const filterActiveStyle = {
  ...filterStyle,
  border: "1px solid rgba(143, 62, 44, 0.22)",
  background: "rgba(143, 62, 44, 0.11)",
  color: "var(--app-accent)",
};
