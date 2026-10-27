import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  PageHero,
  actionRowStyle,
  codePillStyle,
  emptyStateStyle,
  formGridStyle,
  inputStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
  textareaStyle,
} from "../../../../components/admin-ui";
import { Fragment } from "react";
import AdminConfirmSubmitButton from "../../../../components/admin-confirm-submit-button";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminText } from "../../../../components/admin-i18n";
import AdminSelect from "../../../../components/admin-select";
import { AdminProductInfoPdfManager } from "../../../../components/admin-product-info-pdf-manager";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { listCatalogPrograms } from "../../../../lib/catalog-programs";
import { prisma } from "../../../../lib/prisma";
import { ItemType } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

const ITEM_TYPE_OPTIONS = Object.values(ItemType);
const ITEM_TYPE_LABELS = {
  [ItemType.COMPONENT]: { key: "kitchenDetailAdmin.typeComponents", fallback: "Components" },
  [ItemType.ACCESSORY]: { key: "kitchenDetailAdmin.typeAccessories", fallback: "Accessories" },
  [ItemType.SERVICE]: { key: "kitchenDetailAdmin.typeServices", fallback: "Services" },
};
const CATALOG_EDIT_PARAMS = ["editArticle", "editBlende", "editService", "editClaimProduct"];

function buildCatalogEditHref(searchParams, key, id) {
  const params = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([paramKey, rawValue]) => {
    if (CATALOG_EDIT_PARAMS.includes(paramKey)) return;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value != null && String(value).trim()) params.set(paramKey, String(value));
  });
  params.set(key, id);
  return `/admin/catalog/articles?${params.toString()}`;
}

function buildCatalogListHref(searchParams) {
  const params = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([paramKey, rawValue]) => {
    if (CATALOG_EDIT_PARAMS.includes(paramKey)) return;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value != null && String(value).trim()) params.set(paramKey, String(value));
  });
  const query = params.toString();
  return `/admin/catalog/articles${query ? `?${query}` : ""}`;
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function getClaimProductGroupKey(claimProduct) {
  const productCode = String(claimProduct.articleCode || claimProduct.partKey || "").trim().toLowerCase();
  const name = String(claimProduct.name || "").trim().toLowerCase();
  const nameDe = String(claimProduct.nameDe || "").trim().toLowerCase();
  return [productCode, name, nameDe].join("|");
}

function groupClaimProducts(claimProducts) {
  const groups = new Map();

  for (const claimProduct of claimProducts) {
    const key = getClaimProductGroupKey(claimProduct);
    const group = groups.get(key) || {
      ...claimProduct,
      ids: [],
      partKeys: [],
      linkedKitchens: [],
      sourceKitchenItemCodes: [],
      sourceComponentKeys: [],
      sourceKitchenItemNames: [],
    };

    group.ids.push(claimProduct.id);
    group.partKeys.push(claimProduct.partKey);
    group.linkedKitchens.push(
      [claimProduct.kitchenCode, claimProduct.kitchenSlug].filter(Boolean).join(" / ")
        || claimProduct.kitchenName,
    );
    group.sourceKitchenItemCodes.push(claimProduct.sourceKitchenItemCode);
    group.sourceComponentKeys.push(claimProduct.sourceComponentKey);
    group.sourceKitchenItemNames.push(claimProduct.sourceKitchenItemName);
    group.isActive = group.isActive || claimProduct.isActive;
    group.sortOrder = Math.min(Number(group.sortOrder || 0), Number(claimProduct.sortOrder || 0));
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    linkedKitchens: uniqueValues(group.linkedKitchens),
    partKeys: uniqueValues(group.partKeys),
    sourceKitchenItemCodes: uniqueValues(group.sourceKitchenItemCodes),
    sourceComponentKeys: uniqueValues(group.sourceComponentKeys),
    sourceKitchenItemNames: uniqueValues(group.sourceKitchenItemNames),
  }));
}

function formatJoinedValues(values) {
  const items = uniqueValues(values);
  return items.length <= 2 ? items.join(", ") : `${items.slice(0, 2).join(", ")} + ${items.length - 2} more`;
}

function formatDimensionInputValue(value) {
  if (value === null || value === undefined || value === "") return "";
  const cm = Number(value) / 10;
  if (!Number.isFinite(cm) || cm <= 0) return "";
  return Number.isInteger(cm)
    ? String(cm)
    : String(Number(cm.toFixed(2))).replace(/\.0+$/, "");
}

