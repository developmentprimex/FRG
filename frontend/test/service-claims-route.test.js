import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.join(__dirname, "..", "app", "api", "service-claims", "route.js");

test("service-claims route limits floor values to 20 characters", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /requiredString\(body\.clientFloor,\s*"Floor",\s*20\)/);
  assert.match(source, /normalized\.length > maxLength/);
});

test("service-claims route retries inserts when landlord company columns are missing", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /getMissingOptionalInsertColumns/);
  assert.match(source, /information_schema"\."columns/);
  assert.match(source, /getServiceClaimInsertColumnSupport/);
  assert.match(source, /landlordCompanyPhone/);
  assert.match(source, /landlordCompanyEmail/);
  assert.match(source, /includeLandlordCompanyPhone:\s*true/);
  assert.match(source, /includeLandlordCompanyEmail:\s*true/);
  assert.match(source, /await insertServiceClaimRecord\(prisma,\s*payload\)/);
});

test("service-claims route recovers when a running server cached the pre-sequence schema", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /isClaimSequenceNotNullViolation/);
  assert.match(source, /code === "23502"/);
  assert.match(source, /!options\.includeClaimSequence/);
  assert.match(source, /options\.includeClaimSequence = true/);
});

test("service-claims route sends notifications after returning the durable success response", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /import \{ after, NextResponse \} from "next\/server"/);
  assert.match(source, /await insertServiceClaimRecord\(prisma, payload\);[\s\S]*after\(async \(\) =>/);
  assert.match(source, /pending: true/);
});

test("service-claims route requires explicit confirmation for grouped kitchen parts", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /buildServiceClaimComponentChoiceGroups/);
  assert.match(source, /parseConfirmedChoiceGroupKeys/);
  assert.match(source, /confirmedChoiceGroupKeys\.has\(choiceGroup\.sourceComponentKey\)/);
  assert.match(source, /body\.confirmedChoiceGroupsJson/);
});

test("service-claims route requires serial evidence and damage photos for every affected component", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /normalizeReferenceIssuesJson/);
  assert.match(source, /Reference-plan components are not allowed for this contract/);
  assert.match(source, /problemAreaAttachmentPartsByComponentId/);
  assert.match(source, /Upload at least one damage photo/);
  assert.match(source, /Upload a serial-number photo/);
  assert.match(source, /typedCount !== 1 \|\| imageCount !== 1/);
});

test("service-claims route embeds a kitchen preview png in notification emails when available", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /renderClaimKitchenPreviewPng/);
  assert.match(source, /buildClaimKitchenPreviewAttachment/);
  assert.match(source, /claim-kitchen-preview@fragmento/);
  assert.match(source, /contentDisposition:\s*"inline"/);
  assert.match(source, /buildComplaintEmailHtml\(emailPayload,\s*kitchenPreviewAttachment\)/);
  assert.match(source, /width:\s*480/);
  assert.match(source, /loading="eager" fetchpriority="high" decoding="sync"/);
  assert.match(source, /previewDimensions/);
});

test("service-claims route embeds the ARC contract sketch or attaches its PDF fallback", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /getPublicContractClaimPlanAsset/);
  assert.match(source, /buildArcReferencePlanEmailAttachment/);
  assert.match(source, /payload\?\.contractType !== "ARC"/);
  assert.match(source, /arc-kitchen-sketch@fragmento/);
  assert.match(source, /ARC-Küchenskizze/);
  assert.match(source, /Küchenskizze als PDF im Anhang/);
  assert.match(source, /contractType:\s*contract\.contractType/);
});

test("service-claims route validates optional ARC sketch markers and renders them into the email image", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /Invalid kitchen-sketch marker coordinates/);
  assert.match(source, /renderReferencePlanMarkersPng/);
  assert.match(source, /arc-kitchen-sketch-marked-/);
  assert.match(source, /const emailContent = annotatedContent \|\| previewAsset\.content/);
  assert.match(source, /emailImageMetadata = await sharp\(emailContent\)\.metadata/);
  assert.match(source, /width:\s*emailImageMetadata\?\.width/);
  assert.match(source, /isArcReferenceImage:\s*true/);
  assert.match(source, />Skizzenposition</);
  assert.match(source, /markerNumber:\s*area\.planMarker \? index \+ 1 : null/);
});

test("service-claim email limits only ARC reference sketches to the marker renderer's display width", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /previewDisplayWidth = REFERENCE_PLAN_EMAIL_DISPLAY_WIDTH/);
  assert.match(source, /previewAttachment\?\.isArcReferenceImage/);
  assert.match(source, /width:\$\{previewDisplayWidth\}px;max-width:100%;height:auto/);
  assert.match(source, /width:100%;max-width:540px;height:auto/);
  assert.match(source, /style="\$\{previewImageStyle\}"/);
});
test("service-claims route resolves item names and article numbers from the contract kitchen database", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /getServiceClaimKitchenPlan\(contractNumber\)/);
  assert.match(source, /databaseAreasByComponentId\.get\(componentId\)/);
  assert.match(source, /const databaseGermanName = String\(databaseArea\.nameDe/);
  assert.match(source, /name:\s*databaseGermanName/);
  assert.doesNotMatch(source, /databaseArea\.nameDe \|\| databaseArea\.name/);
  assert.match(source, /code:\s*String\(databaseArea\.articleCode \|\| databaseArea\.code/);
  assert.match(source, /const resolvedProblemAreasJson = await resolveProblemAreasFromDatabase/);
});

