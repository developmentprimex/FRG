import { ItemType, KitchenStatus } from "@prisma/client";
import Link from "next/link";
import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  TypeBadge,
  actionRowStyle,
  cardListStyle,
  checkboxRowStyle,
  formGridStyle,
  inputStyle,
  itemCardStyle,
  itemHeaderStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  splitGridStyle,
  subMetaStyle,
  textareaStyle,
} from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminKitchenDisplayName, AdminKitchenNameInput, AdminLocalizedName, AdminStatusBadge, AdminText, AdminTranslatedInput } from "../../../../components/admin-i18n";
import { AdminComponentSlotPicker } from "../../../../components/admin-component-slot-picker";
import AdminBlendePriceFields from "../../../../components/admin-blende-price-fields";
import { AdminIconKeySelect } from "../../../../components/admin-icon-key-select";
import { AdminProductInfoPdfManager } from "../../../../components/admin-product-info-pdf-manager";
import burgerCindyArticleCodes from "../../../../lib/burger-cindy-article-codes.cjs";
import AdminSelect from "../../../../components/admin-select";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { buildKitchenPreviewSvgMarkup } from "../../../../lib/claim-kitchen-preview";
import { LEGACY_ICON_KEYS, getKitchenById, listKitchenItemCodeOptionsForAdmin } from "../../../../lib/catalog";
import { listCatalogPrograms } from "../../../../lib/catalog-programs";
import { getCatalogProgramPrice } from "../../../../lib/catalog-pricing";
import { getKitchenCatalogImagePreview, getKitchenCatalogPreviewHotspots, getKitchenCatalogPreviewSlot, resolveKitchenCatalogPreviewSlug } from "../../../../lib/kitchen-catalog-preview";
import { getKitchenStructureSlots } from "../../../../lib/kitchen-structure";
import { loadKitchenSvgMarkup } from "../../../../lib/load-kitchen-svg";
import { prisma } from "../../../../lib/prisma";
import { loadKitchenApplianceInventories } from "../../../../lib/contract-appliance-inventory";
import AdminApplianceSummary from "../../../../components/admin-appliance-summary";

export const dynamic = "force-dynamic";

const ITEM_TYPE_OPTIONS = Object.values(ItemType);
const ITEM_TYPE_FILTER_LABELS = {
  [ItemType.COMPONENT]: {
    key: "kitchenDetailAdmin.typeComponents",
    fallback: "Components",
  },
  [ItemType.ACCESSORY]: {
    key: "kitchenDetailAdmin.typeAccessories",
    fallback: "Accessories",
  },
  [ItemType.SERVICE]: {
    key: "kitchenDetailAdmin.typeServices",
    fallback: "Services",
  },
};
const KITCHEN_STATUS_OPTIONS = Object.values(KitchenStatus);
const DISHWASHER_BASE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="20" y1="14" x2="40" y2="14" stroke-linecap="round" stroke-width="1.5"/><g stroke="#ccc" stroke-width="0.5"><path d="M 10 24 L 14 44 H 46 L 50 24 Z"/><line x1="18" y1="26" x2="20" y2="44"/><line x1="26" y1="26" x2="26" y2="44"/><line x1="34" y1="26" x2="34" y2="44"/><line x1="42" y1="26" x2="40" y2="44"/><line x1="12" y1="32" x2="48" y2="32"/><line x1="13" y1="38" x2="47" y2="38"/></g><rect x="24" y="58" width="12" height="8" fill="white"/><text x="30" y="64" font-family="sans-serif" font-size="5" text-anchor="middle" fill="currentColor" stroke="none">GS</text></svg>';
const ITEM_ICON_MARKUP = {
  dishwasher: DISHWASHER_BASE_MARKUP,
  extractor_hood: '<img src="/img/foto5.png" alt="Dunstabzugshaube">',
  wall_cabinet_single_light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/><g stroke="#666" stroke-width="0.75"><line x1="30" y1="60" x2="30" y2="63"/><line x1="28" y1="63" x2="32" y2="63"/><line x1="26" y1="66" x2="22" y2="74"/><line x1="30" y1="66" x2="30" y2="75"/><line x1="34" y1="66" x2="38" y2="74"/></g></svg>',
  wall_cabinet_double_light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/><rect x="0.5" y="60" width="59" height="2"/><g stroke="#666" stroke-width="0.75"><line x1="20" y1="62" x2="20" y2="64"/><line x1="18" y1="64" x2="22" y2="64"/><line x1="17" y1="67" x2="14" y2="73"/><line x1="20" y1="67" x2="20" y2="74"/><line x1="23" y1="67" x2="26" y2="73"/><line x1="40" y1="62" x2="40" y2="64"/><line x1="38" y1="64" x2="42" y2="64"/><line x1="37" y1="67" x2="34" y2="73"/><line x1="40" y1="67" x2="40" y2="74"/><line x1="43" y1="67" x2="46" y2="73"/></g></svg>',
  wall_cabinet_plain:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/></svg>',
  washing_machine_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="14" x2="60" y2="14"/><line x1="10" y1="8" x2="25" y2="8" stroke-width="0.5"/><g stroke="#ccc" stroke-width="0.5"><path d="M 16 26 C 12 26 12 46 16 46 Z"/><circle cx="30" cy="36" r="14"/><circle cx="30" cy="36" r="10"/></g><rect x="24" y="58" width="12" height="8" fill="white"/><text x="30" y="64" font-family="sans-serif" font-size="5" text-anchor="middle" fill="currentColor" stroke="none">WM</text></svg>',
  sink_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="20" y1="14" x2="40" y2="14" stroke-linecap="round" stroke-width="1.5"/></svg>',
  dishwasher_base: DISHWASHER_BASE_MARKUP,
  oven_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="16" x2="60" y2="16"/><rect x="44" y="6" width="4" height="4"/><rect x="52" y="6" width="4" height="4"/><line x1="0" y1="56" x2="60" y2="56"/><rect x="8" y="22" width="44" height="26"/><line x1="7" y1="24" x2="53" y2="24" stroke-linecap="round" stroke-width="1.5"/><rect x="12" y="26" width="36" height="18"/><line x1="22" y1="62" x2="38" y2="62" stroke-linecap="round" stroke-width="1.5"/></svg>',
  drawer_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="16" x2="60" y2="16"/><line x1="20" y1="9" x2="40" y2="9" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="24" x2="40" y2="24" stroke-linecap="round" stroke-width="1.5"/></svg>',
  worktop:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20" fill="none" stroke="currentColor" stroke-width="1"><line x1="2" y1="7" x2="118" y2="7"/><line x1="2" y1="13" x2="118" y2="13"/><line x1="118" y1="7" x2="118" y2="13"/></svg>',
  drawer_base_two:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="18" x2="60" y2="18"/><line x1="20" y1="10" x2="40" y2="10" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="26" x2="40" y2="26" stroke-linecap="round" stroke-width="1.5"/></svg>',
  drawer_base_three:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="16" x2="60" y2="16"/><line x1="0" y1="44" x2="60" y2="44"/><line x1="20" y1="9" x2="40" y2="9" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="30" x2="40" y2="30" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="58" x2="40" y2="58" stroke-linecap="round" stroke-width="1.5"/></svg>',
  tall_refrigerator:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 190" fill="none" stroke="currentColor" stroke-width="1"><line x1="3" y1="1" x2="57" y2="1"/><line x1="3" y1="1" x2="3" y2="186"/><line x1="57" y1="1" x2="57" y2="186"/><line x1="3" y1="186" x2="57" y2="186"/><line x1="8" y1="186" x2="8" y2="189" stroke-width="1.5"/><line x1="52" y1="186" x2="52" y2="189" stroke-width="1.5"/><line x1="3" y1="110" x2="57" y2="110"/><line x1="12" y1="108" x2="48" y2="108" stroke-linecap="round" stroke-width="1.5"/><line x1="12" y1="112" x2="48" y2="112" stroke-linecap="round" stroke-width="1.5"/></svg>',
  extractor_hood_chimney:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="24" y="0.5" width="12" height="39"/><line x1="24" y1="20" x2="36" y2="20"/><rect x="10" y="40" width="40" height="12"/><g stroke="#666" stroke-width="0.75"><line x1="18" y1="55" x2="15" y2="62"/><line x1="22" y1="55" x2="22" y2="63"/><line x1="26" y1="55" x2="29" y2="62"/><line x1="34" y1="55" x2="31" y2="62"/><line x1="38" y1="55" x2="38" y2="63"/><line x1="42" y1="55" x2="45" y2="62"/></g></svg>',
  wall_cabinet_standard:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/></svg>',
  under_cabinet_light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="#666" stroke-width="0.75"><line x1="8" y1="0" x2="12" y2="0" stroke="currentColor" stroke-width="1"/><line x1="6" y1="4" x2="2" y2="14"/><line x1="10" y1="4" x2="10" y2="15"/><line x1="14" y1="4" x2="18" y2="14"/></svg>',
  sink_faucet:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 30" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="8" y="28" width="4" height="2" fill="white" stroke-width="1"/><rect x="9" y="24" width="2" height="4" fill="white" stroke-width="1"/><path d="M 10 24 L 10 10 C 10 4, 16 4, 16 10 L 16 14" stroke-linecap="round"/><line x1="10" y1="18" x2="5" y2="15" stroke-linecap="round"/></svg>',
  waste_system:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  cutlery_insert:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="8" y="3" width="8" height="4" rx="1"/><rect x="8" y="8" width="3" height="3" rx="1"/><rect x="12" y="8" width="4" height="3" rx="1"/><rect x="8.5" y="12" width="3" height="9" rx="1"/><rect x="12.5" y="12" width="3" height="9" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>',
  lighting_set:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>',
  delivery_assembly:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-8.5l1.96 2.5H17V9.5h2.5zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2.2-12.2l-4 4-1.4-1.4-1.4 1.4 2.8 2.8 5.4-5.4-1.4-1.4z"/></svg>',
  pickup: '<img src="/img/warehouse.png" alt="Pickup service"/>',
};
function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function contractAddressLines(contract) {
  const streetLine = [contract.address1, contract.address2].filter(Boolean).join(", ");
  const cityLine = [contract.postalCode, contract.city].filter(Boolean).join(" ");
  const unitLine = [
    contract.building ? `Building ${contract.building}` : "",
    contract.floor ? `Floor ${contract.floor}` : "",
    contract.unitNumber ? `Unit ${contract.unitNumber}` : "",
  ].filter(Boolean).join(" · ");

  return [streetLine, cityLine, contract.country, unitLine, contract.notes ? `Notes: ${contract.notes}` : ""].filter(Boolean);
}