function CatalogArticleForm({ action, article, programmId, submitLabel, cancelHref = "" }) {
  const isEditing = Boolean(article);

  return (
    <form action={action} method="post" className={`catalog-article-form ${isEditing ? "is-editing" : "is-creating"}`} style={articleFormStyle}>
      <input type="hidden" name="programmId" value={programmId} />
      <header className="catalog-article-form__header">
        <div>
          <h3>{article?.articleNumber || "Create a new article"}</h3>
        </div>
        <span className={`catalog-article-form__status${article?.isActive === false ? " is-inactive" : ""}`}>
          {article?.isActive === false
            ? <AdminText i18nKey="catalogAdmin.inactive" fallback="Inactive" />
            : <AdminText i18nKey="catalogAdmin.active" fallback="Active" />}
        </span>
      </header>

      <div className="catalog-article-form__layout">
        <section className="catalog-article-form__panel" aria-labelledby={`article-details-${article?.id || "new"}`}>
          <div className="catalog-article-form__section-heading">
            <h4 id={`article-details-${article?.id || "new"}`}>
              <AdminText i18nKey="catalogAdmin.articleDetails" fallback="Article details" />
            </h4>
          </div>

          <div className="catalog-article-form__group">
            <div className="catalog-article-form__grid catalog-article-form__grid--identity">
              <FormField label={<AdminText i18nKey="catalogAdmin.articleNumber" fallback="Article number" />}>
                <input name="articleNumber" defaultValue={article?.articleNumber || ""} style={inputStyle} required />
              </FormField>
              <FormField label={<AdminText i18nKey="catalogAdmin.itemType" fallback="Item type" />}>
                <AdminSelect name="itemType" defaultValue={article?.itemType || ItemType.COMPONENT} style={inputStyle}>
                  {ITEM_TYPE_OPTIONS.map((itemType) => (
                    <option key={itemType} value={itemType}>
                      <AdminText
                        i18nKey={ITEM_TYPE_LABELS[itemType]?.key}
                        fallback={ITEM_TYPE_LABELS[itemType]?.fallback || itemType}
                      />
                    </option>
                  ))}
                </AdminSelect>
              </FormField>
              <FormField label={<AdminText i18nKey="catalogAdmin.englishName" fallback="English name" />}>
                <input name="name" defaultValue={article?.name || ""} style={inputStyle} required />
              </FormField>
              <FormField label={<AdminText i18nKey="catalogAdmin.germanName" fallback="German name" />}>
                <input name="nameDe" defaultValue={article?.nameDe || ""} style={inputStyle} />
              </FormField>
              <FormField label={<AdminText i18nKey="catalogAdmin.description" fallback="Description" />} wide>
                <textarea name="description" defaultValue={article?.description || ""} rows={3} style={textareaStyle} />
              </FormField>
            </div>
          </div>

          <div className="catalog-article-form__group">
            <div className="catalog-article-form__grid catalog-article-form__grid--commercial">
              <FormField label={<AdminText i18nKey="catalogAdmin.price" fallback="Price (€)" />}>
                <input name="price" type="number" min="0" step="0.01" defaultValue={article ? formatMoney(article.price) : "0.00"} style={inputStyle} required />
              </FormField>
              <FormField label={<AdminText i18nKey="catalogAdmin.fixedPricePackage" fallback="Fixed-price package" />}>
                <AdminSelect name="isFixedPricePackage" defaultValue={article?.isFixedPricePackage ? "true" : ""} style={inputStyle}>
                  <option value=""><AdminText i18nKey="catalogAdmin.no" fallback="No" /></option>
                  <option value="true"><AdminText i18nKey="catalogAdmin.yes" fallback="Yes" /></option>
                </AdminSelect>
              </FormField>
              <FormField label={<AdminText i18nKey="catalogAdmin.status" fallback="Status" />}>
                <AdminSelect name="isActive" defaultValue={article?.isActive === false ? "" : "true"} style={inputStyle}>
                  <option value="true"><AdminText i18nKey="catalogAdmin.active" fallback="Active" /></option>
                  <option value=""><AdminText i18nKey="catalogAdmin.inactive" fallback="Inactive" /></option>
                </AdminSelect>
              </FormField>
            </div>
          </div>

          <div className="catalog-article-form__group">
            <div className="catalog-article-form__grid catalog-article-form__grid--dimensions">
              <FormField label={<AdminText i18nKey="catalogAdmin.width" fallback="Width" />}>
                <input name="widthMm" type="number" min="0" step="0.1" defaultValue={formatDimensionInputValue(article?.widthMm)} style={inputStyle} />
              </FormField>
              <FormField label={<AdminText i18nKey="catalogAdmin.height" fallback="Height" />}>
                <input name="heightMm" type="number" min="0" step="0.1" defaultValue={formatDimensionInputValue(article?.heightMm)} style={inputStyle} />
              </FormField>
              <FormField label={<AdminText i18nKey="catalogAdmin.depth" fallback="Depth" />}>
                <input name="depthMm" type="number" min="0" step="0.1" defaultValue={formatDimensionInputValue(article?.depthMm)} style={inputStyle} />
              </FormField>
            </div>
          </div>
        </section>

        <details
          key={`product-information-${article?.id || "new"}`}
          className="catalog-article-form__panel catalog-article-form__panel--product-info"
        >
          <summary className="catalog-article-form__section-heading catalog-article-form__product-info-summary">
              <h4 id={`product-information-${article?.id || "new"}`}>
                <AdminText i18nKey="catalogAdmin.productInformation" fallback="Product Information" />
              </h4>
            <div className="catalog-article-form__product-info-status">
              <span style={article?.productInfoPdfPath ? productInfoReadyStyle : productInfoMissingStyle}>
                {article?.productInfoPdfPath
                  ? <AdminText i18nKey="catalogAdmin.ready" fallback="Ready" />
                  : <AdminText i18nKey="catalogAdmin.missingPdf" fallback="Missing PDF" />}
              </span>
              <span className="catalog-article-form__product-info-chevron" aria-hidden="true" />
            </div>
          </summary>

          <div className="catalog-article-form__product-info-body" style={productInfoBodyStyle}>
            <FormField label={<AdminText i18nKey="catalogAdmin.productImagePath" fallback="Product image path" />} wide>
              <input name="productImagePath" defaultValue={article?.productImagePath || ""} placeholder="/product-images/email/example.jpg" style={inputStyle} />
            </FormField>
            <AdminProductInfoPdfManager
              initialPdfPath={article?.productInfoPdfPath || ""}
              initialSummary={article?.productInfoSummary || ""}
              initialKeyFacts={Array.isArray(article?.productInfoKeyFacts) ? article.productInfoKeyFacts : []}
              initialExtractedText={article?.productInfoExtractedText || ""}
              compact
            />
          </div>
        </details>
      </div>

      <footer className="catalog-article-form__footer">
        <div style={actionRowStyle}>
          {cancelHref ? (
            <Link href={cancelHref} scroll={false} style={secondaryButtonStyle}>
              <AdminText i18nKey="catalogAdmin.cancel" fallback="Cancel" />
            </Link>
          ) : null}
          <button type="submit" style={primaryButtonStyle}>{submitLabel}</button>
        </div>
      </footer>
    </form>
  );
}

