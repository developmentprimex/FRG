import { prisma } from "../../../lib/prisma";
import { attachWorkProcessing } from "../../../lib/work-processing";
import { filterAndSortWork, summarizeWork, workUiItem, workRowStyle } from "../../../lib/work-processing-rules";
import { WorkCell, WorkActions, WorkActionStack, WorkFilter, WorkSummary } from "../../../components/admin-work-processing";
import Link from "next/link";
import { AdminEmailDeliveryStatus } from "../../../components/admin-order-email-delivery";
import { attachOrderEmailDelivery } from "../../../lib/email/order-email-store";
import {
  AdminSection,
  FlashMessage,
  pageGridStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import {
  AdminDateTime,
  AdminKitchenDisplayName,
  AdminPluralText,
  AdminStatusBadge,
  AdminText,
  AdminTranslatedInput,
} from "../../../components/admin-i18n";
import AdminConfirmSubmitButton from "../../../components/admin-confirm-submit-button";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { getTestOrdersForAdmin } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function PaymentStatusBadge({ status }) {
  const value = String(status || "UNPAID").toUpperCase();
  const tone = value === "PAID" ? "#1f6f43" : value === "PENDING" ? "#8a5a13" : value === "UNPAID" ? "var(--app-text-muted)" : "var(--app-danger-text)";
  return (
    <span style={{ ...badgeStyle, color: tone }}>
      <AdminText i18nKey={`reportsAdmin.paymentStatus.${value.toLowerCase()}`} fallback={value} />
    </span>
  );
}

function DeleteAllPxOrdersAction() {
  return (
    <form action="/api/admin/px-orders" method="post" style={{ margin: 0 }}>
      <AdminConfirmSubmitButton
        name="_intent"
        value="delete-all"
        style={deleteButtonStyle}
        confirmKey="pxOrdersAdmin.deleteAllConfirm"
        confirmFallback={"Delete all PX orders?\nThis removes every test order and cannot be undone."}
      >
        <AdminText i18nKey="pxOrdersAdmin.deleteAll" fallback="Delete all PX orders" />
      </AdminConfirmSubmitButton>
    </form>
  );
}

export default async function AdminPxOrdersPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const filters = {
    q: normalizeParam(resolvedSearchParams.q).trim(),
    status: normalizeParam(resolvedSearchParams.status).trim(),
    dateFrom: normalizeParam(resolvedSearchParams.dateFrom).trim(),
    dateTo: normalizeParam(resolvedSearchParams.dateTo).trim(),
  };
  const trackedOrders = await attachWorkProcessing(prisma, await getTestOrdersForAdmin(filters), "TEST_ORDER");
  const processingFilter = normalizeParam(resolvedSearchParams.processing);
  const orders = await attachOrderEmailDelivery(filterAndSortWork(trackedOrders, processingFilter), "test");
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="pxOrdersAdmin.title" fallback="PX orders" />}
          description={(
            <AdminPluralText
              count={orders.length}
              singularKey="pxOrdersAdmin.matchingOrder"
              pluralKey="pxOrdersAdmin.matchingOrders"
              singularFallback="{count} test order matches the current filters."
              pluralFallback="{count} test orders match the current filters."
            />
          )}
          actions={<DeleteAllPxOrdersAction />}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <WorkSummary counts={summarizeWork(trackedOrders)} />
          <form action="/admin/px-orders" method="get" style={filterPanelStyle}>
            <WorkFilter value={processingFilter} />
            <AdminTranslatedInput
              name="q"
              defaultValue={filters.q}
              placeholderKey="ordersAdmin.searchPlaceholder"
              placeholderFallback="Order, customer, contract, city..."
              style={filterInputStyle}
            />
            <select name="status" defaultValue={filters.status} style={filterInputStyle}>
              <option value=""><AdminText i18nKey="dashboard.allStatuses" fallback="All statuses" /></option>
              <option value="NEW"><AdminText i18nKey="status.new" fallback="New" /></option>
              <option value="EMAILED"><AdminText i18nKey="status.emailed" fallback="Emailed" /></option>
              <option value="CONFIRMED"><AdminText i18nKey="status.confirmed" fallback="Confirmed" /></option>
              <option value="CANCELLED"><AdminText i18nKey="status.cancelled" fallback="Cancelled" /></option>
            </select>
            <input name="dateFrom" type="date" defaultValue={filters.dateFrom} style={filterInputStyle} />
            <input name="dateTo" type="date" defaultValue={filters.dateTo} style={filterInputStyle} />
            <button type="submit" style={filterButtonStyle}>
              <AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" />
            </button>
            <Link href="/admin/px-orders" style={clearLinkStyle}>
              <AdminText i18nKey="contractsAdmin.clear" fallback="Clear" />
            </Link>
          </form>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.order" fallback="Order" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.customer" fallback="Customer" /></th>
                  <th style={{ ...thStyle, width: 150 }}><AdminText i18nKey="workProcessing.processing" fallback="Processing" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.kitchen" fallback="Kitchen" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.status" fallback="Status" /></th>
                  <th style={thStyle}><AdminText i18nKey="reportsAdmin.payment" fallback="Payment" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.total" fallback="Total" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.created" fallback="Created" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderEmailDelivery.column" fallback="Email status" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!orders.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={10}>
                      <AdminText i18nKey="pxOrdersAdmin.noOrders" fallback="No PX orders found." />
                    </td>
                  </tr>
                ) : null}
                {orders.map((order) => (
                  <tr key={order.id} style={workRowStyle(order)}>
                    <td style={tdStyle}>
                      <Link href={`/admin/px-orders/${order.id}`} style={orderLinkStyle}>{order.orderNumber}</Link>
                      <div style={metaStyle}>
                        <AdminText i18nKey="contractsAdmin.contract" fallback="Contract" /> <strong>{order.contractNumber || "-"}</strong>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <strong>{order.firstName} {order.lastName}</strong>
                      <div style={metaStyle}>{order.email}</div>
                    </td>
                    <td style={tdStyle}><WorkCell item={workUiItem(order)} /></td>
                    <td style={tdStyle}><AdminKitchenDisplayName slug={order.kitchen.slug} name={order.kitchen.name} /></td>
                    <td style={tdStyle}><AdminStatusBadge status={order.status} /></td>
                    <td style={tdStyle}><PaymentStatusBadge status={order.paymentStatus} /></td>
                    <td style={tdStyle}><strong>{formatCurrency(order.totalPrice)}</strong></td>
                    <td style={tdStyle}><AdminDateTime value={order.createdAt} /></td>
                    <td style={tdStyle}><AdminEmailDeliveryStatus delivery={order.confirmationEmailDelivery} /></td>
                    <td style={tdStyle}>

                      <WorkActionStack><Link href={`/admin/px-orders/${order.id}`} style={viewButtonStyle}>
                        <AdminText i18nKey="ordersAdmin.view" fallback="View" />
                      </Link>
                      <WorkActions item={workUiItem(order)} compact /></WorkActionStack>
                    </td>
                  </tr>
                ))}
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
  gridTemplateColumns: "minmax(220px, 1fr) repeat(3, minmax(140px, 180px)) auto auto",
  gap: 10,
  alignItems: "center",
};

const filterInputStyle = {
  minHeight: 42,
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  padding: "9px 11px",
  background: "rgba(255,255,255,0.94)",
};

const filterButtonStyle = {
  minHeight: 42,
  borderRadius: 8,
  border: "1px solid var(--color-primary)",
  background: "var(--color-primary)",
  color: "var(--app-accent-contrast)",
  fontWeight: 800,
  padding: "9px 14px",
};

const clearLinkStyle = {
  minHeight: 42,
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  color: "var(--app-accent)",
  fontWeight: 800,
};

const orderLinkStyle = {
  color: "var(--app-text)",
  textDecoration: "none",
  fontWeight: 900,
};

const metaStyle = {
  marginTop: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
};

const badgeStyle = {
  display: "inline-flex",
  borderRadius: 999,
  padding: "7px 10px",
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.72)",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const viewButtonStyle = {
  textDecoration: "none",
  minHeight: 38,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  padding: "9px 12px",
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  color: "var(--app-accent)",
  fontWeight: 800,
};

const deleteButtonStyle = {
  border: "1px solid rgba(217, 92, 92, 0.24)",
  background: "rgba(217, 92, 92, 0.1)",
  color: "var(--app-danger-text)",
  minHeight: 42,
  borderRadius: 8,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};