function buildCatalogPreviewMarkup(svgMarkup, kitchenSlug, componentKey) {
  return buildKitchenPreviewSvgMarkup({
    svgMarkup,
    kitchenSlug,
    highlightedComponentKeys: componentKey ? [componentKey] : [],
  });
}

function normalizeItemIconMarkup(iconMarkup) {
  if (!iconMarkup) return "";

  return iconMarkup
    .replace(/<img\b([^>]*)>/i, (match, attrs) => {
      if (/style=/i.test(attrs)) {
        return `<img${attrs.replace(/style=(["'])(.*?)\1/i, (styleMatch, quote, value) => ` style=${quote}${value};max-width:100%;max-height:100%;display:block;object-fit:contain${quote}`)}>`;
      }

      return `<img${attrs} style="max-width:100%;max-height:100%;display:block;object-fit:contain">`;
    })
    .replace(/<svg\b([^>]*)>/i, (match, attrs) => {
      if (/style=/i.test(attrs)) {
        return `<svg${attrs.replace(/style=(["'])(.*?)\1/i, (styleMatch, quote, value) => ` style=${quote}${value};width:100%;height:100%;display:block${quote}`)}>`;
      }

      return `<svg${attrs} style="width:100%;height:100%;display:block">`;
    });
}

function KitchenCatalogPreview({ markup, imagePreview, componentKey, iconMarkup, slotLabel, itemType }) {
  const isComponent = itemType === ItemType.COMPONENT;
  const normalizedIconMarkup = normalizeItemIconMarkup(iconMarkup);
  const imageHotspots = getKitchenCatalogPreviewHotspots(imagePreview, componentKey);

  if (normalizedIconMarkup) {
    return (
      <div className="kitchen-catalog-preview--icon" style={previewIconWrapStyle} aria-label={`${itemType || "Item"} icon preview`}>
        <div style={previewIconStyle} dangerouslySetInnerHTML={{ __html: normalizedIconMarkup }} />
      </div>
    );
  }

  if (imagePreview?.imageHref && imageHotspots.length) {
    return (
      <div className="kitchen-catalog-preview" style={previewWrapStyle} aria-label={slotLabel ? `${slotLabel} preview` : "Kitchen preview"}>
        <div style={{ ...previewImagePlanStyle, aspectRatio: imagePreview.aspectRatio || previewImagePlanStyle.aspectRatio }}>
          <img
            src={imagePreview.imageHref}
            alt=""
            style={{
              ...previewImageStyle,
              left: `${-(imagePreview.crop.left / imagePreview.crop.width) * 100}%`,
              top: `${-(imagePreview.crop.top / imagePreview.crop.height) * 100}%`,
              width: `${(100 / imagePreview.crop.width) * 100}%`,
              height: `${(100 / imagePreview.crop.height) * 100}%`,
            }}
          />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={previewImageOverlayStyle}>
            <defs>
              {imageHotspots
                .filter((hotspot) => !hotspot.outlinePoints?.length)
                .map((hotspot, index) => (
                <clipPath key={`clip-${hotspot.componentKey}-${index}`} id={`catalog-preview-clip-${hotspot.componentKey}-${index}`}>
                  <rect x={hotspot.left} y={hotspot.top} width={hotspot.width} height={hotspot.height} rx="1.2" ry="1.2" />
                </clipPath>
              ))}
            </defs>
            {imageHotspots.map((hotspot, index) => (
              hotspot.outlinePoints?.length ? (
                <polygon
                  key={`${hotspot.componentKey}-${index}`}
                  points={hotspot.outlinePoints.map(([x, y]) => `${x},${y}`).join(" ")}
                  fill="rgba(176, 90, 50, 0.08)"
                  stroke="#8f3e2c"
                  strokeWidth="1.6"
                  vectorEffect="non-scaling-stroke"
                />
              ) : (
                <g key={`${hotspot.componentKey}-${index}`} clipPath={`url(#catalog-preview-clip-${hotspot.componentKey}-${index})`}>
                  <rect
                    x={hotspot.left}
                    y={hotspot.top}
                    width={hotspot.width}
                    height={hotspot.height}
                    rx="1.2"
                    ry="1.2"
                    fill="rgba(176, 90, 50, 0.08)"
                    stroke="#8f3e2c"
                    strokeWidth="1.6"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              )
            ))}
          </svg>
        </div>
      </div>
    );
  }

  if (!markup) {
    return <div className="kitchen-catalog-preview--empty" style={isComponent ? previewEmptyStyle : previewEmptyCompactStyle}><AdminText i18nKey="kitchenDetailAdmin.noPreview" fallback="No preview" /></div>;
  }

  return (
    <div className="kitchen-catalog-preview" style={previewWrapStyle} aria-label={slotLabel ? `${slotLabel} preview` : "Kitchen preview"}>
      <div className="kitchen-catalog-preview__svg" style={previewSvgStyle} dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
  );
}

function IconKeySelect({ name = "iconKey", defaultValue = "", style = inputStyle }) {
  const currentValue = String(defaultValue || "").trim();
  const options = currentValue && !LEGACY_ICON_KEYS.includes(currentValue)
    ? [currentValue, ...LEGACY_ICON_KEYS]
    : LEGACY_ICON_KEYS;

  return (
    <AdminIconKeySelect
      name={name}
      defaultValue={currentValue}
      iconKeys={options}
      iconMarkupByKey={ITEM_ICON_MARKUP}
      selectStyle={style}
    />
  );
}

