import { KitchenStatus } from "@prisma/client";
import Link from "next/link";
import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  actionRowStyle,
  cardListStyle,
  formGridStyle,
  inputStyle,
  itemCardStyle,
  pageGridStyle,
  primaryButtonStyle,
  subMetaStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle as baseTdStyle,
  thStyle,
  textareaStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminPagination } from "../../../components/admin-pagination";
import { AdminDateTime, AdminKitchenDisplayName, AdminPluralText, AdminStatusBadge, AdminText, AdminTranslatedInput, AdminTranslatedTextarea } from "../../../components/admin-i18n";
import AdminSelect from "../../../components/admin-select";
import { listKitchensPageForAdmin } from "../../../lib/catalog";
import { listCatalogPrograms } from "../../../lib/catalog-programs";
import { getFormMessage } from "../../../lib/admin-forms";
import { normalizeKitchenSearchQuery } from "../../../lib/admin-kitchen-search";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const tdStyle = { ...baseTdStyle, padding: "16px 12px", verticalAlign: "middle" };
const numberCellStyle = { width: 64, textAlign: "center", whiteSpace: "nowrap", overflowWrap: "normal", fontVariantNumeric: "tabular-nums", color: "var(--app-text-muted)", fontSize: "var(--admin-text-label, 12px)", fontWeight: 500 };

const KITCHEN_STATUS_OPTIONS = Object.values(KitchenStatus);