function CatalogAddonForm({ action, item, programmId, submitLabel }) {
  return (
    <form action={action} method="post" style={addonFormStyle}>
      <input type="hidden" name="programmId" value={programmId} />
      <div style={formGridStyle}>
        <FormField label={<AdminText i18nKey="catalogAdmin.code" fallback="Code" />}>
          <input name="code" defaultValue={item?.code || ""} style={inputStyle} required />
        </FormField>
        <FormField label={<AdminText i18nKey="catalogAdmin.englishName" fallback="English name" />}>
          <input name="name" defaultValue={item?.name || ""} style={inputStyle} required />
        </FormField>
        <FormField label={<AdminText i18nKey="catalogAdmin.germanName" fallback="German name" />}>
          <input name="nameDe" defaultValue={item?.nameDe || ""} style={inputStyle} />
        </FormField>
        <FormField label={<AdminText i18nKey="catalogAdmin.price" fallback="Price" />}>
          <input name="price" defaultValue={item ? formatMoney(item.price) : "0.00"} style={inputStyle} required />
        </FormField>
        <FormField label={<AdminText i18nKey="catalogAdmin.active" fallback="Active" />}>
          <AdminSelect name="isActive" defaultValue={item?.isActive === false ? "" : "true"} style={inputStyle}>
            <option value="true"><AdminText i18nKey="catalogAdmin.yes" fallback="Yes" /></option>
            <option value=""><AdminText i18nKey="catalogAdmin.no" fallback="No" /></option>
          </AdminSelect>
        </FormField>
        <FormField label={<AdminText i18nKey="catalogAdmin.description" fallback="Description" />} wide>
          <textarea name="description" defaultValue={item?.description || ""} rows={2} style={textareaStyle} />
        </FormField>
      </div>
      <div style={actionRowStyle}>
        <button type="submit" style={primaryButtonStyle}>{submitLabel}</button>
      </div>
    </form>
  );
}

function ClaimProductForm({ action, claimProduct, submitLabel }) {
  return (
    <form action={action} method="post" style={claimProductFormStyle}>
      <input type="hidden" name="claimProductIds" value={(claimProduct?.ids || [claimProduct?.id]).filter(Boolean).join(",")} />
      <input type="hidden" name="partKey" value={claimProduct?.partKey || ""} />
      <div style={formGridStyle}>
        <FormField label={<AdminText i18nKey="catalogAdmin.articleCode" fallback="Article code" />}>
          <input name="articleCode" defaultValue={claimProduct?.articleCode || ""} style={inputStyle} />
        </FormField>
        <FormField label={<AdminText i18nKey="catalogAdmin.englishName" fallback="English name" />}>
          <input name="name" defaultValue={claimProduct?.name || ""} style={inputStyle} required />
        </FormField>
        <FormField label={<AdminText i18nKey="catalogAdmin.germanName" fallback="German name" />}>
          <input name="nameDe" defaultValue={claimProduct?.nameDe || ""} style={inputStyle} />
        </FormField>
        <FormField label={<AdminText i18nKey="catalogAdmin.sortOrder" fallback="Sort order" />}>
          <input name="sortOrder" defaultValue={claimProduct?.sortOrder ?? 0} style={inputStyle} />
        </FormField>
        <FormField label={<AdminText i18nKey="catalogAdmin.active" fallback="Active" />}>
          <AdminSelect name="isActive" defaultValue={claimProduct?.isActive === false ? "" : "true"} style={inputStyle}>
            <option value="true"><AdminText i18nKey="catalogAdmin.yes" fallback="Yes" /></option>
            <option value=""><AdminText i18nKey="catalogAdmin.no" fallback="No" /></option>
          </AdminSelect>
        </FormField>
      </div>
      <details style={productInfoDetailsStyle}>
        <summary style={productInfoSummaryStyle}><AdminText i18nKey="catalogAdmin.productInformation" fallback="Product Information" /></summary>
        <div style={productInfoBodyStyle}>
          <FormField label={<AdminText i18nKey="catalogAdmin.productImagePath" fallback="Product image path" />} wide>
            <input
              name="productImagePath"
              defaultValue={claimProduct?.productImagePath || ""}
              placeholder="/product-images/email/example.jpg"
              style={inputStyle}
            />
          </FormField>
          <AdminProductInfoPdfManager
            initialPdfPath={claimProduct?.productInfoPdfPath || ""}
            initialSummary={claimProduct?.productInfoSummary || ""}
            initialKeyFacts={claimProduct?.productInfoKeyFacts || []}
            initialExtractedText={claimProduct?.productInfoExtractedText || ""}
            compact
          />
        </div>
      </details>
      <div style={actionRowStyle}>
        <button type="submit" style={primaryButtonStyle}>{submitLabel}</button>
      </div>
    </form>
  );
}