function ProductPathStatus({ path }) {
  const normalizedPath = String(path || "").trim();

  return (
    <div style={productPathMetaStyle}>
      <span style={normalizedPath ? productPathAddedStyle : productPathMissingStyle}>
        <AdminText
          i18nKey={normalizedPath ? "kitchenDetailAdmin.pathAdded" : "kitchenDetailAdmin.missingPath"}
          fallback={normalizedPath ? "Path added" : "Missing path"}
        />
      </span>
      {normalizedPath ? (
        <a href={normalizedPath} target="_blank" rel="noreferrer" style={productPathLinkStyle}>
          <AdminText i18nKey="kitchenDetailAdmin.openPath" fallback="Open" />
        </a>
      ) : null}
    </div>
  );
}

function ProductPathField({ label, name, value, placeholder, style }) {
  return (
    <div style={productPathFieldStyle}>
      <label style={productPathLabelStyle}>
        <span>{label}</span>
        <input name={name} defaultValue={value} placeholder={placeholder} spellCheck={false} style={style} />
      </label>
      <ProductPathStatus path={value} />
    </div>
  );
}

function getKeyFactLines(keyFacts) {
  return (Array.isArray(keyFacts) ? keyFacts : [])
    .map((fact) => String(fact || "").trim())
    .filter(Boolean);
}

function getKeyFactsQuality(keyFacts) {
  const lines = getKeyFactLines(keyFacts);

  if (!lines.length) {
    return {
      i18nKey: "kitchenDetailAdmin.noKeyFactsAdded",
      fallback: "No key facts added",
      style: productInfoNoticeMutedStyle,
    };
  }

  const linesWithLabel = lines.filter((line) => line.includes(":")).length;

  if (!linesWithLabel) {
    return {
      i18nKey: "kitchenDetailAdmin.useLabelValueFormat",
      fallback: "Use Label: Value format for better chatbot answers",
      style: productInfoNoticeWarningStyle,
    };
  }

  if (linesWithLabel < lines.length) {
    return {
      i18nKey: "kitchenDetailAdmin.someLinesMayNotFollowLabelValueFormat",
      fallback: "Some lines may not follow Label: Value format",
      style: productInfoNoticeSubtleStyle,
    };
  }

  return null;
}

function getChatbotReadiness(item) {
  const hasSummary = Boolean(String(item.productInfoSummary || "").trim());
  const hasKeyFacts = Boolean(getKeyFactLines(item.productInfoKeyFacts).length);
  const hasExtractedText = Boolean(String(item.productInfoExtractedText || "").trim());
  const count = [hasSummary, hasKeyFacts, hasExtractedText].filter(Boolean).length;

  if (count === 3) {
    return {
      i18nKey: "kitchenDetailAdmin.chatbotReady",
      fallback: "Ready",
      style: chatbotReadyStyle,
    };
  }

  if (count > 0) {
    return {
      i18nKey: "kitchenDetailAdmin.chatbotPartial",
      fallback: "Partial",
      style: chatbotPartialStyle,
    };
  }

  return {
    i18nKey: "kitchenDetailAdmin.chatbotMissing",
    fallback: "Missing",
    style: chatbotMissingStyle,
  };
}

function ChatbotReadinessStatus({ item }) {
  const status = getChatbotReadiness(item);

  return (
    <div style={chatbotReadinessRowStyle}>
      <span style={chatbotReadinessLabelStyle}>
        <AdminText i18nKey="kitchenDetailAdmin.chatbotReadiness" fallback="Chatbot readiness" />
      </span>
      <span style={status.style}>
        <AdminText i18nKey={status.i18nKey} fallback={status.fallback} />
      </span>
    </div>
  );
}

function KeyFactsGuidance({ keyFacts }) {
  const warning = getKeyFactsQuality(keyFacts);
  return warning ? (
    <p style={warning.style}>
      <AdminText i18nKey={warning.i18nKey} fallback={warning.fallback} />
    </p>
  ) : null;
}

function ProductInformationFields({ item = {}, compact = false, placeholders = false }) {
  const currentInputStyle = compact ? compactInputStyle : inputStyle;
  const imagePath = item.productImagePath || "";
  const keyFacts = Array.isArray(item.productInfoKeyFacts) ? item.productInfoKeyFacts : [];

  return (
    <div style={productInfoGroupsStyle}>
      <fieldset style={productInfoGroupStyle}>
        <legend style={productInfoGroupLegendStyle}>
          <AdminText i18nKey="kitchenDetailAdmin.productFiles" fallback="Product Files" />
        </legend>
        <div style={productInfoFieldsStyle}>
          <ProductPathField
            label={<AdminText i18nKey="kitchenDetailAdmin.productImagePath" fallback="Image Path" />}
            name="productImagePath"
            value={imagePath}
            placeholder={placeholders ? "/product-images/email/example.jpg" : undefined}
            style={currentInputStyle}
          />
        </div>
      </fieldset>

      <fieldset style={productInfoGroupStyle}>
        <legend style={productInfoGroupLegendStyle}>
          <AdminText i18nKey="kitchenDetailAdmin.chatbotInformation" fallback="Chatbot Information" />
        </legend>
        <ChatbotReadinessStatus item={item} />
        <div style={productInfoFieldsStyle}>
          <AdminProductInfoPdfManager
            initialPdfPath={item.productInfoPdfPath || ""}
            initialSummary={item.productInfoSummary || ""}
            initialKeyFacts={keyFacts}
            initialExtractedText={item.productInfoExtractedText || ""}
            compact={compact}
          />
          <KeyFactsGuidance keyFacts={keyFacts} />
        </div>
      </fieldset>
    </div>
  );
}

