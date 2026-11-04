import {
  AdminSection,
  PageHero,
  codePillStyle,
  emptyStateStyle,
  pageGridStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminText } from "../../../../components/admin-i18n";
import { requireAdminPage } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

export default async function AdminCatalogBlendenPage() {
  const admin = await requireAdminPage("FRG_VIEW");
  const blenden = await prisma.catalogBlende.findMany({
    include: {
      _count: { select: { kitchenItems: true } },
    },
    orderBy: [
      { code: "asc" },
    ],
  });

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <PageHero
          eyebrow={<AdminText i18nKey="catalogAuditAdmin.readOnly" fallback="Read-only" />}
          title={<AdminText i18nKey="catalogAuditAdmin.catalogBlenden" fallback="Catalog Blenden" />}
          description={<AdminText i18nKey="catalogAuditAdmin.blendenDescription" fallback="Reusable blende price records. These rows are visible for audit only; checkout still uses KitchenItem.price." />}
        />

        <AdminSection title={<AdminText i18nKey="catalogAdmin.blenden" fallback="Blenden" />}>
          {!blenden.length ? <p style={emptyStateStyle}><AdminText i18nKey="catalogAdmin.noBlenden" fallback="No catalog blenden found." /></p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.code" fallback="Code" /></th>
                    <th style={thStyle}><AdminText i18nKey="kitchenDetailAdmin.name" fallback="Name" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.germanName" fallback="German name" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.price" fallback="Price" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.active" fallback="Active" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.linkedKitchenItems" fallback="Linked kitchen items" /></th>
                  </tr>
                </thead>
                <tbody>
                  {blenden.map((blende) => (
                    <tr key={blende.id}>
                      <td style={tdStyle}><span style={codePillStyle}>{blende.code}</span></td>
                      <td style={tdStyle}>{blende.name}</td>
                      <td style={tdStyle}>{blende.nameDe || ""}</td>
                      <td style={tdStyle}>{formatMoney(blende.price)}</td>
                      <td style={tdStyle}><AdminText i18nKey={blende.isActive ? "catalogAdmin.yes" : "catalogAdmin.no"} fallback={blende.isActive ? "Yes" : "No"} /></td>
                      <td style={tdStyle}>{blende._count.kitchenItems}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      </div>
    </AdminShell>
  );
}