function CatalogDeleteForm({ action, itemLabel, entityLabel, confirmKey, linkedKitchenItems, programmId }) {
  const linkedCount = Number(linkedKitchenItems || 0);
  if (linkedCount > 0) {
    return (
      <span style={deleteUnavailableStyle}>
        <AdminText
          i18nKey={linkedCount === 1 ? "catalogAdmin.linkedToKitchenItem" : "catalogAdmin.linkedToKitchenItems"}
          fallback={linkedCount === 1 ? "Linked to {count} kitchen item" : "Linked to {count} kitchen items"}
          values={{ count: linkedCount }}
        />
      </span>
    );
  }

  return (
    <form action={action} method="post" style={deleteFormStyle}>
      <input type="hidden" name="programmId" value={programmId} />
      <AdminConfirmSubmitButton
        name="_intent"
        value="delete"
        style={deleteButtonStyle}
        confirmKey={confirmKey}
        confirmValues={{ item: itemLabel }}
        confirmFallback={`Delete ${entityLabel.toLowerCase()} "${itemLabel}"?\nThis action cannot be undone.`}
      >
        <AdminText i18nKey="catalogAdmin.delete" fallback="Delete" />
      </AdminConfirmSubmitButton>
    </form>
  );
}

function formatDimensionPart(value) {
  if (value === null || value === undefined || value === "") return "";
  const cm = Number(value) / 10;
  if (!Number.isFinite(cm) || cm <= 0) return "";
  return Number.isInteger(cm)
    ? String(cm)
    : String(Number(cm.toFixed(2))).replace(/\.0+$/, "");
}

function formatDimensions(article) {
  const parts = [
    formatDimensionPart(article.widthMm),
    formatDimensionPart(article.heightMm),
    formatDimensionPart(article.depthMm),
  ].filter(Boolean);
  return parts.length ? `${parts.join(" x ")} cm` : "";
}

