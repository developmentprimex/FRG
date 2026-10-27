"use client";

import { useId, useState } from "react";
import { AdminKitchenDisplayName, AdminLocalizedName, AdminText, useAdminI18n } from "./admin-i18n";
import styles from "./admin-order-kitchen-specifications.module.css";

function Text({ name, fallback, values }) {
  return <AdminText i18nKey={`kitchenSpecificationsAdmin.${name}`} fallback={fallback} values={values} />;
}

export function AdminOrderKitchenSpecifications({ details, referenceOnly = false }) {
  const { kitchen, reference, orderedItems } = details;
  const { translate } = useAdminI18n();
  const id = useId();
  const [view, setView] = useState(reference ? "header" : "ordered");
  const [search, setSearch] = useState("");
  const pdfHref = `/api/admin/kitchen-specifications/${encodeURIComponent(kitchen.slug)}/pdf`;
  const tabs = [
    ...(reference ? [{ key: "header", label: "header", fallback: "AB header" }] : []),
    ...(!referenceOnly ? [{ key: "ordered", label: "orderedItems", fallback: "Ordered items" }] : []),
    ...(reference ? [{ key: "articles", label: "abArticles", fallback: "Original AB articles" }] : []),
  ];
  const rows = view === "articles" ? reference?.articles || [] : orderedItems;
  const query = search.trim().toLocaleLowerCase();
  const filtered = rows.filter((row) => !query || [row.code, row.position, row.articleNumber, row.name,
    row.nameDe, row.manufacturer, row.description].join(" ").toLocaleLowerCase().includes(query));
  const missing = <Text name="notSpecified" fallback="Not specified" />;

  function changeView(next) {
    setView(next);
    setSearch("");
  }

  return <div className={styles.root}>
    <div className={styles.heading}>
      <div>
        <h3><AdminKitchenDisplayName slug={kitchen.slug} name={kitchen.name} /></h3>
        <div className={styles.meta}>
          {kitchen.kitchenCode && <span><Text name="kitchenCode" fallback="Kitchen code" />: <strong>{kitchen.kitchenCode}</strong></span>}
          {kitchen.programmId && <span><Text name="program" fallback="Program" />: <strong>{kitchen.programmId}</strong></span>}
          {reference && <span><Text name="abNumber" fallback="AB number" />: <strong>{reference.abNumber}</strong></span>}
          {reference?.apartment && <span><Text name="apartment" fallback="Apartment" />: <strong>{reference.apartment}</strong></span>}
        </div>
      </div>
      {reference && <div className={styles.actions}>
        <a href={pdfHref} target="_blank" rel="noopener noreferrer"><Text name="openPdf" fallback="Open original AB" /></a>
        <a href={`${pdfHref}?download=1`}><Text name="downloadPdf" fallback="Download PDF" /></a>
      </div>}
    </div>

    {!reference && <p className={styles.notice}><Text name={referenceOnly ? "noKitchenAb" : "noAb"} fallback={referenceOnly ? "No AB document has been added for this kitchen." : "No AB document has been added for this kitchen. The ordered articles are shown below."} /></p>}
    {tabs.length > 0 && <div className={styles.tabs} role="tablist" aria-label={translate("kitchenSpecificationsAdmin.title", "Kitchen specifications")}>
      {tabs.map((tab, index) => <button key={tab.key} type="button" role="tab" id={`${id}-${tab.key}-tab`}
        aria-controls={`${id}-${tab.key}-panel`} aria-selected={view === tab.key} tabIndex={view === tab.key ? 0 : -1}
        onClick={() => changeView(tab.key)} onKeyDown={(event) => {
          const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          if (!offset && !["Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + offset + tabs.length) % tabs.length;
          changeView(tabs[next].key);
          document.getElementById(`${id}-${tabs[next].key}-tab`)?.focus();
        }}><Text name={tab.label} fallback={tab.fallback} />{tab.key !== "header" && <span>{tab.key === "ordered" ? orderedItems.length : reference.articles.length}</span>}</button>)}
    </div>}

    {tabs.length > 0 && <div role="tabpanel" id={`${id}-${view}-panel`} aria-labelledby={`${id}-${view}-tab`} tabIndex={0}>
      {view === "header" && reference ? <>
        <p className={styles.notice}><Text name="sourceDate" fallback="Specifications from the original AB dated {date}." values={{ date: reference.date }} /></p>
        <dl className={styles.specifications}>
          {reference.specifications.map((field) => <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.code && <code>{field.code}</code>}<span>{field.value}</span></dd>
          </div>)}
        </dl>
        <details className={styles.sourceHeader}>
          <summary><Text name="additionalHeader" fallback="Additional AB header details" /></summary>
          <dl className={styles.specifications}>
            {reference.header.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}
          </dl>
        </details>
      </> : <>
        <div className={styles.filter}>
          <p className={styles.notice}><Text name={view === "articles" ? "referenceNotice" : "orderNotice"}
            fallback={view === "articles" ? "Original AB specification. Customer selections appear under Ordered items." : "Articles selected in this order. Manufacturers are shown when identified for the selected article."} /></p>
          <label>
            <span><Text name="search" fallback="Search articles" /></span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder={translate("kitchenSpecificationsAdmin.searchPlaceholder", "Code, article or manufacturer")} />
          </label>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <caption className={styles.srOnly}><Text name={view === "articles" ? "abArticles" : "orderedItems"} fallback="Kitchen articles" /></caption>
            <thead><tr>
              <th scope="col"><Text name={view === "articles" ? "position" : "itemCode"} fallback={view === "articles" ? "Position" : "Item code"} /></th>
              <th scope="col"><Text name="articleNumber" fallback="Article number" /></th>
              <th scope="col"><Text name="description" fallback="Description" /></th>
              <th scope="col"><Text name="manufacturer" fallback="Manufacturer" /></th>
              <th scope="col"><Text name="quantity" fallback="Quantity" /></th>
            </tr></thead>
            <tbody>{filtered.map((row) => <tr key={view === "articles" ? row.position : row.id}>
              <td><code>{view === "articles" ? row.position : row.code || "—"}</code></td>
              <td><code>{row.articleNumber || "—"}</code>{row.handing && <small>{row.handing}</small>}</td>
              <td><AdminLocalizedName name={row.name} nameDe={row.nameDe} as="strong" />
                {row.description && <details className={styles.description}><summary><Text name="details" fallback="Details" /></summary><p>{row.description}</p></details>}
                {view === "articles" && <small><Text name="page" fallback="Page {page}" values={{ page: row.page }} /></small>}
              </td>
              <td>{row.manufacturer || missing}</td>
              <td>{row.quantity ?? "—"}</td>
            </tr>)}</tbody>
          </table>
          {!filtered.length && <p className={styles.empty}><Text name="noArticles" fallback="No articles found." /></p>}
        </div>
      </>}
    </div>}
  </div>;
}
