import {
  ActionLink,
  AdminSection,
  FlashMessage,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../../../components/admin-ui";
import Link from "next/link";
import { Fragment } from "react";
import { AdminShell } from "../../../components/admin-shell";
import { AdminPagination } from "../../../components/admin-pagination";
import AdminContractsFilters from "../../../components/admin-contracts-filters";
import AdminContractCreateForm from "../../../components/admin-contract-create-form";
import AdminArcPdfImport from "../../../components/admin-arc-pdf-import";
import { AdminDateTime, AdminKitchenDisplayName, AdminStatusBadge, AdminText } from "../../../components/admin-i18n";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { listKitchenContractsForAdmin, listKitchensForAdmin, listProjectsForAdmin, listPropertyOwnersForAdmin } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function normalizeContractTypeFilter(value) {
  const normalized = String(normalizeParam(value)).trim().toUpperCase();
  return normalized === "ARC" || normalized === "FRG" ? normalized : "";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function CountryName({ country }) {
  if (country === "Germany" || country === "Deutschland") return <AdminText i18nKey="contractsAdmin.germany" fallback="Germany" />;
  if (country === "Austria" || country === "Österreich") return <AdminText i18nKey="contractsAdmin.austria" fallback="Austria" />;
  return country || "";
}

function ProjectStatusText({ status }) {
  const statusKey = String(status || "").toLowerCase();
  const fallback = statusKey.replace(/_/g, " ");
  return <AdminText i18nKey={`status.${statusKey}`} fallback={fallback} />;
}

function contractAddressLines(contract) {
  const fallbackAddress = contract.propertyObject ? null : contract.latestOrderAddress;
  const projectLine = contract.projectName || contract.propertyObject?.projectName
    ? <><AdminText i18nKey="contractsAdmin.project" fallback="Project" />: {contract.projectCode ? `${contract.projectCode} - ` : ""}{contract.projectName || contract.propertyObject?.projectName}</>
    : "";
  const projectMetaLine = [
    contract.projectStatus ? <span key="status"><AdminText i18nKey="dashboard.status" fallback="Status" />: <ProjectStatusText status={contract.projectStatus} /></span> : "",
    contract.projectManagerName ? <span key="manager"><AdminText i18nKey="contractsAdmin.manager" fallback="Manager" />: {contract.projectManagerName}</span> : "",
  ].filter(Boolean);
  const objectLine = contract.propertyObject?.name
    ? <><AdminText i18nKey="contractsAdmin.propertyObject" fallback="Object/building" />: {contract.propertyObject.name}</>
    : fallbackAddress
      ? ""
      : <AdminText i18nKey="contractsAdmin.noObjectSelected" fallback="No object selected" />;
  const streetLine = [
    contract.address1 || fallbackAddress?.address1,
    contract.address2 || fallbackAddress?.address2,
  ].filter(Boolean).join(", ");
  const cityLine = [
    contract.postalCode || fallbackAddress?.postalCode,
    contract.city || fallbackAddress?.city,
  ].filter(Boolean).join(" ");
  const country = contract.country || fallbackAddress?.country;
  const unitLine = [
    contract.building ? <span key="building"><AdminText i18nKey="contractsAdmin.building" fallback="Building" /> {contract.building}</span> : "",
    contract.floor ? <span key="floor"><AdminText i18nKey="contractsAdmin.floor" fallback="Floor" /> {contract.floor}</span> : "",
    contract.unitNumber ? <span key="unit"><AdminText i18nKey="contractsAdmin.unit" fallback="Unit" /> {contract.unitNumber}</span> : "",
  ].filter(Boolean);

  return [
    projectLine,
    projectMetaLine,
    objectLine,
    streetLine,
    cityLine,
    country ? <CountryName country={country} /> : "",
    unitLine,
    contract.notes ? <><AdminText i18nKey="contractsAdmin.notes" fallback="Notes" />: {contract.notes}</> : "",
  ].filter(Boolean);
}

function contactAddressLines(address) {
  if (!address) return [];
  const nameLine = [address.firstName, address.lastName].filter(Boolean).join(" ");
  const streetLine = [address.address1, address.address2].filter(Boolean).join(", ");
  const cityLine = [address.postalCode, address.city].filter(Boolean).join(" ");
  return [nameLine, streetLine, cityLine, address.country ? <CountryName country={address.country} /> : ""].filter(Boolean);
}

function AddressColumn({ lines, emptyText }) {
  const displayLines = lines.length ? lines : [emptyText];

  return (
    <div style={addressBlockStyle}>
      <div style={lines.length ? addressLinesStyle : emptyAddressStyle}>
        {displayLines.map((line, index) => (
          <span key={typeof line === "string" ? line : `empty-${index}`}>{renderLine(line)}</span>
        ))}
      </div>
    </div>
  );
}

function renderLine(line) {
  if (!Array.isArray(line)) return line;
  return line.map((piece, index) => (
    <Fragment key={index}>{index ? " | " : ""}{piece}</Fragment>
  ));
}

function ContractField({ label, children }) {
  return (
    <section style={contractFieldStyle}>
      <span style={contractFieldLabelStyle}>{label}</span>
      <div style={contractFieldValueStyle}>{children}</div>
    </section>
  );
}

function ownerName(owner) {
  if (!owner) return <AdminText i18nKey="contractsAdmin.noOwnerSelected" fallback="No housing company selected" />;
  return owner.name || "";
}

function ownerSummary(owner) {
  return ownerName(owner);
}

function usageLabel(orderCount) {
  const count = Number(orderCount || 0);
  if (count === 0) return <AdminText i18nKey="contractsAdmin.unused" fallback="Unused" />;
  if (count === 1) return <AdminText i18nKey="contractsAdmin.usedOnce" fallback="Used once" />;
  return <AdminText i18nKey="contractsAdmin.usedTimes" fallback="Used {count} times" values={{ count: String(count) }} />;
}

function orderCustomerName(order) {
  return [order.firstName, order.lastName].filter(Boolean).join(" ") || "-";
}

function registrationContactLines(registration) {
  if (!registration) return [];
  return [
    registration.fullName,
    registration.email,
    registration.phone,
    registration.addressNote,
    registration.verifiedAt ? <><AdminText i18nKey="contractsAdmin.verified" fallback="Verified" />: <AdminDateTime value={registration.verifiedAt} /></> : "",
  ].filter(Boolean);
}

function RegisteredOwnerColumn({ contract }) {
  const registration = contract.activeRegistration;
  return (
    <AddressColumn
      lines={registrationContactLines(registration)}
      emptyText={<AdminText i18nKey="contractsAdmin.noRegisteredOwner" fallback="No registered owner" />}
    />
  );
}

function ContractRegistrationHistory({ contract }) {
  const previousRegistrations = contract.previousRegistrations || [];
  const pendingRegistrations = contract.pendingRegistrations || [];
  const hasHistory = previousRegistrations.length || pendingRegistrations.length;

  if (!hasHistory) {
    return (
      <p style={emptyOrdersStyle}>
        <AdminText i18nKey="contractsAdmin.noRegistrationHistory" fallback="No previous or pending registrations." />
      </p>
    );
  }

  return (
    <div style={registrationHistoryListStyle}>
      {pendingRegistrations.map((registration) => (
        <div key={registration.id} style={registrationHistoryItemStyle}>
          <strong>{registration.fullName || "-"}</strong>
          <span>{registration.email || "-"}</span>
          {registration.phone ? <span>{registration.phone}</span> : null}
          <span><AdminText i18nKey="contractsAdmin.pendingVerification" fallback="Pending email verification" /></span>
          {registration.verificationExpiresAt ? <span><AdminText i18nKey="contractsAdmin.expires" fallback="Expires" />: <AdminDateTime value={registration.verificationExpiresAt} /></span> : null}
        </div>
      ))}
      {previousRegistrations.map((registration) => (
        <div key={registration.id} style={registrationHistoryItemStyle}>
          <strong>{registration.fullName || "-"}</strong>
          <span>{registration.email || "-"}</span>
          {registration.phone ? <span>{registration.phone}</span> : null}
          {registration.deactivatedAt ? <span><AdminText i18nKey="contractsAdmin.deactivated" fallback="Deactivated" />: <AdminDateTime value={registration.deactivatedAt} /></span> : null}
        </div>
      ))}
    </div>
  );
}

function ContractOrders({ contract }) {
  const orders = contract.orders || [];

  if (!orders.length) {
    return (
      <p style={emptyOrdersStyle}>
        <AdminText i18nKey="contractsAdmin.noOrdersForThisContract" fallback="No orders for this contract yet." />
      </p>
    );
  }

  return (
    <div style={contractOrdersListStyle}>
      {orders.map((order) => (
        <Link key={order.id} href={`/admin/orders/${order.id}`} className="contract-order-link" style={contractOrderLinkStyle}>
          <span style={contractOrderMainStyle}>
            <strong>{order.orderNumber}</strong>
            <span><AdminText i18nKey="contractsAdmin.orderSequence" fallback="Order {number} for this contract" values={{ number: String(order.contractOrderSequence || "") }} /></span>
          </span>
          <span style={contractOrderMetaStyle}>
            <AdminStatusBadge status={order.status} />
            <span>{orderCustomerName(order)}</span>
            <span>{formatCurrency(order.totalPrice)}</span>
            <span><AdminDateTime value={order.createdAt} /></span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function AdminContractsPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const filters = {
    contractType: normalizeContractTypeFilter(resolvedSearchParams.contractType),
    kitchenId: normalizeParam(resolvedSearchParams.kitchenId),
    housingCompanyId: normalizeParam(resolvedSearchParams.housingCompanyId || resolvedSearchParams.ownerId),
    projectId: normalizeParam(resolvedSearchParams.projectId),
    status: normalizeParam(resolvedSearchParams.status),
    usage: normalizeParam(resolvedSearchParams.usage),
    query: normalizeParam(resolvedSearchParams.q),
  };
  const returnTo = `/admin/contracts?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()}`;

  const [kitchens, owners, projects, pagination] = await Promise.all([
    listKitchensForAdmin(),
    listPropertyOwnersForAdmin(),
    listProjectsForAdmin(),
    listKitchenContractsForAdmin(filters, resolvedSearchParams.page || 1),
  ]);
  const contracts = pagination.items;
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="contractsAdmin.contractNumbers" fallback="Contract Numbers" />}
          description={<AdminText i18nKey="contractsAdmin.createFilterAndEditReusableContractNumbersFromOnePlace" fallback="Create, filter, and manage reusable contract numbers." />}
          actions={<ActionLink href="/admin/property-owners"><AdminText i18nKey="dashboard.manageOwners" fallback="Manage owners" /></ActionLink>}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <AdminContractsFilters
            kitchens={kitchens}
            owners={owners}
            projects={projects}
            filters={filters}
          />
        </AdminSection>

        <AdminSection>
          <details style={createContractDetailsStyle}>
            <summary className="create-contract-summary" style={createContractSummaryStyle}>
              <AdminText i18nKey="contractsAdmin.addContractNumber" fallback="Add Contract Number" />
            </summary>
            <div style={createContractBodyStyle}>
              <AdminContractCreateForm
                kitchens={kitchens}
                owners={owners}
                projects={projects}
                defaultKitchenId={filters.kitchenId}
                defaultHousingCompanyId={filters.housingCompanyId}
                defaultProjectId={filters.projectId}
                returnTo={returnTo}
              />
            </div>
          </details>
        </AdminSection>

        <AdminSection>
          <details style={createContractDetailsStyle}>
            <summary className="create-contract-summary" style={createContractSummaryStyle}>
              <AdminText i18nKey="contractsAdmin.arcImport.title" fallback="Import ARC from PDF folder" />
            </summary>
            <div style={createContractBodyStyle}>
              <AdminArcPdfImport />
            </div>
          </details>
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="contractsAdmin.configuredContracts" fallback="Contract Numbers" />}
          description={<AdminText i18nKey="contractsAdmin.contractNumbersMatchCurrentFilters" fallback="{count} contract numbers match the current filters." values={{ count: String(pagination.totalItems) }} />}
        >
          <div className="contract-card-list" style={contractCardListStyle}>
            {!contracts.length ? <p style={mutedTextStyle}><AdminText i18nKey="contractsAdmin.noContractNumbersMatchCurrentFilters" fallback="No contract numbers match the current filters." /></p> : null}
            {contracts.map((contract) => (
              <article key={contract.id} style={contractCardStyle}>
                <div className="contract-card-grid" style={contractCardGridStyle}>
                  <div style={contractCardIdentityStyle}>
                    <div style={contractTitleRowStyle}>
                      <strong style={contractTitleStyle}>{contract.contractNumber}</strong>
                      <span style={contract.contractType === "ARC" ? arcTypeBadgeStyle : frgTypeBadgeStyle}>
                        {contract.contractType}
                      </span>
                      <span style={badgeWrapStyle}><AdminStatusBadge status={contract.isActive ? "ACTIVE" : "INACTIVE"} /></span>
                    </div>
                    <span style={contractKitchenStyle}><AdminKitchenDisplayName slug={contract.kitchen.slug} name={contract.kitchen.name} /></span>
                  </div>

                  <div className="contract-card-fields" style={contractCardFieldsStyle}>
                    <ContractField label={<AdminText i18nKey="contractsAdmin.owner" fallback="Housing company" />}>
                      {ownerSummary(contract.owner)}
                    </ContractField>
                    <ContractField label={<AdminText i18nKey="contractsAdmin.contractAddress" fallback="Contract address" />}>
                      <AddressColumn lines={contractAddressLines(contract)} emptyText={<AdminText i18nKey="contractsAdmin.noContractAddress" fallback="No contract address" />} />
                    </ContractField>
                    <ContractField label={<AdminText i18nKey="contractsAdmin.paymentAddress" fallback="Billing address" />}>
                      <AddressColumn lines={contactAddressLines(contract.latestOrderAddress)} emptyText={<AdminText i18nKey="contractsAdmin.noPaymentAddress" fallback="No billing address" />} />
                    </ContractField>
                    <ContractField label={<AdminText i18nKey="contractsAdmin.registeredOwner" fallback="Registered owner" />}>
                      <RegisteredOwnerColumn contract={contract} />
                    </ContractField>
                  </div>

                  <aside className="contract-card-meta" style={contractCardMetaStyle}>
                    <span style={contract._count.orders ? usagePillUsedStyle : usagePillUnusedStyle}>
                      {usageLabel(contract._count.orders)}
                    </span>
                    <span className="contract-created" style={contractCreatedStyle}>
                      <AdminText i18nKey="contractsAdmin.created" fallback="Created" />
                      <strong><AdminDateTime value={contract.createdAt} /></strong>
                    </span>
                  </aside>
                </div>

                <div className="contract-card-actions" style={contractCardActionsStyle}>
                  <Link href={`/admin/contracts/${contract.id}`} style={contractDetailsLinkStyle}>
                    <AdminText i18nKey="contractsAdmin.viewDetails" fallback="View details" />
                  </Link>
                  <div style={contractInlineActionsStyle}>
                    <form action={`/api/admin/contracts/${contract.id}`} method="post" style={contractInlineActionFormStyle}>
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button
                        type="submit"
                        name="_intent"
                        value={contract.isActive ? "deactivate" : "reactivate"}
                        style={contractToggleButtonStyle}
                      >
                        {contract.isActive ? <AdminText i18nKey="contractsAdmin.deactivate" fallback="Deactivate" /> : <AdminText i18nKey="contractsAdmin.reactivate" fallback="Reactivate" />}
                      </button>
                    </form>
                    <details style={contractDeleteDetailsStyle}>
                      <summary style={contractDeleteSummaryStyle}><AdminText i18nKey="contractsAdmin.delete" fallback="Delete" /></summary>
                      <form action={`/api/admin/contracts/${contract.id}`} method="post" style={contractDeleteFormStyle}>
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button type="submit" name="_intent" value="delete" style={contractDeleteButtonStyle}>
                          <AdminText i18nKey="contractsAdmin.confirmDelete" fallback="Confirm delete" />
                        </button>
                      </form>
                    </details>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <AdminPagination basePath="/admin/contracts" searchParams={resolvedSearchParams} {...pagination} />

          <style>{`
            .create-contract-summary::-webkit-details-marker {
              display: none;
            }

            .contract-utility-summary::-webkit-details-marker {
              display: none;
            }

            .contract-utility-summary::before {
              content: ">";
              display: inline-flex;
              margin-right: 8px;
              transition: transform 120ms ease;
            }

            details[open] > .contract-utility-summary::before {
              transform: rotate(90deg);
            }

            @media (max-width: 920px) {
              .contract-card-grid {
                grid-template-columns: 1fr !important;
              }

              .contract-card-fields {
                grid-template-columns: 1fr !important;
              }

              .contract-card-actions {
                grid-template-columns: 1fr !important;
              }

              .contract-card-meta {
                align-items: flex-start !important;
              }

              .contract-created {
                justify-items: start !important;
              }

              .contract-order-link {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const createContractDetailsStyle = {
  display: "grid",
  gap: 16,
};

const createContractSummaryStyle = {
  ...primaryButtonStyle,
  width: "fit-content",
  minHeight: 46,
  borderRadius: 8,
  padding: "12px 18px",
  listStyle: "none",
  cursor: "pointer",
};

const createContractBodyStyle = {
  display: "grid",
  gap: 12,
  paddingTop: 6,
};

const contractCardListStyle = {
  display: "grid",
  gap: 14,
};

const contractCardStyle = {
  display: "grid",
  gap: 14,
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.9)",
  boxShadow: "var(--app-card-shadow)",
  padding: 16,
};

const contractCardGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(180px, 0.9fr) minmax(360px, 2.2fr) minmax(180px, 0.8fr)",
  gap: 16,
  alignItems: "start",
};

const contractCardIdentityStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
};

const contractTitleRowStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const badgeWrapStyle = {
  display: "inline-flex",
  whiteSpace: "nowrap",
};

const contractTypeBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 26,
  padding: "4px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const arcTypeBadgeStyle = {
  ...contractTypeBadgeStyle,
  color: "#7a3f24",
  background: "rgba(181, 119, 74, 0.13)",
  border: "1px solid rgba(181, 119, 74, 0.24)",
};

const frgTypeBadgeStyle = {
  ...contractTypeBadgeStyle,
  color: "var(--app-info-text)",
  background: "var(--app-info-bg)",
  border: "1px solid rgba(45, 108, 121, 0.18)",
};

const contractTitleStyle = {
  color: "var(--app-text)",
  fontSize: "1.08rem",
  lineHeight: 1.2,
  overflowWrap: "anywhere",
};

const contractKitchenStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.3,
};

const contractCardFieldsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 12,
  minWidth: 0,
};

const contractFieldStyle = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const contractFieldLabelStyle = {
  color: "var(--app-text-muted)",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.06em",
  lineHeight: 1.25,
  textTransform: "uppercase",
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "none",
};

const contractFieldValueStyle = {
  color: "var(--app-text)",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.42,
  minWidth: 0,
  overflowWrap: "break-word",
  wordBreak: "normal",
  hyphens: "none",
};

const contractCardMetaStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  alignItems: "flex-end",
  minWidth: 0,
};

const contractCreatedStyle = {
  display: "grid",
  gap: 3,
  justifyItems: "end",
  color: "var(--app-text-muted)",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.05em",
  lineHeight: 1.25,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const contractCardActionsStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(180px, 1fr) auto",
  gap: 10,
  alignItems: "start",
};

const contractDetailsLinkStyle = {
  ...secondaryButtonStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 12px",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
};

const contractInlineActionsStyle = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  justifyContent: "flex-end",
  flexWrap: "wrap",
};

const contractInlineActionFormStyle = {
  display: "grid",
};

const contractEditDetailsStyle = {
  display: "grid",
  gap: 10,
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  background: "rgba(255,255,255,0.74)",
  padding: 0,
};

const contractEditSummaryStyle = {
  color: "var(--app-accent)",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 800,
  listStyle: "none",
  minHeight: 46,
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  width: "100%",
};

const contractEditFormStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "end",
  padding: "0 12px 12px",
};

const contractEditActionStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gridColumn: "1 / -1",
};

const contractToggleButtonStyle = {
  ...secondaryButtonStyle,
  width: "auto",
  minWidth: 130,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: "0.92rem",
};

const contractDeleteDetailsStyle = {
  display: "grid",
  gap: 6,
};

const contractDeleteSummaryStyle = {
  color: "#9f2d20",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
};

const contractDeleteFormStyle = {
  display: "grid",
};

const contractDeleteButtonStyle = {
  ...secondaryButtonStyle,
  width: "100%",
  minHeight: 38,
  borderRadius: 8,
  padding: "8px 10px",
  color: "#9f2d20",
  borderColor: "rgba(159, 45, 32, 0.28)",
  background: "rgba(159, 45, 32, 0.06)",
  fontSize: "0.88rem",
};

const usagePillUsedStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "8px 10px",
  borderRadius: 999,
  background: "linear-gradient(135deg, var(--app-info-bg), rgba(255,255,255,0.78))",
  color: "var(--app-info-text)",
  border: "1px solid rgba(45, 108, 121, 0.14)",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

const usagePillUnusedStyle = {
  ...usagePillUsedStyle,
  background: "linear-gradient(135deg, var(--app-neutral-bg), rgba(255,255,255,0.72))",
  color: "var(--app-neutral-text)",
  border: "1px solid rgba(112, 89, 78, 0.12)",
};

const contractOrdersDetailsStyle = {
  display: "grid",
  gap: 10,
  borderRadius: 8,
  border: "1px solid rgba(45, 108, 121, 0.14)",
  background: "rgba(255,255,255,0.74)",
  padding: 0,
};

const contractOrdersSummaryStyle = {
  color: "var(--app-info-text)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
  listStyle: "none",
  minHeight: 46,
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  width: "100%",
};

const contractOrdersListStyle = {
  display: "grid",
  gap: 8,
  padding: "0 12px 12px",
};

const registrationHistoryListStyle = {
  display: "grid",
  gap: 8,
  padding: "0 12px 12px",
};

const registrationHistoryItemStyle = {
  display: "grid",
  gap: 4,
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.9)",
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.35,
  padding: "10px 12px",
};

const contractOrderLinkStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(190px, 1fr) minmax(260px, 2fr)",
  gap: 12,
  alignItems: "center",
  textDecoration: "none",
  color: "var(--app-text)",
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.9)",
  padding: "10px 12px",
};

const contractOrderMainStyle = {
  display: "grid",
  gap: 3,
  minWidth: 0,
};

const contractOrderMetaStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const emptyOrdersStyle = {
  ...mutedTextStyle,
  margin: 0,
};

const addressBlockStyle = {
  display: "grid",
  minWidth: 0,
};

const addressLinesStyle = {
  display: "grid",
  gap: 3,
  color: "var(--app-text-muted)",
  fontSize: 13,
  lineHeight: 1.38,
  overflowWrap: "break-word",
  wordBreak: "normal",
  hyphens: "none",
};

const emptyAddressStyle = {
  ...addressLinesStyle,
  color: "var(--app-text-muted)",
};