export default async function AdminKitchenDetailPage({ params, searchParams }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const kitchen = await getKitchenById(id);
  const applianceInventories = kitchen ? await loadKitchenApplianceInventories([id]) : {};

  if (!kitchen) {
    return (
      <AdminShell adminEmail={admin.email}>
        <div style={pageGridStyle}>
          <AdminSection title={<AdminText i18nKey="kitchenDetailAdmin.kitchenNotFound" fallback="Kitchen not found" />} description={<AdminText i18nKey="kitchenDetailAdmin.requestedKitchenRecordDoesNotExist" fallback="The requested kitchen record does not exist." />}>
            <ActionLink href="/admin/kitchens"><AdminText i18nKey="kitchenDetailAdmin.backToKitchens" fallback="Back to kitchens" /></ActionLink>
          </AdminSection>
        </div>
      </AdminShell>
    );
  }

  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const previewSlug = resolveKitchenCatalogPreviewSlug(kitchen);
  const imagePreview = getKitchenCatalogImagePreview(previewSlug, kitchen.items);
  const structureSlots = getKitchenStructureSlots(previewSlug);
  const requestedEditId =
    typeof resolvedSearchParams.edit === "string" && resolvedSearchParams.edit.trim()
      ? resolvedSearchParams.edit.trim()
      : "";
  const itemSearchQuery = typeof resolvedSearchParams.itemSearch === "string" ? resolvedSearchParams.itemSearch.trim() : "";
  const requestedItemType = typeof resolvedSearchParams.itemType === "string"
    ? resolvedSearchParams.itemType.trim().toUpperCase()
    : "";
  const itemTypeFilter = ITEM_TYPE_OPTIONS.includes(requestedItemType) ? requestedItemType : "";
  const requestedItemStatus = typeof resolvedSearchParams.itemStatus === "string"
    ? resolvedSearchParams.itemStatus.trim().toLowerCase()
    : "";
  const itemStatusFilter = ["active", "inactive"].includes(requestedItemStatus) ? requestedItemStatus : "";
  const normalizedItemSearch = itemSearchQuery.toLowerCase();
  const hasItemFilters = Boolean(itemSearchQuery || itemTypeFilter || itemStatusFilter);
  const visibleItems = kitchen.items.filter((item) => {
    const matchesSearch = !normalizedItemSearch
      || String(item.catalogArticle?.name || item.catalogService?.name || item.name || "").toLowerCase().includes(normalizedItemSearch)
      || String(item.catalogArticle?.nameDe || item.catalogService?.nameDe || item.nameDe || "").toLowerCase().includes(normalizedItemSearch)
      || item.code.toLowerCase().includes(normalizedItemSearch);
    const matchesType = !itemTypeFilter || item.itemType === itemTypeFilter;
    const matchesStatus = !itemStatusFilter
      || (itemStatusFilter === "active" && item.isActive)
      || (itemStatusFilter === "inactive" && !item.isActive);

    return matchesSearch && matchesType && matchesStatus;
  });
  const occupiedByKey = kitchen.items.reduce((acc, item) => {
    if (!item.componentKey) return acc;
    acc[item.componentKey] = [...(acc[item.componentKey] || []), item.name];
    return acc;
  }, {});
  const kitchenSvgMarkup = structureSlots.length ? await loadKitchenSvgMarkup(previewSlug).catch(() => "") : "";
  const [itemCodeOptions, catalogPrograms, catalogArticles, catalogBlenden, catalogServices] = await Promise.all([
    listKitchenItemCodeOptionsForAdmin(),
    listCatalogPrograms(),
    prisma.catalogArticle.findMany({
      where: {
        isActive: true,
        programPrices: { some: { programmId: kitchen.programmId, isActive: true } },
        ...(kitchen.programmId === "BURGER CINDY"
          ? { articleNumber: { notIn: Object.keys(burgerCindyArticleCodes.BURGER_CINDY_ARTICLE_CODES) } }
          : {}),
      },
      include: { programPrices: { where: { programmId: kitchen.programmId, isActive: true }, take: 1 } },
      orderBy: [{ itemType: "asc" }, { articleNumber: "asc" }],
    }),
    prisma.catalogBlende.findMany({
      where: {
        isActive: true,
        programPrices: { some: { programmId: kitchen.programmId, isActive: true } },
      },
      include: { programPrices: { where: { programmId: kitchen.programmId, isActive: true }, take: 1 } },
      orderBy: { code: "asc" },
    }),
    prisma.catalogService.findMany({
      where: {
        isActive: true,
        programPrices: { some: { programmId: kitchen.programmId, isActive: true } },
      },
      include: { programPrices: { where: { programmId: kitchen.programmId, isActive: true }, take: 1 } },
      orderBy: { code: "asc" },
    }),
  ]);
  const catalogBlendeOptions = catalogBlenden.map((blende) => ({
    id: blende.id,
    code: blende.code,
    name: blende.name,
    nameDe: blende.nameDe,
    price: Number(getCatalogProgramPrice(blende)),
    formattedPrice: formatCurrency(getCatalogProgramPrice(blende)),
  }));
  const catalogServiceOptions = catalogServices.map((service) => ({
    id: service.id,
    code: service.code,
    name: service.name,
    nameDe: service.nameDe,
    price: Number(getCatalogProgramPrice(service)),
    formattedPrice: formatCurrency(getCatalogProgramPrice(service)),
  }));
  const catalogArticleOptions = catalogArticles.map((article) => ({
    id: article.id,
    articleNumber: article.articleNumber,
    name: article.name,
    nameDe: article.nameDe,
    price: Number(getCatalogProgramPrice(article)),
    formattedPrice: formatCurrency(getCatalogProgramPrice(article)),
  }));

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminKitchenDisplayName slug={kitchen.slug} name={kitchen.name} />}
          actions={
            <div style={actionRowStyle}>
              <ActionLink href="/admin/kitchens">
                <AdminText i18nKey="kitchenDetailAdmin.backToKitchens" fallback="Back to kitchens" />
              </ActionLink>
              <ActionLink href={`/kitchens/${kitchen.slug}`}><AdminText i18nKey="kitchenDetailAdmin.openPublicPage" fallback="Open public page" /></ActionLink>
            </div>
          }
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action={`/api/admin/kitchens/${kitchen.id}`} method="post" style={kitchenDetailsFormStyle}>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.kitchenName" fallback="Kitchen name" />}>
              <AdminKitchenNameInput slug={kitchen.slug} name={kitchen.name} style={compactInputStyle} required />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.kitchenCode" fallback="Kitchen code" />}>
              <input name="kitchenCode" defaultValue={kitchen.kitchenCode || ""} style={compactInputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.programmId" fallback="Programm ID" />}>
              <AdminSelect name="programmId" defaultValue={kitchen.programmId || "IP 2200"} style={compactInputStyle}>
                {catalogPrograms.map((program) => (
                  <option key={program.programmId} value={program.programmId}>
                    {program.programmId}{program.name && program.name !== program.programmId ? ` - ${program.name}` : ""}
                  </option>
                ))}
              </AdminSelect>
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.status" fallback="Status" />}>
              <AdminSelect name="status" defaultValue={kitchen.status} style={compactInputStyle}>
                {KITCHEN_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    <AdminText i18nKey={`status.${status.toLowerCase()}`} fallback={status} />
                  </option>
                ))}
              </AdminSelect>
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.description" fallback="Description" />} wide>
              <textarea
                name="description"
                defaultValue={kitchen.description || ""}
                rows={2}
                style={compactTextareaStyle}
              />
            </FormField>
            <div style={{ gridColumn: "1 / -1", ...actionRowStyle }}>
              <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="kitchenDetailAdmin.saveKitchen" fallback="Save kitchen" /></button>
              <AdminStatusBadge status={kitchen.status} />
            </div>
          </form>
        </AdminSection>

        <AdminSection title={<AdminText i18nKey="contractDetailAdmin.appliances" fallback="Electrical appliances" />} description={<AdminText i18nKey="contractDetailAdmin.kitchenAppliancesHelp" fallback="Included kitchen appliances. Contract details also include confirmed optional appliances and installed-brand overrides." />}>
          <AdminApplianceSummary appliances={applianceInventories[id]} />
        </AdminSection>

        <div style={contractNoticeStyle}>
          <p style={contractNoticeTextStyle}>
            <strong><AdminText i18nKey="kitchenDetailAdmin.contractNumbers" fallback="Contract numbers" /></strong>
            <span><AdminText i18nKey="kitchenDetailAdmin.contractNumbersManagedInContracts" fallback="Contract numbers are managed in Contracts." /></span>
          </p>
          <ActionLink href={`/admin/contracts?kitchenId=${kitchen.id}`}><AdminText i18nKey="kitchenDetailAdmin.manageContracts" fallback="Manage contracts" /></ActionLink>
        </div>

        <details style={catalogDisclosureStyle}>
          <summary style={catalogDisclosureSummaryStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: "1.08rem", color: "var(--app-text)" }}>
                <AdminText i18nKey="kitchenDetailAdmin.excelCatalog" fallback="Import / Export Catalog" />
              </strong>
              <span style={mutedTextStyle}>
                <AdminText i18nKey="kitchenDetailAdmin.exportKitchenToExcelThenImportBack" fallback="Export this kitchen to Excel, update prices or other item fields, then import the file back to update matching kitchen items." />
              </span>
            </div>
            <span style={catalogDisclosureButtonStyle}>
              <AdminText i18nKey="kitchenDetailAdmin.showImportExport" fallback="Show import / export" />
            </span>
          </summary>
          <div style={catalogDisclosureBodyStyle}>
            <div style={splitGridStyle}>
              <div style={catalogPanelStyle}>
                <div style={{ display: "grid", gap: 8 }}>
                  <strong style={{ fontSize: "1.05rem", color: "var(--app-text)" }}><AdminText i18nKey="kitchenDetailAdmin.exportCurrentKitchenData" fallback="Export current kitchen data" /></strong>
                  <p style={mutedTextStyle}>
                    <AdminText i18nKey="kitchenDetailAdmin.downloadAllCatalogRowsForKitchenIncludingCurrentPricesShownInAdmin" fallback="Download all catalog rows for this kitchen, including current prices shown in admin." />
                  </p>
                </div>
                <a
                  href={`/api/admin/kitchens/${kitchen.id}/catalog`}
                  style={catalogDownloadLinkStyle}
                >
                  <AdminText i18nKey="kitchenDetailAdmin.exportExcel" fallback="Export Excel" />
                </a>
              </div>

              <form
                action={`/api/admin/kitchens/${kitchen.id}/catalog`}
                method="post"
                encType="multipart/form-data"
                style={catalogPanelStyle}
              >
                <div style={{ display: "grid", gap: 8 }}>
                  <strong style={{ fontSize: "1.05rem", color: "var(--app-text)" }}><AdminText i18nKey="kitchenDetailAdmin.importEditedFile" fallback="Import edited file" /></strong>
                  <p style={mutedTextStyle}>
                    <AdminText i18nKey="kitchenDetailAdmin.changePricesInExportedSheetThenUpload" fallback="Change prices in the exported sheet, save it, then upload it here. Matching items will be updated." />
                  </p>
                </div>
                <FormField label={<AdminText i18nKey="kitchenDetailAdmin.catalogFile" fallback="Catalog file" />}>
                  <input
                    type="file"
                    name="catalogFile"
                    accept=".xlsx,.csv"
                    style={inputStyle}
                    required
                  />
                </FormField>
                <div style={actionRowStyle}>
                  <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="kitchenDetailAdmin.importCatalog" fallback="Import catalog" /></button>
                  <span style={catalogHelpTextStyle}><AdminText i18nKey="kitchenDetailAdmin.supportedFormatsXlsxAndCsv" fallback="Supported formats: .xlsx and .csv" /></span>
                </div>
              </form>
            </div>
          </div>
        </details>

        <AdminSection
          title={<AdminText i18nKey="kitchenDetailAdmin.catalogItems" fallback="Catalog Items" />}
        >
          <form method="get" className="kitchen-catalog-items__filters" style={catalogFiltersStyle}>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.searchItems" fallback="Search items" />}>
              <AdminTranslatedInput
                name="itemSearch"
                defaultValue={itemSearchQuery}
                placeholderKey="kitchenDetailAdmin.searchItemsPlaceholder"
                placeholderFallback="Name or code"
                style={compactInputStyle}
              />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.filterType" fallback="Type" />}>
              <AdminSelect key={`item-type-${itemTypeFilter || "all"}`} name="itemType" defaultValue={itemTypeFilter} style={compactInputStyle}>
                <option value=""><AdminText i18nKey="kitchenDetailAdmin.allTypes" fallback="All types" /></option>
                {ITEM_TYPE_OPTIONS.map((itemType) => (
                  <option key={itemType} value={itemType}>
                    <AdminText
                      i18nKey={ITEM_TYPE_FILTER_LABELS[itemType]?.key}
                      fallback={ITEM_TYPE_FILTER_LABELS[itemType]?.fallback || itemType}
                    />
                  </option>
                ))}
              </AdminSelect>
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.filterStatus" fallback="Status" />}>
              <AdminSelect key={`item-status-${itemStatusFilter || "all"}`} name="itemStatus" defaultValue={itemStatusFilter} style={compactInputStyle}>
                <option value=""><AdminText i18nKey="kitchenDetailAdmin.allStatuses" fallback="All statuses" /></option>
                <option value="active"><AdminText i18nKey="kitchenDetailAdmin.active" fallback="Active" /></option>
                <option value="inactive"><AdminText i18nKey="kitchenDetailAdmin.inactive" fallback="Inactive" /></option>
              </AdminSelect>
            </FormField>
            <div style={{ ...actionRowStyle, alignSelf: "end" }}>
              <button type="submit" style={secondaryButtonStyle}><AdminText i18nKey="dashboard.apply" fallback="Apply" /></button>
              <ActionLink href={`/admin/kitchens/${kitchen.id}`}><AdminText i18nKey="dashboard.clearFilters" fallback="Clear filters" /></ActionLink>
            </div>
          </form>

          <div style={cardListStyle}>
            {!visibleItems.length ? (
              <p style={mutedTextStyle}>
                {hasItemFilters
                  ? <AdminText i18nKey="kitchenDetailAdmin.noCatalogItemsMatchFilters" fallback="No catalog items match the current filters." />
                  : <AdminText i18nKey="kitchenDetailAdmin.noItemsConfiguredForThisKitchen" fallback="No items configured for this kitchen." />}
              </p>
            ) : null}
            {visibleItems.map((item) => {
              const isClaimProductManaged = Boolean(item.isLocked)
                && /^OVEN-.+-HOB$/i.test(String(item.code || ""));
              const slot = structureSlots.find((entry) => entry.componentKey === item.componentKey)
                || getKitchenCatalogPreviewSlot(imagePreview, item.componentKey);
              const isRequestedEdit = requestedEditId === item.id;
              const previewMarkup = imagePreview ? "" : buildCatalogPreviewMarkup(kitchenSvgMarkup, previewSlug, item.componentKey);
              const iconMarkup = item.componentKey ? "" : (ITEM_ICON_MARKUP[item.iconKey] || "");
              const editParams = new URLSearchParams();
              if (itemSearchQuery) editParams.set("itemSearch", itemSearchQuery);
              if (itemTypeFilter) editParams.set("itemType", itemTypeFilter);
              if (itemStatusFilter) editParams.set("itemStatus", itemStatusFilter);
              editParams.set("edit", item.id);
              const editHref = `/admin/kitchens/${kitchen.id}?${editParams.toString()}#item-${item.id}`;
              editParams.delete("edit");
              const closeQuery = editParams.toString();
              const closeHref = `/admin/kitchens/${kitchen.id}${closeQuery ? `?${closeQuery}` : ""}#item-${item.id}`;

              return (
                <article key={item.id} id={`item-${item.id}`} className="kitchen-catalog-item-card" style={isRequestedEdit ? highlightedCompactItemCardStyle : compactItemCardStyle}>
                  <div className="kitchen-catalog-item-card__summary" style={item.itemType === ItemType.COMPONENT ? compactSummaryStyle : compactSummaryCompactPreviewStyle}>
                    <div className="kitchen-catalog-item-card__main" style={compactSummaryMainStyle}>
                      <strong className="kitchen-catalog-item-card__title" style={{ fontSize: "1.05rem" }}>
                        <AdminLocalizedName
                          name={item.catalogArticle?.name || item.catalogService?.name || item.name}
                          nameDe={item.catalogArticle?.nameDe || item.catalogService?.nameDe || item.nameDe}
                        />
                      </strong>
                      <div className="kitchen-catalog-item-card__meta" style={subMetaStyle}>
                        <TypeBadge
                          label={(
                            <AdminText
                              i18nKey={ITEM_TYPE_FILTER_LABELS[item.itemType]?.key}
                              fallback={ITEM_TYPE_FILTER_LABELS[item.itemType]?.fallback || item.itemType}
                            />
                          )}
                        />
                        <span><AdminText i18nKey="kitchenDetailAdmin.itemCode" fallback="Item code" />: {item.code}</span>
                        <span><AdminText i18nKey="kitchenDetailAdmin.articleNo" fallback="Article No" />: {item.articleNumber || "-"}</span>
                        {item.blendeCode ? <span>Blende: {item.blendeCode}</span> : null}
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                    </div>
                    <KitchenCatalogPreview
                      markup={previewMarkup}
                      imagePreview={imagePreview}
                      componentKey={item.componentKey}
                      iconMarkup={iconMarkup}
                      slotLabel={slot?.label || item.name}
                      itemType={item.itemType}
                    />
                    <div className="kitchen-catalog-item-card__actions" style={{ ...actionRowStyle, justifyContent: "flex-end" }}>
                      <AdminStatusBadge status={item.isActive ? "ACTIVE" : "ARCHIVED"} />
                      <Link href={isRequestedEdit ? closeHref : editHref} scroll={false} style={editHintStyle}>
                        {isRequestedEdit
                          ? <AdminText i18nKey="kitchenDetailAdmin.close" fallback="Close" />
                          : <AdminText i18nKey="kitchenDetailAdmin.edit" fallback="Edit" />}
                      </Link>
                    </div>
                  </div>

                  {isRequestedEdit ? (
                  <form action={`/api/admin/items/${item.id}`} method="post" style={compactFormStyle}>
                    <AdminBlendePriceFields
                      totalPriceDefaultValue={String(item.price)}
                      priceStyle={compactInputStyle}
                      selectStyle={compactInputStyle}
                      catalogArticles={catalogArticleOptions}
                      catalogBlenden={catalogBlendeOptions}
                      catalogServices={catalogServiceOptions}
                      defaultArticleId={item.catalogArticleId || ""}
                      defaultBlendeId={item.catalogBlendeId || ""}
                      defaultBlendeQuantity={item.catalogBlendeQuantity || (item.catalogBlendeId ? 1 : "")}
                      defaultServiceId={item.catalogServiceId || ""}
                      currentBlendePrice={item.blendePrice == null ? null : Number(item.blendePrice)}
                    />

                    <input type="hidden" name="itemType" value={item.itemType} />
                    <input type="hidden" name="code" value={item.code} />
                    <input type="hidden" name="articleNumber" value={item.articleNumber || ""} />
                    <input type="hidden" name="name" value={item.name} />
                    <input type="hidden" name="nameDe" value={item.nameDe || ""} />
                    <input type="hidden" name="iconKey" value={item.iconKey || ""} />
                    <input type="hidden" name="colorKey" value={item.colorKey || ""} />
                    <input type="hidden" name="sortOrder" value={String(item.sortOrder)} />
                    <input type="hidden" name="infoText" value={item.infoText || ""} />

                    <section className="admin-kitchen-item-settings" aria-labelledby={`kitchen-settings-${item.id}`}>
                      <div className="admin-kitchen-item-settings__heading">
                        <h3 id={`kitchen-settings-${item.id}`}>
                          <AdminText i18nKey="kitchenDetailAdmin.kitchenSpecificSettings" fallback="Kitchen-specific settings" />
                        </h3>
                      </div>

                      {item.itemType === ItemType.COMPONENT && structureSlots.length ? (
                        <AdminComponentSlotPicker
                          name="componentKey"
                          labelI18nKey="kitchenDetailAdmin.kitchenPosition"
                          labelFallback="Kitchen position"
                          slots={structureSlots}
                          defaultValue={item.componentKey || ""}
                          occupiedByKey={occupiedByKey}
                          allowOccupiedKey={item.componentKey || ""}
                          compact
                          allowEmpty={false}
                        />
                      ) : (
                        <input type="hidden" name="componentKey" value={item.componentKey || ""} />
                      )}

                      <div className="admin-kitchen-item-settings__toggles">
                        <label className="admin-kitchen-item-setting-toggle">
                          <input type="checkbox" name="isLocked" value="true" defaultChecked={item.isLocked} />
                          <span>
                            <strong><AdminText i18nKey="kitchenDetailAdmin.lockedItem" fallback="Locked" /></strong>
                          </span>
                        </label>
                        <label className="admin-kitchen-item-setting-toggle">
                          <input type="checkbox" name="isActive" value="true" defaultChecked={item.isActive} />
                          <span>
                            <strong><AdminText i18nKey="kitchenDetailAdmin.activeItem" fallback="Active" /></strong>
                          </span>
                        </label>
                      </div>
                    </section>

                    {isClaimProductManaged ? (
                      <div className="admin-kitchen-product-info-source">
                        <div>
                          <strong><AdminText i18nKey="kitchenDetailAdmin.productInfoManagedInClaimProducts" fallback="Product Information is managed in Claim products" /></strong>
                          <span><AdminText i18nKey="kitchenDetailAdmin.defaultOvenCooktopManagedSeparately" fallback="The default oven and cooktop are maintained separately in the Catalog." /></span>
                        </div>
                        <Link
                          href="/admin/catalog/articles"
                          className="admin-kitchen-product-info-source__link"
                        >
                          <AdminText i18nKey="kitchenDetailAdmin.openClaimProducts" fallback="Open Claim products" />
                        </Link>
                      </div>
                    ) : item.catalogArticleId ? (
                      <div className="admin-kitchen-product-info-source">
                        <div>
                          <strong><AdminText i18nKey="kitchenDetailAdmin.productInfoManagedInCatalog" fallback="Product Information is managed in Catalog" /></strong>
                          <span>
                            {item.catalogArticle?.productInfoPdfPath
                              ? <AdminText i18nKey="kitchenDetailAdmin.catalogDocumentReady" fallback="Catalog document ready" />
                              : <AdminText i18nKey="kitchenDetailAdmin.noProductInfoForCatalogArticle" fallback="No Product Information has been added to this catalog article yet" />}
                          </span>
                        </div>
                        <Link
                          href={`/admin/catalog/articles?editArticle=${encodeURIComponent(item.catalogArticleId)}`}
                          className="admin-kitchen-product-info-source__link"
                        >
                          <AdminText i18nKey="kitchenDetailAdmin.openCatalogArticle" fallback="Open catalog article" />
                        </Link>
                      </div>
                    ) : (
                      <div className="admin-kitchen-product-info-source admin-kitchen-product-info-source--warning">
                        <div>
                          <strong><AdminText i18nKey="kitchenDetailAdmin.catalogLinkRequired" fallback="Catalog link required" /></strong>
                          <span><AdminText i18nKey="kitchenDetailAdmin.selectCatalogBeforeSaving" fallback="Select an article or service from Catalog before saving this item." /></span>
                        </div>
                        <Link
                          href="/admin/catalog/articles"
                          className="admin-kitchen-product-info-source__link"
                        >
                          <AdminText i18nKey="kitchenDetailAdmin.openCatalog" fallback="Open Catalog" />
                        </Link>
                      </div>
                    )}

                    <div style={compactFooterStyle}>
                      <div style={actionRowStyle}>
                        <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="kitchenDetailAdmin.saveItem" fallback="Save item" /></button>
                        <button type="submit" name="_intent" value="delete" style={secondaryButtonStyle}>
                          <AdminText i18nKey="kitchenDetailAdmin.deleteItem" fallback="Delete item" />
                        </button>
                      </div>
                    </div>
                  </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="kitchenDetailAdmin.addExtraItem" fallback="Add Catalog Item" />}
        >
          <details style={addItemDetailsStyle}>
            <summary style={addItemSummaryStyle}>
              <AdminText i18nKey="kitchenDetailAdmin.addExtraItem" fallback="Add Catalog Item" />
            </summary>
            <form action={`/api/admin/kitchens/${kitchen.id}/items`} method="post" style={addItemFormStyle}>
              <fieldset style={formGroupStyle}>
                <legend style={formGroupLegendStyle}><AdminText i18nKey="kitchenDetailAdmin.basicInfo" fallback="Basic Info" /></legend>
                <div style={formGridStyle}>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.itemType" fallback="Item type" />}>
                    <AdminSelect name="itemType" defaultValue={ItemType.ACCESSORY} style={inputStyle}>
                      {[ItemType.COMPONENT, ItemType.ACCESSORY, ItemType.SERVICE].map((itemType) => (
                        <option key={itemType} value={itemType}>
                          {itemType}
                        </option>
                      ))}
                    </AdminSelect>
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.name" fallback="Name (English)" />}>
                    <input name="name" style={inputStyle} required />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.nameDe" fallback="Name (German)" />}>
                    <input name="nameDe" style={inputStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.itemCode" fallback="Item code" />}>
                    <div style={fieldWithHelpStyle}>
                      <input name="code" placeholder="DISH-600-STD" list="admin-kitchen-item-code-options" style={inputStyle} required />
                      <span style={fieldHelpTextStyle}>
                        <AdminText
                          i18nKey="kitchenDetailAdmin.itemCodeHelp"
                          fallback="Use templates; add -01, -02 for repeated cabinets. Article numbers go in the article field."
                        />
                      </span>
                    </div>
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.articleNumber" fallback="Article number(s)" />}>
                    <input name="articleNumber" placeholder="A-EGSPV597210 + ZB60SG" style={inputStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.price" fallback="Price" />}>
                    <input name="price" defaultValue="0.00" style={inputStyle} required />
                  </FormField>
                  <label style={{ ...checkboxInlineStyle, alignSelf: "end" }}>
                    <input type="checkbox" name="isActive" value="true" defaultChecked />
                    <span><AdminText i18nKey="kitchenDetailAdmin.activeItem" fallback="Active" /></span>
                  </label>
                </div>
              </fieldset>

              <fieldset style={formGroupStyle}>
                <legend style={formGroupLegendStyle}><AdminText i18nKey="kitchenDetailAdmin.catalogLinks" fallback="Catalog links" /></legend>
                <div style={formGridStyle}>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.catalogArticle" fallback="Catalog article" />}>
                    <AdminSelect name="catalogArticleId" defaultValue="" style={inputStyle}>
                      <option value=""><AdminText i18nKey="kitchenDetailAdmin.noArticleLink" fallback="No article link" /></option>
                      {catalogArticleOptions.map((article) => (
                        <option key={article.id} value={article.id}>
                          {article.articleNumber} - {article.nameDe || article.name} ({article.formattedPrice})
                        </option>
                      ))}
                    </AdminSelect>
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.blende" fallback="Blende" />}>
                    <AdminSelect name="catalogBlendeId" defaultValue="" style={inputStyle}>
                      <option value=""><AdminText i18nKey="kitchenDetailAdmin.noIncludedBlende" fallback="No blende" /></option>
                      {catalogBlendeOptions.map((blende) => (
                        <option key={blende.id} value={blende.id}>
                          {blende.code} - {blende.nameDe || blende.name} ({blende.formattedPrice})
                        </option>
                      ))}
                    </AdminSelect>
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.quantity" fallback="Quantity" />}>
                    <input type="number" name="catalogBlendeQuantity" min="1" step="1" placeholder="1" style={inputStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.serviceCatalogLink" fallback="Service catalog link" />}>
                    <AdminSelect name="catalogServiceId" defaultValue="" style={inputStyle}>
                      <option value=""><AdminText i18nKey="kitchenDetailAdmin.noServiceLink" fallback="No service link" /></option>
                      {catalogServiceOptions.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.code} - {service.nameDe || service.name} ({service.formattedPrice})
                        </option>
                      ))}
                    </AdminSelect>
                  </FormField>
                </div>
              </fieldset>

              <fieldset style={formGroupStyle}>
                <legend style={formGroupLegendStyle}><AdminText i18nKey="kitchenDetailAdmin.display" fallback="Display" /></legend>
                <div style={formGridStyle}>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.iconKey" fallback="Icon key" />}>
                    <IconKeySelect />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.colorKey" fallback="Color key" />}>
                    <input name="colorKey" style={inputStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.sortOrder" fallback="Sort order" />}>
                    <input name="sortOrder" defaultValue="0" style={inputStyle} />
                  </FormField>
                  <label style={{ ...checkboxInlineStyle, alignSelf: "end" }}>
                    <input type="checkbox" name="isLocked" value="true" />
                    <span><AdminText i18nKey="kitchenDetailAdmin.lockedItem" fallback="Locked" /></span>
                  </label>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.infoText" fallback="Info text" />} wide>
                    <textarea name="infoText" rows={2} style={textareaStyle} />
                  </FormField>
                </div>
                {structureSlots.length ? (
                  <div style={componentSlotCreateStyle}>
                    <AdminComponentSlotPicker
                      name="componentKey"
                      slots={structureSlots}
                      occupiedByKey={occupiedByKey}
                      helperText="Required only when item type is COMPONENT. Accessories and services ignore this field."
                    />
                  </div>
                ) : (
                  <p style={componentSlotHelpStyle}>
                    Components can be created for this kitchen without a position because this kitchen has no predefined layout slots yet.
                  </p>
                )}
              </fieldset>

              <div className="admin-kitchen-product-info-source">
                <div>
                  <strong><AdminText i18nKey="kitchenDetailAdmin.productInfoManagedInCatalog" fallback="Product Information is managed in Catalog" /></strong>
                  <span><AdminText i18nKey="kitchenDetailAdmin.chooseCatalogThenEditProductInfo" fallback="Choose a catalog article, then add or edit its PDF and chatbot data in Catalog." /></span>
                </div>
                <Link
                  href="/admin/catalog/articles"
                  className="admin-kitchen-product-info-source__link"
                >
                  <AdminText i18nKey="kitchenDetailAdmin.openCatalog" fallback="Open Catalog" />
                </Link>
              </div>

              <div>
                <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="kitchenDetailAdmin.createExtraItem" fallback="Create Item" /></button>
              </div>
            </form>
          </details>
        </AdminSection>
        <datalist id="admin-kitchen-item-code-options">
          {itemCodeOptions.map((item) => (
            <option key={item.code} value={item.code} label={item.label} />
          ))}
        </datalist>
        <style>{`
          @media (max-width: 700px) {
            .kitchen-catalog-items__filters {
              grid-template-columns: 1fr !important;
              gap: 10px !important;
            }

            .kitchen-catalog-items__filters > div:last-child {
              width: 100%;
              display: grid !important;
              grid-template-columns: 1fr 1fr;
              gap: 8px !important;
              align-self: stretch !important;
            }

            .kitchen-catalog-items__filters button,
            .kitchen-catalog-items__filters a {
              width: 100%;
              justify-content: center;
              min-height: 44px;
            }

            .kitchen-catalog-item-card {
              border-radius: 8px !important;
            }

            .kitchen-catalog-item-card__summary {
              display: grid !important;
              grid-template-columns: 1fr !important;
              gap: 12px !important;
              align-items: stretch !important;
              padding: 14px !important;
            }

            .kitchen-catalog-item-card__title {
              display: block;
              font-size: 1rem !important;
              line-height: 1.25;
              overflow-wrap: anywhere;
            }

            .kitchen-catalog-item-card__meta {
              display: grid !important;
              grid-template-columns: 1fr !important;
              gap: 5px !important;
              color: var(--app-text-muted);
              font-size: 12px !important;
              line-height: 1.35;
            }

            .kitchen-catalog-item-card__meta > span {
              min-width: 0;
              overflow-wrap: anywhere;
            }

            .kitchen-catalog-preview,
            .kitchen-catalog-preview--icon,
            .kitchen-catalog-preview--empty {
              width: 100% !important;
              min-width: 0 !important;
              max-width: none !important;
              box-sizing: border-box;
            }

            .kitchen-catalog-preview {
              min-height: 0 !important;
              overflow: visible;
            }

            .kitchen-catalog-preview__svg {
              width: 100% !important;
              max-height: none;
              overflow: visible;
            }

            .kitchen-catalog-preview__svg svg {
              width: 100% !important;
              height: auto !important;
              display: block;
            }

            .kitchen-catalog-preview--icon {
              min-height: 72px !important;
              justify-items: start !important;
              padding: 12px !important;
            }

            .kitchen-catalog-item-card__actions {
              width: 100%;
              justify-content: space-between !important;
              align-items: center !important;
              gap: 10px !important;
              padding-top: 2px;
            }

            .kitchen-catalog-item-card form {
              padding: 12px !important;
            }

            .kitchen-catalog-item-card form > div:first-child {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}

const compactItemCardStyle = {
  ...itemCardStyle,
  padding: 0,
  gap: 0,
  overflow: "hidden",
};

const kitchenDetailsFormStyle = {
  ...formGridStyle,
  gap: 12,
};

const contractNoticeStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "var(--color-card)",
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  boxShadow: "var(--app-shadow-soft)",
};

const contractNoticeTextStyle = {
  margin: 0,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  color: "var(--app-text-muted)",
  lineHeight: 1.5,
};

const catalogFiltersStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  alignItems: "end",
};

const addItemDetailsStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "var(--app-surface)",
  overflow: "hidden",
};

const addItemSummaryStyle = {
  width: "fit-content",
  listStyle: "none",
  cursor: "pointer",
  margin: 16,
  border: "1px solid var(--app-border-strong)",
  borderRadius: 8,
  minHeight: 50,
  padding: "13px 18px",
  background: "var(--color-card)",
  color: "var(--app-accent)",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  boxShadow: "var(--app-shadow-soft)",
};

const addItemFormStyle = {
  display: "grid",
  gap: 16,
  padding: "0 16px 16px",
};

const formGroupStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  padding: "16px",
  margin: 0,
  display: "grid",
  gap: 12,
  background: "var(--color-card)",
};

const formGroupLegendStyle = {
  padding: "0 8px",
  color: "var(--app-text)",
  fontWeight: 800,
};

const checkboxInlineStyle = {
  minHeight: 52,
  display: "flex",
  gap: 8,
  alignItems: "center",
  color: "var(--app-text)",
  fontWeight: 700,
};

const fieldWithHelpStyle = {
  display: "grid",
  gap: 6,
};

const fieldHelpTextStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  lineHeight: 1.35,
  fontWeight: 700,
};

const componentSlotCreateStyle = {
  display: "grid",
  gap: 8,
};

const componentSlotHelpStyle = {
  ...mutedTextStyle,
  fontSize: 13,
};

const advancedDetailsStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "rgba(255,255,255,0.62)",
  overflow: "hidden",
};

const advancedSummaryStyle = {
  listStyle: "none",
  cursor: "pointer",
  padding: "12px 14px",
  color: "var(--app-accent)",
  fontWeight: 800,
};

const advancedFieldsStyle = {
  display: "grid",
  gap: 12,
  padding: "0 14px 14px",
};

const productInfoGroupsStyle = {
  display: "grid",
  gap: 12,
};

const productInfoGroupStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  padding: "12px",
  margin: 0,
  display: "grid",
  gap: 10,
  background: "rgba(255,255,255,0.72)",
};

const productInfoGroupLegendStyle = {
  padding: "0 6px",
  color: "var(--app-text)",
  fontSize: "0.92rem",
  fontWeight: 800,
};

const productInfoHelpTextStyle = {
  ...mutedTextStyle,
  fontSize: 13,
};

const productInfoFieldsStyle = {
  display: "grid",
  gap: 10,
};

const productPathFieldStyle = {
  display: "grid",
  gap: 8,
  color: "var(--app-text)",
  fontWeight: 700,
};

const productPathLabelStyle = {
  display: "grid",
  gap: 8,
};

const productPathMetaStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  fontSize: 12,
  lineHeight: 1.3,
};

const productPathAddedStyle = {
  color: "var(--app-success-text)",
  fontWeight: 800,
};

const productPathMissingStyle = {
  color: "var(--app-text-muted)",
  fontWeight: 800,
};

const productPathLinkStyle = {
  color: "var(--app-accent)",
  fontWeight: 800,
  textDecoration: "underline",
  textUnderlineOffset: 2,
};

const chatbotReadinessRowStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  fontSize: 12,
};

const chatbotReadinessLabelStyle = {
  color: "var(--app-text-muted)",
  fontWeight: 800,
};

const chatbotReadyStyle = {
  color: "var(--app-success-text)",
  fontWeight: 900,
};

const chatbotPartialStyle = {
  color: "var(--app-accent)",
  fontWeight: 900,
};

const chatbotMissingStyle = {
  color: "var(--app-text-muted)",
  fontWeight: 900,
};

const productInfoNoticeMutedStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
};

const productInfoNoticeSubtleStyle = {
  margin: 0,
  color: "var(--app-accent)",
  fontSize: 12,
  fontWeight: 800,
};

const productInfoNoticeWarningStyle = {
  margin: 0,
  color: "var(--app-danger-text)",
  fontSize: 12,
  fontWeight: 800,
};

const catalogPanelStyle = {
  ...itemCardStyle,
  gap: 14,
  alignContent: "start",
};

const catalogDisclosureStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "var(--app-surface)",
  boxShadow: "var(--app-shadow-soft)",
  overflow: "hidden",
};

const catalogDisclosureSummaryStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: "16px 24px",
  cursor: "pointer",
  listStyle: "none",
};

const catalogDisclosureButtonStyle = {
  ...secondaryButtonStyle,
  flex: "0 0 auto",
};

const catalogDisclosureBodyStyle = {
  borderTop: "1px solid var(--app-border)",
  padding: 24,
};

const catalogDownloadLinkStyle = {
  ...secondaryButtonStyle,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  width: "fit-content",
};

const catalogHelpTextStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const highlightedCompactItemCardStyle = {
  ...compactItemCardStyle,
  border: "1px solid rgba(143, 62, 44, 0.28)",
  boxShadow: "0 18px 36px rgba(143, 62, 44, 0.12)",
  background: "linear-gradient(180deg, rgba(255,248,242,0.98), rgba(255,255,255,0.98))",
};

const compactSummaryStyle = {
  ...itemHeaderStyle,
  listStyle: "none",
  cursor: "pointer",
  padding: "14px 16px",
  margin: 0,
  display: "grid",
  gap: 14,
  gridTemplateColumns: "minmax(0, 1fr) minmax(180px, 220px) auto",
  alignItems: "center",
};

const compactSummaryCompactPreviewStyle = {
  ...compactSummaryStyle,
  gridTemplateColumns: "minmax(0, 1fr) 96px auto",
  alignItems: "center",
};

const compactSummaryMainStyle = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const compactFormStyle = {
  display: "grid",
  gap: 8,
  padding: "0 14px 12px",
  borderTop: "1px solid var(--app-border)",
};

const compactTopGridStyle = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "start",
};

const compactComponentRowStyle = {
  display: "grid",
  gap: 6,
  alignItems: "start",
};

const compactInputStyle = {
  ...inputStyle,
  minHeight: 38,
  padding: "6px 10px",
  fontSize: "0.92rem",
};

const compactTextareaStyle = {
  ...textareaStyle,
  minHeight: 42,
  padding: "6px 10px",
  fontSize: "0.92rem",
  lineHeight: 1.35,
};

const compactFooterStyle = {
  ...checkboxRowStyle,
  justifyContent: "flex-end",
  gap: 10,
};

const editHintStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const previewWrapStyle = {
  minWidth: 180,
  maxWidth: 220,
  padding: 8,
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,240,232,0.76))",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
};

const previewSvgStyle = {
  width: "100%",
  lineHeight: 0,
};

const previewImagePlanStyle = {
  position: "relative",
  width: "100%",
  aspectRatio: "842 / 595",
  overflow: "hidden",
  borderRadius: 8,
  lineHeight: 0,
};

const previewImageStyle = {
  position: "absolute",
  objectFit: "contain",
  display: "block",
};

const previewImageOverlayStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
};

const previewIconWrapStyle = {
  width: 96,
  minWidth: 96,
  maxWidth: 96,
  padding: 4,
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,240,232,0.76))",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  minHeight: 64,
  display: "grid",
  placeItems: "center",
  color: "var(--app-accent)",
};

const previewIconStyle = {
  width: 26,
  height: 26,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

const previewEmptyStyle = {
  ...previewWrapStyle,
  display: "grid",
  placeItems: "center",
  minHeight: 96,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
};

const previewEmptyCompactStyle = {
  ...previewIconWrapStyle,
  color: "var(--app-text-muted)",
  fontSize: 10,
  fontWeight: 700,
};
