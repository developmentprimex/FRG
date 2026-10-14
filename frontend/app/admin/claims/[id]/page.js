import { formatServiceClaimReference } from "../../../../lib/service-claim-email-subject";
import { prisma as processingDb } from "../../../../lib/prisma";
import { attachWorkProcessing } from "../../../../lib/work-processing";
import { AdminWorkPanel } from "../../../../components/admin-work-panel";
import { AdminClaimFeedback } from "../../../../components/admin-claim-feedback";
import { isTestContractNumber } from "../../../../lib/order-kind";
import {
  ActionLink,
  AdminSection,
  FlashMessage,
  itemCardStyle,
  pageGridStyle,
  splitGridStyle,
  subMetaStyle,
} from "../../../../components/admin-ui";
import { AdminClaimUploadsPanel } from "../../../../components/admin-claim-uploads-panel";
import AdminConfirmSubmitButton from "../../../../components/admin-confirm-submit-button";
import { AdminClaimLocalizedText } from "../../../../components/admin-claim-localized-text";
import { AdminDateTime, AdminText } from "../../../../components/admin-i18n";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminOrderEmailDelivery } from "../../../../components/admin-order-email-delivery";
import { attachClaimEmailDelivery } from "../../../../lib/email/claim-email-store";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminClaimsPage } from "../../../../lib/admin-claims-access";
import { canAccessClaim } from "../../../../lib/admin-roles";
import { redirect } from "next/navigation";
import { renderClaimKitchenPreviewPng } from "../../../../lib/claim-kitchen-preview";
import { prisma } from "../../../../lib/prisma";
import { formatServiceClaimProblemArea, formatServiceClaimProblemAreaList, parseServiceClaimProblemAreas } from "../../../../lib/service-claim-problem-areas";
import { queryServiceClaimById } from "../../../../lib/service-claim-admin-query";
import { getServiceClaimKitchenPlan } from "../../../../lib/service-claim-kitchen-plan";

export const dynamic = "force-dynamic";

function formatClaimCustomerName(value) {
  return String(value || "")
    .replace(/\s*\((female|male|diverse|other)\)\s*$/i, "")
    .replace(/^(Herr|Frau)\s+/i, "")
    .trim();
}

function getClaimCustomerGender(value) {
  const salutation = String(value || "").match(/^(Herr|Frau)\s+/i)?.[1]?.toLowerCase();
  if (salutation === "herr") return "male";
  if (salutation === "frau") return "female";
  const match = String(value || "").match(/\((female|male|diverse|other)\)\s*$/i);
  return match?.[1]?.toLowerCase() || "";
}

function parseClaimClientAddress(value) {
  let address = String(value || "").trim();
  const unit = address.match(/(?:^|,\s*)Unit:\s*([^,]+)\s*$/i);
  if (unit) address = address.slice(0, unit.index).trim();
  const floor = address.match(/(?:^|,\s*)Floor:\s*([^,]+)\s*$/i);
  if (floor) address = address.slice(0, floor.index).trim();
  return { address: address || "-", floor: floor?.[1]?.trim(), unit: unit?.[1]?.trim() };
}

function ClaimGenderText({ gender }) {
  if (gender === "female") {
    return <AdminText i18nKey="claimsAdmin.genderFemale" fallback="Female" />;
  }
  if (gender === "male") {
    return <AdminText i18nKey="claimsAdmin.genderMale" fallback="Male" />;
  }
  if (gender === "diverse") {
    return <AdminText i18nKey="claimsAdmin.genderDiverse" fallback="Diverse" />;
  }
  if (gender === "other") {
    return <AdminText i18nKey="claimsAdmin.genderOther" fallback="Other" />;
  }
  return <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />;
}

function parseClaimAttachments(raw) {
  if (raw == null || raw === "") {
    return [];
  }
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) {
      return [];
    }
    return data.filter(
      (entry) => entry && typeof entry.filename === "string" && typeof entry.size === "number",
    );
  } catch {
    return [];
  }
}

