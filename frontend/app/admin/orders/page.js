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
  AdminKitchenDisplayName,
  AdminPluralText,
  AdminStatusBadge,
  AdminText,
  AdminTranslatedInput,
} from "../../../components/admin-i18n";
import AdminSelect from "../../../components/admin-select";
import AdminConfirmSubmitButton from "../../../components/admin-confirm-submit-button";
import { getFormMessage } from "../../../lib/admin-forms";
import { getOrdersForAdmin, listKitchensForAdmin } from "../../../lib/catalog";
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

function formatOrdinal(value) {
  const number = Number(value || 0);
  if (!number) return "";
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  const suffix = number % 10 === 1 ? "st" : number % 10 === 2 ? "nd" : number % 10 === 3 ? "rd" : "th";
  return `${number}${suffix}`;
}

function getContractOrderLabel(order) {
  if (!order.contractOrderSequence) return "";
  return formatOrdinal(order.contractOrderSequence);
}

function getContractOrderKey(sequence) {
  const number = Number(sequence || 0);
  if (number === 1) return "ordersAdmin.firstOrderForContract";
  if (number === 2) return "ordersAdmin.secondOrderForContract";
  if (number === 3) return "ordersAdmin.thirdOrderForContract";
  return "ordersAdmin.nthOrderForContract";
}

function getOrderContractNumber(order) {
  return String(order?.contractNumber || order?.kitchenContract?.contractNumber || "").trim();
}

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getStatusHref(filters, status) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.kitchenId) params.set("kitchenId", filters.kitchenId);
  if (status) params.set("status", status);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