export default async function AdminCatalogArticlesPage({ searchParams }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = await searchParams;
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const editArticleId = String(resolvedSearchParams?.editArticle || "");
  const editBlendeId = String(resolvedSearchParams?.editBlende || "");
  const editServiceId = String(resolvedSearchParams?.editService || "");
  const editClaimProductId = String(resolvedSearchParams?.editClaimProduct || "");
  const catalogPrograms = await listCatalogPrograms();
  const requestedProgramId = String(resolvedSearchParams?.programmId || "").trim();
  const selectedProgram = catalogPrograms.find((program) => program.programmId === requestedProgramId) || catalogPrograms[0];
  const selectedProgramId = selectedProgram?.programmId || "IP 2200";
  const [articles, blenden, services, claimProducts] = await Promise.all([
    prisma.$queryRaw`
    SELECT
      ca."id",
      ca."articleNumber",
      ca."name",
      ca."nameDe",
      ca."description",
      ca."widthMm",
      ca."heightMm",
      ca."depthMm",
      capp."price",
      ca."itemType",
      ca."productImagePath",
      ca."productInfoPdfPath",
      ca."productInfoSummary",
      ca."productInfoKeyFacts",
      CASE WHEN ca."id" = ${editArticleId} THEN ca."productInfoExtractedText" ELSE NULL END AS "productInfoExtractedText",
      ca."productInfoUpdatedAt",
      ca."isFixedPricePackage",
      capp."isActive",
      COUNT(ki."id")::int AS "linkedKitchenItems"
    FROM "CatalogArticle" ca
    INNER JOIN "CatalogArticleProgramPrice" capp
      ON capp."catalogArticleId" = ca."id"
      AND capp."programmId" = ${selectedProgramId}
    LEFT JOIN "KitchenItem" ki ON ki."catalogArticleId" = ca."id"
      AND EXISTS (
        SELECT 1 FROM "Kitchen" linked_kitchen
        WHERE linked_kitchen."id" = ki."kitchenId"
          AND linked_kitchen."programmId" = ${selectedProgramId}
      )
    GROUP BY ca."id", capp."price", capp."isActive"
    ORDER BY ca."itemType" ASC, ca."articleNumber" ASC
    `,
    prisma.$queryRaw`
    SELECT
      cb."id",
      cb."code",
      cb."name",
      cb."nameDe",
      cb."description",
      cbp."price",
      cbp."isActive",
      COUNT(ki."id")::int AS "linkedKitchenItems"
    FROM "CatalogBlende" cb
    INNER JOIN "CatalogBlendeProgramPrice" cbp
      ON cbp."catalogBlendeId" = cb."id"
      AND cbp."programmId" = ${selectedProgramId}
    LEFT JOIN "KitchenItem" ki ON ki."catalogBlendeId" = cb."id"
      AND EXISTS (
        SELECT 1 FROM "Kitchen" linked_kitchen
        WHERE linked_kitchen."id" = ki."kitchenId"
          AND linked_kitchen."programmId" = ${selectedProgramId}
      )
    GROUP BY cb."id", cbp."price", cbp."isActive"
    ORDER BY cb."code" ASC
    `,
    prisma.$queryRaw`
    SELECT
      cs."id",
      cs."code",
      cs."name",
      cs."nameDe",
      cs."description",
      csp."price",
      csp."isActive",
      COUNT(ki."id")::int AS "linkedKitchenItems"
    FROM "CatalogService" cs
    INNER JOIN "CatalogServiceProgramPrice" csp
      ON csp."catalogServiceId" = cs."id"
      AND csp."programmId" = ${selectedProgramId}
    LEFT JOIN "KitchenItem" ki ON ki."catalogServiceId" = cs."id"
      AND EXISTS (
        SELECT 1 FROM "Kitchen" linked_kitchen
        WHERE linked_kitchen."id" = ki."kitchenId"
          AND linked_kitchen."programmId" = ${selectedProgramId}
      )
    GROUP BY cs."id", csp."price", csp."isActive"
    ORDER BY cs."code" ASC
    `,
    prisma.$queryRaw`
    SELECT
      kcp."id",
      kcp."kitchenId",
      kcp."partKey",
      kcp."name",
      kcp."nameDe",
      kcp."articleCode",
      kcp."sourceKitchenItemCode",
      kcp."sourceComponentKey",
      kcp."productImagePath",
      kcp."productInfoPdfPath",
      kcp."productInfoSummary",
      kcp."productInfoKeyFacts",
      CASE WHEN kcp."id" = ${editClaimProductId} THEN kcp."productInfoExtractedText" ELSE NULL END AS "productInfoExtractedText",
      kcp."productInfoUpdatedAt",
      kcp."isActive",
      kcp."sortOrder",
      k."name" AS "kitchenName",
      k."slug" AS "kitchenSlug",
      k."kitchenCode" AS "kitchenCode",
      ki."name" AS "sourceKitchenItemName"
    FROM "KitchenClaimPart" kcp
    INNER JOIN "Kitchen" k ON k."id" = kcp."kitchenId"
    LEFT JOIN "KitchenItem" ki ON ki."kitchenId" = kcp."kitchenId"
      AND ki."code" = kcp."sourceKitchenItemCode"
    WHERE k."programmId" = ${selectedProgramId}
    ORDER BY k."name" ASC, kcp."sortOrder" ASC, kcp."partKey" ASC
    `,
  ]);
  const claimProductGroups = groupClaimProducts(claimProducts);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <PageHero
          eyebrow={<AdminText i18nKey="catalogAdmin.manage" fallback="Manage" />}
          title={<AdminText i18nKey="catalogAdmin.catalog" fallback="Catalog" />}
          description={<AdminText i18nKey="catalogAdmin.catalogDescription" fallback="Reusable articles, blenden, and services." />}
          actions={(
            <div style={actionRowStyle}>
              <ActionLink href="/api/admin/catalog/export?includeAllPrograms=true" secondary>
                <AdminText i18nKey="catalogAdmin.exportExcel" fallback="Export Excel" />
              </ActionLink>
              <ActionLink href="/admin/catalog/imports">
                <AdminText i18nKey="catalogAdmin.priceImports" fallback="Price imports" />
              </ActionLink>
            </div>
          )}
        />
        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

        <nav style={programCatalogNavStyle} aria-label="Catalog program">
          <div>
            <strong style={programCatalogTitleStyle}>
              <AdminText i18nKey="catalogAdmin.programCatalogs" fallback="Program catalogs" />
            </strong>
            <p style={programCatalogHelpStyle}>
              <AdminText i18nKey="catalogAdmin.programCatalogsDescription" fallback="Impuls and Burger articles and prices are managed separately." />
            </p>
          </div>
          <div style={programCatalogTabsStyle}>
            {catalogPrograms.map((program) => {
              const isSelected = program.programmId === selectedProgramId;
              return (
                <Link
                  key={program.programmId}
                  href={`/admin/catalog/articles?programmId=${encodeURIComponent(program.programmId)}`}
                  style={isSelected ? programCatalogTabActiveStyle : programCatalogTabStyle}
                  aria-current={isSelected ? "page" : undefined}
                >
                  <span>{program.name || program.programmId}</span>
                  <small style={programCatalogTabMetaStyle}>{program.programmId}</small>
                </Link>
              );
            })}
          </div>
        </nav>

        <AdminSection
          title={<AdminText i18nKey="catalogAdmin.articles" fallback="Articles" />}
          actions={(
            <details style={addonDetailsStyle}>
              <summary style={secondaryButtonStyle}><AdminText i18nKey="catalogAdmin.addArticle" fallback="Add article" /></summary>
              <CatalogArticleForm
                action="/api/admin/catalog/articles"
                programmId={selectedProgramId}
                submitLabel={<AdminText i18nKey="catalogAdmin.createArticle" fallback="Create article" />}
              />
            </details>
          )}
        >
          {!articles.length ? <p style={emptyStateStyle}><AdminText i18nKey="catalogAdmin.noArticles" fallback="No catalog articles found." /></p> : (
            <div style={tableWrapStyle}>
              <table style={catalogArticlesTableStyle}>
                <colgroup>
                  <col style={{ width: "12.5%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8.5%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.articleNumber" fallback="Article number" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.englishName" fallback="English name" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.germanName" fallback="German name" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.dimensions" fallback="Dimensions" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.itemType" fallback="Item type" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.price" fallback="Price" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.fixedPackage" fallback="Fixed package" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.active" fallback="Active" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.linkedKitchenItems" fallback="Linked kitchen items" /></th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <Fragment key={article.id}>
                      <tr>
                        <td style={tdStyle}><span style={codePillStyle}>{article.articleNumber}</span></td>
                        <td style={tdStyle}>{article.name}</td>
                        <td style={tdStyle}>{article.nameDe || ""}</td>
                        <td style={tdStyle}>{formatDimensions(article)}</td>
                        <td style={tdStyle}>
                          <AdminText
                            i18nKey={ITEM_TYPE_LABELS[article.itemType]?.key}
                            fallback={ITEM_TYPE_LABELS[article.itemType]?.fallback || article.itemType}
                          />
                        </td>
                        <td style={tdStyle}>{formatMoney(article.price)}</td>
                        <td style={tdStyle}>{article.isFixedPricePackage
                          ? <AdminText i18nKey="catalogAdmin.yes" fallback="Yes" />
                          : <AdminText i18nKey="catalogAdmin.no" fallback="No" />}</td>
                        <td style={tdStyle}>{article.isActive
                          ? <AdminText i18nKey="catalogAdmin.yes" fallback="Yes" />
                          : <AdminText i18nKey="catalogAdmin.no" fallback="No" />}</td>
                        <td style={tdStyle}>{article.linkedKitchenItems}</td>
                      </tr>
                      <tr>
                        <td colSpan={9} style={editRowCellStyle}>
                          <div style={editActionRowStyle}>
                            {editArticleId === article.id ? (
                              <details open style={editDetailsStyle}>
                                <summary style={editSummaryStyle}><AdminText i18nKey="catalogAdmin.editing" fallback="Editing" /></summary>
                                <CatalogArticleForm
                                  action={`/api/admin/catalog/articles/${article.id}`}
                                  article={article}
                                  programmId={selectedProgramId}
                                  submitLabel={<AdminText i18nKey="catalogAdmin.saveArticle" fallback="Save article" />}
                                  cancelHref={buildCatalogListHref(resolvedSearchParams)}
                                />
                              </details>
                            ) : (
                              <Link href={buildCatalogEditHref(resolvedSearchParams, "editArticle", article.id)} scroll={false} style={editSummaryStyle}>
                                <AdminText i18nKey="catalogAdmin.edit" fallback="Edit" />
                              </Link>
                            )}
                            <CatalogDeleteForm
                              action={`/api/admin/catalog/articles/${article.id}`}
                              entityLabel="Article"
                              confirmKey="catalogAdmin.deleteArticleConfirm"
                              itemLabel={article.articleNumber}
                              linkedKitchenItems={article.linkedKitchenItems}
                              programmId={selectedProgramId}
                            />
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="catalogAdmin.blenden" fallback="Blenden" />}
          actions={(
            <details style={addonDetailsStyle}>
              <summary style={secondaryButtonStyle}><AdminText i18nKey="catalogAdmin.addBlende" fallback="Add blende" /></summary>
              <CatalogAddonForm action="/api/admin/catalog/blenden" programmId={selectedProgramId} submitLabel={<AdminText i18nKey="catalogAdmin.createBlende" fallback="Create blende" />} />
            </details>
          )}
        >
          {!blenden.length ? <p style={emptyStateStyle}><AdminText i18nKey="catalogAdmin.noBlenden" fallback="No catalog blenden found." /></p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.code" fallback="Code" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.englishName" fallback="English name" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.germanName" fallback="German name" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.description" fallback="Description" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.price" fallback="Price" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.active" fallback="Active" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.linkedKitchenItems" fallback="Linked kitchen items" /></th>
                  </tr>
                </thead>
                <tbody>
                  {blenden.map((blende) => (
                    <Fragment key={blende.id}>
                      <tr>
                        <td style={tdStyle}><span style={codePillStyle}>{blende.code}</span></td>
                        <td style={tdStyle}>{blende.name}</td>
                        <td style={tdStyle}>{blende.nameDe || ""}</td>
                        <td style={tdStyle}>{blende.description || ""}</td>
                        <td style={tdStyle}>{formatMoney(blende.price)}</td>
                        <td style={tdStyle}>{blende.isActive
                          ? <AdminText i18nKey="catalogAdmin.yes" fallback="Yes" />
                          : <AdminText i18nKey="catalogAdmin.no" fallback="No" />}</td>
                        <td style={tdStyle}>{blende.linkedKitchenItems}</td>
                      </tr>
                      <tr>
                        <td colSpan={7} style={editRowCellStyle}>
                          <div style={editActionRowStyle}>
                            {editBlendeId === blende.id ? (
                              <details open style={editDetailsStyle}>
                                <summary style={editSummaryStyle}><AdminText i18nKey="catalogAdmin.editing" fallback="Editing" /></summary>
                                <CatalogAddonForm action={`/api/admin/catalog/blenden/${blende.id}`} item={blende} programmId={selectedProgramId} submitLabel={<AdminText i18nKey="catalogAdmin.saveBlende" fallback="Save blende" />} />
                              </details>
                            ) : (
                              <Link href={buildCatalogEditHref(resolvedSearchParams, "editBlende", blende.id)} scroll={false} style={editSummaryStyle}><AdminText i18nKey="catalogAdmin.edit" fallback="Edit" /></Link>
                            )}
                            <CatalogDeleteForm
                              action={`/api/admin/catalog/blenden/${blende.id}`}
                              entityLabel="Blende"
                              confirmKey="catalogAdmin.deleteBlendeConfirm"
                              itemLabel={blende.code}
                              linkedKitchenItems={blende.linkedKitchenItems}
                              programmId={selectedProgramId}
                            />
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="catalogAdmin.services" fallback="Services" />}
          actions={(
            <details style={addonDetailsStyle}>
              <summary style={secondaryButtonStyle}><AdminText i18nKey="catalogAdmin.addService" fallback="Add service" /></summary>
              <CatalogAddonForm action="/api/admin/catalog/services" programmId={selectedProgramId} submitLabel={<AdminText i18nKey="catalogAdmin.createService" fallback="Create service" />} />
            </details>
          )}
        >
          {!services.length ? <p style={emptyStateStyle}><AdminText i18nKey="catalogAdmin.noServices" fallback="No catalog services found." /></p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.code" fallback="Code" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.englishName" fallback="English name" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.germanName" fallback="German name" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.description" fallback="Description" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.price" fallback="Price" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.active" fallback="Active" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.linkedKitchenItems" fallback="Linked kitchen items" /></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <Fragment key={service.id}>
                      <tr>
                        <td style={tdStyle}><span style={codePillStyle}>{service.code}</span></td>
                        <td style={tdStyle}>{service.name}</td>
                        <td style={tdStyle}>{service.nameDe || ""}</td>
                        <td style={tdStyle}>{service.description || ""}</td>
                        <td style={tdStyle}>{formatMoney(service.price)}</td>
                        <td style={tdStyle}>{service.isActive
                          ? <AdminText i18nKey="catalogAdmin.yes" fallback="Yes" />
                          : <AdminText i18nKey="catalogAdmin.no" fallback="No" />}</td>
                        <td style={tdStyle}>{service.linkedKitchenItems}</td>
                      </tr>
                      <tr>
                        <td colSpan={7} style={editRowCellStyle}>
                          <div style={editActionRowStyle}>
                            {editServiceId === service.id ? (
                              <details open style={editDetailsStyle}>
                                <summary style={editSummaryStyle}><AdminText i18nKey="catalogAdmin.editing" fallback="Editing" /></summary>
                                <CatalogAddonForm action={`/api/admin/catalog/services/${service.id}`} item={service} programmId={selectedProgramId} submitLabel={<AdminText i18nKey="catalogAdmin.saveService" fallback="Save service" />} />
                              </details>
                            ) : (
                              <Link href={buildCatalogEditHref(resolvedSearchParams, "editService", service.id)} scroll={false} style={editSummaryStyle}><AdminText i18nKey="catalogAdmin.edit" fallback="Edit" /></Link>
                            )}
                            <CatalogDeleteForm
                              action={`/api/admin/catalog/services/${service.id}`}
                              entityLabel="Service"
                              confirmKey="catalogAdmin.deleteServiceConfirm"
                              itemLabel={service.code}
                              linkedKitchenItems={service.linkedKitchenItems}
                              programmId={selectedProgramId}
                            />
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="catalogAdmin.claimProducts" fallback="Claim products" />}
          actions={<ActionLink href="/api/admin/catalog/claim-products/export"><AdminText i18nKey="catalogAdmin.exportClaimProducts" fallback="Export claim products" /></ActionLink>}
        >
          {!claimProductGroups.length ? <p style={emptyStateStyle}><AdminText i18nKey="catalogAdmin.noClaimProducts" fallback="No claim products found." /></p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.linkedKitchens" fallback="Linked kitchens" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.partKey" fallback="Part key" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.articleCode" fallback="Article code" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.englishName" fallback="English name" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.germanName" fallback="German name" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.sortOrder" fallback="Sort order" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.productInformation" fallback="Product info" /></th>
                    <th style={thStyle}><AdminText i18nKey="catalogAdmin.active" fallback="Active" /></th>
                  </tr>
                </thead>
                <tbody>
                  {claimProductGroups.map((claimProduct) => (
                    <Fragment key={claimProduct.id}>
                      <tr>
                        <td style={tdStyle} title={claimProduct.linkedKitchens.join(", ")}>
                          {claimProduct.linkedKitchens.length} kitchen{claimProduct.linkedKitchens.length === 1 ? "" : "s"}
                          {claimProduct.linkedKitchens.length ? `: ${formatJoinedValues(claimProduct.linkedKitchens)}` : ""}
                        </td>
                        <td style={tdStyle}>
                          <span style={codePillStyle}>{formatJoinedValues(claimProduct.partKeys || [claimProduct.partKey])}</span>
                        </td>
                        <td style={tdStyle}>{claimProduct.articleCode || ""}</td>
                        <td style={tdStyle}>{claimProduct.name}</td>
                        <td style={tdStyle}>{claimProduct.nameDe || ""}</td>
                        <td style={tdStyle}>{claimProduct.sortOrder}</td>
                        <td style={tdStyle}>
                          {claimProduct.productInfoPdfPath ? (
                            <span style={{ color: "var(--app-success-text)", fontWeight: 800 }}><AdminText i18nKey="catalogAdmin.ready" fallback="Ready" /></span>
                          ) : (
                            <span style={{ color: "var(--app-text-muted)" }}><AdminText i18nKey="catalogAdmin.missing" fallback="Missing" /></span>
                          )}
                        </td>
                        <td style={tdStyle}>{claimProduct.isActive
                          ? <AdminText i18nKey="catalogAdmin.yes" fallback="Yes" />
                          : <AdminText i18nKey="catalogAdmin.no" fallback="No" />}</td>
                      </tr>
                      <tr>
                        <td colSpan={8} style={editRowCellStyle}>
                          <div style={editActionRowStyle}>
                            {editClaimProductId === claimProduct.id ? (
                              <details open style={editDetailsStyle}>
                                <summary style={editSummaryStyle}><AdminText i18nKey="catalogAdmin.editing" fallback="Editing" /></summary>
                                <ClaimProductForm
                                  action={`/api/admin/catalog/claim-products/${claimProduct.id}`}
                                  claimProduct={claimProduct}
                                  submitLabel={<AdminText i18nKey="catalogAdmin.saveClaimProduct" fallback="Save claim product" />}
                                />
                              </details>
                            ) : (
                              <Link href={buildCatalogEditHref(resolvedSearchParams, "editClaimProduct", claimProduct.id)} scroll={false} style={editSummaryStyle}><AdminText i18nKey="catalogAdmin.edit" fallback="Edit" /></Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
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

const addonDetailsStyle = {
  position: "relative",
};

const programCatalogNavStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
  padding: 18,
  border: "1px solid var(--app-border)",
  borderRadius: 16,
  background: "var(--color-card)",
  boxShadow: "var(--app-shadow-soft)",
};

const programCatalogTitleStyle = {
  color: "var(--app-text)",
  fontSize: 17,
  fontWeight: 900,
};

const programCatalogHelpStyle = {
  margin: "4px 0 0",
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 650,
};

const programCatalogTabsStyle = {
  display: "flex",
  alignItems: "stretch",
  gap: 10,
  flexWrap: "wrap",
};

const programCatalogTabStyle = {
  display: "grid",
  gap: 2,
  minWidth: 150,
  padding: "11px 16px",
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  background: "var(--app-surface)",
  color: "var(--app-text)",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 850,
};

const programCatalogTabActiveStyle = {
  ...programCatalogTabStyle,
  border: "1px solid var(--app-accent)",
  background: "var(--app-accent)",
  color: "white",
  boxShadow: "0 8px 20px rgba(115, 80, 55, 0.18)",
};

const programCatalogTabMetaStyle = {
  opacity: 0.75,
  fontSize: 11,
  fontWeight: 750,
  letterSpacing: "0.04em",
};

const addonFormStyle = {
  display: "grid",
  gap: 14,
  minWidth: 520,
  maxWidth: 760,
  marginTop: 10,
  padding: 16,
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "var(--color-card)",
  boxShadow: "var(--app-shadow-soft)",
};

const articleFormStyle = {
  width: "100%",
};

const catalogArticlesTableStyle = {
  ...tableStyle,
  minWidth: 1180,
};

const productInfoDetailsStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.62)",
  overflow: "hidden",
};

const productInfoSummaryStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 14px",
  color: "var(--app-accent)",
  fontWeight: 900,
  cursor: "pointer",
};

const productInfoReadyStyle = {
  padding: "4px 8px",
  borderRadius: 999,
  background: "#edf8f1",
  color: "#237246",
  fontSize: 12,
};

const productInfoMissingStyle = {
  ...productInfoReadyStyle,
  background: "#f6f1eb",
  color: "var(--app-text-muted)",
};

const productInfoBodyStyle = {
  display: "grid",
  gap: 12,
  padding: "0 14px 14px",
};

const claimProductFormStyle = {
  ...addonFormStyle,
  minWidth: 680,
};

const editRowCellStyle = {
  ...tdStyle,
  paddingTop: 0,
  background: "var(--app-surface)",
};

const editDetailsStyle = {
  flex: "1 1 100%",
  minWidth: 0,
};

const editSummaryStyle = {
  ...secondaryButtonStyle,
  width: "fit-content",
  minHeight: 40,
  padding: "9px 13px",
  listStyle: "none",
  cursor: "pointer",
};

const editActionRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap",
};

const deleteFormStyle = {
  margin: 0,
};

const deleteButtonStyle = {
  border: "1px solid rgba(217, 92, 92, 0.24)",
  background: "rgba(255,255,255,0.72)",
  color: "var(--app-danger-text)",
  minHeight: 40,
  borderRadius: 8,
  padding: "9px 13px",
  fontSize: 13,
  boxShadow: "none",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const deleteUnavailableStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 40,
  borderRadius: 8,
  padding: "9px 13px",
  background: "rgba(115, 80, 55, 0.07)",
  border: "1px solid rgba(115, 80, 55, 0.12)",
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
};