function parseClaimProblemAreas(raw) {
  return parseServiceClaimProblemAreas(raw);
}

function getAdditionalClaimDetails(description, areas) {
  const text = String(description || "").trim();
  if (!text || !areas.length) return text;

  const areaDescriptions = new Set(
    areas.map((area) => String(area.detail || "").replace(/\s+/g, " ").trim().toLowerCase()).filter(Boolean),
  );
  const repeatedSection = /^(?:Ausgewählte Küchenbereiche:|Elektrische Komponenten:|Moebel\s*\/\s*nicht-elektrische Komponenten:|Küchenbereiche:|Kitchen areas:|Mutfak bölgeleri:|Zonas de la cocina:|Zones concernées\s*:|Кухонные зоны:)/i;
  return text
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter((section) => {
      if (!section) return false;
      if (repeatedSection.test(section)) return false;
      return !areaDescriptions.has(section.replace(/\s+/g, " ").trim().toLowerCase());
    })
    .join("\n\n");
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) {
    return "—";
  }
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function buildAttachmentMetaText(file) {
  const parts = [file.contentType || "file", formatBytes(file.size)];
  if (file.role === "serial_number") {
    parts.push("serial number");
  }
  if (file.role === "problem_area") {
    const areaLabel = formatServiceClaimProblemArea({
      name: file.areaName,
      code: file.areaCode,
    }, { includeCode: false });
    if (areaLabel) {
      parts.push(areaLabel);
    }
  }
  return parts.filter(Boolean).join(" · ");
}

