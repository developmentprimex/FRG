import Link from "next/link";
import {
  ActionLink,
  AdminSection,
  FormField,
  actionRowStyle,
  inputStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import AdminContractLinkFields from "../../../../components/admin-contract-link-fields";
import AdminContractApplianceFields from "../../../../components/admin-contract-appliance-fields";
import AdminApplianceSummary from "../../../../components/admin-appliance-summary";
import { loadContractApplianceInventory } from "../../../../lib/contract-appliance-inventory";
import AdminFileInput from "../../../../components/admin-file-input";
import { AdminDateTime, AdminKitchenDisplayName, AdminStatusBadge, AdminText } from "../../../../components/admin-i18n";
import { requireAdminPage } from "../../../../lib/auth";
import { getKitchenContractForAdmin, listKitchensForAdmin, listProjectsForAdmin, listPropertyOwnersForAdmin } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function CountryName({ country }) {
  if (country === "Germany" || country === "Deutschland") return <AdminText i18nKey="contractsAdmin.germany" fallback="Germany" />;
  if (country === "Austria" || country === "\u00d6sterreich") return <AdminText i18nKey="contractsAdmin.austria" fallback="Austria" />;
  return country || "";
}

function ProjectStatusText({ status }) {
  const statusKey = String(status || "").toLowerCase();
  return <AdminText i18nKey={`status.${statusKey}`} fallback={statusKey.replace(/_/g, " ")} />;
}

function DetailField({ label, children }) {
  return (
    <div style={detailFieldStyle}>
      <span style={detailLabelStyle}>{label}</span>
      <div style={detailValueStyle}>{children || "-"}</div>
    </div>
  );
}

function AddressLines({ lines }) {
  const displayLines = lines.filter(Boolean);
  if (!displayLines.length) return "-";
  return (
    <div style={lineStackStyle}>
      {displayLines.map((line, index) => (
        <span key={`${String(line)}-${index}`}>{line}</span>
      ))}
    </div>
  );
}

function contractAddressLines(contract) {
  return [
    contract.projectName ? <><AdminText i18nKey="contractsAdmin.project" fallback="Project" />: {contract.projectCode ? `${contract.projectCode} - ` : ""}{contract.projectName}</> : "",
    contract.projectStatus ? <><AdminText i18nKey="contractsAdmin.status" fallback="Status" />: <ProjectStatusText status={contract.projectStatus} /></> : "",
    contract.propertyObject?.name ? <><AdminText i18nKey="contractsAdmin.propertyObject" fallback="Object / Building" />: {contract.propertyObject.name}</> : "",
    [contract.address1, contract.address2].filter(Boolean).join(", "),
    [contract.postalCode, contract.city].filter(Boolean).join(" "),
    contract.country ? <CountryName country={contract.country} /> : "",
    contract.building || contract.floor || contract.unitNumber ? (
      <>
        {contract.building ? <><AdminText i18nKey="contractsAdmin.building" fallback="Building" /> {contract.building}</> : null}
        {contract.building && (contract.floor || contract.unitNumber) ? " | " : ""}
        {contract.floor ? <><AdminText i18nKey="contractsAdmin.floor" fallback="Floor" /> {contract.floor}</> : null}
        {contract.floor && contract.unitNumber ? " | " : ""}
        {contract.unitNumber ? <><AdminText i18nKey="contractsAdmin.unit" fallback="Unit" /> {contract.unitNumber}</> : null}
      </>
    ) : "",
  ];
}

function billingAddressLines(contract) {
  const address = contract.latestOrderAddress;
  if (!address) return [];
  return [
    [address.firstName, address.lastName].filter(Boolean).join(" "),
    [address.address1, address.address2].filter(Boolean).join(", "),
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.country ? <CountryName country={address.country} /> : "",
  ];
}

function contactLines(registration) {
  if (!registration) return [];
  return [
    registration.fullName,
    registration.email,
    registration.phone,
    registration.addressNote,
    registration.verifiedAt ? <><AdminText i18nKey="contractsAdmin.verified" fallback="Verified" />: <AdminDateTime value={registration.verifiedAt} /></> : "",
  ];
}

function OrderList({ orders }) {
  if (!orders?.length) {
    return <p style={mutedTextStyle}><AdminText i18nKey="contractsAdmin.noOrdersForThisContract" fallback="No orders for this contract number yet." /></p>;
  }
  return (
    <div style={listStyle}>
      {orders.map((order) => (
        <Link key={order.id} href={`/admin/orders/${order.id}`} style={listItemLinkStyle}>
          <strong>{order.orderNumber}</strong>
          <span style={itemMetaStyle}>
            <AdminStatusBadge status={order.status} />
            <span>{[order.firstName, order.lastName].filter(Boolean).join(" ") || "-"}</span>
            <span>{formatCurrency(order.totalPrice)}</span>
            <span><AdminDateTime value={order.createdAt} /></span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function RegistrationHistory({ contract }) {
  const active = contract.activeRegistration ? [contract.activeRegistration] : [];
  const pending = contract.pendingRegistrations || [];
  const previous = contract.previousRegistrations || [];
  const entries = [
    ...active.map((entry) => ({ ...entry, statusKey: "activeOwner", statusFallback: "Active owner" })),
    ...pending.map((entry) => ({ ...entry, statusKey: "pendingEmailVerification", statusFallback: "Pending email verification" })),
    ...previous.map((entry) => ({ ...entry, statusKey: "previousOwner", statusFallback: "Previous owner" })),
  ];

  if (!entries.length) {
    return <p style={mutedTextStyle}><AdminText i18nKey="contractDetailAdmin.noRegistrationHistory" fallback="No registration history yet." /></p>;
  }

  return (
    <div style={listStyle}>
      {entries.map((entry) => (
        <div key={entry.id} style={historyItemStyle}>
          <div style={historyHeaderStyle}>
            <strong>{entry.fullName || "-"}</strong>
            <span style={historyStatusStyle}>
              <AdminText i18nKey={`contractDetailAdmin.${entry.statusKey}`} fallback={entry.statusFallback} />
            </span>
          </div>
          <AddressLines lines={[
            entry.email,
            entry.phone,
            entry.addressNote,
            entry.verifiedAt ? <><AdminText i18nKey="contractsAdmin.verified" fallback="Verified" />: <AdminDateTime value={entry.verifiedAt} /></> : "",
            entry.deactivatedAt ? <><AdminText i18nKey="contractsAdmin.deactivated" fallback="Deactivated" />: <AdminDateTime value={entry.deactivatedAt} /></> : "",
            entry.verificationExpiresAt && !entry.verifiedAt ? <><AdminText i18nKey="contractsAdmin.codeExpires" fallback="Code expires" />: <AdminDateTime value={entry.verificationExpiresAt} /></> : "",
          ]} />
        </div>
      ))}
    </div>
  );
}

export default async function AdminContractDetailPage({ params }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const [contract, kitchens, owners, projects] = await Promise.all([
    getKitchenContractForAdmin(id),
    listKitchensForAdmin(),
    listPropertyOwnersForAdmin(),
    listProjectsForAdmin(),
  ]);

  if (!contract) {
    return (
      <AdminShell adminEmail={admin.email}>
        <div style={pageGridStyle}>
          <AdminSection title={<AdminText i18nKey="contractDetailAdmin.contractNotFound" fallback="Contract not found" />}>
            <ActionLink href="/admin/contracts"><AdminText i18nKey="contractDetailAdmin.backToContracts" fallback="Back to contract numbers" /></ActionLink>
          </AdminSection>
        </div>
      </AdminShell>
    );
  }

  const returnTo = `/admin/contracts/${contract.id}`;
  const applianceInventory = await loadContractApplianceInventory(contract);
  const claimPlanAssetBase = `/api/service-claims/contracts/${encodeURIComponent(contract.contractNumber)}/plan-assets`;

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="contractDetailAdmin.contractTitle" fallback="Contract {contractNumber}" values={{ contractNumber: contract.contractNumber }} />}
          description={<AdminKitchenDisplayName slug={contract.kitchen.slug} name={contract.kitchen.name} />}
          actions={
            <div style={actionRowStyle}>
              <ActionLink href="/admin/contracts"><AdminText i18nKey="contractDetailAdmin.backToContracts" fallback="Back to contract numbers" /></ActionLink>
              <ActionLink href="#orders"><AdminText i18nKey="adminShellLogin.orders" fallback="Orders" /></ActionLink>
              <ActionLink href="#registration-history"><AdminText i18nKey="contractDetailAdmin.registrationHistory" fallback="Registration history" /></ActionLink>
              <ActionLink href="#edit-contract"><AdminText i18nKey="contractDetailAdmin.editContract" fallback="Edit contract" /></ActionLink>
            </div>
          }
        >
          <div style={summaryGridStyle}>
            <DetailField label={<AdminText i18nKey="contractDetailAdmin.type" fallback="Type" />}>{contract.contractType}</DetailField>
            <DetailField label={<AdminText i18nKey="contractsAdmin.status" fallback="Status" />}><AdminStatusBadge status={contract.isActive ? "ACTIVE" : "INACTIVE"} /></DetailField>
            <DetailField label={<AdminText i18nKey="contractsAdmin.owner" fallback="Housing company" />}>{contract.owner?.name || <AdminText i18nKey="contractsAdmin.noOwnerSelected" fallback="No housing company selected" />}</DetailField>
            <DetailField label={<AdminText i18nKey="contractsAdmin.created" fallback="Created" />}><AdminDateTime value={contract.createdAt} /></DetailField>
            <DetailField label={<AdminText i18nKey="contractsAdmin.usage" fallback="Usage" />}>
              {contract._count.orders
                ? <AdminText i18nKey="contractDetailAdmin.orderCount" fallback="{count} order(s)" values={{ count: contract._count.orders }} />
                : <AdminText i18nKey="contractsAdmin.unused" fallback="Unused" />}
            </DetailField>
          </div>
        </AdminSection>

        <AdminSection title={<AdminText i18nKey="contractDetailAdmin.overview" fallback="Overview" />}>
          <div style={overviewGridStyle}>
            <DetailField label={<AdminText i18nKey="contractsAdmin.contractAddress" fallback="Contract address" />}><AddressLines lines={contractAddressLines(contract)} /></DetailField>
            <DetailField label={<AdminText i18nKey="contractsAdmin.paymentAddress" fallback="Billing address" />}><AddressLines lines={billingAddressLines(contract)} /></DetailField>
            <DetailField label={<AdminText i18nKey="contractsAdmin.registeredOwner" fallback="Registered owner" />}><AddressLines lines={contactLines(contract.activeRegistration)} /></DetailField>
            <DetailField label={<AdminText i18nKey="contractsAdmin.notes" fallback="Notes" />}>{contract.notes || "-"}</DetailField>
            <DetailField label={<AdminText i18nKey="contractDetailAdmin.claimPlan" fallback="Claim plan" />}>
              <AddressLines lines={[
                contract.hasUploadedClaimPlanPreview
                  ? <a href={`${claimPlanAssetBase}/preview`} target="_blank" rel="noreferrer"><AdminText i18nKey="contractDetailAdmin.openUploadedSketch" fallback="Open uploaded sketch" /></a>
                  : contract.claimPlanPreviewPath
                    ? <a href={contract.claimPlanPreviewPath} target="_blank" rel="noreferrer"><AdminText i18nKey="contractDetailAdmin.openSketch" fallback="Open sketch" /></a>
                    : "",
                contract.hasUploadedClaimPlanPdf
                  ? <a href={`${claimPlanAssetBase}/pdf`} target="_blank" rel="noreferrer"><AdminText i18nKey="contractDetailAdmin.openUploadedPdf" fallback="Open uploaded PDF" /></a>
                  : contract.claimPlanPdfPath
                    ? <a href={contract.claimPlanPdfPath} target="_blank" rel="noreferrer"><AdminText i18nKey="contractDetailAdmin.openPdfPlan" fallback="Open PDF plan" /></a>
                    : "",
              ]} />
            </DetailField>
          </div>
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="contractDetailAdmin.appliances" fallback="Electrical appliances" />}
          description={<AdminText i18nKey="contractDetailAdmin.appliancesSummary" fallback="Installed appliance brands used to select serial-number help photos for this contract." />}
        >
          <AdminApplianceSummary appliances={applianceInventory.appliances} />
          {applianceInventory.manual && !applianceInventory.configured ? <p style={mutedTextStyle}><AdminText i18nKey="contractDetailAdmin.inventoryUnreviewed" fallback="This appliance list has not been checked yet. Remove missing appliances and save to confirm it." /></p> : null}
        </AdminSection>

        <AdminSection id="orders" title={<AdminText i18nKey="adminShellLogin.orders" fallback="Orders" />}>
          <div id="orders" />
          <OrderList orders={contract.orders || []} />
        </AdminSection>

        <AdminSection title={<AdminText i18nKey="contractDetailAdmin.registrationHistory" fallback="Registration history" />}>
          <div id="registration-history" />
          <RegistrationHistory contract={contract} />
        </AdminSection>

        <AdminSection title={<AdminText i18nKey="contractDetailAdmin.editContract" fallback="Edit contract" />}>
          <div id="edit-contract" />
          <form action={`/api/admin/contracts/${contract.id}`} method="post" encType="multipart/form-data" style={editFormStyle}>
            <input type="hidden" name="_intent" value="update" />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="contractType" value={contract.contractType} />
            <FormField label={<AdminText i18nKey="contractsAdmin.contractNumber" fallback="Contract number" />}>
              <input name="contractNumber" defaultValue={contract.contractNumber} style={inputStyle} required />
            </FormField>
            {contract.contractType === "ARC" ? (
              <FormField label={<AdminText i18nKey="contractDetailAdmin.replaceKitchenSketch" fallback="Replace kitchen sketch (JPG, PNG, or WebP)" />}>
                <AdminFileInput
                  name="claimPlanPreviewFile"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  chooseFileKey="contractsAdmin.chooseFile"
                  noFileChosenKey="contractsAdmin.noFileChosen"
                  style={inputStyle}
                />
              </FormField>
            ) : (
              <>
                <FormField label={<AdminText i18nKey="kitchensAdmin.kitchen" fallback="Kitchen" />}>
                  <select name="kitchenId" defaultValue={contract.kitchenId} style={inputStyle}>
                    <option value=""><AdminText i18nKey="contractDetailAdmin.pdfOnlyKitchen" fallback="PDF-only kitchen (automatic)" /></option>
                    {kitchens.map((kitchen) => (
                      <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>
                    ))}
                  </select>
                </FormField>
                <input type="hidden" name="claimPlanPdfPath" value={contract.claimPlanPdfPath || ""} />
                <input type="hidden" name="claimPlanPreviewPath" value={contract.claimPlanPreviewPath || ""} />
                <FormField label={<AdminText i18nKey="contractDetailAdmin.replaceOrAddKitchenSketch" fallback="Replace/add kitchen sketch (JPG, PNG, or WebP)" />}>
                  <AdminFileInput
                    name="claimPlanPreviewFile"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    chooseFileKey="contractsAdmin.chooseFile"
                    noFileChosenKey="contractsAdmin.noFileChosen"
                    style={inputStyle}
                  />
                </FormField>
                <FormField label={<AdminText i18nKey="contractDetailAdmin.replaceOrAddPdf" fallback="Replace/add original kitchen plan (PDF)" />}>
                  <AdminFileInput
                    name="claimPlanPdfFile"
                    accept="application/pdf,.pdf"
                    chooseFileKey="contractsAdmin.chooseFile"
                    noFileChosenKey="contractsAdmin.noFileChosen"
                    style={inputStyle}
                  />
                </FormField>
                <AdminContractLinkFields
                  owners={owners}
                  projects={projects}
                  defaultHousingCompanyId={contract.housingCompanyId || ""}
                  defaultProjectId={contract.projectId || ""}
                  contract={contract}
                />
              </>
            )}
            <AdminContractApplianceFields initialInventory={applianceInventory} kitchenId={contract.kitchenId} contractId={contract.id} contractType={contract.contractType} />
            <div style={editActionsStyle}>
              <button type="submit" style={primaryButtonStyle}>
                <AdminText i18nKey="contractDetailAdmin.saveContractType" fallback="Save {type} contract" values={{ type: contract.contractType }} />
              </button>
            </div>
          </form>

          <div style={dangerActionsStyle}>
            <form action={`/api/admin/contracts/${contract.id}`} method="post">
              <input type="hidden" name="returnTo" value={returnTo} />
              <button
                type="submit"
                name="_intent"
                value={contract.isActive ? "deactivate" : "reactivate"}
                style={secondaryButtonStyle}
              >
                {contract.isActive
                  ? <AdminText i18nKey="contractsAdmin.deactivate" fallback="Deactivate" />
                  : <AdminText i18nKey="contractsAdmin.reactivate" fallback="Reactivate" />}
              </button>
            </form>
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const summaryGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const overviewGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
};

const applianceSummaryGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const applianceSummaryStyle = {
  background: "rgba(255,255,255,0.7)",
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  display: "grid",
  gap: 5,
  padding: 12,
};

const detailFieldStyle = {
  display: "grid",
  gap: 7,
  minWidth: 0,
};

const detailLabelStyle = {
  color: "var(--app-text-muted)",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.08em",
  lineHeight: 1.25,
  textTransform: "uppercase",
};

const detailValueStyle = {
  color: "var(--app-text)",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.45,
};

const lineStackStyle = {
  display: "grid",
  gap: 4,
};

const listStyle = {
  display: "grid",
  gap: 10,
};

const listItemLinkStyle = {
  display: "grid",
  gap: 8,
  padding: 14,
  borderRadius: 10,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.86)",
  color: "var(--app-text)",
  textDecoration: "none",
};

const itemMetaStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const historyItemStyle = {
  display: "grid",
  gap: 8,
  padding: 14,
  borderRadius: 10,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.86)",
};

const historyHeaderStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
};

const historyStatusStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 10px",
  background: "var(--app-accent-soft)",
  color: "var(--app-accent)",
  fontSize: 12,
  fontWeight: 800,
};

const editFormStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "end",
};

const editActionsStyle = {
  gridColumn: "1 / -1",
  display: "flex",
  justifyContent: "flex-end",
};

const dangerActionsStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};
