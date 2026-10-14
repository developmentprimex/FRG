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
    <div className="order-selection-summary">
      <div><AdminText i18nKey="orderItemsAdmin.program" fallback="Kitchen program (current configuration)" /><strong>{order.kitchen?.programmId || "—"}</strong></div>
      <div><AdminText i18nKey="orderItemsAdmin.itemsTotal" fallback="Displayed item total" /><strong>{currency(summary.itemsTotal)}</strong></div>
      <div><AdminText i18nKey="orderItemsAdmin.orderTotal" fallback="Recorded order total (incl. VAT)" /><strong>{currency(summary.orderTotal)}</strong></div>
    </div>
    <p className="order-selection-note"><AdminText i18nKey="orderItemsAdmin.historyNote" fallback="Article numbers, names, quantities and saved prices come from this order. Default inclusion and the program use the current kitchen configuration because they were not saved with the order." /></p>
    {!summary.matchesTotal && <p role="status" className="order-selection-warning"><AdminText i18nKey="orderItemsAdmin.mismatch" fallback="The displayed items do not match the recorded order total. The kitchen configuration may have changed; verify the original confirmation before using this breakdown." /></p>}
    {Object.entries(summary.groups).map(([group, items]) => items.length > 0 && <section key={group}>
      <h3><AdminText i18nKey={`orderItemsAdmin.${group}`} fallback={labels[group]} /> <small>({items.length})</small></h3>
      {group === "unknown" && <p className="order-selection-note"><AdminText i18nKey="orderItemsAdmin.unknownNote" fallback="Default inclusion cannot be determined for these items. Their saved prices are shown." /></p>}
      <div className="order-selection-table">
        <table>
          <thead><tr>
            <th><AdminText i18nKey="orderDetailAdmin.item" fallback="Item" /></th>
            <th><AdminText i18nKey="orderItemsAdmin.codes" fallback="Article number / item code" /></th>
            <th><AdminText i18nKey="orderDetailAdmin.quantity" fallback="Quantity" /></th>
            <th><AdminText i18nKey="orderItemsAdmin.unitPrice" fallback="Charge per unit" /></th>
            <th><AdminText i18nKey="orderDetailAdmin.lineTotal" fallback="Line total" /></th>
          </tr></thead>
          <tbody>{items.map(item => <tr key={item.id}>
            <td><AdminLocalizedName name={item.nameSnapshot || item.code} nameDe={item.nameDeSnapshot || ""} as="strong" />
              <small><AdminText i18nKey={`orderItemsAdmin.type${item.itemType}`} fallback={item.itemType} /></small>
              {item.kitchenItem?.blendeCode && <small><AdminText i18nKey="orderItemsAdmin.currentBlende" fallback="Blende (current configuration)" />: {item.kitchenItem.blendeCode}</small>}
            </td>
            <td><strong>{item.articleNumber || "—"}</strong><small>{item.code}</small></td>
            <td>{item.quantity}</td>
            <td>{currency(item.unitPrice)}{group === "included" && item.savedUnitPrice !== 0 && <small><AdminText i18nKey="orderItemsAdmin.savedPrice" fallback="Saved reference price, not charged" />: {currency(item.savedUnitPrice)}</small>}</td>
            <td><strong>{currency(item.lineTotal)}</strong></td>
          </tr>)}</tbody>
          <tfoot><tr><td colSpan={4}><AdminText i18nKey="orderItemsAdmin.subtotal" fallback="Subtotal" /></td><td><strong>{currency(items.reduce((sum, item) => sum + item.lineTotal, 0))}</strong></td></tr></tfoot>
        </table>
      </div>
    </section>)}
    <style>{`
      .order-selection { display:grid; gap:20px; min-width:0; }
      .order-selection-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:12px; }
      .order-selection-summary > div { display:grid; gap:8px; border:1px solid var(--app-border); border-radius:12px; padding:16px; }
      .order-selection-summary strong { font-size:1.15rem; }
      .order-selection-note { margin:0; color:var(--app-text-muted); font-size:13px; line-height:1.6; }
      .order-selection-warning { margin:0; padding:14px; background:#fff4dc; color:#765017; border:1px solid #dfc38a; border-radius:10px; }
      .order-selection h3 { margin:0 0 12px; font-size:1.1rem; }
      .order-selection h3 small { font-weight:400; }
      .order-selection-table { overflow-x:auto; border:1px solid var(--app-border); border-radius:14px; margin-top:12px; }
      .order-selection table { width:100%; border-collapse:collapse; text-align:left; }
      .order-selection th, .order-selection td { padding:14px; border-bottom:1px solid var(--app-border); vertical-align:top; }
      .order-selection th { font-size:12px; color:var(--app-text-muted); background:var(--app-surface); }
      .order-selection td:nth-child(1) { min-width:170px; }
      .order-selection td:nth-child(2) { min-width:180px; overflow-wrap:anywhere; }
      .order-selection td:nth-child(n+3) { min-width:95px; }
      .order-selection td small { display:block; margin-top:6px; color:var(--app-text-muted); font-size:12px; line-height:1.5; }
      .order-selection tfoot td { border-bottom:0; }
    `}</style>
  </div>;
}