export default async function AdminClaimDetailPage({ params, searchParams }) {
  const admin = await requireAdminClaimsPage();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  const claims = await queryServiceClaimById(prisma, id);
  if (claims[0] && !canAccessClaim(admin, claims[0].contractNumber)) redirect("/admin");

  let [claim] = await attachWorkProcessing(processingDb, await attachClaimEmailDelivery(claims), "CLAIM");

  if (!claim) {
    return (
      <AdminShell adminEmail={admin.email}>
        <div style={pageGridStyle}>
          <AdminSection
            title={<AdminText i18nKey="claimsAdmin.claimNotFound" fallback="Claim not found" />}
            description={<AdminText i18nKey="claimsAdmin.requestedClaimDoesNotExist" fallback="The requested claim does not exist." />}
          >
            <ActionLink href="/admin/claims"><AdminText i18nKey="claimsAdmin.backToClaims" fallback="Back to claims" /></ActionLink>
          </AdminSection>
        </div>
      </AdminShell>
    );
  }

  const submissions = await prisma.serviceClaimSubmission.findMany({ where: { claimId: claim.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const selectedSubmission = submissions.find((entry) => entry.id === resolvedSearchParams.submission) || submissions[0];
  const attachmentStart = selectedSubmission?.attachmentStart || 0;
  if (selectedSubmission) {
    // Display the selected immutable form snapshot, preserving ticket identity/status.
    claim = { ...claim, ...selectedSubmission.payload, id: claim.id, ticketNumber: claim.ticketNumber,
      claimSequence: claim.claimSequence, contractNumber: claim.contractNumber, createdAt: claim.createdAt,
      processing: claim.processing, workType: claim.workType, emailDelivery: claim.emailDelivery };
  }

  const feedback = isTestContractNumber(claim.contractNumber)
    ? await prisma.claimFeedbackInvitation.findFirst({ where: { claimId: claim.id }, orderBy: { createdAt: "desc" } })
    : null;

  const rawUploadedAttachments = parseClaimAttachments(claim.attachmentsJson);
  const parsedProblemAreas = parseClaimProblemAreas(claim.problemAreasJson);
  const customerGender = getClaimCustomerGender(claim.fullName);
  const customerSalutation = /^(Herr|Frau)\s+/i.test(String(claim.fullName || ""));
  const clientAddress = parseClaimClientAddress(claim.clientAddress);
  const claimKitchenName = String(claim.kitchenName || "").trim();
  const claimSelectedAreas = formatServiceClaimProblemAreaList(claim.problemAreasJson, { includeCode: false });
  const storedSketchIndex = rawUploadedAttachments.findIndex((file) => file.role === "kitchen_preview");
  const referencePlan = storedSketchIndex < 0
    ? await getServiceClaimKitchenPlan(claim.contractNumber).catch(() => null)
    : null;
  const referenceSketchUrl = storedSketchIndex >= 0
    ? `/api/admin/claims/${claim.id}/attachments/${attachmentStart + storedSketchIndex}?view=1&compactMarkers=1`
    : referencePlan?.selectionMode === "reference-pdf" ? referencePlan.previewImagePath : null;
  const claimKitchenPreview = referenceSketchUrl ? null : await renderClaimKitchenPreviewPng({
    kitchenSlug: claim.kitchenSlug,
    selectedAreas: claim.problemAreasJson,
    contractNumber: claim.contractNumber,
    width: 1040,
  }).catch(() => null);
  const uploadedAttachmentFiles = rawUploadedAttachments.map((file, index) => ({
    index: attachmentStart + index,
    filename: file.filename,
    contentType: file.contentType || "",
    size: file.size,
    role: file.role || "general",
    areaComponentId: file.areaComponentId || "",
    areaName: file.areaName || "",
    areaCode: file.areaCode || "",
    meta: buildAttachmentMetaText(file),
  }));
  const generalUploadedAttachments = uploadedAttachmentFiles.filter((file) => file.role !== "problem_area" && file.role !== "kitchen_preview");
  const uploadedAttachments = generalUploadedAttachments;
  const problemAreaSections = parsedProblemAreas.map((area) => ({
    ...area,
    label: formatServiceClaimProblemArea(area, { includeCode: false }),
    files: uploadedAttachmentFiles.filter(
      (file) => file.role === "problem_area" && file.areaComponentId === area.componentId,
    ),
  }));
  const additionalClaimDetails = getAdditionalClaimDetails(claim.problemDescription, parsedProblemAreas);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="claimsAdmin.claimTitle" fallback="Claim {claimNumber}" values={{ claimNumber: formatServiceClaimReference(claim.contractNumber, claim.claimSequence, claim.ticketNumber) }} />}
          description={<AdminText i18nKey="claimsAdmin.claimDetailDescription" fallback="Details from the submitted service request." />}
          actions={
            <ActionLink href="/admin/claims"><AdminText i18nKey="claimsAdmin.backToClaims" fallback="Back to claims" /></ActionLink>
          }
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <AdminWorkPanel item={claim} />
          <section style={{ ...itemCardStyle, marginBottom: 16 }}>
            <strong><AdminText i18nKey="claimsAdmin.submissionHistory" fallback="Submission history" /></strong>
            <ol>{submissions.map((submission, index) => <li key={submission.id} style={{ marginTop: 10 }}>
              <a href={`/admin/claims/${claim.id}?submission=${encodeURIComponent(submission.id)}`} aria-current={selectedSubmission?.id === submission.id ? "page" : undefined}>
                #{index + 1} · <AdminDateTime value={submission.createdAt} numeric /> · {submission.payload.fullName}
              </a>
              <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{submission.payload.problemDescription}</div>
            </li>)}</ol>
          </section>
          <AdminClaimFeedback feedback={feedback ? {
            id: feedback.id, status: feedback.status, createdAt: feedback.createdAt.toISOString(), attemptedAt: feedback.attemptedAt?.toISOString() || null,
            sentAt: feedback.sentAt?.toISOString() || null, submittedAt: feedback.submittedAt?.toISOString() || null,
            resolved: feedback.resolved, speedRating: feedback.speedRating,
            communicationRating: feedback.communicationRating, overallRating: feedback.overallRating,
            comment: feedback.comment,
          } : null} />
          <form action={`/api/admin/claims/${claim.id}`} method="post" style={actionPanelStyle}>
            <div style={subMetaStyle}>
              <span>{formatClaimCustomerName(claim.fullName)}</span>
              <span aria-hidden="true">·</span>
              <span><ClaimRequestTypeText requestType={claim.requestType} /></span>
              <span aria-hidden="true">·</span>
              <span><AdminDateTime value={claim.createdAt} /></span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <AdminConfirmSubmitButton
                name="_intent"
                value="delete"
                style={deleteClaimButtonStyle}
                confirmKey="claimsAdmin.deleteConfirmMessage"
                confirmFallback={"Delete this claim?\nThis action cannot be undone."}
              >
                <AdminText i18nKey="claimsAdmin.deleteClaim" fallback="Delete claim" />
              </AdminConfirmSubmitButton>
            </div>
          </form>

          <AdminOrderEmailDelivery delivery={claim.emailDelivery} titleKey="orderEmailDelivery.claimTitle" titleFallback="Claim email" />
          <div style={splitGridStyle}>
            <article style={itemCardStyle}>
              <strong style={sectionTitleStyle}><AdminText i18nKey="claimsAdmin.customer" fallback="Customer" /></strong>
              <div style={customerDetailGridStyle}>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}><AdminText i18nKey="kitchenDetailAdmin.name" fallback="Name" /></span>
                  <span>{formatClaimCustomerName(claim.fullName)}</span>
                </div>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}>{customerSalutation ? <AdminText i18nKey="claimsAdmin.salutation" fallback="Salutation" /> : <AdminText i18nKey="claimsAdmin.gender" fallback="Gender" />}</span>
                  <span>{customerSalutation ? (customerGender === "male" ? "Herr" : "Frau") : <ClaimGenderText gender={customerGender} />}</span>
                </div>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.phone" fallback="Phone" /></span>
                  <span>{claim.phone || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</span>
                </div>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.email" fallback="Email" /></span>
                  <span>{claim.email || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</span>
                </div>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.clientAddress" fallback="Client address" /></span>
                  <div>
                    <p style={detailTextStyle}>{clientAddress.address}</p>
                    {clientAddress.floor ? <div><strong><AdminText i18nKey="claimsAdmin.floor" fallback="Floor" />: {clientAddress.floor}</strong></div> : null}
                    {clientAddress.unit ? <div><strong><AdminText i18nKey="claimsAdmin.unit" fallback="Unit" />: {clientAddress.unit}</strong></div> : null}
                  </div>
                </div>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.contractNumber" fallback="Contract" /></span>
                  <span>{claim.contractNumber}</span>
                </div>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.kitchen" fallback="Kitchen" /></span>
                  <div style={claimKitchenSectionStyle}>
                    {referenceSketchUrl ? (
                      <div style={claimKitchenPreviewCardStyle}>
                        <a href={referenceSketchUrl} target="_blank" rel="noopener noreferrer">
                          <img src={referenceSketchUrl} alt={claimKitchenName || "Kitchen sketch"} style={{ display: "block", width: "100%", height: "auto", borderRadius: 8 }} />
                        </a>
                      </div>
                    ) : null}
                    {claimKitchenPreview?.content ? (
                      <div style={claimKitchenPreviewCardStyle}>
                        <span id={`claim-kitchen-preview-${claim.id}`} style={visuallyHiddenStyle}>
                          <AdminText i18nKey="claimsAdmin.kitchenPreview" fallback="Kitchen preview" />
                        </span>
                        <img
                          alt={claimKitchenName || "Kitchen preview"}
                          aria-labelledby={`claim-kitchen-preview-${claim.id}`}
                          style={{ ...claimKitchenPreviewWrapStyle, display: "block", height: "auto" }}
                          src={`data:image/png;base64,${claimKitchenPreview.content.toString("base64")}`}
                        />
                      </div>
                    ) : null}
                    <p style={detailTextStyle}>
                      {claimKitchenName ? (
                        <><AdminText i18nKey="claimsAdmin.kitchen" fallback="Kitchen" />: {claimKitchenName}</>
                      ) : null}
                      {claimKitchenName && claimSelectedAreas.length ? "\n" : null}
                      {claimSelectedAreas.length ? (
                        <><AdminText i18nKey="claimsAdmin.selectedPartSingular" fallback="Selected part" />: {claimSelectedAreas.join(", ")}</>
                      ) : null}
                      {!claimKitchenName && !claimSelectedAreas.length ? "-" : null}
                    </p>
                  </div>
                </div>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.serialNumber" fallback="Serial number" /></span>
                  <span>{claim.serialNumber}</span>
                </div>
              </div>
            </article>

            <article style={itemCardStyle}>
              <strong style={sectionTitleStyle}><AdminText i18nKey="claimsAdmin.requestDetails" fallback="Request details" /></strong>
              <div style={customerDetailGridStyle}>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.requestType" fallback="Request type" /></span>
                  <span><ClaimRequestTypeText requestType={claim.requestType} /></span>
                </div>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.created" fallback="Created" /></span>
                  <span><AdminDateTime value={claim.createdAt} /></span>
                </div>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.landlord" fallback="Landlord" /></span>
                  <div style={detailTextStyle}>
                    <div>{claim.landlordName || "-"}</div>
                    {claim.landlordCompanyPhone ? <div><AdminText i18nKey="claimsAdmin.companyPhone" fallback="Company phone" />: {claim.landlordCompanyPhone}</div> : null}
                    {claim.landlordCompanyEmail ? <div><AdminText i18nKey="claimsAdmin.companyEmail" fallback="Company email" />: {claim.landlordCompanyEmail}</div> : null}
                    {claim.landlordPhone ? <div><AdminText i18nKey="claimsAdmin.contactPhone" fallback="Contact phone" />: {claim.landlordPhone}</div> : null}
                    {claim.landlordEmail ? <div><AdminText i18nKey="claimsAdmin.contactEmail" fallback="Contact email" />: {claim.landlordEmail}</div> : null}
                  </div>
                </div>
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.hausmeister" fallback="Hausmeister" /></span>
                  <p style={detailTextStyle}>
                    {[
                      claim.hausmeisterName || "-",
                      claim.hausmeisterPhone ? `${claim.hausmeisterPhone}` : null,
                      claim.hausmeisterEmail ? `${claim.hausmeisterEmail}` : null,
                    ].filter(Boolean).join("\n")}
                  </p>
                </div>
                {additionalClaimDetails ? (
                  <div style={customerDetailRowStyle}>
                    <span style={customerDetailLabelStyle}>{parsedProblemAreas.length
                      ? <AdminText i18nKey="claimsAdmin.additionalDetails" fallback="Additional details" />
                      : <AdminText i18nKey="claimsAdmin.issue" fallback="Issue" />}</span>
                    <p style={detailTextStyle}><AdminClaimLocalizedText text={additionalClaimDetails} /></p>
                  </div>
                ) : null}
                {problemAreaSections.map((area, index) => (
                  <section key={area.componentId || area.label} style={selectedPartGroupStyle} aria-labelledby={`claim-part-${claim.id}-${index}`}>
                    <div style={selectedPartHeaderStyle}>
                      <span style={selectedPartNumberStyle} aria-hidden="true">{index + 1}</span>
                      <div>
                        <span style={selectedPartEyebrowStyle}><AdminText i18nKey="claimsAdmin.selectedPart" fallback="Selected part" /> {index + 1}</span>
                        <strong id={`claim-part-${claim.id}-${index}`} style={selectedPartNameStyle}>{area.label || "-"}</strong>
                      </div>
                    </div>
                    <div style={selectedPartBodyStyle}>
                      <div style={selectedPartDetailRowStyle}>
                        <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.problemDescription" fallback="Problem description" /></span>
                        <p style={detailTextStyle}>
                          {area.detail ? <AdminClaimLocalizedText text={area.detail} /> : <AdminText i18nKey="claimsAdmin.noItemDescription" fallback="No item-specific description provided." />}
                        </p>
                      </div>
                      <div style={{ ...selectedPartDetailRowStyle, borderBottom: "none" }}>
                        <span style={customerDetailLabelStyle}><AdminText i18nKey="claimsAdmin.partFiles" fallback="Part files" /></span>
                        {area.files.length ? (
                          <AdminClaimUploadsPanel claimId={claim.id} files={area.files} />
                        ) : (
                          <p style={detailTextStyle}><AdminText i18nKey="claimsAdmin.noItemFiles" fallback="No item-specific files uploaded." /></p>
                        )}
                      </div>
                    </div>
                  </section>
                ))}
                <div style={customerDetailRowStyle}>
                  <span style={customerDetailLabelStyle}>
                    <AdminText i18nKey="claimsAdmin.uploadedFiles" fallback="Uploaded files" />
                  </span>
                  <div>
                  <AdminClaimUploadsPanel
                    claimId={claim.id}
                    files={uploadedAttachments.map((file) => ({
                      index: file.index,
                      filename: file.filename,
                      contentType: file.contentType || "",
                      meta: `${file.contentType || "file"} · ${formatBytes(file.size)}`,
                    }))}
                  />
                  {uploadedAttachments.length ? (
                    <p
                      style={{
                        margin: "12px 0 0",
                        fontSize: 13,
                        color: "var(--app-text-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      <AdminText
                        i18nKey="claimsAdmin.uploadedFilesEmailNote"
                        fallback="Original files are also attached to the notification email when SMTP is configured."
                      />
                    </p>
                  ) : null}
                  </div>
                </div>
              </div>
            </article>
          </div>
          <style>{`
            button:focus-visible,
            a:focus-visible {
              outline: 3px solid rgba(143, 62, 44, 0.24);
              outline-offset: 2px;
            }
          `}</style>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

function ClaimRequestTypeText({ requestType }) {
  if (requestType === "complaint") {
    return <AdminText i18nKey="claimsAdmin.complaint" fallback="Complaint" />;
  }

  return requestType || "-";
}

const actionPanelStyle = {
  display: "grid",
  gap: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,248,242,0.74))",
  padding: 18,
};

const deleteClaimButtonStyle = {
  border: "1px solid rgba(217, 92, 92, 0.24)",
  borderRadius: 10,
  minHeight: 42,
  padding: "10px 14px",
  background: "rgba(255,255,255,0.72)",
  color: "var(--app-danger-text)",
  fontWeight: 800,
  fontSize: "0.92rem",
  cursor: "pointer",
  boxShadow: "none",
};

const sectionTitleStyle = {
  fontSize: "1.1rem",
};

const customerDetailGridStyle = {
  display: "grid",
  marginTop: 8,
};

const customerDetailRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(110px, 28%) minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
  padding: "11px 0",
  borderBottom: "1px solid var(--app-border)",
  minWidth: 0,
};

const customerDetailLabelStyle = {
  color: "var(--app-text)",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.5,
};

const selectedPartGroupStyle = {
  marginTop: 14,
  border: "1px solid var(--app-border)",
  borderLeft: "4px solid var(--app-accent)",
  borderRadius: 12,
  overflow: "hidden",
  background: "#fff",
};

const selectedPartHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  background: "var(--app-accent-soft)",
};

const selectedPartNumberStyle = {
  display: "grid",
  placeItems: "center",
  flex: "0 0 28px",
  height: 28,
  borderRadius: "50%",
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  fontSize: 13,
  fontWeight: 800,
};

const selectedPartEyebrowStyle = {
  display: "block",
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
};

const selectedPartNameStyle = {
  display: "block",
  lineHeight: 1.4,
};

const selectedPartBodyStyle = {
  padding: "0 14px",
};

const selectedPartDetailRowStyle = {
  ...customerDetailRowStyle,
  padding: "12px 0",
};

const detailTextStyle = {
  margin: 0,
  color: "var(--app-text)",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
};

const visuallyHiddenStyle = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const claimKitchenSectionStyle = {
  display: "grid",
  gap: 12,
};

const claimKitchenPreviewCardStyle = {
  maxWidth: 520,
  padding: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 16,
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,248,242,0.82))",
};

const claimKitchenPreviewWrapStyle = {
  width: "100%",
  margin: 0,
};