test("service-claim notification email separates every item field into German rows", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, />Type</);
  assert.match(source, />Typen - NR</);
  assert.match(source, />Problembeschreibung</);
  assert.match(source, />Anhänge</);
  assert.match(source, /Hochgeladenes Bild/);
  assert.match(source, /Siehe Seriennummernfoto in den Anhängen/);
  assert.doesNotMatch(source, /Uploaded image|Kitchen preview with selected claim area highlighted|See serial number photo|Not applicable/);
  assert.doesNotMatch(source, /StringForEmail/);
});

test("service-claim item email uses full-width rows and hides article codes for ARC", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /payload\.contractType !== "ARC"/);
  assert.match(source, /showArticleCode: showClaimItemArticleCode/);
  assert.match(source, /fullWidth: true/);
  assert.match(source, /colspan="2"/);
  assert.match(source, /Problem \$\{itemNumber\}/);
  assert.match(source, /Elektrogerät.*Möbelteil/);
  assert.match(source, /width:35%/);
  assert.match(source, /itemNumber: index \+ 1/);
  assert.match(source, /formatAttachmentHtml\(entry, \{ includeItemContext: false \}\)/);
  assert.match(source, /function formatAttachmentFileMetaLine/);
  assert.match(source, /serialAttachmentsByComponentId/);
  assert.match(source, /isElectricalAppliance: isElectricalApplianceProblemArea\(area\)/);
  assert.match(source, /row\.isElectricalAppliance/);
  assert.match(source, />Seriennummer</);
  assert.match(source, />Seriennummer-Foto</);
  assert.doesNotMatch(source, /\["Seriennummer",\s*payload\.serialNumber\]/);
});

test("service-claim email keeps uploaded photos inside small thumbnail containers", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /<table role="presentation" width="150"/);
  assert.match(source, /<td width="148" height="148"/);
  assert.match(source, /<img src="cid:\$\{escapeHtml\(entry\.cid\)\}"/);
  assert.match(source, /width="140" height="140"/);
  assert.match(source, /object-fit:contain/);
  assert.doesNotMatch(source, /max-width:220px/);
});

test("service-claim email requests the PDF-derived ordered-component kitchen preview", () => {
  const previewSource = fs.readFileSync(
    path.join(__dirname, "..", "lib", "claim-kitchen-preview.js"),
    "utf8",
  );
  const planSource = fs.readFileSync(
    path.join(__dirname, "..", "lib", "service-claim-kitchen-plan.js"),
    "utf8",
  );

  assert.match(previewSource, /PLAN_IMAGE_BY_SLUG/);
  assert.match(previewSource, /source:\s*"pdf-plan"/);
  assert.match(previewSource, /visibleComponentIds/);
  assert.match(previewSource, /selectedHotspots/);
  assert.match(previewSource, /opacity:0\.3/);
  assert.match(previewSource, /alpha:\s*0\.72/);
  assert.doesNotMatch(previewSource, /\.linear\(\[1,\s*1,\s*1,\s*0\.1\]/);
  assert.match(planSource, /confirmedItems:\s*contractOrderState\.confirmedItems/);
  assert.doesNotMatch(planSource, /SHOW_FULL_KITCHEN_IN_SERVICE_CLAIMS/);
});

test("service-claim email omits the logo and the duplicate final problem-description row", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.doesNotMatch(source, /buildLogoAttachment|buildComplaintEmailLogoHtml|logo@fragmento/);
  assert.doesNotMatch(source, /\["Problembeschreibung",\s*standaloneProblemText/);
  assert.doesNotMatch(source, /"Problem",\s*standaloneProblemText/);
  assert.match(source, />Problembeschreibung</);
});

test("service-claim email separates landlord and caretaker contact details into rows", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /function buildEmailDetailSubtable/);
  assert.match(source, /const populatedRows = rows\.filter/);
  assert.match(source, /populatedRows\.map/);
  assert.doesNotMatch(source, /formatMultiline\(value \|\| "—"\)/);
  assert.match(source, /function hasPartyContactDetails/);
  assert.match(source, /border-top:2px solid #d9c7b8/);
  assert.match(source, /hasLandlordDetails \? \[\["", \{ html: landlordHtml/);
  assert.match(source, /hasLandlordDetails \? \["", "Vermieter", landlordBlock\] : \[\]/);
  assert.match(source, /html: landlordHtml, fullWidth: true, sectionTitle: "Vermieter"/);
  assert.match(source, /html: hausmeisterHtml, fullWidth: true, sectionTitle: "Hausmeister"/);
  assert.match(source, /hasHausmeisterDetails \? \["", "Hausmeister", hausBlock\] : \[\]/);
  assert.match(source, /\["Firma", payload\.landlordCompanyName\]/);
  assert.match(source, /\["Telefon Firma", payload\.landlordCompanyPhone\]/);
  assert.match(source, /\["E-Mail Firma", payload\.landlordCompanyEmail\]/);
  assert.match(source, /\["Ansprechperson", landlordContactDisplay/);
  assert.match(source, /\["Telefon", payload\.hausmeisterPhone\]/);
  assert.match(source, /\["E-Mail", payload\.hausmeisterEmail\]/);
});

test("service-claim email separates preferred contact date and time into German rows", () => {
  const source = fs.readFileSync(routePath, "utf8") + "\n" + fs.readFileSync(path.join(__dirname, "..", "lib", "email", "claim-notification-template.js"), "utf8");

  assert.match(source, /function formatGermanPreferredContactTime/);
  assert.match(source, /\["Gewünschtes Kontaktdatum", availabilityDate\]/);
  assert.match(source, /\["Gewünschte Kontaktzeit", availabilityTime\]/);
  assert.match(source, /GewÃ¼nschtes Kontaktdatum:/);
  assert.match(source, /GewÃ¼nschte Kontaktzeit:/);
  assert.match(source, /Eigene Uhrzeit/);
  assert.doesNotMatch(source, /\["Erreichbarkeit", availability\]/);
});
