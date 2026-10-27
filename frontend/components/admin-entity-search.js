"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminI18n } from "./admin-i18n";

const TOP_MATCH_LIMIT = 10;
const OPEN_LINK_STYLE = {
  flexShrink: 0,
  minHeight: 38,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  border: "1px solid var(--color-primary)",
  color: "#ffffff",
  textDecoration: "none",
  background: "var(--color-primary)",
  padding: "9px 12px",
  fontWeight: 800,
};

const FOOTER_LINK_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid rgba(107, 79, 58, 0.16)",
  background: "var(--color-primary-soft)",
  color: "var(--color-primary)",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
};

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function tokenizeText(value) {
  return normalizeText(value)
    .split(/[\s,/.-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildAddress(parts) {
  return parts.map((part) => String(part || "").trim()).filter(Boolean).join(", ");
}

function formatOrderAddressLabel(address, translate) {
  if (!address) return "";
  return `${translate("dashboard.finderOrderAddress", "Order address")}: ${address}`;
}

function joinMeta(parts) {
  return parts.filter(Boolean).join(" | ");
}

function getTypePriority(type) {
  if (type === "contract") return 1;
  if (type === "order") return 2;
  if (type === "partner") return 3;
  if (type === "object") return 4;
  return 5;
}

function matchesAnyToken(tokens, haystack) {
  if (!tokens.length) return false;
  return tokens.every((token) => haystack.includes(token));
}

function getRowRanking(row, query) {
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenizeText(query);
  const searchable = normalizeText([
    row.label,
    row.meta,
    row.secondary,
    ...(row.keywords || []),
  ].join(" "));
  let score = 0;

  if (normalizedQuery) {
    const exactFields = (row.exactFields || []).map((field) => normalizeText(field));
    const exactIndex = exactFields.findIndex((field) => field && field === normalizedQuery);
    if (exactIndex >= 0) {
      const base = row.type === "contract"
        ? 5000
        : row.type === "order"
          ? 4800
          : row.type === "partner"
            ? 4600
            : row.type === "object"
              ? 4400
              : 4200;
      score += base - exactIndex;
    } else if (searchable.includes(normalizedQuery)) {
      score += 1200;
    } else if (matchesAnyToken(queryTokens, searchable)) {
      score += 700;
    }
  }

  score += Math.max(0, 200 - getTypePriority(row.type) * 20);
  return score;
}

function flattenResults(results, query, translate) {
  const rows = [];
  let index = 0;

  for (const company of results.companies || []) {
    rows.push({
      id: `partner-${company.id}`,
      type: "partner",
      badge: translate("dashboard.finderBadgePartner", "Housing Company"),
      label: company.name || translate("dashboard.finderUnnamedPartner", "Unnamed housing company"),
      secondary: company.address || "",
      meta: joinMeta([
        `${company.objectCount || 0} ${translate("dashboard.finderObjectsShort", "objects")}`,
        `${company.contractCount || 0} ${translate("dashboard.finderContractsShort", "contract numbers")}`,
        `${company.orderCount || 0} ${translate("dashboard.finderOrdersShort", "orders")}`,
      ]),
      href: `/admin/property-owners/${company.id}`,
      exactFields: [company.name, company.address],
      keywords: [company.name, company.address],
      sourceOrder: index++,
    });
  }

  for (const contract of results.contracts || []) {
    rows.push({
      id: `contract-${contract.id}`,
      type: "contract",
      badge: translate("dashboard.finderBadgeContract", "Contract number"),
      label: contract.contractNumber || translate("dashboard.finderUnnamedContract", "Contract number"),
      secondary: [
        contract.companyName,
        contract.projectName ? `${translate("contractsAdmin.project", "Project")}: ${contract.projectName}` : "",
        contract.objectName ? `${translate("contractsAdmin.propertyObject", "Object/building")}: ${contract.objectName}` : "",
        contract.kitchenName,
      ].filter(Boolean).join(" | "),
      meta: joinMeta([
        `${contract.orderCount || 0} ${translate("dashboard.finderOrdersShort", "orders")}`,
        formatCurrency(contract.revenue),
      ]),
      href: `/admin/contracts?q=${encodeURIComponent(contract.contractNumber || "")}`,
      exactFields: [contract.contractNumber, contract.projectName, contract.objectName, contract.companyName],
      keywords: [contract.contractNumber, contract.companyName, contract.projectName, contract.project?.projectCode, contract.project?.status, contract.project?.description, contract.project?.managerName, contract.objectName, contract.kitchenName],
      sourceOrder: index++,
    });
  }

  for (const object of results.objects || []) {
    const address = buildAddress([
      object.address1,
      object.address2,
      [object.postalCode, object.city].filter(Boolean).join(" "),
      object.country,
    ]);

    rows.push({
      id: `object-${object.id}`,
      type: "object",
      badge: translate("dashboard.finderBadgeObject", "Object"),
      label: object.name || translate("dashboard.finderUnnamedObject", "Object"),
      secondary: joinMeta([
        object.companyName || "",
        object.projectName ? `${translate("contractsAdmin.project", "Project")}: ${object.projectName}` : "",
      ]),
      meta: joinMeta([
        address || translate("dashboard.finderNoAddress", "No address"),
        `${object.contractCount || 0} ${translate("dashboard.finderContractsShort", "contract numbers")}`,
        `${object.orderCount || 0} ${translate("dashboard.finderOrdersShort", "orders")}`,
      ]),
      href: `/admin/property-owners/${object.companyId}?openObject=${object.id}`,
      exactFields: [object.name, address, object.address1, object.city, object.postalCode],
      keywords: [object.name, object.projectName, object.projectCode, object.projectStatus, object.projectDescription, object.projectManagerName, object.companyName, address, object.address1, object.address2, object.city, object.postalCode, object.country],
      sourceOrder: index++,
    });
  }

  for (const order of results.orders || []) {
    const orderAddress = buildAddress([
      order.address1,
      order.address2,
      [order.postalCode, order.city].filter(Boolean).join(" "),
      order.country,
    ]);

    rows.push({
      id: `order-${order.id}`,
      type: "order",
      badge: translate("dashboard.finderBadgeOrder", "Order"),
      label: order.orderNumber || translate("dashboard.finderUnnamedOrder", "Order"),
      secondary: [
        order.companyName,
        order.contractNumber,
        order.projectName ? `${translate("contractsAdmin.project", "Project")}: ${order.projectName}` : "",
        order.objectName ? `${translate("contractsAdmin.propertyObject", "Object/building")}: ${order.objectName}` : "",
        order.customerName,
      ].filter(Boolean).join(" | "),
      meta: joinMeta([
        formatOrderAddressLabel(orderAddress, translate),
        formatCurrency(order.totalPrice),
        formatDate(order.createdAt),
      ]),
      href: `/admin/orders/${order.id}`,
      exactFields: [order.orderNumber, order.contractNumber, order.customerName, orderAddress],
      keywords: [order.orderNumber, order.contractNumber, order.projectName, order.project?.projectCode, order.project?.status, order.project?.description, order.project?.managerName, order.objectName, order.companyName, order.customerName, order.address1, order.address2, order.postalCode, order.city, order.country],
      sourceOrder: index++,
    });
  }

  const sortedRows = rows
    .map((row) => ({ ...row, rank: getRowRanking(row, query) }))
    .sort((left, right) => {
      if (right.rank !== left.rank) return right.rank - left.rank;
      if (getTypePriority(left.type) !== getTypePriority(right.type)) {
        return getTypePriority(left.type) - getTypePriority(right.type);
      }
      return left.sourceOrder - right.sourceOrder;
    });

  const topRows = sortedRows.slice(0, TOP_MATCH_LIMIT);
  if (topRows.some((row) => row.type === "object")) {
    return topRows;
  }

  const firstObjectRow = sortedRows.find((row) => row.type === "object");
  if (!firstObjectRow || !topRows.length) {
    return topRows;
  }

  return [...topRows.slice(0, -1), firstObjectRow];
}

export function AdminEntitySearch({ period, kitchenId, status, compact = false, placeholderFallback }) {
  const { translate } = useAdminI18n();
  const inputRef = useRef(null);
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState({
    companies: [],
    contracts: [],
    objects: [],
    orders: [],
  });
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestNonce, setRequestNonce] = useState(0);

  const trimmedDraftQuery = draftQuery.trim();
  const trimmedSubmittedQuery = submittedQuery.trim();
  const hasSubmittedSearch = Boolean(trimmedSubmittedQuery);
  const showMatches = hasSubmittedSearch && trimmedDraftQuery === trimmedSubmittedQuery;
  const topMatches = useMemo(
    () => flattenResults(results, trimmedSubmittedQuery, translate),
    [results, trimmedSubmittedQuery, translate],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const nextParams = new URLSearchParams();
    if (trimmedSubmittedQuery) {
      nextParams.set("q", trimmedSubmittedQuery);
    }
    if (period) {
      nextParams.set("period", period);
    }
    if (kitchenId) {
      nextParams.set("kitchenId", kitchenId);
    }
    if (status) {
      nextParams.set("status", status);
    }

    if (!trimmedSubmittedQuery) {
      setResults({ companies: [], contracts: [], objects: [], orders: [] });
      setResultsLoading(false);
      return () => controller.abort();
    }

    const delay = window.setTimeout(async () => {
      setResultsLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/admin/search?${nextParams.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Search request failed");
        }

        const data = await response.json();
        if (!controller.signal.aborted) {
          setResults(data.results || { companies: [], contracts: [], objects: [], orders: [] });
        }
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Search request failed");
      } finally {
        if (!controller.signal.aborted) {
          setResultsLoading(false);
        }
      }
    }, 50);

    return () => {
      controller.abort();
      window.clearTimeout(delay);
    };
  }, [kitchenId, period, requestNonce, status, trimmedSubmittedQuery]);

  function retry() {
    setRequestNonce((current) => current + 1);
  }

  function submitSearch() {
    const nextQuery = draftQuery.trim();
    setError("");
    setSubmittedQuery(nextQuery);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch();
      return;
    }
  }

  return (
    <section className={`search-workspace${compact ? " search-workspace--compact" : ""}`}>
      <div className="search-header">
        <div>
          <h2>{translate("dashboard.finderTitle", "Go to")}</h2>
        </div>
        {resultsLoading && trimmedSubmittedQuery ? (
          <span className="loading-pill">{translate("dashboard.updating", "Updating")}</span>
        ) : null}
      </div>

      <div className="search-shell">
        <div className="search-input-wrap">
          <div className="input-row">
            <div className="input-slot">
              <input
                ref={inputRef}
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={compact
                  ? translate("dashboard.finderCompactPlaceholder", placeholderFallback || "Search by company, project, contract number")
                  : translate("dashboard.finderPlaceholder", "Search by housing company, project, contract number, object, address, or order.")}
                aria-label={translate("dashboard.finderAriaLabel", "Quick find admin entities")}
              />
            </div>
            <button type="button" className="search-button" onClick={submitSearch}>
              {translate("dashboard.finderSearch", "Search")}
            </button>
          </div>
        </div>

        {error ? (
          <div className="state-card state-card--error">
            <strong>{translate("dashboard.finderUnavailable", "Search is temporarily unavailable.")}</strong>
            <button type="button" onClick={retry}>{translate("dashboard.retry", "Retry")}</button>
          </div>
        ) : null}

        {!error && showMatches ? (
          <div className="matches-panel">
            <div className="matches-header">
              <h3>{translate("dashboard.finderTopMatches", "Top matches")}</h3>
            </div>

            {!resultsLoading && !topMatches.length ? (
              <div className="state-card state-card--embedded">
                <strong>{translate("dashboard.finderNoMatches", "No matches found.")}</strong>
              </div>
            ) : null}

            {topMatches.length ? (
              <div className="matches-list">
                {topMatches.map((item) => (
                  <article key={item.id} className="match-row">
                    <div className="match-main">
                      <span className={`type-badge type-badge--${item.type}`}>{item.badge}</span>
                      <div className="match-copy">
                        <strong>{item.label}</strong>
                        {item.secondary ? <span>{item.secondary}</span> : null}
                        {item.meta ? <small>{item.meta}</small> : null}
                      </div>
                    </div>
                    <Link href={item.href} className="open-link" style={OPEN_LINK_STYLE}>
                      {translate("dashboard.finderOpen", "Open")}
                    </Link>
                  </article>
                ))}
              </div>
            ) : null}

            <div className="finder-footer">
              <Link href="/admin/contracts" style={FOOTER_LINK_STYLE}>{translate("dashboard.finderViewAllContracts", "View all contracts")}</Link>
              <Link href="/admin/orders" style={FOOTER_LINK_STYLE}>{translate("dashboard.finderViewAllOrders", "View all orders")}</Link>
              <Link href="/admin/property-owners" style={FOOTER_LINK_STYLE}>{translate("dashboard.finderManagePartners", "Manage housing companies")}</Link>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .search-workspace {
          border: 1px solid var(--color-border);
          border-radius: 18px;
          background: var(--color-card);
          box-shadow: var(--app-shadow-soft);
          padding: 18px;
          display: grid;
          gap: 14px;
        }

        .search-workspace--compact {
          border-radius: 10px;
          padding: 12px;
          gap: 10px;
        }

        .search-workspace--compact .search-header {
          align-items: center;
        }

        .search-workspace--compact h2 {
          font-size: 1rem;
        }

        .search-workspace--compact .search-shell {
          gap: 8px;
        }

        .search-workspace--compact .search-input-wrap {
          border-radius: 10px;
        }

        .search-workspace--compact .input-row {
          padding: 6px;
          gap: 8px;
        }

        .search-workspace--compact input {
          min-height: 40px;
          font-size: 14px;
        }

        .search-workspace--compact .search-button {
          min-height: 40px;
          border-radius: 8px;
          padding: 0 12px;
        }

        .search-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        h2,
        h3 {
          margin: 0;
          color: var(--color-text);
        }

        h2 {
          font-size: 1.15rem;
        }

        h3 {
          font-size: 0.95rem;
        }

        p {
          margin: 6px 0 0;
          color: var(--color-text-muted);
          line-height: 1.45;
        }

        .loading-pill {
          border-radius: 999px;
          background: var(--color-primary-soft);
          color: var(--color-primary);
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .search-shell {
          display: grid;
          gap: 12px;
        }

        .search-input-wrap {
          position: relative;
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
        }

        .input-row {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 10px;
        }

        .input-slot {
          flex: 1 1 220px;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        input {
          flex: 1;
          min-height: 44px;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--color-text);
          font-size: 15px;
          padding: 0 4px;
        }

        .search-button {
          min-height: 44px;
          border: 1px solid var(--color-primary);
          border-radius: 12px;
          background: var(--color-primary);
          color: #ffffff;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: background-color 160ms ease, border-color 160ms ease;
        }

        .search-button:hover {
          background: var(--color-primary-hover);
          border-color: var(--color-primary-hover);
        }

        .state-card strong,
        .match-copy strong {
          display: block;
          color: var(--color-text);
        }

        .state-card span,
        .match-copy span,
        .match-copy small {
          color: var(--color-text-muted);
          line-height: 1.4;
        }

        .state-card {
          border: 1px dashed var(--color-border);
          border-radius: 14px;
          background: #fbfaf7;
          padding: 16px;
          display: grid;
          gap: 6px;
        }

        .state-card--embedded {
          padding: 14px;
        }

        .state-card--error {
          border-style: solid;
          border-color: rgba(217, 92, 92, 0.22);
          background: var(--app-danger-bg);
        }

        .state-card button {
          width: fit-content;
          min-height: 38px;
          border: 1px solid var(--color-primary);
          border-radius: 10px;
          background: var(--color-primary);
          color: #ffffff;
          padding: 0 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .matches-panel {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          padding: 14px;
          display: grid;
          gap: 12px;
        }

        .matches-header {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
        }

        .matches-list {
          display: grid;
          gap: 10px;
        }

        .match-row {
          border: 1px solid var(--color-border);
          border-radius: 14px;
          background: var(--color-card);
          padding: 12px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .match-main {
          min-width: 0;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .match-copy {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .match-copy strong,
        .match-copy span,
        .match-copy small {
          overflow-wrap: anywhere;
        }

        .type-badge {
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .type-badge--contract {
          background: var(--color-primary-soft);
          color: var(--color-primary);
        }

        .type-badge--order {
          background: #edf1fe;
          color: var(--color-emailed);
        }

        .type-badge--partner {
          background: #eef8f2;
          color: var(--color-confirmed);
        }

        .type-badge--object {
          background: #fbf0db;
          color: var(--color-new);
        }

        .type-badge--address {
          background: #f0ebe5;
          color: var(--color-text-muted);
        }

        .finder-footer {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 700px) {
          .input-row {
            flex-direction: column;
            align-items: stretch;
          }

          .input-slot {
            flex: 0 1 auto;
            width: 100%;
          }

          .match-row {
            flex-direction: column;
          }

          .open-link,
          .search-button {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
}