export default async function AdminKitchensPage({ searchParams }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const kitchenSearchQuery = normalizeKitchenSearchQuery(resolvedSearchParams.q);
  const [pagination, programs] = await Promise.all([
    listKitchensPageForAdmin(kitchenSearchQuery, resolvedSearchParams.page),
    listCatalogPrograms(),
  ]);
  const kitchens = pagination.items;
  const rowNumber = (index) => pagination.totalItems - (pagination.page - 1) * pagination.pageSize - index;

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="kitchensAdmin.addKitchen" fallback="Add Kitchen" />}
          description={<AdminText i18nKey="kitchensAdmin.addKitchenDescription" fallback="Create a kitchen record with the three default catalog items. Add the remaining items from the kitchen detail page." />}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action="/api/admin/kitchens" method="post" style={formGridStyle}>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.kitchenName" fallback="Kitchen name" />}>
              <input name="name" placeholder="105807" style={inputStyle} required />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.kitchenCode" fallback="Kitchen code" />}>
              <input name="kitchenCode" placeholder="105 807" style={inputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.programmId" fallback="Programm ID" />}>
              <AdminSelect name="programmId" defaultValue="IP 2200" style={inputStyle}>
                {programs.map((program) => (
                  <option key={program.programmId} value={program.programmId}>
                    {program.programmId}{program.name && program.name !== program.programmId ? ` - ${program.name}` : ""}
                  </option>
                ))}
              </AdminSelect>
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.status" fallback="Status" />}>
              <AdminSelect name="status" defaultValue={KitchenStatus.DRAFT} style={inputStyle}>
                {KITCHEN_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    <AdminText i18nKey={`status.${status.toLowerCase()}`} fallback={status} />
                  </option>
                ))}
              </AdminSelect>
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.description" fallback="Description" />} wide>
              <AdminTranslatedTextarea
                name="description"
                placeholderKey="kitchensAdmin.descriptionPlaceholder"
                placeholderFallback="Kitchen configuration based on the plan file"
                rows={2}
                style={textareaStyle}
              />
            </FormField>
            <div style={{ gridColumn: "1 / -1", ...actionRowStyle }}>
              <button type="submit" style={primaryButtonStyle}>
                <AdminText i18nKey="kitchensAdmin.createKitchen" fallback="Create kitchen" />
              </button>
            </div>
          </form>
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="adminShellLogin.kitchens" fallback="Kitchens" />}
        >
          <form action="/admin/kitchens" method="get" style={searchPanelStyle}>
            <label style={searchFieldStyle}>
              <span><AdminText i18nKey="kitchensAdmin.search" fallback="Search kitchens" /></span>
              <AdminTranslatedInput
                name="q"
                type="search"
                defaultValue={kitchenSearchQuery}
                placeholderKey="kitchensAdmin.searchPlaceholder"
                placeholderFallback="Search by kitchen name, code, or program..."
                style={searchInputStyle}
              />
            </label>
            <div style={searchActionsStyle}>
              <button type="submit" style={primaryButtonStyle}>
                <AdminText i18nKey="kitchensAdmin.searchButton" fallback="Search" />
              </button>
              {kitchenSearchQuery ? (
                <ActionLink href="/admin/kitchens">
                  <AdminText i18nKey="kitchensAdmin.clearSearch" fallback="Clear" />
                </ActionLink>
              ) : null}
            </div>
          </form>

          {kitchenSearchQuery ? (
            <p style={searchResultsStyle}>
              <AdminText
                i18nKey="kitchensAdmin.searchResults"
                fallback="{shown} of {total} kitchens found"
                values={{ shown: String(filteredKitchens.length), total: String(allKitchens.length) }}
              />
            </p>
          ) : null}

          <div className="admin-list-table" style={{ ...tableWrapStyle, borderRadius: 4 }}>
            <table style={{ ...tableStyle, minWidth: 1050 }}>
              <colgroup><col style={{ width: 64 }} />{Array.from({ length: 8 }, (_, index) => <col key={index} />)}</colgroup>
              <thead>
                <tr>
                  <th style={{ ...thStyle, ...numberCellStyle }}><AdminText i18nKey="usersAdmin.orderNr" fallback="No." /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.kitchen" fallback="Kitchen" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.programmId" fallback="Programm ID" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.status" fallback="Status" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.items" fallback="Items" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.orders" fallback="Orders" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.contracts" fallback="Contracts" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.updated" fallback="Updated" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchensAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!kitchens.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={9}><AdminText i18nKey="kitchensAdmin.noKitchensFound" fallback="No kitchens found." /></td>
                  </tr>
                ) : null}
                {kitchens.map((kitchen, index) => (
                  <tr key={kitchen.id}>
                    <td style={{ ...tdStyle, ...numberCellStyle }}>{rowNumber(index)}</td>
                    <td style={tdStyle}>
                      <Link
                        href={`/admin/kitchens/${kitchen.id}`}
                        style={{ color: "var(--app-accent)", fontWeight: 800, textDecoration: "none" }}
                      >
                        <AdminKitchenDisplayName slug={kitchen.slug} name={kitchen.name} />
                      </Link>
                    </td>
                    <td style={tdStyle}>{kitchen.programmId || "IP 2200"}</td>
                    <td style={tdStyle}><AdminStatusBadge status={kitchen.status} /></td>
                    <td style={tdStyle}>{kitchen._count.items}</td>
                    <td style={tdStyle}>{kitchen._count.orders}</td>
                    <td style={tdStyle}>{kitchen._count.contracts}</td>
                    <td style={tdStyle}><AdminDateTime value={kitchen.updatedAt.toISOString()} /></td>
                    <td style={tdStyle}>
                      <ActionLink href={`/admin/kitchens/${kitchen.id}`}>
                        <AdminText i18nKey="kitchensAdmin.manage" fallback="Manage" />
                      </ActionLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards" style={{ gap: cardListStyle.gap }}>
            {!kitchens.length ? <p style={{ margin: 0, color: "var(--app-text-muted)" }}><AdminText i18nKey="kitchensAdmin.noKitchensFound" fallback="No kitchens found." /></p> : null}
            {kitchens.map((kitchen, index) => (
              <article key={kitchen.id} style={itemCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ color: "var(--app-text-muted)", fontSize: 12 }}><AdminText i18nKey="usersAdmin.orderNr" fallback="No." /> {rowNumber(index)}</div>
                    <Link
                      href={`/admin/kitchens/${kitchen.id}`}
                      style={{ color: "var(--app-accent)", fontWeight: 800, textDecoration: "none" }}
                    >
                      <AdminKitchenDisplayName slug={kitchen.slug} name={kitchen.name} />
                    </Link>
                    <div style={subMetaStyle}>
                      <span>{kitchen.programmId || "IP 2200"}</span>
                      <span><AdminDateTime value={kitchen.updatedAt.toISOString()} /></span>
                    </div>
                  </div>
                  <AdminStatusBadge status={kitchen.status} />
                </div>
                <div style={subMetaStyle}>
                  <span>{kitchen._count.items} <AdminText i18nKey="kitchensAdmin.itemCount" fallback="item(s)" /></span>
                  <span>{kitchen._count.orders} <AdminText i18nKey="kitchensAdmin.orderCount" fallback="order(s)" /></span>
                  <span>
                    <AdminPluralText
                      count={kitchen._count.contracts}
                      singularKey="kitchensAdmin.contractCountSingular"
                      pluralKey="kitchensAdmin.contractCountPlural"
                      singularFallback="{count} contract"
                      pluralFallback="{count} contracts"
                    />
                  </span>
                </div>
                <div>
                  <ActionLink href={`/admin/kitchens/${kitchen.id}`}>
                    <AdminText i18nKey="kitchensAdmin.manage" fallback="Manage" />
                  </ActionLink>
                </div>
              </article>
            ))}
          </div>

          <AdminPagination basePath="/admin/kitchens" searchParams={resolvedSearchParams} {...pagination} />

          <style>{`
            .admin-list-cards {
              display: none;
            }

            @media (max-width: 760px) {
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

const searchPanelStyle = {
  display: "flex",
  gap: 12,
  alignItems: "end",
  flexWrap: "wrap",
  padding: "16px 18px",
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "var(--app-surface-muted)",
};

const searchFieldStyle = {
  display: "grid",
  gap: 8,
  flex: "1 1 320px",
  color: "var(--app-text)",
  fontWeight: 700,
};

const searchInputStyle = {
  ...inputStyle,
  width: "100%",
  minHeight: 48,
};

const searchActionsStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const searchResultsStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  fontSize: 14,
};

