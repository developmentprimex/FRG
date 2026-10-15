import { calculateOrderReportSummary } from "../../../lib/admin-order-reports";
import Link from "next/link";
import {
  AdminSection,
  FlashMessage,
  cardListStyle,
  inputStyle,
  itemCardStyle,
  pageGridStyle,
  primaryButtonStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminEmailDeliveryStatus } from "../../../components/admin-order-email-delivery";
import { attachOrderEmailDelivery } from "../../../lib/email/order-email-store";
import { AdminPagination } from "../../../components/admin-pagination";
import {
  AdminDateTime,
  AdminPluralText,
  AdminStatusBadge,
  AdminText,
  AdminTranslatedInput,
} from "../../../components/admin-i18n";
import AdminSelect from "../../../components/admin-select";
import AdminConfirmSubmitButton from "../../../components/admin-confirm-submit-button";
import { getFormMessage } from "../../../lib/admin-forms";
import { getOrdersForAdmin, getTestOrdersForAdmin, listKitchensForAdmin } from "../../../lib/catalog";
import { requireAdminPage } from "../../../lib/auth";
import { paginateAdminItems } from "../../../lib/admin-pagination";

export const dynamic = "force-dynamic";

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getArticleCodes(items = []) {
  const codes = [...new Set(items.map((item) => item.code).filter(Boolean))];
  return codes;
}

function getOrderContractNumber(order) {
  return String(order?.contractNumber || order?.kitchenContract?.contractNumber || "").trim();
}

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function ItemCount({ count }) {
  return (
    <AdminPluralText
      count={count}
      singularKey="ordersAdmin.itemCountSingular"
      pluralKey="ordersAdmin.itemCountPlural"
      singularFallback="{count} item"
      pluralFallback="{count} items"
    />
  );
}

function PaymentStatusBadge({ status }) {
  const value = String(status || "UNPAID").toUpperCase();
  const style = value === "PAID"
    ? paymentStatusPaidStyle
    : value === "PENDING"
      ? paymentStatusPendingStyle
      : value === "FAILED"
        ? paymentStatusFailedStyle
        : value === "CANCELLED"
          ? paymentStatusFailedStyle
        : paymentStatusUnpaidStyle;

  return (
    <span style={style}>
      <AdminText i18nKey={`reportsAdmin.paymentStatus.${value.toLowerCase()}`} fallback={value} />
    </span>
  );
}

function DeleteOrderAction({ orderId, compact = false }) {
  return (
    <form action={`/api/admin/orders/${orderId}`} method="post" style={deleteFormStyle}>
      <AdminConfirmSubmitButton
        name="_intent"
        value="delete"
        style={compact ? compactDeleteButtonStyle : deleteButtonStyle}
        confirmKey="ordersAdmin.deleteConfirmMessage"
        confirmFallback={"Delete this order?\nThis action cannot be undone."}
      >
        <AdminText i18nKey="ordersAdmin.delete" fallback="Delete" />
      </AdminConfirmSubmitButton>
    </form>
  );
}

function DeleteAllPxOrdersAction() {
  return <form action="/api/admin/px-orders" method="post" style={deleteFormStyle}>
    <AdminConfirmSubmitButton name="_intent" value="delete-all" style={deleteButtonStyle} confirmKey="pxOrdersAdmin.deleteAllConfirm" confirmFallback={"Delete all PX orders?\nThis removes every test order and cannot be undone."}>
      <AdminText i18nKey="pxOrdersAdmin.deleteAll" fallback="Delete all PX orders" />
    </AdminConfirmSubmitButton>
  </form>;
}

