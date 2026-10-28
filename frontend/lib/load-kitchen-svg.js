import { promises as fs } from "fs";
import path from "path";
import { AB_105777_LAYOUT_ALIAS_SLUGS } from "./ab-105777-layout.js";
import { AB_105779_LAYOUT_ALIAS_SLUGS } from "./ab-105779-layout.js";

function normalizeAssetPaths(input) {
  return input
    .replaceAll('src="img/', 'src="/img/')
    .replaceAll("src='img/", "src='/img/")
    .replaceAll('"img/', '"/img/')
    .replaceAll("'img/", "'/img/");
}

const SVG_BY_SLUG = {
  ...Object.fromEntries([
    "ab-105846", "ab-105849", "ab-105852", "ab-105855", "ab-105858", "ab-105861",
  ].map((slug) => [slug, path.join(process.cwd(), "public", "plans", "AB 105846-view.svg")])),
  "ab-105804": path.join(process.cwd(), "public", "plans", "670 105804.svg"),
  "ab-105803": path.join(process.cwd(), "public", "plans", "670 105803.svg"),
  "ab-105793": path.join(process.cwd(), "public", "plans", "AB 105793.svg"),
  "ab-105796": path.join(process.cwd(), "public", "plans", "AB 105796.svg"),
  "ab-105799": path.join(process.cwd(), "public", "plans", "AB 105799.svg"),
  "ab-105802": path.join(process.cwd(), "public", "plans", "AB 105802.svg"),
  "ab-105792": path.join(process.cwd(), "public", "plans", "670 105792.svg"),
  "ab-105795": path.join(process.cwd(), "public", "plans", "670 105795.svg"),
  "ab-105798": path.join(process.cwd(), "public", "plans", "670 105798.svg"),
  "ab-105801": path.join(process.cwd(), "public", "plans", "670 105801.svg"),
  "ab-105791": path.join(process.cwd(), "public", "plans", "670 105791.svg"),
  "ab-105794": path.join(process.cwd(), "public", "plans", "670 105794.svg"),
  "ab-105797": path.join(process.cwd(), "public", "plans", "670 105797.svg"),
  "ab-105800": path.join(process.cwd(), "public", "plans", "670 105800.svg"),
  ...Object.fromEntries(AB_105779_LAYOUT_ALIAS_SLUGS.map((slug) => [
    slug, path.join(process.cwd(), "public", "plans", "AB 105779.svg"),
  ])),
  "ab-105789": path.join(process.cwd(), "public", "plans", "670 105789.svg"),
  "ab-105790": path.join(process.cwd(), "public", "plans", "AB 105790.svg"),
  ...Object.fromEntries(AB_105777_LAYOUT_ALIAS_SLUGS.map((slug) => [
    slug, path.join(process.cwd(), "public", "plans", "AB 105777.svg"),
  ])),
  "ab-105778": path.join(process.cwd(), "public", "plans", "670 105778.svg"),
  "ab-105781": path.join(process.cwd(), "public", "plans", "670 105778.svg"),
  "ab-105784": path.join(process.cwd(), "public", "plans", "670 105778.svg"),
  "ab-105787": path.join(process.cwd(), "public", "plans", "670 105778.svg"),
  "ab-104332": path.join(process.cwd(), "public", "plans", "670 104332.svg"),
  "ab-104296": path.join(process.cwd(), "public", "plans", "670 104296.svg"),
  "burger-103898": path.join(process.cwd(), "public", "plans", "670 103898.svg"),
  "kitchen-model-b": path.join(process.cwd(), "kitchen-svgs", "active", "kitchen-model-b.svg"),
  "kitchen-model-c": path.join(process.cwd(), "kitchen-svgs", "active", "kitchen-model-c.svg"),
  "l-kitchen-new": path.join(process.cwd(), "kitchen-svgs", "active", "l-kitchen-new.svg"),
  "l-shaped-kitchen": path.join(process.cwd(), "kitchen-svgs", "active", "l-shaped-kitchen.svg"),
  "ab-105808": path.join(process.cwd(), "public", "plans", "AB 105808.svg"),
  "ab-105762": path.join(process.cwd(), "public", "plans", "AB 105762-63.svg"),
  "ab-105766": path.join(process.cwd(), "public", "plans", "AB 105762-63.svg"),
  "ab-105770": path.join(process.cwd(), "public", "plans", "AB 105762-63.svg"),
  "ab-105774": path.join(process.cwd(), "public", "plans", "AB 105762-63.svg"),
  "ab-105763": path.join(process.cwd(), "public", "plans", "AB 105759.svg"),
  "ab-105767": path.join(process.cwd(), "public", "plans", "AB 105759.svg"),
  "ab-105771": path.join(process.cwd(), "public", "plans", "AB 105759.svg"),
  "ab-105845": path.join(process.cwd(), "public", "plans", "AB 105845.svg"),
  "ab-105847": path.join(process.cwd(), "public", "plans", "AB 105847.svg"),
  "ab-105850": path.join(process.cwd(), "public", "plans", "AB 105847.svg"),
  "ab-105853": path.join(process.cwd(), "public", "plans", "AB 105847.svg"),
  "ab-105856": path.join(process.cwd(), "public", "plans", "AB 105847.svg"),
  "ab-105859": path.join(process.cwd(), "public", "plans", "AB 105847.svg"),
  "ab-105862": path.join(process.cwd(), "public", "plans", "AB 105847.svg"),
  "ab-105848": path.join(process.cwd(), "public", "plans", "AB 105845.svg"),
  "ab-105851": path.join(process.cwd(), "public", "plans", "AB 105845.svg"),
  "ab-105854": path.join(process.cwd(), "public", "plans", "AB 105845.svg"),
  "ab-105857": path.join(process.cwd(), "public", "plans", "AB 105845.svg"),
  "ab-105860": path.join(process.cwd(), "public", "plans", "AB 105845.svg"),
  "105845-modul-2": path.join(process.cwd(), "public", "plans", "AB 105845.svg"),
  "test-3d-kitchen": path.join(process.cwd(), "kitchen-svgs", "active", "test-3d-kitchen.svg"),
};

function resolveAbPlanSvgPath(slug) {
  const match = String(slug || "").trim().toLowerCase().match(/^ab-(\d{6})$/);
  if (!match) {
    return "";
  }

  return path.join(process.cwd(), "public", "plans", `AB ${match[1]}.svg`);
}

async function loadSvgFromFile(filePath) {
  return normalizeAssetPaths((await fs.readFile(filePath, "utf8")).trim());
}

async function loadLegacySvgMarkup() {
  const htmlPath = path.join(process.cwd(), "index.html");
  const rawHtml = await fs.readFile(htmlPath, "utf8");
  const match = rawHtml.match(/<div id="kitchen-svg-wrapper">[\s\S]*?(<svg[\s\S]*?<\/svg>)[\s\S]*?<\/div>/i);

  if (!match?.[1]) {
    throw new Error("Kitchen SVG markup not found in legacy document.");
  }

  return normalizeAssetPaths(match[1].trim());
}

export async function loadKitchenSvgMarkup(slug) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const svgPath = SVG_BY_SLUG[normalizedSlug];
  if (svgPath) {
    return loadSvgFromFile(svgPath);
  }

  const abPlanSvgPath = resolveAbPlanSvgPath(normalizedSlug);
  if (abPlanSvgPath) {
    try {
      await fs.access(abPlanSvgPath);
      return loadSvgFromFile(abPlanSvgPath);
    } catch {
      // Fall back to the legacy drawing for older slugs that do not have a plan asset.
    }
  }

  return loadLegacySvgMarkup();
}
