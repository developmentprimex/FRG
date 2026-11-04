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

export default async function AdminCatalogServicesPage() {
  const admin = await requireAdminPage("FRG_VIEW");
  const services = await prisma.catalogService.findMany({
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
          title={<AdminText i18nKey="catalogAuditAdmin.catalogServices" fallback="Catalog Services" />}
          description={<AdminText i18nKey="catalogAuditAdmin.servicesDescription" fallback="Reusable service price records. These rows are visible for audit only; checkout still uses KitchenItem.price." />}
        />

        <AdminSection title={<AdminText i18nKey="catalogAdmin.services" fallback="Services" />}>
          {!services.length ? <p style={emptyStateStyle}><AdminText i18nKey="catalogAdmin.noServices" fallback="No catalog services found." /></p> : (
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
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td style={tdStyle}><span style={codePillStyle}>{service.code}</span></td>
                      <td style={tdStyle}>{service.name}</td>
                      <td style={tdStyle}>{service.nameDe || ""}</td>
                      <td style={tdStyle}>{formatMoney(service.price)}</td>
                      <td style={tdStyle}><AdminText i18nKey={service.isActive ? "catalogAdmin.yes" : "catalogAdmin.no"} fallback={service.isActive ? "Yes" : "No"} /></td>
                      <td style={tdStyle}>{service._count.kitchenItems}</td>
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
