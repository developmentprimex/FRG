import { getPriceBreakdown } from "../lib/price-utils";
import { AdminLocalizedName, AdminText } from "./admin-i18n";
import { buildAdminOrderItems } from "../lib/admin-order-items";

const currency = (value) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
const labels = {
  additional: "Ordered additions",
  included: "Default kitchen — included",
  unknown: "Items without a linked kitchen configuration",
};

export function AdminOrderItems({ order }) {
  const summary = buildAdminOrderItems(order);
  return <div className="order-selection">
    {!summary.matchesTotal && <p role="status" className="order-selection-warning"><AdminText i18nKey="orderItemsAdmin.mismatch" fallback="The displayed items do not match the recorded order total. The kitchen configuration may have changed; verify the original confirmation before using this breakdown." /></p>}
    <div className="order-selection-table">
      <table>
        <thead><tr>
          <th><AdminText i18nKey="orderDetailAdmin.item" fallback="Item" /></th>
          <th><AdminText i18nKey="orderItemsAdmin.codes" fallback="Article number / item code" /></th>
          <th><AdminText i18nKey="orderDetailAdmin.quantity" fallback="Quantity" /></th>
          <th><AdminText i18nKey="orderItemsAdmin.unitPrice" fallback="Charge per unit" /></th>
          <th><AdminText i18nKey="orderDetailAdmin.lineTotal" fallback="Line total" /></th>
        </tr></thead>
        {Object.entries(summary.groups).map(([group, items]) => items.length > 0 && <tbody key={group} data-group={group}>
          <tr className="order-selection-group"><th colSpan={5} scope="rowgroup"><AdminText i18nKey={`orderItemsAdmin.${group}`} fallback={labels[group]} /> ({items.length})</th></tr>
          {group === "unknown" && <tr><td colSpan={5}><AdminText i18nKey="orderItemsAdmin.unknownNote" fallback="Default inclusion cannot be determined for these items. Their saved prices are shown." /></td></tr>}
          {items.map(item => <tr key={item.id}>
            <td><AdminLocalizedName name={item.nameSnapshot || item.code} nameDe={item.nameDeSnapshot || ""} as="strong" />
              {item.kitchenItem?.blendeCode && <small><AdminText i18nKey="orderItemsAdmin.currentBlende" fallback="Blende (current configuration)" />: {item.kitchenItem.blendeCode}</small>}
            </td>
            <td><strong>{item.articleNumber || "-"}</strong><small>{item.code}</small></td>
            <td>{item.quantity}</td>
            <td>{currency(item.unitPrice)}</td>
            <td><strong>{currency(item.lineTotal)}</strong></td>
          </tr>)}
        </tbody>)}
        <tfoot>
          {!summary.matchesTotal && <tr><td colSpan={4}><AdminText i18nKey="orderItemsAdmin.itemsTotal" fallback="Displayed item total" /></td><td>{currency(summary.itemsTotal)}</td></tr>}
          <tr><td colSpan={4}><AdminText i18nKey="orderDetailAdmin.priceExclVat" fallback="Price" /></td><td>{currency(getPriceBreakdown(summary.orderTotal).net)}</td></tr>
          <tr><td colSpan={4}><AdminText i18nKey="orderDetailAdmin.vatAmount" fallback="VAT (19%)" /></td><td>{currency(getPriceBreakdown(summary.orderTotal).vat)}</td></tr>
          <tr className="order-selection-total"><td colSpan={4}><AdminText i18nKey="orderItemsAdmin.orderTotal" fallback="Recorded order total (incl. VAT)" /></td><td><strong>{currency(summary.orderTotal)}</strong></td></tr>
        </tfoot>
      </table>
    </div>
    <details className="order-selection-note"><summary><AdminText i18nKey="orderItemsAdmin.priceDetails" fallback="Price and configuration details" /></summary>
      <p><AdminText i18nKey="orderItemsAdmin.historyNote" fallback="Article numbers, names, quantities and saved prices come from this order. Default inclusion and the program use the current kitchen configuration because they were not saved with the order." /></p>
      {summary.groups.included.filter(item => item.savedUnitPrice !== 0).map(item => <p key={item.id}>{item.articleNumber || item.code}: <AdminText i18nKey="orderItemsAdmin.savedPrice" fallback="Saved reference price, not charged" /> {currency(item.savedUnitPrice)}</p>)}
    </details>
    <style>{`
      .order-selection { display:grid; gap:12px; min-width:0; }
      .order-selection-note { margin:0; color:var(--app-text-muted); font-size:13px; line-height:1.6; }
      .order-selection-warning { margin:0; padding:14px; background:#fff4dc; color:#765017; border:1px solid #dfc38a; border-radius:10px; }
      .order-selection h3 { margin:0 0 12px; font-size:1.1rem; }
      .order-selection h3 small { font-weight:400; }
      .order-selection-table { overflow-x:auto; border:1px solid var(--app-border); border-radius:14px; margin-top:12px; }
      .order-selection table { width:100%; border-collapse:collapse; text-align:left; }
      .order-selection th, .order-selection td { padding:10px 12px; border-bottom:1px solid var(--app-border); vertical-align:top; }
      .order-selection th { font-size:12px; color:var(--app-text-muted); background:var(--app-surface); }
      .order-selection td:nth-child(1) { min-width:170px; }
      .order-selection td:nth-child(2) { min-width:180px; overflow-wrap:anywhere; }
      .order-selection td:nth-child(n+3) { min-width:95px; }
      .order-selection td small { display:block; margin-top:6px; color:var(--app-text-muted); font-size:12px; line-height:1.5; }
      .order-selection tfoot td { border-bottom:0; text-align:right; padding:7px 12px; }
      .order-selection thead th:nth-child(n+3), .order-selection tbody td:nth-child(n+3) { text-align:right; }
      .order-selection thead th { background:#eee5da; color:#594431; padding-top:13px; padding-bottom:13px; }
      .order-selection tbody tr:nth-child(odd):not(.order-selection-group) { background:#faf7f3; }
      .order-selection tbody tr:not(.order-selection-group):hover { background:#f1e9df; }
      .order-selection-group th { background:#f1e8dc; color:#64482f; font-size:13px; border-left:4px solid #ac8761; }
      .order-selection tbody[data-group="included"] .order-selection-group th { background:#e7f0e9; color:#315b40; border-left-color:#73977c; }
      .order-selection tbody[data-group="included"] tr:nth-child(odd):not(.order-selection-group) { background:#f5f9f5; }
      .order-selection tbody[data-group="included"] tr:not(.order-selection-group):hover { background:#eaf2eb; }
      .order-selection tbody[data-group="unknown"] .order-selection-group th { background:#fff3dc; color:#73521b; border-left-color:#bf963f; }
      .order-selection-total { font-size:16px; background:#ede2d4; color:#503924; font-weight:700; border-top:2px solid #b89b7b; }
      .order-selection-total td { padding:13px 12px !important; }
      .order-selection summary { cursor:pointer; }
    `}</style>
  </div>;
}