export default async function AdminOrdersPage({ searchParams = {}, pxOnly = false }) {
  const admin = await requireAdminPage();
  const basePath = pxOnly ? "/admin/px-orders" : "/admin/orders";
  const resolvedSearchParams = (await searchParams) || {};
  const filters = {
    q: normalizeParam(resolvedSearchParams.q).trim(),
    kitchenId: pxOnly ? normalizeParam(resolvedSearchParams.kitchenId).trim() : "",
    status: normalizeParam(resolvedSearchParams.status).trim(),
    dateFrom: normalizeParam(resolvedSearchParams.dateFrom).trim(),
    dateTo: normalizeParam(resolvedSearchParams.dateTo).trim(),
  };
  const [allOrders, kitchens] = await Promise.all([
    pxOnly ? getTestOrdersForAdmin(filters) : getOrdersForAdmin(filters),
    pxOnly ? listKitchensForAdmin() : Promise.resolve([]),
  ]);
  const pagination = paginateAdminItems(allOrders, resolvedSearchParams.page);
  const orders = await attachOrderEmailDelivery(pagination.items, pxOnly ? "test" : "live");
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const summary = calculateOrderReportSummary(allOrders);
  const rowNumber = (index) => pagination.totalItems - (pagination.page - 1) * pagination.pageSize - index;

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={pxOnly ? <AdminText i18nKey="pxOrdersAdmin.title" fallback="PX orders" /> : <AdminText i18nKey="ordersAdmin.orders" fallback="Orders" />}
          actions={pxOnly ? <DeleteAllPxOrdersAction /> : undefined}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <div style={summaryPanelStyle}>
            <dl className="orders-summary" style={summaryGridStyle}>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="reportsAdmin.totalOrders" fallback="Total orders" /></dt><dd style={summaryValueStyle}>{summary.totalOrders}</dd></div>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="dashboard.statusNew" fallback="New" /></dt><dd style={summaryValueStyle}>{summary.statusCounts.NEW}</dd></div>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="dashboard.statusEmailed" fallback="Emailed" /></dt><dd style={summaryValueStyle}>{summary.statusCounts.EMAILED}</dd></div>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="dashboard.statusConfirmed" fallback="Confirmed" /></dt><dd style={summaryValueStyle}>{summary.statusCounts.CONFIRMED}</dd></div>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="dashboard.statusCancelled" fallback="Cancelled" /></dt><dd style={summaryValueStyle}>{summary.statusCounts.CANCELLED}</dd></div>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="reportsAdmin.netWithoutVat" fallback="Net without VAT" /></dt><dd style={summaryValueStyle}>{formatCurrency(summary.confirmedNet)}</dd></div>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="reportsAdmin.vatTotal" fallback="VAT total (19%)" /></dt><dd style={summaryValueStyle}>{formatCurrency(summary.confirmedVat)}</dd></div>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="reportsAdmin.totalWithVat" fallback="Total with VAT" /></dt><dd style={{ ...summaryValueStyle, fontWeight: 700 }}>{formatCurrency(summary.confirmedGross)}</dd></div>
            </dl>
          </div>

          <form action={basePath} method="get" style={filterPanelStyle}>
            <div className="orders-filter-grid" style={{ ...filterGridStyle, gridTemplateColumns: pxOnly ? filterGridStyle.gridTemplateColumns : "minmax(0, 2fr) repeat(2, minmax(0, 1fr)) max-content" }}>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="contractsAdmin.search" fallback="Search" /></span>
                <AdminTranslatedInput
                  name="q"
                  defaultValue={filters.q}
                  placeholderKey="ordersAdmin.searchPlaceholder"
                  placeholderFallback="Order, customer, contract, city..."
                  style={filterInputStyle}
                />
              </label>
              {pxOnly ? <label style={filterFieldStyle}>
                <span><AdminText i18nKey="dashboard.kitchen" fallback="Kitchen" /></span>
                <AdminSelect name="kitchenId" defaultValue={filters.kitchenId} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="dashboard.allKitchens" fallback="All kitchens" /></option>
                  {kitchens.map((kitchen) => (
                    <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>
                  ))}
                </AdminSelect>
              </label> : null}
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" /></span>
                <input name="dateFrom" type="date" defaultValue={filters.dateFrom} style={filterInputStyle} />
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" /></span>
                <input name="dateTo" type="date" defaultValue={filters.dateTo} style={filterInputStyle} />
              </label>
              <div style={filterActionsStyle}>
                <button type="submit" style={filterApplyButtonStyle}><AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" /></button>
                <Link href={basePath} scroll={false} style={filterClearLinkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
              </div>
            </div>
          </form>

          <div className="admin-list-table" style={{ ...tableWrapStyle, borderRadius: 4 }}>
            <table style={ordersTableStyle}>
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "9%" }} />
                <col className="orders-table-optional" style={{ width: "7%" }} />
                <col className="orders-table-date" style={{ width: "10%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...ordersThStyle, paddingLeft: 12, paddingRight: 12, textAlign: "center", letterSpacing: "0.04em" }}><AdminText i18nKey="usersAdmin.orderNr" fallback="No." /></th>
                  <th style={ordersThStyle}><AdminText i18nKey="ordersAdmin.order" fallback="Order" /></th>
                  <th style={ordersThStyle}><AdminText i18nKey="ordersAdmin.customer" fallback="Customer" /></th>
                  <th style={ordersThStyle}><AdminText i18nKey="ordersAdmin.items" fallback="Items" /></th>
                  <th style={ordersThStyle}><AdminText i18nKey="ordersAdmin.status" fallback="Status" /></th>
                  <th style={ordersThStyle}><AdminText i18nKey="reportsAdmin.payment" fallback="Payment" /></th>
                  <th style={ordersThStyle}><AdminText i18nKey="ordersAdmin.total" fallback="Total" /></th>
                  <th className="orders-table-optional" style={ordersThStyle}><AdminText i18nKey="contractAddressFields.city" fallback="City" /></th>
                  <th className="orders-table-date" style={ordersThStyle}><AdminText i18nKey="ordersAdmin.created" fallback="Created" /></th>
                  <th style={ordersThStyle}><AdminText i18nKey="orderEmailDelivery.column" fallback="Email status" /></th>
                  <th style={ordersThStyle}><AdminText i18nKey="ordersAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!orders.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={11}><AdminText i18nKey="ordersAdmin.noOrdersFound" fallback="No orders found." /></td>
                  </tr>
                ) : null}
                {orders.map((order, index) => {
                  const contractNumber = getOrderContractNumber(order);
                  const articleCodes = getArticleCodes(order.items);
                  return (
                  <tr key={order.id} className="orders-table-row" style={orderRowStyle}>
                    <td style={{ ...ordersTdStyle, padding: "16px 12px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap", overflowWrap: "normal", wordBreak: "normal", fontVariantNumeric: "tabular-nums", fontSize: "var(--admin-text-label)", fontWeight: 500, color: "var(--app-text-muted)" }}>{rowNumber(index)}</td>
                    <td style={ordersTdStyle}>
                      <Link href={`${basePath}/${order.id}`} style={orderLinkStyle}>
                        <strong>{order.orderNumber}</strong>
                      </Link>
                    </td>
                    <td style={ordersTdStyle}>
                      <div style={customerNameStyle}>{order.firstName} {order.lastName}</div>
                      <div style={customerEmailStyle}>{order.email}</div>
                    </td>
                    <td style={ordersTdStyle}>
                      <span style={articleCountStyle} title={articleCodes.join(", ")}>
                        <ItemCount count={order.items.length} />
                      </span>
                    </td>
                    <td style={ordersTdStyle}>
                      <AdminStatusBadge status={order.status} />

                    </td>
                    <td style={ordersTdStyle}><PaymentStatusBadge status={order.paymentStatus} /></td>
                    <td style={ordersTdStyle}><strong style={totalStyle}>{formatCurrency(order.totalPrice)}</strong></td>
                    <td className="orders-table-optional" style={{ ...ordersTdStyle, overflowWrap: "normal", wordBreak: "normal" }}>{order.city || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</td>
                    <td className="orders-table-date" style={ordersTdStyle}><AdminDateTime value={order.createdAt} /></td>
                    <td style={ordersTdStyle}><AdminEmailDeliveryStatus delivery={order.confirmationEmailDelivery} /></td>
                    <td style={ordersActionTdStyle}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap" }}>
                        <Link href={`${basePath}/${order.id}`} style={viewButtonStyle}>
                          <AdminText i18nKey="ordersAdmin.view" fallback="View" />
                        </Link>

                        {!pxOnly ? <DeleteOrderAction orderId={order.id} /> : null}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards" style={{ gap: cardListStyle.gap }}>
            {!orders.length ? <p style={{ margin: 0, color: "var(--app-text-muted)" }}><AdminText i18nKey="ordersAdmin.noOrdersFound" fallback="No orders found." /></p> : null}
            {orders.map((order, index) => {
              const contractNumber = getOrderContractNumber(order);
              const articleCodes = getArticleCodes(order.items);
              return (
              <article key={order.id} style={itemCardStyle}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={mobileLabelStyle}><AdminText i18nKey="usersAdmin.orderNr" fallback="No." /> {rowNumber(index)}</span>
                      <span style={mobileLabelStyle}><AdminText i18nKey="ordersAdmin.mobileOrderNumber" fallback="Order number" /></span>
                      <Link href={`${basePath}/${order.id}`} style={orderLinkStyle}>
                        <strong style={{ fontSize: "var(--admin-text-body)" }}>{order.orderNumber}</strong>
                      </Link>
                    </div>
                    <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                      <AdminStatusBadge status={order.status} />

                      <PaymentStatusBadge status={order.paymentStatus} />
                      <strong style={totalStyle}>{formatCurrency(order.totalPrice)}</strong>
                    </div>
                  </div>
                  <div style={mobileCardGridStyle}>
                    <div>
                      <span style={mobileLabelStyle}><AdminText i18nKey="orderEmailDelivery.column" fallback="Email status" /></span>
                      <AdminEmailDeliveryStatus delivery={order.confirmationEmailDelivery} />
                    </div>
                    <div>
                      <span style={mobileLabelStyle}><AdminText i18nKey="ordersAdmin.customer" fallback="Customer" /></span>
                      <strong>{order.firstName} {order.lastName}</strong>
                      <span style={mobileMutedLineStyle}>{order.email}</span>
                    </div>
                    <div>
                      <span style={mobileLabelStyle}><AdminText i18nKey="contractAddressFields.city" fallback="City" /></span>
                      <span style={mobileMutedLineStyle}>{order.city || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</span>
                    </div>
                    <div>
                      <span style={mobileLabelStyle}><AdminText i18nKey="ordersAdmin.created" fallback="Created" /></span>
                      <strong><AdminDateTime value={order.createdAt} /></strong>
                    </div>
                    <div>
                      <span style={mobileLabelStyle}><AdminText i18nKey="ordersAdmin.mobileItemCount" fallback="Item count" /></span>
                      <strong title={articleCodes.join(", ")}><ItemCount count={order.items.length} /></strong>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={cardActionRowStyle}>
                      <Link href={`${basePath}/${order.id}`} style={viewButtonStyle}>
                        <AdminText i18nKey="ordersAdmin.viewOrder" fallback="View order" />
                      </Link>

                        {!pxOnly ? <DeleteOrderAction orderId={order.id} compact /> : null}
                    </div>
                  </div>
                </div>
              </article>
              );
            })}
          </div>

          <AdminPagination basePath={basePath} searchParams={resolvedSearchParams} {...pagination} />

          <style>{`
            .orders-summary > div {
              min-width: 0;
              padding: 14px 16px;
              border: 1px solid var(--summary-border, #e4dbd1);
              border-radius: 12px;
              background: var(--summary-bg, #f7f3ee);
              color: var(--summary-color, #6b503b);
            }

            .orders-summary > div:nth-child(2) {
              --summary-bg: #eef5ff;
              --summary-border: #d6e5fa;
              --summary-color: #315e97;
            }

            .orders-summary > div:nth-child(3) {
              --summary-bg: #f3effb;
              --summary-border: #e3daf3;
              --summary-color: #73539c;
            }

            .orders-summary > div:nth-child(4) {
              --summary-bg: #edf7f0;
              --summary-border: #d2e9d9;
              --summary-color: #2d754b;
            }

            .orders-summary > div:nth-child(5) {
              --summary-bg: #fff1ef;
              --summary-border: #f3dcd7;
              --summary-color: #ad5147;
            }

            .orders-summary > div:nth-child(6),
            .orders-summary > div:nth-child(7) {
              --summary-bg: #faf5e9;
              --summary-border: #eee2c5;
              --summary-color: #87682e;
            }

            .orders-summary > div:last-child {
              --summary-bg: #6d503b;
              --summary-border: #6d503b;
              --summary-color: #fff;
            }

            .admin-list-cards {
              display: none;
            }

            .orders-table-row:hover {
              background: rgba(143, 62, 44, 0.045);
            }

            .orders-table-row a:focus-visible,
            .admin-list-cards a:focus-visible,
            button:focus-visible {
              outline: 3px solid rgba(143, 62, 44, 0.24);
              outline-offset: 2px;
            }

            @media (max-width: 1400px) {
              .orders-filter-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            }

            @media (max-width: 800px) {
              .orders-filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            }

            @media (max-width: 480px) {
              .orders-filter-grid { grid-template-columns: minmax(0, 1fr) !important; }
            }

            @media (max-width: 1180px) {
              .orders-table-optional {
                display: none;
              }
            }

            @media (max-width: 980px) {
              .orders-table-date {
                display: none;
              }
            }

            @media (max-width: 1100px) {
              .admin-list-table {
                display: none;
              }

              .admin-list-cards {
                display: grid;
              }
            }
          `}</style>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const orderLinkStyle = {
  color: "var(--app-text)",
  textDecoration: "none",
  fontWeight: 600,
};

const ordersTableStyle = {
  ...tableStyle,
  minWidth: 1280,
};

const ordersThStyle = {
  ...thStyle,
  whiteSpace: "nowrap",
  overflowWrap: "normal",
  wordBreak: "normal",
};

const ordersTdStyle = {
  ...tdStyle,
  padding: "16px 12px",
  verticalAlign: "middle",
};

const ordersActionTdStyle = {
  ...ordersTdStyle,
  whiteSpace: "nowrap",
};

const orderRowStyle = {
  transition: "background 160ms ease",
};

const articleCountStyle = {
  display: "inline-flex",
  borderRadius: 999,
  padding: "6px 8px",
  background: "rgba(115, 80, 55, 0.08)",
  border: "1px solid rgba(115, 80, 55, 0.12)",
  color: "var(--app-accent)",
  fontSize: "var(--admin-text-label)",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const paymentStatusBaseStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 8px",
  border: "1px solid transparent",
  fontSize: "var(--admin-text-label)",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const paymentStatusPaidStyle = {
  ...paymentStatusBaseStyle,
  color: "#1f6f43",
  background: "rgba(42, 145, 85, 0.12)",
  borderColor: "rgba(42, 145, 85, 0.22)",
};

const paymentStatusPendingStyle = {
  ...paymentStatusBaseStyle,
  color: "#8a5a13",
  background: "rgba(207, 145, 36, 0.12)",
  borderColor: "rgba(207, 145, 36, 0.22)",
};

const paymentStatusFailedStyle = {
  ...paymentStatusBaseStyle,
  color: "var(--app-danger-text)",
  background: "rgba(217, 92, 92, 0.12)",
  borderColor: "rgba(217, 92, 92, 0.22)",
};

const paymentStatusUnpaidStyle = {
  ...paymentStatusBaseStyle,
  color: "var(--app-text-muted)",
  background: "rgba(115, 80, 55, 0.07)",
  borderColor: "rgba(115, 80, 55, 0.12)",
};

const deleteFormStyle = {
  margin: 0,
};

const deleteButtonStyle = {
  border: "1px solid rgba(217, 92, 92, 0.24)",
  background: "rgba(255,255,255,0.72)",
  color: "var(--app-danger-text)",
  minHeight: 38,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: "var(--admin-text-meta)",
  boxShadow: "none",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const cardActionRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const compactDeleteButtonStyle = {
  ...deleteButtonStyle,
  minHeight: 38,
};

const rowActionStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
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
  fontWeight: 600,
  fontSize: "var(--admin-text-meta)",
  whiteSpace: "nowrap",
};

const customerNameStyle = {
  fontWeight: 600,
};

const customerEmailStyle = {
  color: "var(--app-text-muted)",
  marginTop: 6,
  fontSize: "var(--admin-text-meta)",
};

const totalStyle = {
  whiteSpace: "nowrap",
  fontWeight: 600,
  color: "var(--app-text)",
};

const summaryPanelStyle = {
  padding: "12px 0",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 10,
  margin: 0,
};

const summaryLabelStyle = {
  color: "inherit",
  fontSize: "var(--admin-text-label)",
  opacity: 0.85,
  marginBottom: 8,
};

const summaryValueStyle = {
  margin: 0,
  fontSize: "var(--admin-text-metric)",
  fontWeight: 700,
  lineHeight: 1.2,
};

const mobileCardGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const mobileLabelStyle = {
  display: "block",
  color: "var(--app-text-muted)",
  fontSize: "var(--admin-text-label)",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 4,
};

const mobileMutedLineStyle = {
  display: "block",
  color: "var(--app-text-muted)",
  fontSize: "var(--admin-text-meta)",
  marginTop: 4,
};

const filterGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(4, minmax(0, 1fr)) max-content",
  alignItems: "end",
};

const filterPanelStyle = {
  display: "grid",
  gap: 12,
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.16)",
  background: "linear-gradient(180deg, rgba(255,247,241,0.82), rgba(255,255,255,0.72))",
  padding: 14,
  marginBottom: 16,
};

const filterHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const filterEyebrowStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 10px",
  background: "rgba(143, 62, 44, 0.1)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  color: "var(--app-accent)",
  fontSize: "var(--admin-text-label)",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const filterHintStyle = {
  color: "var(--app-text-muted)",
  fontSize: "var(--admin-text-meta)",
  fontWeight: 700,
};

const filterFieldStyle = {
  minWidth: 0,
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: "var(--admin-text-label)",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const filterInputStyle = {
  minWidth: 0,
  ...inputStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 11px",
  background: "rgba(255,255,255,0.94)",
  fontSize: "var(--admin-text-body)",
  boxShadow: "none",
};

const filterActionsStyle = {
  minWidth: 0,
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
  fontSize: "var(--admin-text-body)",
  whiteSpace: "nowrap",
  boxShadow: "0 10px 20px rgba(143, 62, 44, 0.16)",
};

const filterClearLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  minHeight: 42,
  padding: "9px 12px",
  background: "rgba(255,255,255,0.88)",
  color: "var(--app-accent)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  fontWeight: 600,
  fontSize: "var(--admin-text-body)",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};