function getOrderSummary(orders) {
  const initial = {
    NEW: 0,
    EMAILED: 0,
    CONFIRMED: 0,
    CANCELLED: 0,
    revenue: 0,
  };

  return orders.reduce((summary, order) => {
    if (Object.prototype.hasOwnProperty.call(summary, order.status)) {
      summary[order.status] += 1;
    }
    summary.revenue += Number(order.totalPrice || 0);
    return summary;
  }, initial);
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

function DeleteAllOrdersAction() {
  return (
    <form action="/api/admin/orders" method="post" style={deleteFormStyle}>
      <AdminConfirmSubmitButton
        name="_intent"
        value="delete-all"
        style={deleteAllButtonStyle}
        confirmKey="ordersAdmin.deleteAllConfirmMessage"
        confirmFallback={"Delete all orders?\nThis removes every order and cannot be undone."}
      >
        <AdminText i18nKey="ordersAdmin.deleteAllOrders" fallback="Delete all orders" />
      </AdminConfirmSubmitButton>
    </form>
  );
}

export default async function AdminOrdersPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const filters = {
    q: normalizeParam(resolvedSearchParams.q).trim(),
    kitchenId: normalizeParam(resolvedSearchParams.kitchenId).trim(),
    status: normalizeParam(resolvedSearchParams.status).trim(),
    dateFrom: normalizeParam(resolvedSearchParams.dateFrom).trim(),
    dateTo: normalizeParam(resolvedSearchParams.dateTo).trim(),
  };
  const [rawOrders, kitchens] = await Promise.all([
    getOrdersForAdmin(filters),
    listKitchensForAdmin(),
  ]);
  const allOrders = rawOrders;
  const pagination = paginateAdminItems(allOrders, resolvedSearchParams.page);
  const orders = await attachOrderEmailDelivery(pagination.items);
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const summary = getOrderSummary(allOrders);
  const statusFilters = [
    { status: "", key: "ordersAdmin.all", fallback: "All" },
    { status: "NEW", key: "dashboard.statusNew", fallback: "New" },
    { status: "EMAILED", key: "dashboard.statusEmailed", fallback: "Emailed" },
    { status: "CONFIRMED", key: "dashboard.statusConfirmed", fallback: "Confirmed" },
    { status: "CANCELLED", key: "dashboard.statusCancelled", fallback: "Cancelled" },
  ];

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="ordersAdmin.orders" fallback="Orders" />}
          description={(
            <AdminPluralText
              count={orders.length}
              singularKey="ordersAdmin.orderMatchesCurrentFilters"
              pluralKey="ordersAdmin.ordersMatchCurrentFilters"
              singularFallback="{count} order matches the current filters."
              pluralFallback="{count} orders match the current filters."
            />
          )}
          actions={<DeleteAllOrdersAction />}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <div style={summaryGridStyle}>
            <div style={summaryCardStyle}>
              <span><AdminText i18nKey="dashboard.statusNew" fallback="New" /></span>
              <strong>{summary.NEW}</strong>
            </div>
            <div style={summaryCardStyle}>
              <span><AdminText i18nKey="dashboard.statusEmailed" fallback="Emailed" /></span>
              <strong>{summary.EMAILED}</strong>
            </div>
            <div style={summaryCardStyle}>
              <span><AdminText i18nKey="dashboard.statusConfirmed" fallback="Confirmed" /></span>
              <strong>{summary.CONFIRMED}</strong>
            </div>
            <div style={summaryCardStyle}>
              <span><AdminText i18nKey="dashboard.statusCancelled" fallback="Cancelled" /></span>
              <strong>{summary.CANCELLED}</strong>
            </div>
            <div style={summaryCardStyle}>
              <span><AdminText i18nKey="dashboard.totalRevenue" fallback="Total revenue" /></span>
              <strong>{formatCurrency(summary.revenue)}</strong>
            </div>
          </div>

          <form action="/admin/orders" method="get" style={filterPanelStyle}>
            <div style={filterHeaderStyle}>
              <span style={filterEyebrowStyle}><AdminText i18nKey="contractsAdmin.filters" fallback="Filters" /></span>
              <span style={filterHintStyle}><AdminText i18nKey="ordersAdmin.filterOrdersByCustomerContractAddressAndDate" fallback="Filter by customer, contract, address, kitchen, status, or date." /></span>
            </div>
            <div className="orders-filter-grid" style={filterGridStyle}>
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
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="dashboard.kitchen" fallback="Kitchen" /></span>
                <AdminSelect name="kitchenId" defaultValue={filters.kitchenId} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="dashboard.allKitchens" fallback="All kitchens" /></option>
                  {kitchens.map((kitchen) => (
                    <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>
                  ))}
                </AdminSelect>
              </label>
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
                <Link href="/admin/orders" scroll={false} style={filterClearLinkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
              </div>
            </div>
          </form>

          <div style={statusFilterRowStyle}>
            {statusFilters.map((filter) => {
              const isActive = filters.status === filter.status;
              return (
                <Link
                  key={filter.status || "all"}
                  href={getStatusHref(filters, filter.status)}
                  scroll={false}
                  className="orders-status-filter"
                  style={isActive ? statusFilterActiveStyle : statusFilterStyle}
                >
                  <AdminText i18nKey={filter.key} fallback={filter.fallback} />
                </Link>
              );
            })}
          </div>

          <div className="admin-list-table" style={tableWrapStyle}>
            <table style={ordersTableStyle}>
              <colgroup>
                <col style={{ width: "10%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "9%" }} />
                <col className="orders-table-optional" style={{ width: "7%" }} />
                <col className="orders-table-date" style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={ordersThStyle}><AdminText i18nKey="ordersAdmin.order" fallback="Order" /></th>
                  <th style={ordersThStyle}><AdminText i18nKey="ordersAdmin.customer" fallback="Customer" /></th>
                  <th style={ordersThStyle}><AdminText i18nKey="ordersAdmin.kitchen" fallback="Kitchen" /></th>
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
                {orders.map((order) => {
                  const contractNumber = getOrderContractNumber(order);
                  const articleCodes = getArticleCodes(order.items);
                  return (
                  <tr key={order.id} className="orders-table-row" style={orderRowStyle}>
                    <td style={ordersTdStyle}>
                      <Link href={`/admin/orders/${order.id}`} style={orderLinkStyle}>
                        <strong>{order.orderNumber}</strong>
                      </Link>
                      {contractNumber ? (
                        <div style={contractMetaStyle}>
                          <AdminText i18nKey="orderDetailAdmin.contractNumber" fallback="Contract number" />{" "}
                          <span style={{ fontWeight: 800 }}>{contractNumber}</span>
                        </div>
                      ) : null}
                      {order.contractOrderSequence ? (
                        <div style={contractSequenceStyle}>
                          <AdminText
                            i18nKey={getContractOrderKey(order.contractOrderSequence)}
                            fallback={`${getContractOrderLabel(order)} order for contract`}
                            values={{
                              number: String(order.contractOrderSequence),
                              ordinal: getContractOrderLabel(order),
                            }}
                          />
                        </div>
                      ) : null}
                    </td>
                    <td style={ordersTdStyle}>
                      <div style={customerNameStyle}>{order.firstName} {order.lastName}</div>
                      <div style={customerEmailStyle}>{order.email}</div>
                    </td>
                    <td style={ordersTdStyle}><AdminKitchenDisplayName slug={order.kitchen.slug} name={order.kitchen.name} /></td>
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
                      <div style={{ display: "grid", gap: 6 }}>
                        <Link href={`/admin/orders/${order.id}`} style={viewButtonStyle}>
                          <AdminText i18nKey="ordersAdmin.view" fallback="View" />
                        </Link>

                        <DeleteOrderAction orderId={order.id} />
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
            {orders.map((order) => {
              const contractNumber = getOrderContractNumber(order);
              const articleCodes = getArticleCodes(order.items);
              return (
              <article key={order.id} style={itemCardStyle}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={mobileLabelStyle}><AdminText i18nKey="ordersAdmin.mobileOrderNumber" fallback="Order number" /></span>
                      <Link href={`/admin/orders/${order.id}`} style={orderLinkStyle}>
                        <strong style={{ fontSize: "1.05rem" }}>{order.orderNumber}</strong>
                      </Link>
                      {contractNumber ? (
                        <span style={contractMetaStyle}>
                          <AdminText i18nKey="orderDetailAdmin.contractNumber" fallback="Contract number" />{" "}
                          <span style={{ fontWeight: 800 }}>{contractNumber}</span>
                        </span>
                      ) : null}
                      {order.contractOrderSequence ? (
                        <span style={contractSequenceStyle}>
                          <AdminText
                            i18nKey={getContractOrderKey(order.contractOrderSequence)}
                            fallback={`${getContractOrderLabel(order)} order for contract`}
                            values={{
                              number: String(order.contractOrderSequence),
                              ordinal: getContractOrderLabel(order),
                            }}
                          />
                        </span>
                      ) : null}
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
                      <span style={mobileLabelStyle}><AdminText i18nKey="ordersAdmin.kitchen" fallback="Kitchen" /> + <AdminText i18nKey="contractAddressFields.city" fallback="City" /></span>
                      <strong><AdminKitchenDisplayName slug={order.kitchen.slug} name={order.kitchen.name} /></strong>
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
                      <Link href={`/admin/orders/${order.id}`} style={viewButtonStyle}>
                        <AdminText i18nKey="ordersAdmin.viewOrder" fallback="View order" />
                      </Link>

                        <DeleteOrderAction orderId={order.id} compact />
                    </div>
                  </div>
                </div>
              </article>
              );
            })}
          </div>

          <AdminPagination basePath="/admin/orders" searchParams={resolvedSearchParams} {...pagination} />

          <style>{`
            .admin-list-cards {
              display: none;
            }

            .orders-table-row:hover {
              background: rgba(143, 62, 44, 0.045);
            }

            .orders-table-row a:focus-visible,
            .admin-list-cards a:focus-visible,
            .orders-status-filter:focus-visible,
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
  fontWeight: 800,
};

const ordersTableStyle = {
  ...tableStyle,
  minWidth: 1280,
};

const ordersThStyle = {
  ...thStyle,
  padding: "14px 12px",
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "auto",
  fontSize: 11,
  letterSpacing: "0.11em",
};

const ordersTdStyle = {
  ...tdStyle,
  padding: "16px 12px",
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
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const paymentStatusBaseStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 8px",
  border: "1px solid transparent",
  fontSize: 11,
  fontWeight: 900,
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

const contractSequenceStyle = {
  display: "inline-flex",
  width: "fit-content",
  marginTop: 8,
  padding: "5px 8px",
  borderRadius: 999,
  background: "rgba(115, 80, 55, 0.07)",
  color: "var(--app-text-muted)",
  border: "1px solid rgba(115, 80, 55, 0.12)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0,
};

const contractMetaStyle = {
  marginTop: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
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
  fontSize: 13,
  boxShadow: "none",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const deleteAllButtonStyle = {
  ...deleteButtonStyle,
  minHeight: 42,
  padding: "10px 14px",
  background: "rgba(217, 92, 92, 0.1)",
  borderColor: "rgba(217, 92, 92, 0.34)",
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
  fontWeight: 800,
  fontSize: 13,
  whiteSpace: "nowrap",
};

const customerNameStyle = {
  fontWeight: 800,
};

const customerEmailStyle = {
  color: "var(--app-text-muted)",
  marginTop: 6,
  fontSize: 13,
};

const totalStyle = {
  whiteSpace: "nowrap",
  fontWeight: 900,
  color: "var(--app-text)",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 10,
};

const summaryCardStyle = {
  display: "grid",
  gap: 7,
  borderRadius: 10,
  border: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,247,241,0.72))",
  padding: "13px 14px",
  boxShadow: "var(--app-shadow-soft)",
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const statusFilterRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const statusFilterStyle = {
  textDecoration: "none",
  borderRadius: 999,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.82)",
  color: "var(--app-text-muted)",
  minHeight: 34,
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 12px",
  fontSize: 13,
  fontWeight: 800,
};

const statusFilterActiveStyle = {
  ...statusFilterStyle,
  border: "1px solid rgba(143, 62, 44, 0.22)",
  background: "rgba(143, 62, 44, 0.11)",
  color: "var(--app-accent)",
};

const mobileCardGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const mobileLabelStyle = {
  display: "block",
  color: "var(--app-text-muted)",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 4,
};

const mobileMutedLineStyle = {
  display: "block",
  color: "var(--app-text-muted)",
  fontSize: 13,
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
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const filterHintStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const filterFieldStyle = {
  minWidth: 0,
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
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
  fontSize: "0.92rem",
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
  fontSize: "0.92rem",
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
  fontWeight: 800,
  fontSize: "0.92rem",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};
