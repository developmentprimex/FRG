import { AB_105803_HOTSPOTS, AB_105803_LIGHT_DETAILS } from "./ab-105803-plan.js";
import { AB_105743_FAUCET_POINTS } from "./ab-105743-fixtures.js";
// Vector plans (rendered from the source PDFs via docs/render-plan-svg.py) so the drawing
// stays razor-sharp at any zoom. The pixel-perfect hotspot overlay sits on top unchanged
// (the SVG keeps the PDF's aspect ratio, so the %-based boxes still line up exactly).
import { AB_104332_HOTSPOTS } from './ab-104332-plan.js';
import { AB_104296_HOTSPOTS } from './ab-104296-plan.js';
import { AB_105789_HOTSPOTS, AB_105789_LIGHT_DETAILS } from './ab-105789-plan.js';
import { AB_105804_HOTSPOTS, AB_105804_LIGHT_DETAILS } from './ab-105804-plan.js';
import { AB_105790_HOTSPOTS, AB_105790_LIGHT_DETAILS } from './ab-105790-plan.js';
import { AB_105793_HOTSPOTS, AB_105793_LIGHT_DETAILS } from './ab-105793-plan.js';
import { AB_105796_HOTSPOTS, AB_105796_LIGHT_DETAILS } from './ab-105796-plan.js';
import { AB_105799_HOTSPOTS, AB_105799_LIGHT_DETAILS } from './ab-105799-plan.js';
import { AB_105802_HOTSPOTS, AB_105802_LIGHT_DETAILS } from './ab-105802-plan.js';
import { AB_105792_HOTSPOTS, AB_105792_LIGHT_DETAILS } from './ab-105792-plan.js';
import { AB_105795_HOTSPOTS, AB_105795_LIGHT_DETAILS } from './ab-105795-plan.js';
import { AB_105798_HOTSPOTS, AB_105798_LIGHT_DETAILS } from './ab-105798-plan.js';
import { AB_105801_HOTSPOTS, AB_105801_LIGHT_DETAILS } from './ab-105801-plan.js';
import { AB_105791_HOTSPOTS, AB_105791_LIGHT_DETAILS } from './ab-105791-plan.js';
import { AB_105794_HOTSPOTS, AB_105794_LIGHT_DETAILS } from './ab-105794-plan.js';
import { AB_105797_HOTSPOTS, AB_105797_LIGHT_DETAILS } from './ab-105797-plan.js';
import { AB_105800_HOTSPOTS, AB_105800_LIGHT_DETAILS } from './ab-105800-plan.js';
import { AB_105777_LAYOUT_ALIAS_SLUGS } from './ab-105777-layout.js';
import { AB_105779_HOTSPOTS } from './ab-105779-plan.js';
import { AB_105779_LAYOUT_ALIAS_SLUGS } from './ab-105779-layout.js';

export const PLAN_IMAGE_BY_SLUG = {
  "ab-105804": "/plans/670%20105804-smooth.png",
  "ab-105793": "/plans/AB%20105793.svg",
  "ab-105796": "/plans/AB%20105796.svg",
  "ab-105799": "/plans/AB%20105799.svg",
  "ab-105802": "/plans/AB%20105802.svg",
  "ab-105792": "/plans/670%20105792.svg",
  "ab-105795": "/plans/670%20105795.svg",
  "ab-105798": "/plans/670%20105798.svg",
  "ab-105801": "/plans/670%20105801.svg",
  "ab-105791": "/plans/670%20105791.svg",
  "ab-105794": "/plans/670%20105794.svg",
  "ab-105797": "/plans/670%20105797.svg",
  "ab-105800": "/plans/670%20105800.svg",
  "ab-105803": "/plans/670%20105803.svg",
  "ab-105779": "/plans/AB%20105779.svg",
  "ab-105789": "/plans/670%20105789-smooth.png",
  "ab-105790": "/plans/AB%20105790.svg",
  "ab-105777": "/plans/AB%20105777.svg",
  "ab-104332": "/plans/670%20104332.svg",
  "ab-104296": "/plans/670%20104296.svg",
  "burger-103898": "/plans/670%20103898.svg",
  "ab-105747": "/plans/AB%20105747.svg",
  "ab-105758": "/plans/AB%20105758.svg",
  "ab-105750": "/plans/AB%20105747.svg",
  "ab-105753": "/plans/AB%20105747.svg",
  "ab-105756": "/plans/AB%20105747.svg",
  "ab-105806": "/plans/AB%20105806.svg",
  "ab-105807": "/plans/AB%20105807.svg",
  "ab-105808": "/plans/AB%20105808.svg",
  // JPG (not SVG) so the stage matches the PDF/hotspot render 1:1 — the PDF-derived SVG
  // can look different in some browsers when loaded as <img>.
  "ab-105805": "/jpg/AB%20105805_page-0001.jpg",
  "ab-105809": "/jpg/AB%20105805_page-0001.jpg",
  "ab-105813": "/jpg/AB%20105805_page-0001.jpg",
  "ab-105817": "/jpg/AB%20105805_page-0001.jpg",
  "ab-105834": "/jpg/AB%20105834_page-0001.jpg",
  "ab-104968": "/plans/AB%20104968-smooth.png",
  "ab-105837": "/jpg/AB%20105837_page-0001.jpg",
  "ab-105840": "/jpg/AB%20105837_page-0001.jpg",
  "ab-105843": "/jpg/AB%20105837_page-0001.jpg",
  "ab-105825": "/plans/AB%20105825.svg",
  "ab-105828": "/plans/AB%20105825.svg",
  "ab-105831": "/plans/AB%20105831.svg",
  "ab-105810": "/plans/AB%20105810.svg",
  "ab-105812": "/plans/AB%20105812.svg",
  "ab-105814": "/plans/AB%20105814.svg",
  "ab-105815": "/plans/AB%20105815.svg",
  "ab-105816": "/plans/AB%20105816.svg",
  "ab-105818": "/plans/AB%20105818.svg",
  "ab-105819": "/plans/AB%20105819.svg",
  "ab-105820": "/plans/AB%20105820.svg",
  "ab-105821": "/plans/AB%20105821.svg",
  "ab-105824": "/plans/AB%20105821.svg",
  "ab-105822": "/plans/AB%20105825.svg",
  "ab-105823": "/plans/AB%20105822.svg",
  "ab-105829": "/plans/AB%20105822.svg",
  "ab-105832": "/plans/AB%20105822.svg",
  "ab-105826": "/plans/AB%20105826.svg",
  "ab-105827": "/plans/AB%20105827.svg",
  "ab-105830": "/plans/AB%20105827.svg",
  "ab-105835": "/plans/AB%20105835.svg",
  "ab-105836": "/plans/AB%20105836.svg",
  "ab-105842": "/plans/AB%20105842.svg",
  "ab-105839": "/plans/AB%20105842.svg",
  "ab-105845": "/plans/AB%20105845.svg",
  "ab-105847": "/plans/AB%20105847.svg",
  "ab-105850": "/plans/AB%20105847.svg",
  "ab-105853": "/plans/AB%20105847.svg",
  "ab-105856": "/plans/AB%20105847.svg",
  "ab-105859": "/plans/AB%20105847.svg",
  "ab-105862": "/plans/AB%20105847.svg",
  "ab-105848": "/plans/AB%20105845.svg",
  "ab-105851": "/plans/AB%20105845.svg",
  "ab-105854": "/plans/AB%20105845.svg",
  "ab-105857": "/plans/AB%20105845.svg",
  "ab-105860": "/plans/AB%20105845.svg",
  "ab-105846": "/plans/AB%20105846.svg",
  "ab-109873": "/plans/AB%20109873.svg",
  "ab-109874": "/plans/AB%20109874.svg",
  "ab-109955": "/plans/AB%20109955.svg",
  "ab-110401": "/plans/AB%20110401.svg",
  "ab-110402": "/plans/AB%20110402.svg",
  "105845-modul-2": "/plans/AB%20105845.svg",
  "ab-105833": "/plans/AB%20105833.svg",
  "ab-105841": "/plans/AB%20105841.svg",
  "ab-105838": "/plans/AB%20105841.svg",
  "ab-105844": "/plans/AB%20105841.svg",
  "ab-105811": "/plans/AB%20105811.svg",
  "ab-105733": "/plans/AB%20105733.svg",
  "ab-105736": "/plans/AB%20105733.svg",
  "ab-105739": "/plans/AB%20105733.svg",
  "ab-105742": "/plans/AB%20105733.svg",
  "ab-105732": "/plans/AB%20105732.svg",
  "ab-105734": "/plans/AB%20104968-smooth.png",
  "ab-105735": "/plans/AB%20105732.svg",
  "ab-105737": "/plans/AB%20104968-smooth.png",
  "ab-105738": "/plans/AB%20105732.svg",
  "ab-105740": "/plans/AB%20104968-smooth.png",
  "ab-105741": "/plans/AB%20105732.svg",
  "ab-105743": "/plans/AB%20105743-smooth.png",
  "ab-105744": "/plans/AB%20105744.svg",
  "ab-105760": "/plans/AB%20105760-61.svg",
  "ab-105761": "/plans/AB%20105761-62.svg",
  "ab-105765": "/plans/AB%20105761-62.svg",
  "ab-105769": "/plans/AB%20105761-62.svg",
  "ab-105764": "/plans/AB%20105760-61.svg",
  "ab-105768": "/plans/AB%20105760-61.svg",
  "ab-105772": "/plans/AB%20105760-61.svg",
  "ab-105776": "/plans/AB%20105776%20-%2066.svg",
  "ab-105778": "/plans/670%20105778.svg",
  "ab-105775": "/plans/AB%20105775%20-%2064.svg?v=4",
  "ab-105745": "/plans/AB%20105748.svg",
  "ab-105746": "/plans/AB%20105746.svg",
  "ab-105748": "/plans/AB%20105748.svg",
  "ab-105749": "/plans/AB%20105746.svg",
  "ab-105751": "/plans/AB%20105748.svg",
  "ab-105752": "/plans/AB%20105746.svg",
  "ab-105754": "/plans/AB%20105748.svg",
  "ab-105755": "/plans/AB%20105746.svg",
  "ab-105757": "/plans/AB%20105757.svg",
  "ab-105759": "/plans/AB%20105759.svg",
  "ab-105762": "/plans/AB%20105762-63.svg?v=4",
  "ab-110140": "/plans/AB%20110140.svg",
  "ab-110510": "/plans/AB%20110510.svg",
  "ab-111539": "/plans/AB%20111539.svg",
  "ab-101246": "/plans/670%20101246.svg",
  "108134-modul-1": "/plans/108134%20MODUL%201.svg",
};

// Most legacy drawings use the 842 x 595 CAD sheet. Keep native dimensions for
// plans exported on a different page size so neither the artwork nor hotspots stretch.
export const PLAN_IMAGE_SOURCE_SIZE_BY_SLUG = {
  "ab-105804": { width: 842, height: 595 },
  "ab-105793": { width: 842, height: 595 },
  "ab-105796": { width: 842, height: 595 },
  "ab-105799": { width: 842, height: 595 },
  "ab-105802": { width: 842, height: 595 },
  "ab-105792": { width: 842, height: 595 },
  "ab-105795": { width: 842, height: 595 },
  "ab-105798": { width: 842, height: 595 },
  "ab-105801": { width: 842, height: 595 },
  "ab-105791": { width: 842, height: 595 },
  "ab-105794": { width: 842, height: 595 },
  "ab-105797": { width: 842, height: 595 },
  "ab-105800": { width: 842, height: 595 },
  "ab-105803": { width: 842, height: 595 },
  "ab-105779": { width: 842, height: 595 },
  "ab-105789": { width: 842, height: 595 },
  "ab-105790": { width: 842, height: 595 },
  "ab-105777": { width: 842, height: 595 },
  "ab-105778": { width: 842, height: 595 },
  "ab-104332": { width: 842, height: 595 },
  "ab-104296": { width: 842, height: 595 },
  "burger-103898": { width: 842, height: 595 },
  "ab-109873": { width: 842, height: 595 },
  "ab-109874": { width: 842, height: 595 },
  "ab-109955": { width: 842, height: 595 },
  "ab-110401": { width: 842, height: 595 },
  "ab-110402": { width: 842, height: 595 },
  "ab-111539": { width: 842, height: 595 },
  "ab-101246": { width: 842, height: 595 },
  "ab-105845": { width: 800, height: 600 },
  "ab-105847": { width: 800, height: 600 },
  "ab-105850": { width: 800, height: 600 },
  "ab-105853": { width: 800, height: 600 },
  "ab-105856": { width: 800, height: 600 },
  "ab-105859": { width: 800, height: 600 },
  "ab-105862": { width: 800, height: 600 },
  "ab-105848": { width: 800, height: 600 },
  "ab-105851": { width: 800, height: 600 },
  "ab-105854": { width: 800, height: 600 },
  "ab-105857": { width: 800, height: 600 },
  "ab-105860": { width: 800, height: 600 },
  "105845-modul-2": { width: 800, height: 600 },
};

// Tight source-image clips for appliance details that must remain light grey above
// selection tints. Keep cabinet outlines, doors, handles, and seams outside these clips.
const AB_105845_DISHWASHER_LIGHT_DETAILS = [
  { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 87.0625, top: 65.83333, width: 6.5, height: 3.53334 },
];

export const PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG = {
  "ab-105804": AB_105804_LIGHT_DETAILS,
  "ab-105793": AB_105793_LIGHT_DETAILS,
  "ab-105796": AB_105796_LIGHT_DETAILS,
  "ab-105799": AB_105799_LIGHT_DETAILS,
  "ab-105802": AB_105802_LIGHT_DETAILS,
  "ab-105792": AB_105792_LIGHT_DETAILS,
  "ab-105795": AB_105795_LIGHT_DETAILS,
  "ab-105798": AB_105798_LIGHT_DETAILS,
  "ab-105801": AB_105801_LIGHT_DETAILS,
  "ab-105791": AB_105791_LIGHT_DETAILS,
  "ab-105794": AB_105794_LIGHT_DETAILS,
  "ab-105797": AB_105797_LIGHT_DETAILS,
  "ab-105800": AB_105800_LIGHT_DETAILS,
  "ab-105803": AB_105803_LIGHT_DETAILS,
  "ab-105779": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 56.208, top: 69.570, width: 8.495, height: 8.783, persistWhenSelected: true, sourceLineworkOpacity: 0.32 },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 59.671021, top: 80.759664, width: 1.683, height: 3.771428, persistWhenSelected: true, sourceLineworkOpacity: 0.32 },
  ],
  "ab-105789": AB_105789_LIGHT_DETAILS,
  "ab-105790": AB_105790_LIGHT_DETAILS,
  "ab-105777": [
    {"componentKey": "dishwasher-base", "left": 87.030879, "top": 70.033613, "width": 11.223278, "height": 6.302521, "key": "dishwasher-basket", "persistWhenSelected": true},
    {"componentKey": "dishwasher-base", "left": 91.581948, "top": 79.02521, "width": 2.266033, "height": 2.92437, "key": "dishwasher-gs-mark", "persistWhenSelected": true},
  ],
  "ab-104332": [
    { key: "customer-dishwasher-basket", componentKey: "dishwasher-front", left: 71.483373, top: 70.047059, width: 8.641331, height: 8.921008, persistWhenSelected: true },
    { key: "customer-dishwasher-gs-mark", componentKey: "dishwasher-front", left: 74.947743, top: 82.531092, width: 1.814727, height: 3.89916, persistWhenSelected: true },
  ],
  "ab-104296": [
    { key: "customer-dishwasher-basket", componentKey: "dishwasher-front", left: 54.9, top: 72.5, width: 8.25, height: 8.4, persistWhenSelected: true },
    { key: "customer-dishwasher-gs-mark", componentKey: "dishwasher-front", left: 58.05, top: 83.25, width: 1.95, height: 3.9, persistWhenSelected: true },
  ],
  "ab-101246": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 35.6295, top: 77.1429, width: 12.9454, height: 7.2269, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 40.6176, top: 88.0672, width: 2.9691, height: 3.6975, persistWhenSelected: true },
  ],
  "ab-105760": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 24.855107, top: 76.100840, width: 14.551069, height: 8.047059, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 30.783848, top: 87.717647, width: 2.878860, height: 3.731092, persistWhenSelected: true },
  ],
  "ab-105761": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 58.845606, top: 76.100840, width: 14.437055, height: 8.047059, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 64.760095, top: 87.717647, width: 2.878860, height: 3.731092, persistWhenSelected: true },
  ],
  "ab-105776": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 21.288117, top: 75.967742, width: 14.676546, height: 8.185484, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 27.187232, top: 87.661290, width: 2.878313, height: 3.830645, persistWhenSelected: true },
  ],
  "ab-105778": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 48.990499, top: 75.983193, width: 14.596200, height: 8.159664, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 54.904988, top: 87.647059, width: 2.935867, height: 3.791597, persistWhenSelected: true },
  ],
  "ab-105775": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 77.486936, top: 76.685714, width: 8.821853, height: 7.441176, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 81.106888, top: 86.386555, width: 1.767221, height: 3.206723, persistWhenSelected: true },
  ],
  "ab-105759": [
    { key: "dishwasher-basket", componentKey: "base-module-3", left: 62.25, top: 71.8, width: 12.85, height: 8.45, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "base-module-3", left: 68.1, top: 82.9, width: 2.8, height: 4.05, persistWhenSelected: true },
  ],
  "ab-105762": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 67.458432, top: 70.252101, width: 7.482185, height: 8.403361, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 70.344418, top: 80.806723, width: 2.589074, height: 3.94958, persistWhenSelected: true },
  ],
  "burger-103898": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 66.449, top: 72.222, width: 8.85, height: 7.95 },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 69.962, top: 82.595, width: 1.924, height: 3.489 },
  ],
  "ab-109873": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 37.45, top: 75.7, width: 14.8, height: 7.7, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 43.4, top: 87.5, width: 3.1, height: 3.95, persistWhenSelected: true },
  ],
  "ab-109874": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 50.64, top: 66.64, width: 6.64, height: 7.4, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 53.35, top: 76.83, width: 2.2, height: 2.35, persistWhenSelected: true },
  ],
  "ab-109955": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 17.472684, top: 70.211765, width: 10.308789, height: 6.070588, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 21.505938, top: 79.085714, width: 2.280285, height: 2.944538, persistWhenSelected: true },
  ],
  "ab-110401": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 40.25, top: 67.95, width: 10.2, height: 8.7, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 44.58, top: 79.79, width: 2.29, height: 2.39, persistWhenSelected: true },
  ],
  "ab-110402": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 38.665083, top: 75.858824, width: 14.494062, height: 7.240336, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 44.551069, top: 87.596639, width: 2.907363, height: 3.771428, persistWhenSelected: true },
  ],
  "ab-111539": [
    { key: "dishwasher-basket", componentKey: "dishwasher-base", left: 35.11639, top: 68.638655, width: 7.068884, height: 6.352941, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "dishwasher-base", left: 37.635392, top: 80.889076, width: 2.567696, height: 2.695798, persistWhenSelected: true },
  ],
  "ab-105845": AB_105845_DISHWASHER_LIGHT_DETAILS,
  "ab-105847": [
    { key: "dishwasher-basket", componentKey: "base-module-5", left: 54.4, top: 58.45, width: 3.53, height: 1.9 },
    { key: "dishwasher-gs-mark", componentKey: "base-module-5", left: 55.6, top: 61.8, width: 1.05, height: 1.28 },
  ],
  "ab-105850": [
    { key: "dishwasher-basket", componentKey: "base-module-5", left: 54.4, top: 58.45, width: 3.53, height: 1.9 },
    { key: "dishwasher-gs-mark", componentKey: "base-module-5", left: 55.6, top: 61.8, width: 1.05, height: 1.28 },
  ],
  "ab-105853": [
    { key: "dishwasher-basket", componentKey: "base-module-5", left: 54.4, top: 58.45, width: 3.53, height: 1.9 },
    { key: "dishwasher-gs-mark", componentKey: "base-module-5", left: 55.6, top: 61.8, width: 1.05, height: 1.28 },
  ],
  "ab-105856": [
    { key: "dishwasher-basket", componentKey: "base-module-5", left: 54.4, top: 58.45, width: 3.53, height: 1.9 },
    { key: "dishwasher-gs-mark", componentKey: "base-module-5", left: 55.6, top: 61.8, width: 1.05, height: 1.28 },
  ],
  "ab-105859": [
    { key: "dishwasher-basket", componentKey: "base-module-5", left: 54.4, top: 58.45, width: 3.53, height: 1.9 },
    { key: "dishwasher-gs-mark", componentKey: "base-module-5", left: 55.6, top: 61.8, width: 1.05, height: 1.28 },
  ],
  "ab-105862": [
    { key: "dishwasher-basket", componentKey: "base-module-5", left: 54.25, top: 58.1, width: 4, height: 2.55, persistWhenSelected: true },
    { key: "dishwasher-gs-mark", componentKey: "base-module-5", left: 55.6, top: 61.8, width: 1.05, height: 1.28 },
  ],
  "ab-105848": AB_105845_DISHWASHER_LIGHT_DETAILS,
  "ab-105851": AB_105845_DISHWASHER_LIGHT_DETAILS,
  "ab-105854": AB_105845_DISHWASHER_LIGHT_DETAILS,
  "ab-105857": AB_105845_DISHWASHER_LIGHT_DETAILS,
  "ab-105860": AB_105845_DISHWASHER_LIGHT_DETAILS,
  "105845-modul-2": AB_105845_DISHWASHER_LIGHT_DETAILS,
};

const AB_105846_LAYOUT_ALIAS_SLUGS = [
  "ab-105849",
  "ab-105852",
  "ab-105855",
  "ab-105858",
  "ab-105861",
];
const AB_105760_LAYOUT_ALIAS_SLUGS = [
  "ab-105764",
  "ab-105768",
  "ab-105772",
];
const AB_105761_LAYOUT_ALIAS_SLUGS = [
  "ab-105765",
  "ab-105769",
];
AB_105760_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug] = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105760"];
});
AB_105761_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug] = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105761"];
});
AB_105846_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_IMAGE_BY_SLUG[slug] = PLAN_IMAGE_BY_SLUG["ab-105846"];
});

export const AB_105759_LAYOUT_ALIAS_SLUGS = [
  "ab-105763",
  "ab-105767",
  "ab-105771",
];
export const AB_105762_LAYOUT_ALIAS_SLUGS = [
  "ab-105766",
  "ab-105770",
  "ab-105774",
];
export const AB_105778_LAYOUT_ALIAS_SLUGS = ["ab-105781", "ab-105784", "ab-105787"];
AB_105778_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_IMAGE_BY_SLUG[slug] = PLAN_IMAGE_BY_SLUG["ab-105778"];
  PLAN_IMAGE_SOURCE_SIZE_BY_SLUG[slug] = PLAN_IMAGE_SOURCE_SIZE_BY_SLUG["ab-105778"];
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug] = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105778"];
});
AB_105759_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_IMAGE_BY_SLUG[slug] = PLAN_IMAGE_BY_SLUG["ab-105759"];
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug] =
    PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105759"];
});
AB_105762_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_IMAGE_BY_SLUG[slug] = PLAN_IMAGE_BY_SLUG["ab-105762"];
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug] =
    PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105762"];
});

// Exact cabinet rectangles and fixture silhouettes from the 842 x 595 vector
// PDF. The end HPK2002/UPK20 faces are intentionally included with their
// adjoining schedule cabinets, while dishwasher internals stay light grey.
export const AB_109873_FRG_ORDER_HOTSPOTS = [
  { componentKey: "wall-cabinet-1", left: 4.275534, top: 16.141176, width: 16.532067, height: 27.267227, preserveManualSize: true },
  { componentKey: "wall-cabinet-2", left: 20.807601, top: 16.141176, width: 15.990499, height: 27.267227, preserveManualSize: true },
  { componentKey: "wall-cabinet-3", left: 36.798100, top: 16.141176, width: 15.990499, height: 27.267227, preserveManualSize: true },
  { componentKey: "wall-cabinet-4", left: 52.788599, top: 16.221849, width: 15.990498, height: 27.267227, preserveManualSize: true },
  { componentKey: "extractor-hood", left: 52.788599, top: 43.489076, width: 15.990498, height: 1.875630, preserveManualSize: true },
  { componentKey: "under-cabinet-light", points: [[56.408551, 46.695798], [57.078385, 46.695798], [57.762470, 46.695798], [58.646081, 49.862185], [57.078385, 49.862185], [55.524941, 49.862185]], preserveManualSize: true },
  { componentKey: "under-cabinet-light", points: [[64.503563, 46.695798], [65.187648, 46.695798], [65.857482, 46.695798], [66.741093, 49.862185], [65.187648, 49.862185], [63.634204, 49.862185]], preserveManualSize: true },
  { componentKey: "wall-cabinet-5", left: 68.779097, top: 16.221849, width: 11.985749, height: 27.267227, preserveManualSize: true },
  { componentKey: "wall-cabinet-6", left: 80.764846, top: 16.221849, width: 14.394299, height: 27.267227, preserveManualSize: true },
  { componentKey: "worktop", left: 4.275534, top: 63.213445, width: 90.883611, height: 1.512605, preserveManualSize: true },
  // Each lower-unit selection continues through its own plinth/toe-kick section
  // to the final PDF baseline at 97.842017%, without crossing cabinet dividers.
  { componentKey: "sink-base", left: 4.275534, top: 64.726050, width: 16.532067, height: 33.115967, preserveManualSize: true },
  { componentKey: "base-module-1", left: 20.807601, top: 64.726050, width: 15.990499, height: 33.115967, preserveManualSize: true },
  { componentKey: "dishwasher-base", left: 36.798100, top: 64.726050, width: 15.990499, height: 33.115967, preserveManualSize: true },
  { componentKey: "oven-module", left: 52.788599, top: 64.726050, width: 15.990498, height: 33.115967, preserveManualSize: true },
  { componentKey: "base-module-2", left: 68.779097, top: 64.726050, width: 11.985749, height: 33.115967, preserveManualSize: true },
  { componentKey: "base-module-3", left: 80.764846, top: 64.726050, width: 14.394299, height: 33.115967, preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[18.228029, 55.610084], [19.054632, 55.610084], [19.054632, 62.951261], [18.228029, 62.951261]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[17.885986, 58.453782], [19.396675, 58.453782], [19.396675, 60.107563], [17.885986, 60.107563]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[17.885986, 62.951261], [19.396675, 62.951261], [19.396675, 63.213445], [17.885986, 63.213445]], preserveManualSize: true },
];

// AB 109955 is a straight elevation. Every boundary below comes directly from
// the 842 x 595 PDF vectors; the two left fillers remain part of their supplied
// sink/upper-cabinet packages instead of becoming dead strips.
export const AB_109955_FRG_ORDER_HOTSPOTS = [
  { componentKey: "wall-cabinet-1", points: [[0.39905, 23.280672], [16.289786, 23.280672], [16.289786, 44.578151], [0.39905, 44.578151]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[16.289786, 23.280672], [28.774347, 23.280672], [28.774347, 44.578151], [16.289786, 44.578151]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[28.774347, 23.280672], [41.273159, 23.280672], [41.273159, 44.578151], [28.774347, 44.578151]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[41.273159, 23.280672], [53.75772, 23.280672], [53.75772, 44.578151], [41.273159, 44.578151]], preserveManualSize: true },
  { componentKey: "extractor-hood", points: [[41.273159, 44.578151], [53.75772, 44.578151], [53.75772, 46.05042], [41.273159, 46.05042]], preserveManualSize: true },
  { componentKey: "worktop", points: [[0.39905, 60.047059], [53.75772, 60.047059], [53.75772, 61.236975], [0.39905, 61.236975]], preserveManualSize: true },
  // Lower selections include the complete plinth down to the final PDF line.
  { componentKey: "sink-base", points: [[0.39905, 61.236975], [16.289786, 61.236975], [16.289786, 87.092437], [0.39905, 87.092437]], preserveManualSize: true },
  { componentKey: "dishwasher-base", points: [[16.289786, 61.236975], [28.774347, 61.236975], [28.774347, 87.092437], [16.289786, 87.092437]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[28.774347, 61.236975], [41.273159, 61.236975], [41.273159, 87.092437], [28.774347, 87.092437]], preserveManualSize: true },
  { componentKey: "oven-module", points: [[41.273159, 61.236975], [53.75772, 61.236975], [53.75772, 87.092437], [41.273159, 87.092437]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[54.940618, 34.070588], [66.513064, 34.070588], [66.513064, 86.648739], [54.940618, 86.648739]], preserveManualSize: true },
  // Faucet cap, body, handles and pedestal follow the separate vector outlines.
  { componentKey: "sink-faucet", points: [[12.912114, 54.117647], [13.567696, 54.117647], [13.567696, 55.045378], [12.912114, 55.045378]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[12.741093, 54.702521], [13.724466, 54.702521], [13.724466, 59.845378], [12.741093, 59.845378]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[12.684086, 56.336134], [12.912114, 56.336134], [12.912114, 57.52605], [12.684086, 57.52605]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[13.567696, 56.336134], [13.795724, 56.336134], [13.795724, 57.52605], [13.567696, 57.52605]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[12.655582, 59.845378], [13.824228, 59.845378], [13.824228, 60.047059], [12.655582, 60.047059]], preserveManualSize: true },
];

// AB 111539 is an L-shaped 50/45 cm sink run and 40/60/30 cm cooking run.
// Every polygon follows the official 842 x 595 vector plan. Repeated keys join
// perspective fronts, sides, tops and fascias to the same physical FRG item.
export const AB_111539_FRG_ORDER_HOTSPOTS = [
  { componentKey: "wall-cabinet-1", points: [[40.460808, 4.72605], [41.586698, 4.968067], [51.961995, 7.105882], [51.961995, 34.433613], [41.586698, 32.295798], [40.460808, 32.07395]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[41.586698, 4.968067], [48.598575, 3.959664], [58.973872, 6.077311], [51.961995, 7.105882]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[51.961995, 7.105882], [58.874109, 8.517647], [58.874109, 35.845378], [51.961995, 34.433613]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[51.961995, 7.105882], [58.973872, 6.077311], [65.885986, 7.509244], [58.874109, 8.517647]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[58.874109, 8.517647], [69.263658, 10.655462], [69.263658, 37.983193], [58.874109, 35.845378]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[58.874109, 8.517647], [65.885986, 7.509244], [76.275534, 9.647059], [69.263658, 10.655462]], preserveManualSize: true },
  { componentKey: "extractor-hood", points: [[58.874109, 35.845378], [69.263658, 37.983193], [69.263658, 39.878992], [58.874109, 37.741176]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[69.263658, 10.655462], [74.451306, 11.72437], [74.451306, 39.052101], [69.263658, 37.983193]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[69.263658, 10.655462], [76.275534, 9.647059], [81.463183, 10.715966], [74.451306, 11.72437]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[74.451306, 11.72437], [81.463183, 10.715966], [81.463183, 38.043697], [76.589074, 38.608403], [76.589074, 39.354622], [76.175772, 39.415126], [74.451306, 39.052101]], preserveManualSize: true },
  { componentKey: "under-cabinet-light", points: [[61.225653, 39.556303], [62.109264, 39.737815], [62.679335, 43.02521], [61.667458, 39.636975], [60.655582, 42.601681]], preserveManualSize: true },
  { componentKey: "under-cabinet-light", points: [[66.484561, 40.62521], [67.368171, 40.806723], [67.938242, 44.094118], [66.926366, 40.72605], [65.914489, 43.690756]], preserveManualSize: true },
  // Split the two claimable worktops on the supplier line from the inner L
  // corner (3191/2240) to 4059/2329. The previous diagonal to the back wall
  // cut the selection before the visible joint marked on the plan.
  { componentKey: "worktop", points: [[10.546318, 56.235294], [47.472684, 50.890756], [57.847981, 53.028571], [45.477435, 54.823529], [20.921615, 58.373109]], preserveManualSize: true },
  { componentKey: "worktop", points: [[57.847981, 53.028571], [83.187648, 58.231933], [70.817102, 60.026891], [45.477435, 54.823529]], preserveManualSize: true },
  { componentKey: "worktop", points: [[10.546318, 56.235294], [20.921615, 58.373109], [45.477435, 54.823529], [45.477435, 56.336134], [20.921615, 59.885714], [10.546318, 57.747899]], preserveManualSize: true },
  { componentKey: "worktop", points: [[45.477435, 54.823529], [70.817102, 60.026891], [83.187648, 58.231933], [83.187648, 59.744538], [70.817102, 61.539496], [45.477435, 56.336134]], preserveManualSize: true },
  { componentKey: "sink-faucet", claimFixturePartKey: "sink", points: [[17.543943, 55.368067], [32.693587, 53.169748], [40.175772, 54.4], [23.814727, 57.122689]], preserveManualSize: true },
  { componentKey: "sink-faucet", claimFixturePartKey: "faucet", points: [[25.610451, 50.447059], [26.308789, 50.547899], [26.308789, 54.904202], [25.610451, 54.863866]], preserveManualSize: true },
  { componentKey: "sink-faucet", claimFixturePartKey: "faucet", points: [[25.724466, 50.426891], [25.724466, 47.462185], [27.007126, 44.719328], [29.458432, 44.840336], [29.415677, 43.912605], [30.099762, 44.154622], [29.914489, 47.885714], [27.007126, 47.563025], [26.209026, 50.527731]], preserveManualSize: true },
  { componentKey: "sink-base", points: [[10.546318, 57.747899], [20.921615, 59.885714], [20.921615, 93.082353], [10.546318, 90.944538]], preserveManualSize: true },
  { componentKey: "sink-base", points: [[20.921615, 59.885714], [33.990499, 57.989916], [33.990499, 91.186555], [20.921615, 93.082353]], preserveManualSize: true },
  { componentKey: "dishwasher-base", points: [[33.990499, 57.989916], [43.268409, 56.658824], [43.268409, 89.835294], [33.990499, 91.186555]], preserveManualSize: true },
  // The corner return/filler and the drawer/door front are visible parts of
  // the supplied US40, not of the adjacent 45 cm dishwasher. Keep one
  // component key so the complete default cabinet is painted in FRG/ASC and
  // exposed as one US40 claim line.
  { componentKey: "base-module-1", points: [[43.268409, 56.658824], [43.5962, 56.598319], [45.477435, 56.336134], [45.477435, 89.512605], [43.5962, 89.794958], [43.268409, 89.835294]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[45.477435, 56.336134], [46.603325, 56.557983], [46.603325, 89.754622], [45.477435, 89.512605]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[46.603325, 56.557983], [53.515439, 57.989916], [53.515439, 91.166387], [46.603325, 89.754622]], preserveManualSize: true },
  { componentKey: "oven-module", points: [[53.515439, 57.989916], [63.904988, 60.127731], [63.904988, 93.304202], [53.515439, 91.166387]], preserveManualSize: true },
  { componentKey: "base-module-2", points: [[63.904988, 60.127731], [69.092637, 61.176471], [69.092637, 94.373109], [63.904988, 93.304202]], preserveManualSize: true },
  { componentKey: "base-module-2", points: [[69.092637, 61.176471], [70.817102, 61.539496], [83.187648, 59.744538], [83.187648, 92.941176], [70.817102, 94.736134], [69.092637, 94.373109]], preserveManualSize: true },
];

// AB 110402 is a straight 30/60/60/40/40/40 cm elevation. Coordinates are
// converted directly from the 842 x 595 vector PDF. The outside HPK2002 and
// UPK20 filler faces belong to their adjoining wall/base cabinet packages.
export const AB_110402_FRG_ORDER_HOTSPOTS = [
  { componentKey: "wall-cabinet-1", points: [[12.541568, 16.141176], [21.904988, 16.141176], [21.904988, 43.408403], [12.541568, 43.408403]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[21.904988, 16.141176], [37.895487, 16.141176], [37.895487, 43.408403], [21.904988, 43.408403]], preserveManualSize: true },
  { componentKey: "extractor-hood", points: [[21.904988, 43.408403], [37.895487, 43.408403], [37.895487, 45.304202], [21.904988, 45.304202]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[37.895487, 16.141176], [53.885986, 16.141176], [53.885986, 43.408403], [37.895487, 43.408403]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[53.885986, 16.141176], [64.546318, 16.141176], [64.546318, 43.408403], [53.885986, 43.408403]], preserveManualSize: true },
  { componentKey: "wall-cabinet-5", points: [[64.546318, 16.141176], [75.206651, 16.141176], [75.206651, 43.408403], [64.546318, 43.408403]], preserveManualSize: true },
  { componentKey: "wall-cabinet-6", points: [[75.206651, 16.141176], [86.907363, 16.141176], [86.907363, 43.408403], [75.206651, 43.408403]], preserveManualSize: true },
  { componentKey: "worktop", points: [[12.541568, 63.213445], [86.907363, 63.213445], [86.907363, 64.726050], [12.541568, 64.726050]], preserveManualSize: true },
  // Lower selections include their complete plinth sections to the final PDF baseline.
  { componentKey: "base-module-1", points: [[12.541568, 64.726050], [21.862233, 64.726050], [21.862233, 97.842017], [12.541568, 97.842017]], preserveManualSize: true },
  { componentKey: "oven-module", points: [[21.862233, 64.726050], [37.852732, 64.726050], [37.852732, 97.842017], [21.862233, 97.842017]], preserveManualSize: true },
  { componentKey: "dishwasher-base", points: [[37.852732, 64.726050], [53.857482, 64.726050], [53.857482, 97.842017], [37.852732, 97.842017]], preserveManualSize: true },
  { componentKey: "sink-base", points: [[53.857482, 64.726050], [64.517815, 64.726050], [64.517815, 97.842017], [53.857482, 97.842017]], preserveManualSize: true },
  { componentKey: "base-module-2", points: [[64.517815, 64.726050], [75.178147, 64.726050], [75.178147, 97.842017], [64.517815, 97.842017]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[75.178147, 64.726050], [86.907363, 64.726050], [86.907363, 97.842017], [75.178147, 97.842017]], preserveManualSize: true },
  // Faucet body, side grips and pedestal are separate vector silhouettes.
  { componentKey: "sink-faucet", points: [[60.669834, 55.993277], [61.510689, 55.993277], [61.510689, 62.951261], [60.669834, 62.951261]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[60.370546, 58.453782], [60.669834, 58.453782], [60.669834, 59.966387], [60.456057, 59.966387]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[61.510689, 58.453782], [61.809976, 58.453782], [61.724466, 59.966387], [61.510689, 59.966387]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[60.342043, 62.951261], [61.838480, 62.951261], [61.838480, 63.213445], [60.342043, 63.213445]], preserveManualSize: true },
];

// Exact visible faces traced from the 842 x 595 vector source PDF. Perspective
// faces are kept as separate polygons so the selection tint stops on every CAD line.
export const AB_109874_FRG_ORDER_HOTSPOTS = [
  { componentKey: "wall-cabinet-1", points: [[39.733967, 15.919328], [40.546318, 16.10084], [40.546318, 37.458824], [39.733967, 37.297479]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[40.546318, 16.10084], [46.019002, 15.294118], [51.434679, 16.423529], [45.947743, 17.210084]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[40.546318, 16.10084], [45.947743, 17.210084], [45.947743, 38.568067], [40.546318, 37.458824]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[45.947743, 17.210084], [51.434679, 16.423529], [59.543943, 18.077311], [54.071259, 18.884034]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[45.947743, 17.210084], [54.071259, 18.884034], [54.071259, 40.242017], [45.947743, 38.568067]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[54.071259, 18.884034], [59.543943, 18.077311], [67.667458, 19.751261], [62.180523, 20.537815]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[54.071259, 18.884034], [62.180523, 20.537815], [62.180523, 41.915966], [54.071259, 40.242017]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[62.180523, 20.537815], [67.667458, 19.751261], [75.776722, 21.42521], [70.289786, 22.211765]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[62.180523, 20.537815], [70.289786, 22.211765], [70.289786, 43.569748], [62.180523, 41.915966]], preserveManualSize: true },
  { componentKey: "extractor-hood", points: [[62.180523, 41.915966], [70.289786, 43.569748], [70.289786, 45.062185], [62.180523, 43.388235]], preserveManualSize: true },
  { componentKey: "under-cabinet-light", points: [[64.019002, 44.8], [64.361045, 44.880672], [64.703088, 44.941176], [65.159145, 47.522689], [64.361045, 47.341176], [63.577197, 47.179832]], preserveManualSize: true },
  { componentKey: "under-cabinet-light", points: [[68.123515, 45.647059], [68.47981, 45.727731], [68.821853, 45.788235], [69.263658, 48.34958], [68.47981, 48.188235], [67.68171, 48.026891]], preserveManualSize: true },
  { componentKey: "wall-cabinet-5", points: [[70.289786, 22.211765], [75.776722, 21.42521], [83.885986, 23.078992], [78.413302, 23.885714]], preserveManualSize: true },
  { componentKey: "wall-cabinet-5", points: [[70.289786, 22.211765], [78.413302, 23.885714], [78.413302, 34.998319], [74.223278, 35.603361], [74.223278, 44.477311], [70.289786, 43.569748]], preserveManualSize: true },
  { componentKey: "wall-cabinet-5", points: [[78.413302, 23.885714], [83.885986, 23.078992], [83.885986, 34.191597], [78.413302, 34.998319]], preserveManualSize: true },
  { componentKey: "worktop", points: [[2.72209, 57.001681], [34.80285, 52.201681], [37.382423, 52.72605], [40.346793, 54.4], [10.845606, 58.67563]], preserveManualSize: true },
  { componentKey: "worktop", points: [[37.382423, 52.72605], [43.781473, 51.717647], [74.223278, 57.989916], [74.223278, 61.378151], [40.346793, 54.4]], preserveManualSize: true },
  { componentKey: "worktop", points: [[2.72209, 57.001681], [10.845606, 58.67563], [40.346793, 54.4], [40.346793, 55.589916], [39.534442, 55.710924], [39.27791, 55.751261], [29.60095, 57.142857], [19.938242, 58.534454], [11.871734, 59.704202], [10.845606, 59.865546], [2.72209, 58.191597]], preserveManualSize: true },
  { componentKey: "worktop", points: [[40.346793, 54.4], [74.223278, 61.378151], [74.223278, 62.547899], [66.099762, 60.894118], [57.990499, 59.220168], [49.881235, 57.546218], [41.016627, 55.731092], [40.346793, 55.589916]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[2.72209, 58.191597], [10.845606, 59.865546], [10.845606, 85.801681], [2.72209, 84.147899]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[10.845606, 59.865546], [11.871734, 59.704202], [11.871734, 85.660504], [10.845606, 85.801681]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[11.871734, 59.704202], [19.938242, 58.534454], [19.938242, 84.490756], [11.871734, 85.660504]], preserveManualSize: true },
  { componentKey: "base-module-2", points: [[19.938242, 58.534454], [29.60095, 57.142857], [29.60095, 83.09916], [19.938242, 84.490756]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[29.60095, 57.142857], [39.27791, 55.751261], [39.27791, 81.687395], [29.60095, 83.09916]], preserveManualSize: true },
  { componentKey: "corner-blende", points: [[39.27791, 55.751261], [39.534442, 55.710924], [39.534442, 81.647059], [39.27791, 81.687395]], preserveManualSize: true },
  { componentKey: "corner-blende", points: [[39.534442, 55.710924], [40.346793, 55.589916], [40.346793, 81.546218], [39.534442, 81.647059]], preserveManualSize: true },
  { componentKey: "corner-blende", points: [[40.346793, 55.589916], [41.016627, 55.731092], [41.016627, 81.667227], [40.346793, 81.546218]], preserveManualSize: true },
  { componentKey: "sink-base", points: [[41.016627, 55.731092], [49.881235, 57.546218], [49.881235, 83.502521], [41.016627, 81.667227]], preserveManualSize: true },
  { componentKey: "dishwasher-base", points: [[49.881235, 57.546218], [57.990499, 59.220168], [57.990499, 85.156303], [49.881235, 83.502521]], preserveManualSize: true },
  { componentKey: "oven-module", points: [[57.990499, 59.220168], [66.099762, 60.894118], [66.099762, 86.830252], [57.990499, 85.156303]], preserveManualSize: true },
  { componentKey: "base-module-4", points: [[66.099762, 60.894118], [74.223278, 62.547899], [74.223278, 88.504202], [66.099762, 86.830252]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[74.223278, 35.603361], [83.885986, 34.191597], [91.410926, 35.744538], [81.733967, 37.136134]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[74.223278, 35.603361], [81.733967, 37.136134], [81.733967, 89.613445], [74.223278, 88.060504]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[81.733967, 37.136134], [91.410926, 35.744538], [91.410926, 88.201681], [81.733967, 89.613445]], preserveManualSize: true },
  // Faucet handle, curved spout, and pedestal traced independently from the PDF.
  // The spout follows both the outside and inside arcs in winding order; crossing
  // those contours makes CSS clip-path cancel the curved section of the tint.
  { componentKey: "sink-faucet", points: [[47.187648, 45.142857], [47.786223, 45.142857], [47.957245, 48.208403], [47.957245, 48.248739], [47.928741, 48.268908], [47.857482, 48.309244], [47.75772, 48.329412], [47.700713, 48.34958], [47.515439, 48.34958], [47.429929, 48.34958], [47.372922, 48.329412], [47.35867, 48.289076], [47.372922, 48.268908], [47.401425, 48.268908], [47.187648, 45.284034]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[47.786223, 45.94958], [50.066508, 45.94958], [50.180523, 45.94958], [50.294537, 45.969748], [50.408551, 46.030252], [50.522565, 46.090756], [50.622328, 46.171429], [50.736342, 46.292437], [50.821853, 46.413445], [50.921615, 46.57479], [51.007126, 46.736134], [51.078385, 46.917647], [51.135392, 47.09916], [51.178147, 47.30084], [51.220903, 47.502521], [51.249406, 47.72437], [51.263658, 47.92605], [51.263658, 50.447059], [51.320665, 50.467227], [51.334917, 50.487395], [51.306413, 50.507563], [51.235154, 50.507563], [51.135392, 50.527731], [51.021378, 50.527731], [50.907363, 50.527731], [50.821853, 50.507563], [50.821853, 48.188235], [50.807601, 47.92605], [50.764846, 47.663866], [50.693587, 47.401681], [50.593824, 47.179832], [50.465558, 46.998319], [50.32304, 46.877311], [50.180523, 46.796639], [50.038005, 46.776471], [47.84323, 46.816807]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[50.935867, 50.547899], [51.149644, 50.709244], [51.149644, 53.835294], [51.249406, 53.835294], [51.334917, 53.855462], [51.406176, 53.855462], [51.463183, 53.87563], [51.505938, 53.895798], [51.534442, 53.915966], [51.534442, 54.036975], [51.52019, 54.057143], [51.491686, 54.077311], [51.448931, 54.097479], [51.377672, 54.097479], [51.292162, 54.117647], [50.750594, 54.117647], [50.665083, 54.097479], [50.608076, 54.077311], [50.565321, 54.057143], [50.536817, 54.036975], [50.536817, 53.936134], [50.551069, 53.915966], [50.579572, 53.895798], [50.650831, 53.87563], [50.793349, 53.855462], [50.935867, 53.855462]], preserveManualSize: true },
];

// AB 110401 is an L-shaped drawing with two independently selectable worktop
// runs. Every polygon follows a source-PDF seam; narrow fillers and cabinet side
// faces stay with the schedule item they belong to.
export const AB_110401_FRG_ORDER_HOTSPOTS = [
  { componentKey: "wall-cabinet-1", points: [[5.686461,17.714286],[10.931116,18.783193],[10.931116,43.206723],[5.686461,42.137815]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[5.686461,17.714286],[13.966746,16.504202],[19.225653,17.593277],[10.931116,18.783193]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[10.931116,18.783193],[19.225653,17.593277],[19.225653,42.016807],[10.931116,43.206723]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[13.966746,16.504202],[22.261283,15.314286],[27.52019,16.403361],[19.225653,17.593277]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[19.225653,17.593277],[27.52019,16.403361],[27.52019,40.806723],[19.225653,42.016807]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[22.261283,15.314286],[30.555819,14.104202],[35.800475,15.193277],[27.52019,16.403361]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[27.52019,16.403361],[35.800475,15.193277],[35.800475,39.616807],[27.52019,40.806723]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[30.555819,14.104202],[41.60095,12.510924],[46.859857,13.6],[35.800475,15.193277]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[35.800475,15.193277],[46.859857,13.6],[46.859857,38.023529],[35.800475,39.616807]], preserveManualSize: true },
  { componentKey: "wall-cabinet-5", points: [[41.60095,12.510924],[52.660333,10.917647],[57.904988,11.986555],[46.859857,13.6]], preserveManualSize: true },
  { componentKey: "wall-cabinet-5", points: [[46.859857,13.6],[57.904988,11.986555],[57.904988,36.410084],[46.859857,38.023529]], preserveManualSize: true },
  { componentKey: "extractor-hood", points: [[46.859857,38.023529],[57.904988,36.410084],[57.904988,38.104202],[46.859857,39.697479]], preserveManualSize: true },
  { componentKey: "wall-cabinet-6", points: [[52.660333,10.917647],[63.705463,9.32437],[68.964371,10.393277],[57.904988,11.986555]], preserveManualSize: true },
  { componentKey: "wall-cabinet-6", points: [[57.904988,11.986555],[68.964371,10.393277],[68.964371,34.816807],[57.904988,36.410084]], preserveManualSize: true },
  { componentKey: "wall-cabinet-6", points: [[68.964371,10.393277],[69.890736,10.272269],[69.890736,34.67563],[68.964371,34.816807]], preserveManualSize: true },
  { componentKey: "worktop", points: [[5.244656,59.92605],[53.572447,52.927731],[62.850356,54.843697],[14.508314,61.842017]], preserveManualSize: true },
  { componentKey: "worktop", points: [[53.572447,52.927731],[64.631829,51.334454],[94.147268,57.405042],[83.102138,58.998319],[62.850356,54.843697]], preserveManualSize: true },
  { componentKey: "worktop", points: [[5.244656,59.92605],[14.508314,61.842017],[62.850356,54.843697],[62.850356,56.194958],[14.508314,63.193277],[5.244656,61.277311]], preserveManualSize: true },
  { componentKey: "worktop", points: [[62.850356,54.843697],[83.102138,58.998319],[94.147268,57.405042],[94.147268,58.756303],[83.102138,60.34958],[62.850356,56.194958]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[5.244656,61.277311],[14.508314,63.193277],[14.508314,92.840336],[5.244656,90.944538]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[14.508314,63.193277],[14.950119,63.132773],[14.950119,92.779832],[14.508314,92.840336]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[14.950119,63.132773],[23.244656,61.922689],[23.244656,91.589916],[14.950119,92.779832]], preserveManualSize: true },
  { componentKey: "sink-base", points: [[23.244656,61.922689],[31.539192,60.732773],[31.539192,90.379832],[23.244656,91.589916]], preserveManualSize: true },
  { componentKey: "base-module-2", points: [[31.539192,60.732773],[39.819477,59.522689],[39.819477,89.189916],[31.539192,90.379832]], preserveManualSize: true },
  { componentKey: "dishwasher-base", points: [[39.819477,59.522689],[50.87886,57.929412],[50.87886,87.576471],[39.819477,89.189916]], preserveManualSize: true },
  { componentKey: "oven-module", points: [[50.87886,57.929412],[61.92399,56.336134],[61.92399,85.983193],[50.87886,87.576471]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[61.92399,56.336134],[62.850356,56.194958],[62.850356,85.842017],[61.92399,85.983193]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[62.850356,56.194958],[63.619952,56.356303],[63.619952,86.003361],[62.850356,85.842017]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[63.619952,56.356303],[71.35867,57.94958],[71.35867,87.596639],[63.619952,86.003361]], preserveManualSize: true },
  { componentKey: "base-module-4", points: [[71.35867,57.94958],[80.622328,59.845378],[80.622328,89.512605],[71.35867,87.596639]], preserveManualSize: true },
  { componentKey: "base-module-4", points: [[80.622328,59.845378],[83.102138,60.34958],[83.102138,90.016807],[80.622328,89.512605]], preserveManualSize: true },
  { componentKey: "base-module-4", points: [[83.102138,60.34958],[94.147268,58.756303],[94.147268,88.403361],[83.102138,90.016807]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[19.211401,52.10084],[19.211401,51.858824],[19.225653,51.636975],[19.254157,51.394958],[19.28266,51.152941],[19.339667,50.931092],[19.396675,50.709244],[19.467933,50.507563],[19.539192,50.32605],[19.624703,50.164706],[19.724466,50.003361],[19.824228,49.882353],[19.92399,49.801681],[20.038005,49.721008],[20.137767,49.680672],[20.251781,49.640336],[20.351544,49.640336],[22.546318,49.761345],[22.489311,50.709244],[20.394299,50.588235],[20.32304,50.588235],[20.251781,50.608403],[20.180523,50.648739],[20.109264,50.689076],[20.038005,50.74958],[19.980998,50.830252],[19.909739,50.931092],[19.852732,51.031933],[19.809976,51.152941],[19.767221,51.294118],[19.724466,51.435294],[19.695962,51.576471],[19.667458,51.737815],[19.653207,51.878992],[19.638955,52.040336],[19.638955,52.181513],[19.638955,54.823529],[19.211401,54.742857]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[22.489311,48.87395],[22.546318,48.833613],[22.888361,48.813445],[23.073634,48.87395],[23.173397,48.934454],[23.173397,48.954622],[23.130641,49.136134],[22.95962,52.443697],[22.888361,52.463866],[22.56057,52.463866],[22.4038,52.403361],[22.31829,52.342857],[22.346793,52.302521],[22.503563,48.914286]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[19.111639,54.742857],[19.738717,54.843697],[19.738717,58.736134],[19.995249,58.836975],[19.995249,58.877311],[19.909739,58.917647],[19.653207,58.957983],[19.239905,58.957983],[18.926366,58.917647],[18.855107,58.877311],[18.855107,58.836975],[18.969121,58.796639],[19.111639,58.695798]], preserveManualSize: true },
];


// Clickable selection boxes drawn on top of a flat plan image.
// Coordinates are percentages of the rendered image (left/top/width/height),
// so they stay aligned at any display size. `componentKey` must match the
// component's `componentKey` in the kitchen data (see prisma/seed.js).
// Coordinates auto-detected from the 3509x2480 plan render by edge-detecting the CAD
// linework (see docs/detect-plan-hotspots.py). Values are % of image width/height, so they
// stay pixel-aligned at any display size. Use ?calibrate=1 on the kitchen page to verify.
export const PLAN_HOTSPOTS_BY_SLUG = {
  "ab-105804": AB_105804_HOTSPOTS,
  "ab-105779": AB_105779_HOTSPOTS,
  "ab-105789": AB_105789_HOTSPOTS,
  "ab-105790": AB_105790_HOTSPOTS,
  "ab-105793": AB_105793_HOTSPOTS,
  "ab-105796": AB_105796_HOTSPOTS,
  "ab-105799": AB_105799_HOTSPOTS,
  "ab-105802": AB_105802_HOTSPOTS,
  "ab-105792": AB_105792_HOTSPOTS,
  "ab-105795": AB_105795_HOTSPOTS,
  "ab-105798": AB_105798_HOTSPOTS,
  "ab-105801": AB_105801_HOTSPOTS,
  "ab-105791": AB_105791_HOTSPOTS,
  "ab-105794": AB_105794_HOTSPOTS,
  "ab-105797": AB_105797_HOTSPOTS,
  "ab-105800": AB_105800_HOTSPOTS,
  "ab-105803": AB_105803_HOTSPOTS,
  "ab-105777": [
    {"componentKey": "refrigerator", "left": 1.881235, "top": 34.998319, "width": 11.315914, "height": 51.448739, "preserveManualSize": true},
    {"componentKey": "wall-cabinet-1", "left": 14.251781, "top": 24.45042, "width": 12.228029, "height": 20.833613, "preserveManualSize": true},
    {"componentKey": "wall-cabinet-2", "left": 26.47981, "top": 24.45042, "width": 12.213777, "height": 20.833613, "preserveManualSize": true},
    {"componentKey": "wall-cabinet-3", "left": 38.693587, "top": 24.45042, "width": 8.152019, "height": 20.833613, "preserveManualSize": true},
    {"componentKey": "wall-cabinet-4", "left": 46.845606, "top": 24.45042, "width": 7.325416, "height": 20.833613, "preserveManualSize": true},
    {"componentKey": "wall-cabinet-5", "left": 62.365796, "top": 24.45042, "width": 11.900238, "height": 20.833613, "preserveManualSize": true},
    {"componentKey": "wall-cabinet-6", "left": 74.266033, "top": 24.45042, "width": 12.228029, "height": 20.833613, "preserveManualSize": true},
    {"componentKey": "wall-cabinet-7", "left": 86.494062, "top": 24.45042, "width": 12.541568, "height": 20.833613, "preserveManualSize": true},
    {"componentKey": "extractor-hood", "left": 26.47981, "top": 45.284034, "width": 12.213777, "height": 1.431933, "preserveManualSize": true},
    { componentKey: "extractor-hood", left: 28.574822, top: 47.744538, width: 2.380048, height: 2.4, preserveManualSize: true },
    { componentKey: "extractor-hood", left: 34.760095, top: 47.744538, width: 2.380048, height: 2.4, preserveManualSize: true },
    {"componentKey": "worktop", "left": 13.92399, "top": 60.410084, "width": 40.247031, "height": 1.14958, "preserveManualSize": true},
    {"componentKey": "worktop", "left": 62.365796, "top": 60.410084, "width": 36.669834, "height": 1.14958, "preserveManualSize": true},
    { componentKey: "worktop", left: 13.92399, top: 61.559664, width: 0.327791, height: 25.310924, preserveManualSize: true, separateLockedSidePanel: true },
    {"componentKey": "sink-faucet", "left": 81.691211, "top": 54.601681, "width": 1.140143, "height": 5.808403, "preserveManualSize": true},
    {"componentKey": "base-module-1", "left": 14.251781, "top": 61.559664, "width": 12.228029, "height": 25.310924, "preserveManualSize": true},
    {"componentKey": "oven-module", "left": 26.47981, "top": 61.559664, "width": 12.213777, "height": 25.310924, "preserveManualSize": true},
    {"componentKey": "base-module-2", "left": 38.693587, "top": 61.559664, "width": 8.152019, "height": 25.310924, "preserveManualSize": true},
    {"componentKey": "base-module-3", "left": 46.845606, "top": 61.559664, "width": 7.325416, "height": 25.310924, "preserveManualSize": true},
    {"componentKey": "drawer-module", "left": 62.365796, "top": 61.559664, "width": 11.900238, "height": 25.310924, "preserveManualSize": true},
    {"componentKey": "sink-base", "left": 74.266033, "top": 61.559664, "width": 12.228029, "height": 25.310924, "preserveManualSize": true},
    {"componentKey": "dishwasher-base", "left": 86.494062, "top": 61.559664, "width": 12.541568, "height": 25.310924, "preserveManualSize": true},
  ],
  "ab-104332": AB_104332_HOTSPOTS,
  "ab-104296": AB_104296_HOTSPOTS,
  "ab-101246": [
    { componentKey: "wall-cabinet-1", left: 8.4323, top: 21.6807, width: 26.1283, height: 25.3782 },
    { componentKey: "wall-cabinet-3", left: 34.5606, top: 21.6807, width: 14.8456, height: 25.3782 },
    { componentKey: "wall-cabinet-4", left: 49.4062, top: 21.6807, width: 14.8456, height: 25.3782 },
    { componentKey: "extractor-hood", left: 49.4062, top: 47.0589, width: 14.8456, height: 1.6806 },
    { componentKey: "wall-cabinet-5", left: 64.2518, top: 21.6807, width: 9.9762, height: 25.3782 },
    // Trace the outer rays of each PDF light symbol; all five share one lighting set.
    { componentKey: "under-cabinet-light", points: [[17.771971, 49.136134], [19.040380, 49.136134], [19.852732, 52.080672], [16.959620, 52.080672]], preserveManualSize: true },
    { componentKey: "under-cabinet-light", points: [[26.266033, 49.136134], [27.534442, 49.136134], [28.346793, 52.080672], [25.453682, 52.080672]], preserveManualSize: true },
    { componentKey: "under-cabinet-light", points: [[40.859857, 49.015126], [42.114014, 49.015126], [42.940618, 51.959664], [40.033254, 51.959664]], preserveManualSize: true },
    { componentKey: "under-cabinet-light", points: [[52.389549, 50.265546], [53.657957, 50.265546], [54.484561, 53.210084], [51.577197, 53.210084]], preserveManualSize: true },
    { componentKey: "under-cabinet-light", points: [[59.942993, 50.265546], [61.211401, 50.265546], [62.023753, 53.210084], [59.130641, 53.210084]], preserveManualSize: true },
    { componentKey: "worktop", left: 8.4323, top: 65.3782, width: 65.7957, height: 1.5126 },
    { componentKey: "sink-faucet", left: 30.1663, top: 57.9832, width: 1.6627, height: 7.3950 },
    { componentKey: "base-module-1", left: 8.4323, top: 66.8908, width: 13.7767, height: 30.9243 },
    { componentKey: "sink-base", left: 22.2090, top: 66.8908, width: 12.3516, height: 30.9243 },
    { componentKey: "dishwasher-base", left: 34.5606, top: 66.8908, width: 14.8456, height: 30.9243 },
    { componentKey: "oven-module", left: 49.4062, top: 66.8908, width: 14.8456, height: 30.9243 },
    { componentKey: "base-module-2", left: 64.2518, top: 66.8908, width: 9.9762, height: 30.9243 },
    { componentKey: "refrigerator", left: 75.4157, top: 34.4538, width: 13.8955, height: 62.8571 },
  ],
  "burger-103898": [
    { componentKey: "refrigerator", points: [[9.562945, 36.813445], [17.75772, 35.139496], [28.304038, 36.652101], [20.109264, 38.346218]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[9.562945, 36.813445], [20.109264, 38.346218], [20.109264, 95.563025], [9.562945, 94.030252]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[20.109264, 38.346218], [28.304038, 36.652101], [28.304038, 93.889076], [20.109264, 95.563025]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[17.75772, 21.929412], [24.39905, 20.557983], [30.370546, 21.42521], [23.743468, 22.796639]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[17.75772, 21.929412], [23.743468, 22.796639], [23.743468, 36.006723], [17.75772, 35.139496]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[23.743468, 22.796639], [30.370546, 21.42521], [30.370546, 44.739496], [28.304038, 45.163025], [28.304038, 36.652101], [23.743468, 36.006723]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[24.39905, 20.557983], [33.249406, 18.742857], [39.220903, 19.610084], [30.370546, 21.42521]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[30.370546, 21.42521], [39.220903, 19.610084], [39.220903, 42.904202], [30.370546, 44.739496]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[30.370546, 44.739496], [39.220903, 42.904202], [39.220903, 44.517647], [30.370546, 46.352941]], preserveManualSize: true },
    { componentKey: "under-cabinet-light", points: [[32.380048, 47.058824], [32.750594, 46.978151], [33.135392, 46.917647], [33.619952, 49.519328], [32.750594, 49.680672], [31.895487, 49.862185]], preserveManualSize: true },
    { componentKey: "under-cabinet-light", points: [[36.869359, 46.151261], [37.239905, 46.070588], [37.610451, 45.989916], [38.095012, 48.591597], [37.239905, 48.773109], [36.384798, 48.934454]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[33.249406, 18.742857], [42.099762, 16.927731], [48.085511, 17.794958], [39.220903, 19.610084]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[39.220903, 19.610084], [48.085511, 17.794958], [48.085511, 41.089076], [39.220903, 42.904202]], preserveManualSize: true },
    { componentKey: "wall-cabinet-4", points: [[79.938242, 20.658824], [84.954869, 19.630252], [90.228029, 20.396639], [85.211401, 21.42521]], preserveManualSize: true },
    { componentKey: "wall-cabinet-4", points: [[79.938242, 20.658824], [85.211401, 21.42521], [85.211401, 44.719328], [79.938242, 43.973109]], preserveManualSize: true },
    { componentKey: "wall-cabinet-4", points: [[85.211401, 21.42521], [90.228029, 20.396639], [90.228029, 43.690756], [85.211401, 44.719328]], preserveManualSize: true },
    { componentKey: "worktop", points: [[28.304038, 61.196639], [48.655582, 57.021849], [59.2019, 58.554622], [54.128266, 59.583193], [54.128266, 60.87395], [28.646081, 66.117647], [28.304038, 64.907563]], preserveManualSize: true },
    { componentKey: "worktop", points: [[62.978622, 57.768067], [90.228029, 61.721008], [90.228029, 63.011765], [81.377672, 64.826891], [77.273159, 64.242017], [54.128266, 60.87395], [54.128266, 59.583193]], preserveManualSize: true },
    { componentKey: "base-module-1", points: [[28.304038, 66.198319], [35.686461, 64.665546], [35.686461, 92.840336], [28.304038, 94.373109]], preserveManualSize: true },
    { componentKey: "oven-module", points: [[35.686461, 64.665546], [44.536817, 62.85042], [44.536817, 91.02521], [35.686461, 92.840336]], preserveManualSize: true },
    { componentKey: "base-module-2", points: [[44.536817, 62.85042], [53.387173, 61.035294], [53.387173, 89.210084], [44.536817, 91.02521]], preserveManualSize: true },
    { componentKey: "base-module-2", points: [[53.387173, 61.035294], [54.128266, 60.87395], [54.128266, 89.048739], [53.387173, 89.210084]], preserveManualSize: true },
    { componentKey: "base-module-2", points: [[54.128266, 60.87395], [54.997625, 61.015126], [54.997625, 89.189916], [54.128266, 89.048739]], preserveManualSize: true },
    { componentKey: "sink-base", points: [[54.997625, 61.015126], [65.558195, 62.527731], [65.558195, 90.702521], [54.997625, 89.189916]], preserveManualSize: true },
    { componentKey: "dishwasher-base", points: [[65.558195, 62.527731], [76.104513, 64.060504], [76.104513, 92.235294], [65.558195, 90.702521]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[76.104513, 64.060504], [81.377672, 64.826891], [81.377672, 93.001681], [76.104513, 92.235294]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[81.377672, 64.826891], [90.228029, 63.011765], [90.228029, 91.186555], [81.377672, 93.001681]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[65.971496, 50.12437], [66.64133, 50.12437], [66.7981, 53.633613], [66.142518, 53.633613]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[66.584323, 50.910924], [68.679335, 50.910924], [69.36342, 51.818487], [69.776722, 53.270588], [69.776722, 55.872269], [69.36342, 55.872269], [69.36342, 53.351261], [68.650831, 51.939496], [66.64133, 51.939496]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[69.505938, 55.791597], [69.890736, 55.791597], [69.890736, 59.684034], [69.76247, 59.946218], [69.178147, 60.006723], [69.178147, 59.905882], [69.505938, 59.643697]], preserveManualSize: true },
  ],
  "ab-105758": [
    { componentKey: "wall-cabinet-1", points: [[40.860, 7.711], [41.644, 7.872], [41.644, 32.719], [40.860, 32.558]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[41.644, 7.872], [48.029, 6.965], [57.463, 8.901], [51.093, 9.829]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[41.644, 7.872], [51.093, 9.829], [51.093, 34.676], [41.644, 32.719]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[51.093, 9.829], [57.463, 8.901], [66.898, 10.837], [60.527, 11.765]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[51.093, 9.829], [60.527, 11.765], [60.527, 36.612], [51.093, 34.676]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[51.093, 34.676], [60.527, 36.612], [60.527, 38.326], [51.093, 36.390]], preserveManualSize: true },
    { componentKey: "under-cabinet-light", points: [[53.216152, 38.023529], [54.028504, 38.205042], [54.541568, 41.189916], [53.629454, 40.988235], [52.703088, 40.806723]], preserveManualSize: true },
    { componentKey: "under-cabinet-light", points: [[58.004751, 39.011765], [58.802850, 39.173109], [59.315914, 42.157983], [58.403800, 41.976471], [57.491686, 41.794958]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[60.527, 11.765], [66.898, 10.837], [71.615, 11.805], [65.245, 12.733]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[60.527, 11.765], [65.245, 12.733], [65.245, 25.741], [60.613, 26.407]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[65.245, 12.733], [71.615, 11.805], [71.615, 24.733], [65.245, 25.741]], preserveManualSize: true },
    { componentKey: "worktop", points: [[10.603, 54.965], [47.159, 49.681], [56.594, 51.617], [20.038, 56.901]], preserveManualSize: true },
    { componentKey: "worktop", points: [[56.594, 51.617], [60.613, 52.444], [60.613, 56.376], [45.349, 53.230]], preserveManualSize: true },
    { componentKey: "worktop", points: [[10.603, 54.965], [20.038, 56.901], [45.349, 53.230], [45.349, 54.622], [20.038, 58.272], [10.603, 56.336]], preserveManualSize: true },
    { componentKey: "worktop", points: [[45.349, 53.230], [60.613, 56.376], [60.613, 57.748], [45.349, 54.622]], preserveManualSize: true },
    { componentKey: "worktop", points: [[60.371, 57.708], [60.613, 57.748], [60.613, 87.919], [60.371, 87.879]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[16.261, 48.450], [16.318, 47.724], [16.575, 46.756], [17.002, 45.970], [17.658, 45.506], [20.309, 44.800], [20.252, 45.768], [17.686, 46.474], [17.359, 46.676], [17.045, 47.119], [16.846, 47.745], [16.789, 48.390]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[16.261, 48.450], [16.789, 48.390], [16.860, 55.106], [16.375, 55.166]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[20.337, 43.771], [20.993, 43.852], [20.793, 47.462], [20.109, 47.361]], preserveManualSize: true },
    { componentKey: "sink-base", points: [[12.299, 56.679], [20.038, 58.272], [19.724, 88.383], [12.299, 86.266]], preserveManualSize: true },
    // UPK20 is the narrow divider beside the end sink; it is claimed on its
    // own and must not turn the whole sink cabinet green.
    { componentKey: "sink-end-blende", points: [[20.038, 58.272], [21.734, 58.030], [21.734, 88.202], [19.724, 88.383]], preserveManualSize: true },
    { componentKey: "sink-base", points: [[21.734, 58.030], [32.979, 56.397], [32.979, 86.588], [21.734, 88.202]], preserveManualSize: true },
    { componentKey: "base-module-3", points: [[32.979, 56.397], [44.223, 54.783], [44.223, 84.955], [32.979, 86.588]], preserveManualSize: true },
    { componentKey: "base-module-3", points: [[44.223, 54.783], [45.349, 54.622], [45.349, 84.793], [44.223, 84.955]], preserveManualSize: true },
    { componentKey: "base-module-3", points: [[45.349, 54.622], [46.219, 54.783], [46.219, 84.975], [45.349, 84.793]], preserveManualSize: true },
    { componentKey: "oven-module", points: [[46.219, 54.783], [55.653, 56.739], [55.653, 86.911], [46.219, 84.975]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[55.653, 56.739], [60.371, 57.708], [60.371, 87.879], [55.653, 86.911]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[60.613, 26.407], [69.363, 28.202], [69.363, 89.210], [60.613, 87.415]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[69.363, 28.202], [80.608, 26.568], [80.608, 87.576], [69.363, 89.210]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[60.613, 26.407], [71.872, 24.773], [80.608, 26.568], [69.363, 28.202]], preserveManualSize: true },
  ],
  // AB 105750/105753/105756 share this L-shaped AB 105747 layout.
  "ab-105747": [
    { componentKey: "refrigerator", points: [[13.682, 36.773], [22.048, 35.563], [29.615, 37.116], [21.249, 38.326]] },
    { componentKey: "refrigerator", points: [[13.682, 36.773], [21.249, 38.326], [21.249, 87.294], [13.682, 85.721]] },
    { componentKey: "refrigerator", points: [[21.249, 38.326], [29.615, 37.116], [29.615, 86.084], [21.249, 87.294]] },
    { componentKey: "wall-cabinet-1", points: [[22.048, 25.197], [31.069, 23.886], [35.359, 24.773], [26.337, 26.084]] },
    { componentKey: "wall-cabinet-1", points: [[22.048, 25.197], [26.337, 26.084], [26.337, 36.45], [22.048, 35.563]] },
    { componentKey: "wall-cabinet-1", points: [[26.337, 26.084], [35.359, 24.773], [35.359, 44.719], [29.615, 45.546], [29.615, 37.116], [26.337, 36.45]] },
    { componentKey: "wall-cabinet-2", points: [[31.069, 23.886], [40.09, 22.595], [44.38, 23.462], [35.359, 24.773]] },
    { componentKey: "wall-cabinet-2", points: [[35.359, 24.773], [44.38, 23.462], [44.38, 43.408], [35.359, 44.719]] },
    { componentKey: "extractor-hood", points: [[35.359, 46.091], [35.359, 44.719], [29.615, 45.546]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[35.359, 44.719], [44.38, 43.408], [44.38, 44.78], [35.359, 46.091]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[35.35, 50.03], [44.22, 48.76], [44.22, 44.8], [35.35, 46.13]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[40.09, 22.595], [49.112, 21.284], [53.401, 22.171], [44.38, 23.462]] },
    { componentKey: "wall-cabinet-3", points: [[44.38, 23.462], [53.401, 22.171], [54.157, 22.05], [54.157, 41.997], [53.401, 42.097], [44.38, 43.408]] },
    { componentKey: "worktop", points: [[29.615, 58.514], [50.181, 55.55], [57.762, 57.103], [66.784, 55.792], [84.955, 59.523], [84.955, 60.632], [75.933, 61.943], [57.762, 58.212], [29.615, 62.266]] },
    { componentKey: "base-module-1", points: [[29.857, 62.245], [38.879, 60.934], [38.879, 85.156], [29.857, 86.447]] },
    { componentKey: "oven-module", points: [[38.879, 60.934], [47.9, 59.624], [47.9, 83.845], [38.879, 85.156]] },
    { componentKey: "base-module-2", points: [[47.9, 59.624], [56.936, 58.313], [58.39, 58.279], [58.39, 82.555], [56.936, 82.534], [47.9, 83.845]] },
    { componentKey: "sink-base", points: [[58.39, 58.279], [65.957, 59.832], [65.957, 84.108], [58.39, 82.555]], preserveManualSize: true },
    { componentKey: "base-module-3", points: [[65.957, 59.886], [71.635, 61.06], [71.635, 85.27], [65.957, 84.108]] },
    { componentKey: "drawer-module", points: [[71.635, 61.06], [75.42, 61.842], [76.233, 61.903], [76.233, 86.084], [75.42, 86.044], [71.635, 85.27]] },
    { componentKey: "drawer-module", points: [[76.233, 61.903], [84.456, 60.713], [84.456, 84.733], [76.233, 86.084]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[67.097, 49.277], [70.903, 49.277], [70.903, 57.506], [67.097, 57.506]], preserveManualSize: true },
  ],
  "ab-105806": [
    { componentKey: "refrigerator", left: 3.59, top: 31.83, width: 13.82, height: 63.35 },
    { componentKey: "wall-cabinet-1", left: 18.35, top: 18.91, width: 9.95, height: 25.47 },
    { componentKey: "wall-cabinet-2", left: 28.3, top: 18.91, width: 14.93, height: 25.47 },
    { componentKey: "extractor-hood", left: 28.3, top: 44.38, width: 14.93, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 43.23, top: 18.91, width: 9.95, height: 25.47 },
    { componentKey: "wall-cabinet-4", left: 53.18, top: 18.91, width: 14.92, height: 25.47 },
    { componentKey: "wall-cabinet-5", left: 68.1, top: 18.91, width: 14.93, height: 25.47 },
    { componentKey: "wall-cabinet-6", left: 83.03, top: 18.91, width: 15.56, height: 25.47 },
    { componentKey: "worktop", left: 17.86, top: 62.86, width: 80.73, height: 1.39 },
    { componentKey: "worktop", left: 17.86, top: 62.86, width: 0.4, height: 32.3 },
    { componentKey: "sink-faucet", left: 70.4, top: 56.6, width: 4, height: 7.8 },
    { componentKey: "base-module-1", left: 18.24, top: 64.25, width: 9.94, height: 30.91 },
    { componentKey: "oven-module", left: 28.18, top: 64.25, width: 14.94, height: 30.91 },
    { componentKey: "base-module-2", left: 43.12, top: 64.25, width: 9.94, height: 30.91 },
    { componentKey: "base-module-3", left: 53.06, top: 64.25, width: 14.92, height: 30.91 },
    { componentKey: "sink-base", left: 67.98, top: 64.25, width: 14.94, height: 30.91 },
    { componentKey: "drawer-module", left: 82.92, top: 64.25, width: 15.67, height: 30.91 },
  ],
  "ab-105807": [
    { componentKey: "wall-cabinet-1", left: 4.49, top: 16.01, width: 16.46, height: 26.73 },
    { componentKey: "wall-cabinet-2", left: 20.95, top: 16.01, width: 15.68, height: 26.73 },
    { componentKey: "wall-cabinet-3", left: 36.63, top: 16.01, width: 15.68, height: 26.73 },
    { componentKey: "wall-cabinet-4", left: 52.31, top: 16.01, width: 15.69, height: 26.73 },
    { componentKey: "extractor-hood", left: 52.31, top: 42.74, width: 15.69, height: 7.05 },
    { componentKey: "worktop", left: 4.49, top: 62.14, width: 63.92, height: 1.49 },
    { componentKey: "sink-faucet", left: 30.7, top: 54.5, width: 4.4, height: 8 },
    { componentKey: "drawer-module", left: 4.49, top: 63.63, width: 16.46, height: 32.5 },
    { componentKey: "base-module-2", left: 20.95, top: 63.63, width: 15.68, height: 32.5 },
    { componentKey: "base-module-3", left: 36.63, top: 63.63, width: 15.68, height: 32.5 },
    { componentKey: "oven-module", left: 52.31, top: 63.63, width: 16.1, height: 32.5 },
    { componentKey: "refrigerator", left: 71.37, top: 29.54, width: 14.55, height: 66.59 },
  ],
  "ab-105805": [
    {
      componentKey: "refrigerator",
      points: [[10.6, 29.8], [20.1, 28.4], [28.3, 30.15], [28.41, 85.51], [19.07, 86.73], [10.57, 84.68]],
    },
    {
      componentKey: "wall-cabinet-1",
      points: [[19.92, 18.27], [27.11, 17.25], [31.5, 18.3], [31.5, 40.75], [28.41, 41.19], [28.3, 30.15], [19.9, 28.43]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[31.5, 18.3], [27.11, 17.25], [37.21, 15.8], [41.6, 16.85], [41.6, 39.3], [31.5, 40.75]],
    },
    {
      componentKey: "extractor-hood",
      points: [[31.5, 40.75], [41.6, 39.3], [41.6, 44.45], [31.5, 45.9]],
    },
    {
      componentKey: "under-cabinet-light",
      points: [[31.5, 42.3], [41.6, 40.85], [41.6, 44.45], [31.5, 45.9]],
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[41.6, 16.85], [37.21, 15.8], [45.66, 14.55], [50.05, 15.6], [50.05, 38.06], [41.6, 39.3]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[50.05, 15.6], [45.66, 14.55], [56.61, 12.94], [61.02, 13.76], [61.02, 36.65], [50.05, 38.06]],
    },
    {
      componentKey: "worktop",
      points: [
        [28.44, 54.44], [35.45, 53.44], [45.57, 51.94], [55.57, 50.4], [64.05, 51.89], [72.55, 53.68],
        [76.8, 54.5], [87.17, 56.68], [87.17, 57.75], [76.8, 59.27], [72.55, 58.4], [64.05, 56.65],
        [55.57, 54.9], [45.57, 56.13], [35.45, 57.8], [28.4, 58.55],
      ],
    },
    {
      componentKey: "base-module-1",
      points: [[28.7, 58.55], [35.45, 57.58], [35.45, 84.84], [28.7, 85.77]],
    },
    {
      componentKey: "oven-module",
      points: [[35.45, 57.58], [45.57, 56.13], [45.57, 83.35], [35.45, 84.84]],
    },
    {
      componentKey: "base-module-2",
      points: [[45.57, 56.13], [55.52, 54.98], [55.52, 82.23], [45.57, 83.35]],
    },
    {
      componentKey: "corner-base",
      points: [[55.55, 55.05], [64.05, 56.65], [64.05, 83.91], [55.55, 82.25]],
    },
    {
      componentKey: "base-module-3",
      points: [[64.05, 56.65], [72.55, 58.4], [72.55, 85.65], [64.05, 83.91]],
    },
    {
      componentKey: "sink-base",
      points: [[72.55, 58.4], [76.8, 59.27], [76.8, 86.53], [72.55, 85.95]],
    },
    {
      componentKey: "sink-base",
      points: [[76.8, 59.25], [87.17, 58.05], [87.17, 85.12], [76.8, 86.53]],
      preserveManualSize: true,
    },
    // End blende left of the corner sink — belongs to the run on the left, not the sink base.

    // Left fridge-end worktop blende (locked with worktop).
    {
      componentKey: "worktop",
      points: [[28.28, 58.7], [28.65, 58.5], [28.72, 85.50], [28.28, 86.02]],
      preserveManualSize: true,
    },
    {
      componentKey: "sink-faucet",
      left: 64,
      top: 44,
      width: 6,
      height: 10.2,
      preserveManualSize: true,
    },
  ],
  "ab-105809": [
  {
    componentKey: "refrigerator",
    points: [[11.54, 29.71], [21.35, 26.82], [27.74, 31.97], [27.74, 80.87], [17.95, 83.76], [11.54, 78.61]],
  },
  {
    componentKey: "worktop",
    points: [[27.74, 48.69], [28.74, 55.43], [29.03, 80.5], [27.74, 80.58]],
    preserveManualSize: true,
  },
  {
    componentKey: "wall-cabinet-1",
    points: [[24.89, 17.11], [31.95, 15.03], [35.48, 17.85], [35.48, 37.66], [27.74, 39.73], [27.74, 31.97], [24.89, 29.7]],
  },
  {
    componentKey: "wall-cabinet-2",
    points: [[31.95, 15.03], [42.54, 11.9], [46.06, 14.76], [46.06, 34.55], [35.48, 37.66], [35.48, 17.85]],
  },
  {
    componentKey: "extractor-hood",
    points: [[35.48, 37.66], [46.06, 34.55], [46.06, 35.8], [35.48, 38.9]],
  },
  {
    componentKey: "wall-cabinet-3",
    points: [[42.54, 11.9], [51.37, 9.33], [54.88, 12.15], [54.88, 31.95], [46.06, 34.55], [46.06, 14.76]],
  },
  {
    componentKey: "wall-cabinet-4",
    points: [[51.37, 9.33], [60.65, 6.59], [64.89, 9.08], [64.89, 29.01], [54.88, 31.95], [54.88, 12.15]],
  },
  {
    componentKey: "worktop",
    points: [[27.74, 48.69], [50.05, 42.12], [56.45, 47.28], [55.49, 48.66], [46.66, 51.26], [36.08, 54.35], [29.03, 56.44], [28.74, 55.43]],
  },
  {
    componentKey: "worktop",
    points: [[50.05, 42.12], [60.65, 39.01], [83.61, 57.51], [73.03, 60.61], [69.25, 58.67], [62.85, 53.51], [55.49, 48.66], [56.45, 47.28]],
  },
  {
    componentKey: "base-module-1",
    points: [[29.03, 56.44], [36.08, 54.35], [36.08, 78.42], [29.03, 80.5]],
  },
  {
    componentKey: "oven-module",
    points: [[36.08, 54.35], [46.66, 51.26], [46.66, 75.29], [36.08, 78.42]],
  },
  {
    componentKey: "base-module-2",
    points: [[46.66, 51.26], [55.49, 48.66], [56.45, 48.37], [56.45, 72.4], [55.49, 72.71], [46.66, 75.29]],
  },
  {
    "componentKey": "corner-base",
    "points": [[56.45, 48.37], [62.85, 53.51], [62.85, 77.58], [56.45, 72.4]],
  },
  {
    "componentKey": "base-module-3",
    "points": [[62.85, 53.51], [69.25, 58.67], [69.25, 82.72], [62.85, 77.58]],
  },
  {
    componentKey: "sink-base",
    points: [[69.25, 58.67], [73.03, 60.61], [73.03, 85.76], [69.25, 82.72]],
  },
  {
    componentKey: "sink-faucet",
    left: 65.32,
    top: 39.84,
    width: 6.01,
    height: 8.95,
    preserveManualSize: true,
  },
  {
    componentKey: "sink-base",
    points: [[73.03, 61.45], [83.61, 58.35], [83.61, 82.66], [73.03, 85.76]],
    preserveManualSize: true,
  },
  {
    componentKey: "worktop",
    points: [[73.03, 60.61], [83.61, 57.51], [83.61, 58.35], [73.03, 61.45]],
    preserveManualSize: true,
  },
],
  "ab-105834": [
    { componentKey: "refrigerator", points: [[8.38, 26.9], [18.41, 25.44], [29.52, 27.34], [18.41, 28.95]] },
    { componentKey: "refrigerator", points: [[8.38, 26.9], [18.41, 28.95], [29.52, 27.34], [29.52, 92.94], [18.41, 93.99], [8.38, 91.94]] },
    { componentKey: "wall-cabinet-1", points: [[19.81, 11.41], [29.52, 10.06], [35.48, 11.13], [25.51, 12.58]] },
    { componentKey: "wall-cabinet-1", points: [[19.81, 11.41], [25.51, 12.58], [25.51, 26.61], [19.81, 25.44]] },
    { componentKey: "wall-cabinet-1", points: [[25.51, 12.58], [35.48, 11.13], [35.48, 37.86], [29.52, 37.86], [29.52, 27.34], [25.51, 26.61]] },
    { componentKey: "wall-cabinet-2", points: [[29.52, 10.06], [42.75, 8.12], [47.48, 9.4], [35.48, 11.13]] },
    { componentKey: "wall-cabinet-2", points: [[35.48, 11.13], [47.48, 9.4], [47.48, 37.86], [35.48, 39.6]] },
    { componentKey: "extractor-hood", points: [[35.49, 39.62], [35.48, 37.8], [30.0, 38.62]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[35.48, 37.9], [47.48, 36.16], [47.48, 37.9], [35.48, 39.57]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[36.58, 44.08], [46.38, 42.75], [46.38, 38.11], [36.58, 39.57]] },
    { componentKey: "wall-cabinet-3", points: [[42.747221, 8.145161], [53.548019, 6.572581], [60.444571, 7.580645], [47.477914, 9.435484]] },
    { componentKey: "wall-cabinet-3", points: [[47.477914, 9.435484], [59.447136, 7.741935], [59.447136, 34.233871], [47.477914, 36.008065]] },
    { componentKey: "wall-cabinet-3", points: [[59.447136, 7.741935], [60.444571, 7.580645], [60.444571, 34.112903], [59.447136, 34.233871]] },
    {
      componentKey: "worktop",
      points: [
        [29.55, 55.52], [46.4, 53.43], [54.81, 52.22], [67.92, 54.84], [94.73, 60.29], [94.82, 62.25],
        [82.83, 63.71], [67.92, 60.89], [53.81, 57.66], [31.81, 60.48], [29.55, 60.55],
      ],
    },
    { componentKey: "base-module-1", points: [[29.55, 60.65], [39.81, 58.71], [39.81, 91.94], [29.65, 93.09]] },
    { componentKey: "oven-module", points: [[39.81, 58.71], [51.81, 57.35], [51.81, 89.52], [39.81, 91.94]] },
    { componentKey: "base-module-2", points: [[51.92, 57.31], [62.3, 59.31], [62.3, 91.55], [51.92, 89.52]] },
    { componentKey: "base-module-3", points: [[72.33, 61.34], [82.67, 63.36], [82.67, 95.55], [72.33, 93.56]] },
    { componentKey: "base-module-3", points: [[82.67, 63.46], [94.54, 62.03], [94.54, 93.74], [82.67, 95.55]] },
    // The corner cabinet is a separate selectable base; only the small
    // elevated faucet silhouette belongs to the sink fixture.
    { componentKey: "corner-base", points: [[62.31, 59.71], [72.3, 61.25], [72.41, 93.32], [62.22, 91.82]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[69.95, 45.98], [76.1, 45.98], [76.1, 58.89], [69.95, 58.89]], preserveManualSize: true },
  ],
  "ab-105837": [
    { componentKey: "refrigerator", points: [[10.74, 29.62], [20.82, 28.18], [29.74, 30.02], [19.92, 31.56]] },
    { componentKey: "refrigerator", points: [[10.74, 29.62], [19.92, 31.56], [19.92, 90.92], [10.8, 89.05]] },
    { componentKey: "refrigerator", points: [[19.92, 31.56], [30.2, 30.02], [30.2, 89.62], [19.92, 90.92]] },
    { componentKey: "wall-cabinet-1", points: [[20.92, 15.56], [32.09, 13.87], [37.08, 15.07], [26.1, 16.5]] },
    { componentKey: "wall-cabinet-1", points: [[20.92, 15.5], [26.1, 16.5], [26.1, 29.25], [20.8, 28.3]] },
    { componentKey: "wall-cabinet-1", points: [[26.1, 16.7], [37.08, 15.07], [37.08, 39.28], [30.09, 40.45], [30.09, 30.25], [26.1, 29.15]] },
    { componentKey: "wall-cabinet-2", points: [[37.1, 15.17], [48.07, 13.6], [43.02, 12.29], [32.08, 13.87]] },
    { componentKey: "wall-cabinet-2", points: [[37.08, 15.17], [48.02, 13.59], [48.02, 37.69], [37.08, 39.38]] },
    { componentKey: "extractor-hood", points: [[37.09, 41.05], [37.08, 39.28], [32.08, 40.08]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[37.08, 39.38], [48.02, 37.69], [48.02, 39.38], [37.08, 41.0]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[38.08, 45.38], [47.02, 44.09], [47.02, 39.58], [38.08, 41.0]] },
    { componentKey: "wall-cabinet-3", points: [[43.1, 12.22], [53.55, 10.85], [58.76, 11.9], [48.02, 13.75]] },
    { componentKey: "wall-cabinet-3", points: [[48.02, 13.55], [60.02, 11.8], [60.02, 36.0], [48.02, 37.85]] },
    // Keep the ASC worktop split on the other red-marked seam: source pixels
    // (1621, 1331) to (1858, 1386) in the 3509 x 2480 plan render.
    { componentKey: "worktop", points: [[30.34, 56.08], [33.07, 55.93], [43.76, 54.03], [46.195497, 53.669355], [52.949558, 55.887097], [52.05, 55.82], [41.07, 58.02], [30.34, 60.02]] },
    { componentKey: "worktop", points: [[46.195497, 53.669355], [52.05, 53.0], [53.98, 52.7], [54.687945, 52.419355], [61.64, 53.95], [70.85, 55.88], [80.05, 57.72], [91.22, 59.92], [91.22, 60.48], [80.05, 61.82], [70.85, 59.38], [61.64, 57.48], [53.98, 55.95], [52.949558, 55.887097]] },
    // Split the short inside-corner fascia exactly in half. Both runs meet on
    // the midpoint line from (53.015, 55.885) to (53.015, 57.4343).
    { componentKey: "worktop", points: [[30.34, 60.02], [41.07, 58.02], [52.05, 55.82], [53.015, 55.885], [53.015, 57.4343], [52.05, 57.45], [41.07, 59.05], [30.09, 60.73]], preserveManualSize: true },
    { componentKey: "worktop", points: [[53.015, 55.885], [53.98, 55.95], [61.64, 57.48], [70.85, 59.38], [80.05, 61.82], [91.22, 60.48], [91.22, 61.3], [80.05, 63.02], [70.85, 61.08], [61.64, 59.08], [53.015, 57.4343]], preserveManualSize: true },
    { componentKey: "base-module-1", points: [[30.09, 60.73], [41.07, 59.05], [41.07, 88.51], [30.09, 89.9]] },
    { componentKey: "oven-module", points: [[41.07, 59.05], [52.05, 57.45], [52.05, 86.8], [41.07, 88.51]] },
    { componentKey: "base-module-2", points: [[52.05, 57.25], [61.64, 58.92], [61.64, 88.5], [52.05, 86.62]] },
    { componentKey: "base-module-4", points: [[61.64, 59.08], [70.85, 60.88], [70.85, 90.69], [61.64, 88.69]] },
    { componentKey: "base-module-3", points: [[70.85, 61.08], [80.05, 62.82], [80.05, 92.25], [70.85, 90.55]] },
    // The broad face at the far right is the separately claimable WU16 cabinet
    // side panel, not a second face of base-module-3.
    { componentKey: "worktop", points: [[80.05, 63.02], [91.22, 61.30], [91.22, 91.1], [80.05, 92.25]], preserveManualSize: true },
    // Match the order-page plan: this source shape is the faucet fixture;
    // the sink bowl is derived separately by the ASC claim-part mapper.
    { componentKey: "sink-faucet", points: [[68.6, 46.7], [75.1, 46.7], [75.1, 56.5], [68.6, 56.75]], preserveManualSize: true },
  ],
  "ab-105825": [
    {
      componentKey: "wall-cabinet-1",
      points: [[48.1, 12.2], [57.9, 14.08], [57.9, 37.63], [48.1, 35.63]],
    },
    {
      componentKey: "wall-cabinet-1",
      points: [[48.9, 12.51], [55.16, 11.35], [63.28, 13.32], [57.78, 14.08]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[57.9, 13.98], [66.98, 16.1], [66.98, 39.25], [57.98, 37.42]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[58.08, 13.98], [63.18, 13.15], [72.86, 15.19], [66.5, 16.03]],
    },
    {
      componentKey: "extractor-hood",
      points: [[58.08, 37.42], [66.98, 39.25], [66.75, 46.22], [58.43, 45.21]],
      preserveManualSize: true,
    },
    {
      componentKey: "extractor-hood",
      points: [[66.75, 39.25], [70.95, 40.15], [66.75, 40.78]],
      preserveManualSize: true,
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[66.68, 16.1], [75.65, 17.88], [75.65, 41.34], [66.78, 39.58]],
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[66.9, 16.0], [75.65, 17.88], [80.98, 17.0], [73.07, 15.09]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[75.65, 17.88], [81.88, 17.03], [85.99, 17.8], [80.29, 18.82]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[75.65, 17.88], [80.29, 18.7], [80.29, 31.26], [75.65, 31.92]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[80.29, 18.82], [86.19, 17.8], [86.19, 30.25], [80.29, 31.26]],
    },
    {
      componentKey: "worktop",
      // Pixel-traced from the 842 x 595 source. Both worktop runs share only
      // the real inside-corner seam from (366, 317) to (373, 325).
      points: [
        [6.650831, 55.630252], [16.745843, 54.117647], [34.916865, 51.092437],
        [43.467933, 53.277311], [44.299287, 54.621849], [39.548694, 55.12605],
        [34.916865, 55.798319], [15.795724, 58.487395], [6.650831, 56.806723],
      ],
    },
    {
      componentKey: "worktop",
      points: [
        [43.467933, 53.277311], [54.513064, 51.428571], [75.771971, 56.134454],
        [75.653207, 61.344538], [70.427553, 59.831933], [65.795724, 58.823529],
        [55.463183, 56.638655], [49.643705, 55.798319], [44.299287, 54.621849],
      ],
    },
    {
      componentKey: "sink-faucet",
      points: [[17.9, 53.95], [38.8, 52.9], [38.8, 56.75], [17.9, 58.35]],
      preserveManualSize: true,
    },
    {
      componentKey: "sink-faucet",
      points: [[22.35, 45.85], [29.5, 45.2], [29.5, 54.3], [22.35, 55.2]],
      preserveManualSize: true,
    },
    {
      componentKey: "base-module-1",
      points: [[6.78, 56.85], [15.56, 58.61], [15.56, 87.16], [6.78, 85.38]],
    },
    {
      componentKey: "base-module-1",
      points: [[15.56, 58.61], [21.63, 57.78], [21.63, 86.31], [15.56, 87.16]],
    },
    {
      componentKey: "dishwasher-base",
      points: [[21.62, 57.48], [32.19, 55.97], [32.19, 84.87], [21.62, 86.39]],
    },
    {
      componentKey: "sink-base",
      // Stop at the calibrated UPEF65 boundary. The previous 43.47% edge
      // overlapped the independently selectable corner Blende beside it. The
      // top follows the cabinet seam below the worktop fascia, not its surface.
      points: [[32.19, 56.37], [42.661727, 54.78], [42.661727, 83.36], [32.19, 84.87]],
    },
    {
      componentKey: "base-module-2",
      points: [[43.47, 53.78], [44.18, 54.45], [53.44, 56.3], [53.44, 85.21], [44.18, 83.36], [43.47, 83.36]],
    },
    {
      componentKey: "oven-base",
      points: [[53.44, 56.3], [62.0, 58.15], [62.0, 87.06], [53.44, 85.21]],
    },
    {
      componentKey: "base-module-3",
      points: [[62.0, 58.15], [71.02, 60.0], [71.02, 88.74], [62.0, 87.06]],
    },
    {
      componentKey: "drawer-base",
      points: [[71.02, 60.0], [75.65, 60.84], [75.65, 89.75], [71.02, 88.74]],
    },
    {
      componentKey: "refrigerator",
      points: [[75.65, 31.76], [84.2, 33.61], [84.2, 90.92], [75.65, 89.75]],
    },
    {
      componentKey: "refrigerator",
      points: [[84.2, 33.61], [94.89, 31.93], [94.89, 89.08], [84.2, 90.92]],
    },
    {
      componentKey: "refrigerator",
      points: [[75.65, 31.76], [85.99, 30.25], [94.89, 31.93], [84.2, 33.61]],
    },
  ],
  "ab-105831": [
    {
      componentKey: "wall-cabinet-1",
      points: [[48.02, 15.85], [57.97, 17.85], [57.97, 41.9], [48.02, 40.35]],
    },
    {
      componentKey: "wall-cabinet-1",
      points: [[48.02, 15.85], [54.05, 15.05], [64.05, 16.85], [57.97, 17.85]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[57.97, 17.14], [61.05, 16.45], [70.35, 18.85], [67.11, 20.0]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[57.97, 17.14], [61.05, 16.45], [70.35, 18.85], [67.11, 20.0]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[57.97, 18.14], [67.11, 20.0], [67.11, 43.65], [57.97, 41.45]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[57.97, 18.14], [67.11, 20.0], [73.9, 19.24], [64.05, 16.85]],
    },
    {
      componentKey: "extractor-hood",
      points: [[57.97, 41.45], [67.11, 43.87], [66.85, 43.65], [60.25, 43.0]],
    },
    {
      componentKey: "extractor-hood",
      points: [[57.97, 41.45], [67.11, 43.87], [66.85, 43.65], [60.25, 43.0]],
    },
    {
      componentKey: "extractor-hood",
      points: [[60.25, 43.0], [66.85, 43.65], [66.85, 48.45], [60.25, 48.0]],
      preserveManualSize: true,
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[67.11, 20.0], [70.35, 18.85], [78.05, 20.1], [74.78, 21.25]],
    },
    {
      componentKey: "extractor-hood",
      points: [[66.85, 43.55], [70.55, 45.05], [66.85, 45.75]],
      preserveManualSize: true,
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[67.11, 20.0], [74.78, 21.25], [74.78, 45.48], [67.11, 43.87]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[74.78, 21.25], [78.05, 20.1], [82.4, 19.45], [79.37, 20.52]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[74.78, 21.25], [78.05, 20.1], [82.4, 19.45], [79.37, 20.52]],
    },
    {
      componentKey: "wall-cabinet-3",
      points: [[67.11, 20.0], [74.78, 21.25], [83.47, 21.18], [73.9, 19.24]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[79.37, 20.52], [82.4, 19.45], [88.5, 20.25], [85.58, 21.25]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[79.37, 20.52], [82.4, 19.45], [88.5, 20.25], [85.58, 21.25]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[74.78, 21.25], [79.37, 20.52], [85.58, 21.25], [85.58, 36.9], [79.37, 36.9], [74.78, 35.32]],
    },
    {
      componentKey: "worktop",
      points: [[5.3, 59.85], [14.55, 59.0], [31.45, 58.05], [43.35, 58.3], [43.35, 59.8], [31.45, 60.55], [14.55, 61.2], [5.3, 62.0]],
    },
    {
      componentKey: "worktop",
      points: [[43.35, 58.3], [53.25, 57.25], [66.5, 59.35], [74.75, 60.0], [74.75, 62.65], [62.35, 61.55], [53.25, 60.35], [43.35, 59.8]],
    },
    {
      componentKey: "worktop",
      points: [[5.3, 62.0], [14.55, 61.2], [31.45, 60.55], [43.35, 59.8], [43.35, 60.95], [31.45, 61.7], [14.55, 62.35], [5.3, 63.15]],
      preserveManualSize: true,
    },
    {
      componentKey: "worktop",
      points: [[43.35, 59.8], [53.25, 60.35], [62.35, 61.55], [74.75, 62.65], [74.75, 63.8], [62.35, 62.7], [53.25, 61.5], [43.35, 60.95]],
      preserveManualSize: true,
    },
    {
      componentKey: "sink-faucet",
      points: [[25.05, 47.15], [30.8, 47.15], [30.8, 58.15], [25.05, 58.65]],
      preserveManualSize: true,
    },
    {
      componentKey: "base-module-1",
      points: [[5.3, 62.0], [14.55, 61.2], [14.55, 92.2], [5.3, 89.8]],
    },
    {
      componentKey: "base-module-1",
      points: [[14.55, 61.2], [20.45, 61.75], [20.45, 91.47], [14.55, 92.2]],
    },
    {
      componentKey: "base-module-3",
      points: [[20.45, 61.75], [31.45, 60.55], [31.45, 90.1], [20.45, 91.47]],
    },
    {
      componentKey: "sink-base",
      points: [[31.45, 61.55], [42.55, 59.8], [42.25, 89.25], [31.45, 90.8]],
    },
    {
      componentKey: "base-module-2",
      points: [[44.05, 59.8], [53.25, 60.35], [53.25, 89.4], [44.05, 87.85]],
    },
    {
      componentKey: "oven-module",
      points: [[53.25, 60.35], [62.35, 61.55], [62.35, 91.0], [53.25, 89.4]],
    },
    {
      componentKey: "drawer-module",
      points: [[62.35, 61.55], [70.08, 62.24], [70.08, 92.56], [62.35, 91.0]],
    },
    {
      componentKey: "base-module-4",
      points: [[70.08, 62.24], [74.75, 62.65], [74.75, 93.5], [70.08, 92.56]],
    },
    {
      componentKey: "refrigerator",
      points: [[74.89, 34.31], [83.39, 37.34], [83.39, 96.49], [74.89, 95.16]],
    },
    {
      componentKey: "refrigerator",
      points: [[83.39, 37.34], [94.33, 34.31], [94.33, 95.16], [83.39, 96.49]],
    },
    {
      componentKey: "refrigerator",
      points: [[74.89, 34.31], [83.39, 33.45], [94.33, 34.31], [94.33, 35.65], [83.39, 37.34], [74.89, 35.45]],
    },
  ],
  "ab-104968": [
    { componentKey: "refrigerator", points: [[72.41, 90.47], [81.02, 92.08], [91.71, 90.47], [91.71, 31.3], [83.29, 29.69], [72.41, 31.17], [72.41, 90.57]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[6.8, 15.05], [15.89, 13.89], [20.8, 14.76], [21, 38.91], [11.91, 40.22], [6.69, 39.06], [6.59, 15.19]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[16.59, 39.64], [20.88, 40.51], [31.82, 38.92], [31.82, 13.31], [26.91, 12.16], [16.08, 13.75], [20.99, 15.05], [20.99, 38.92], [16.9, 39.64]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[20.83, 45.69], [20.88, 40.51], [31.82, 38.92], [31.7, 45.11]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[31.82, 13.31], [26.81, 12.01], [34.17, 11.14], [39.18, 12.16], [39.08, 36.32], [31.82, 37.33], [31.82, 13.46]] },
    { componentKey: "wall-cabinet-4", points: [[39.28, 12.16], [34.17, 11.14], [44.7, 9.7], [49.92, 10.57], [50.94, 10.71], [50.84, 34.73], [39.18, 36.17], [39.18, 12.3]] },
    { componentKey: "worktop", points: [[14.7, 59.97], [5.57, 58.11], [5.57, 56.64], [45.69, 50.91], [72.34, 56.36], [72.34, 60.09], [72.34, 61.55], [43.9, 55.82], [14.61, 59.96]] },
    { componentKey: "base-module-1", points: [[6.69, 87.24], [6.59, 58.41], [14.44, 60.01], [24.75, 58.68], [24.75, 87.79], [14.44, 89.13], [14.53, 88.96], [6.78, 87.22]], preserveManualSize: true },
    { componentKey: "oven-module", points: [[24.84, 58.62], [35.72, 57.01], [35.72, 86.09], [24.84, 87.83], [24.84, 58.47]] },
    { componentKey: "base-module-2", points: [[35.72, 56.94], [43.76, 55.87], [44.8, 55.87], [44.7, 85.04], [43.95, 85.04], [35.72, 86.11], [35.72, 56.8]] },
    { componentKey: "sink-base", points: [[44.73, 55.83], [44.7, 85.31], [53.78, 86.92], [53.97, 57.87]], preserveManualSize: true },
    { componentKey: "base-module-3", points: [[53.88, 57.72], [53.88, 87.07], [62.96, 88.94], [62.96, 59.63], [53.78, 57.76]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[63.05, 59.73], [62.96, 88.9], [72.13, 90.91], [72.04, 61.6], [63.05, 59.6]], preserveManualSize: true },
    { componentKey: "worktop", points: [[72.04, 61.6], [72.41, 61.67], [72.41, 90.57], [72.13, 90.91]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[57.75, 53.76], [57.66, 43.72], [51.32, 43.32], [51.7, 52.35]], preserveManualSize: true },
  ],
  "ab-105808": [
    { componentKey: "refrigerator", left: 3.31, top: 28.08, width: 13.08, height: 59.98 },
    { componentKey: "wall-cabinet-1", left: 17.67, top: 15.89, width: 7.05, height: 24.09 },
    { componentKey: "wall-cabinet-2", left: 24.72, top: 15.89, width: 14.14, height: 24.09 },
    { componentKey: "extractor-hood", left: 24.72, top: 39.98, width: 14.14, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.86, top: 15.89, width: 14.12, height: 24.09 },
    { componentKey: "wall-cabinet-4", left: 52.98, top: 15.89, width: 14.12, height: 24.09 },
    { componentKey: "wall-cabinet-5", left: 67.1, top: 15.89, width: 14.13, height: 24.09 },
    { componentKey: "wall-cabinet-6", left: 81.23, top: 15.89, width: 15.07, height: 24.09 },
    { componentKey: "worktop", left: 17.67, top: 57.46, width: 78.63, height: 1.35 },
    { componentKey: "worktop", left: 17.2, top: 57.42, width: 0.45, height: 30.64 },
    { componentKey: "sink-faucet", left: 68.85, top: 50.73, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.65, top: 58.81, width: 7.07, height: 29.25 },
    { componentKey: "oven-module", left: 24.72, top: 58.81, width: 14.14, height: 29.25 },
    { componentKey: "base-module-2", left: 38.86, top: 58.81, width: 14.12, height: 29.25 },
    { componentKey: "base-module-3", left: 52.98, top: 58.81, width: 14.12, height: 29.25 },
    { componentKey: "sink-base", left: 67.1, top: 58.81, width: 14.13, height: 29.25 },
    { componentKey: "drawer-module", left: 81.23, top: 58.81, width: 15.07, height: 29.25 },
  ],
  "ab-105810": [
    { componentKey: "refrigerator", left: 3.9, top: 27.88, width: 12.97, height: 59.48 },
    { componentKey: "wall-cabinet-1", left: 18.12, top: 15.77, width: 10.51, height: 23.91 },
    { componentKey: "wall-cabinet-2", left: 28.63, top: 15.77, width: 14.02, height: 23.91 },
    { componentKey: "extractor-hood", left: 28.63, top: 39.68, width: 14.02, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 42.65, top: 15.77, width: 9.34, height: 23.91 },
    { componentKey: "wall-cabinet-4", left: 51.99, top: 15.77, width: 14.01, height: 23.91 },
    { componentKey: "wall-cabinet-5", left: 66, top: 15.77, width: 14.01, height: 23.91 },
    { componentKey: "wall-cabinet-6", left: 80.01, top: 15.77, width: 14.01, height: 23.91 },
    { componentKey: "worktop", left: 18.12, top: 57.02, width: 76.61, height: 1.35 },
    { componentKey: "worktop", left: 17.67, top: 56.98, width: 0.45, height: 30.38 },
    { componentKey: "sink-faucet", left: 67.65, top: 50.15, width: 4.35, height: 8 },
    { componentKey: "base-module-1", left: 18.12, top: 58.37, width: 10.51, height: 28.99 },
    { componentKey: "oven-module", left: 28.63, top: 58.37, width: 14.02, height: 28.99 },
    { componentKey: "base-module-2", left: 42.65, top: 58.37, width: 9.34, height: 28.99 },
    { componentKey: "base-module-3", left: 51.99, top: 58.37, width: 14.01, height: 28.99 },
    { componentKey: "sink-base", left: 66, top: 58.37, width: 14.01, height: 28.99 },
    { componentKey: "drawer-module", left: 80.01, top: 58.37, width: 14.01, height: 28.99 },
  ],
  "ab-105812": [
    { componentKey: "refrigerator", left: 2.51, top: 29.15, width: 13.19, height: 60.54 },
    { componentKey: "wall-cabinet-1", left: 17.07, top: 16.85, width: 7.11, height: 24.32 },
    { componentKey: "wall-cabinet-2", left: 24.18, top: 16.85, width: 14.28, height: 24.32 },
    { componentKey: "extractor-hood", left: 24.18, top: 41.17, width: 14.28, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.46, top: 16.85, width: 14.26, height: 24.32 },
    { componentKey: "wall-cabinet-4", left: 52.72, top: 16.85, width: 14.25, height: 24.32 },
    { componentKey: "wall-cabinet-5", left: 66.97, top: 16.85, width: 14.26, height: 24.32 },
    { componentKey: "wall-cabinet-6", left: 81.23, top: 16.85, width: 14.27, height: 24.32 },
    { componentKey: "worktop", left: 17.07, top: 58.83, width: 78.43, height: 1.33 },
    { componentKey: "worktop", left: 16.62, top: 58.79, width: 0.45, height: 30.91 },
    { componentKey: "sink-faucet", left: 68.77, top: 52.16, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.07, top: 60.16, width: 7.11, height: 29.54 },
    { componentKey: "oven-module", left: 24.18, top: 60.16, width: 14.28, height: 29.54 },
    { componentKey: "base-module-2", left: 38.46, top: 60.16, width: 14.26, height: 29.54 },
    { componentKey: "base-module-3", left: 52.72, top: 60.16, width: 14.25, height: 29.54 },
    { componentKey: "sink-base", left: 66.97, top: 60.16, width: 14.26, height: 29.54 },
    { componentKey: "drawer-module", left: 81.23, top: 60.16, width: 14.27, height: 29.54 },
  ],
  "ab-105814": [
    // Pixel-traced from AB 105814.svg (842x595); the old values were copied
    // from a cropped dashboard preview and shifted the refrigerator/lower run.
    { componentKey: "refrigerator", left: 2.375297, top: 27.731092, width: 14.489312, height: 59.663866 },
    { componentKey: "wall-cabinet-1", left: 18.052257, top: 15.630252, width: 10.570071, height: 24.033613 },
    { componentKey: "wall-cabinet-2", left: 28.622327, top: 15.630252, width: 14.014252, height: 24.033613 },
    { componentKey: "extractor-hood", left: 28.622327, top: 39.663866, width: 14.014252, height: 7.058824 },
    { componentKey: "wall-cabinet-3", left: 42.636579, top: 15.630252, width: 9.382423, height: 24.033613 },
    { componentKey: "wall-cabinet-4", left: 52.019002, top: 15.630252, width: 14.014252, height: 24.033613 },
    { componentKey: "wall-cabinet-5", left: 66.033254, top: 15.630252, width: 14.014252, height: 24.033613 },
    { componentKey: "wall-cabinet-6", left: 80.047506, top: 15.630252, width: 14.608076, height: 24.033613 },
    { componentKey: "worktop", left: 17.695962, top: 56.974790, width: 76.959620, height: 1.344538 },
    { componentKey: "sink-faucet", left: 68.2, top: 51.95, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.695962, top: 58.319328, width: 10.926365, height: 29.075630 },
    { componentKey: "oven-module", left: 28.622327, top: 58.319328, width: 14.014252, height: 29.075630 },
    { componentKey: "base-module-2", left: 42.636579, top: 58.319328, width: 9.263658, height: 29.075630 },
    { componentKey: "base-module-3", left: 51.900237, top: 58.319328, width: 14.014252, height: 29.075630 },
    { componentKey: "sink-base", left: 65.914489, top: 58.319328, width: 14.014252, height: 29.075630 },
    { componentKey: "drawer-module", left: 79.928741, top: 58.319328, width: 14.014252, height: 29.075630 },
  ],
  "ab-105816": [
    { componentKey: "refrigerator", left: 2.96, top: 28.31, width: 13.19, height: 60.44 },
    { componentKey: "wall-cabinet-1", left: 17.18, top: 15.97, width: 7.11, height: 24.27 },
    { componentKey: "wall-cabinet-2", left: 24.29, top: 15.97, width: 14.25, height: 24.27 },
    { componentKey: "extractor-hood", left: 24.29, top: 40.24, width: 14.25, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.54, top: 15.97, width: 14.24, height: 24.27 },
    { componentKey: "wall-cabinet-4", left: 52.78, top: 15.97, width: 14.22, height: 24.27 },
    { componentKey: "wall-cabinet-5", left: 67.0, top: 15.97, width: 14.23, height: 24.27 },
    { componentKey: "wall-cabinet-6", left: 81.23, top: 15.97, width: 15.21, height: 24.27 },
    { componentKey: "worktop", left: 17.17, top: 57.9, width: 79.27, height: 1.35 },
    { componentKey: "worktop", left: 16.72, top: 57.86, width: 0.45, height: 30.89 },
    { componentKey: "sink-faucet", left: 68.75, top: 51.95, width: 4.35, height: 8 },
    { componentKey: "base-module-1", left: 17.17, top: 59.25, width: 7.12, height: 29.5 },
    { componentKey: "oven-module", left: 24.29, top: 59.25, width: 14.25, height: 29.5 },
    { componentKey: "base-module-2", left: 38.54, top: 59.25, width: 14.24, height: 29.5 },
    { componentKey: "base-module-3", left: 52.78, top: 59.25, width: 14.22, height: 29.5 },
    { componentKey: "sink-base", left: 67.0, top: 59.25, width: 14.23, height: 29.5 },
    { componentKey: "drawer-module", left: 81.23, top: 59.25, width: 15.21, height: 29.5 },
  ],
  "ab-105819": [
    { componentKey: "wall-cabinet-1", left: 3.23, top: 17.34, width: 16.11, height: 26.73 },
    { componentKey: "wall-cabinet-2", left: 19.34, top: 17.34, width: 15.67, height: 26.73 },
    { componentKey: "wall-cabinet-3", left: 35.01, top: 17.34, width: 15.67, height: 26.73 },
    { componentKey: "wall-cabinet-4", left: 50.68, top: 17.34, width: 15.68, height: 26.73 },
    { componentKey: "extractor-hood", left: 50.68, top: 44.07, width: 15.68, height: 7.05 },
    { componentKey: "worktop", left: 3.68, top: 63.47, width: 62.68, height: 1.35 },
    { componentKey: "worktop", left: 66.36, top: 63.57, width: 0.45, height: 33.87 },
    { componentKey: "sink-faucet", left: 30.18, top: 56.05, width: 1.48, height: 7.42 },
    { componentKey: "base-module-1", left: 3.23, top: 64.82, width: 16.11, height: 32.62 },
    { componentKey: "sink-base", left: 19.34, top: 64.82, width: 15.67, height: 32.62 },
    { componentKey: "base-module-3", left: 35.01, top: 64.82, width: 15.67, height: 32.62 },
    { componentKey: "oven-module", left: 50.68, top: 64.82, width: 15.68, height: 32.62 },
    { componentKey: "refrigerator", left: 69.75, top: 31.0, width: 14.52, height: 66.43 },
  ],
  "ab-105821": [
    { componentKey: "wall-cabinet-1", left: 6.27, top: 17.98, width: 14.76, height: 26.45 },
    { componentKey: "wall-cabinet-2", left: 21.03, top: 17.98, width: 15.47, height: 26.45 },
    { componentKey: "wall-cabinet-3", left: 36.51, top: 17.98, width: 15.5, height: 26.45 },
    { componentKey: "wall-cabinet-4", left: 52.01, top: 17.98, width: 15.5, height: 26.45 },
    { componentKey: "extractor-hood", left: 52.01, top: 44.44, width: 15.5, height: 7.05 },
    { componentKey: "wall-cabinet-5", left: 67.51, top: 17.98, width: 7.75, height: 26.45 },
    { componentKey: "worktop", left: 6.27, top: 63.63, width: 69.39, height: 1.49 },
    { componentKey: "worktop", left: 75.26, top: 63.63, width: 0.41, height: 33.59 },
    { componentKey: "sink-faucet", left: 31.43, top: 56.21, width: 1.51, height: 7.42, preserveManualSize: true },
    { componentKey: "base-module-1", left: 6.27, top: 65.12, width: 14.76, height: 32.1 },
    { componentKey: "sink-base", left: 21.03, top: 65.12, width: 15.47, height: 32.1 },
    { componentKey: "base-module-3", left: 36.51, top: 65.12, width: 15.5, height: 32.1 },
    { componentKey: "oven-module", left: 52.01, top: 65.12, width: 15.5, height: 32.1 },
    { componentKey: "drawer-module", left: 67.51, top: 65.12, width: 7.75, height: 32.1 },
    { componentKey: "refrigerator", left: 77.2, top: 31.37, width: 14.38, height: 66.08 },
  ],
  "ab-105827": [
    { componentKey: "wall-cabinet-1", left: 12.11, top: 15.85, width: 12.28, height: 22.88 },
    { componentKey: "wall-cabinet-2", left: 24.39, top: 15.85, width: 13.41, height: 22.88 },
    { componentKey: "wall-cabinet-3", left: 37.8, top: 15.85, width: 13.44, height: 22.88 },
    { componentKey: "wall-cabinet-4", left: 51.24, top: 15.85, width: 13.42, height: 22.88 },
    { componentKey: "extractor-hood", left: 51.24, top: 38.73, width: 13.42, height: 7.05 },
    { componentKey: "wall-cabinet-5", left: 64.66, top: 15.85, width: 7.01, height: 22.88 },
    { componentKey: "worktop", left: 12.11, top: 55.36, width: 59.71, height: 1.25 },
    { componentKey: "worktop", left: 71.37, top: 55.36, width: 0.45, height: 24.12 },
    { componentKey: "sink-faucet", left: 31.5, top: 47.5, width: 3.25, height: 9.4, preserveManualSize: true },
    { componentKey: "base-module-1", left: 12.11, top: 56.61, width: 12.28, height: 22.87 },
    { componentKey: "sink-base", left: 24.39, top: 56.61, width: 13.41, height: 22.87 },
    { componentKey: "base-module-3", left: 37.8, top: 56.61, width: 13.44, height: 22.87 },
    { componentKey: "oven-module", left: 51.24, top: 56.61, width: 13.42, height: 22.87 },
    { componentKey: "drawer-module", left: 64.66, top: 56.61, width: 7.16, height: 22.87 },
    { componentKey: "refrigerator", left: 73.04, top: 27.44, width: 12.44, height: 56.99 },
  ],
  "ab-105835": [
    { componentKey: "wall-cabinet-1", left: 0.9, top: 18.87, width: 14.46, height: 22.8 },
    { componentKey: "wall-cabinet-2", left: 15.36, top: 18.87, width: 13.38, height: 22.8 },
    { componentKey: "extractor-hood", left: 15.36, top: 41.67, width: 13.38, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 28.74, top: 18.87, width: 13.38, height: 22.8 },
    { componentKey: "wall-cabinet-4", left: 42.12, top: 18.87, width: 13.38, height: 22.8 },
    { componentKey: "wall-cabinet-5", left: 55.5, top: 18.87, width: 13.37, height: 22.8 },
    { componentKey: "wall-cabinet-6", left: 68.87, top: 18.87, width: 13.37, height: 22.8, preserveManualSize: true },
    { componentKey: "worktop", left: 0.9, top: 58.25, width: 82.14, height: 1.23 },
    { componentKey: "worktop", left: 82.59, top: 58.25, width: 0.45, height: 24.05 },
    { componentKey: "sink-faucet", left: 49.5, top: 51.5, width: 3.85, height: 8 },
    { componentKey: "base-module-1", left: 0.9, top: 59.48, width: 14.46, height: 22.82 },
    { componentKey: "oven-module", left: 15.36, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "base-module-2", left: 28.74, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "sink-base", left: 42.12, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "base-module-3", left: 55.5, top: 59.48, width: 13.37, height: 22.82 },
    { componentKey: "drawer-module", left: 68.87, top: 59.48, width: 14.17, height: 22.82 },
    { componentKey: "refrigerator", left: 84.61, top: 30.3, width: 12.4, height: 56.7 },
  ],
  "ab-105836": [
    { componentKey: "refrigerator", left: 2.3, top: 31.85, width: 10.54, height: 46.8, preserveManualSize: true },
    { componentKey: "worktop", left: 13.23, top: 54.78, width: 0.45, height: 23.94, preserveManualSize: true },
    { componentKey: "wall-cabinet-1", left: 13.75, top: 22.3, width: 10.85, height: 18.71 },
    { componentKey: "wall-cabinet-2", left: 24.73, top: 22.3, width: 11.06, height: 18.71 },
    { componentKey: "extractor-hood", left: 24.73, top: 41.07, width: 11.06, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 35.79, top: 22.3, width: 14.0, height: 18.71 },
    { componentKey: "worktop", left: 13.68, top: 54.78, width: 35.96, height: 1.05 },
    { componentKey: "base-module-1", left: 13.68, top: 55.83, width: 11.04, height: 22.89, preserveManualSize: true },
    { componentKey: "oven-module", left: 24.73, top: 55.83, width: 11.06, height: 22.89, preserveManualSize: true },
    { componentKey: "base-module-2", left: 35.79, top: 55.83, width: 14.0, height: 22.89, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 63.66, top: 22.94, width: 10.55, height: 18.71 },
    { componentKey: "wall-cabinet-5", left: 74.21, top: 22.94, width: 11.06, height: 18.71 },
    { componentKey: "wall-cabinet-6", left: 85.27, top: 22.94, width: 11.75, height: 18.71 },
    { componentKey: "worktop", left: 63.66, top: 54.78, width: 33.37, height: 1.05 },
    { componentKey: "sink-faucet", left: 80.5, top: 48.0, width: 2.85, height: 8, preserveManualSize: true },
    { componentKey: "base-module-3", left: 63.66, top: 55.83, width: 10.55, height: 22.89, preserveManualSize: true },
    { componentKey: "sink-base", left: 74.21, top: 55.83, width: 11.06, height: 22.89, preserveManualSize: true },
    { componentKey: "drawer-module", left: 85.27, top: 55.83, width: 11.76, height: 22.89, preserveManualSize: true },
  ],
  "ab-105842": [
    { componentKey: "refrigerator", left: 3.27, top: 33.29, width: 10.04, height: 44.93, preserveManualSize: true },
    { componentKey: "worktop", left: 14.62, top: 55.55, width: 0.27, height: 22.99, preserveManualSize: true },
    { componentKey: "wall-cabinet-1", left: 14.89, top: 24.29, width: 10.62, height: 18.11 },
    { componentKey: "wall-cabinet-2", left: 25.51, top: 24.25, width: 10.62, height: 18.11 },
    { componentKey: "extractor-hood", left: 25.51, top: 42.36, width: 10.62, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 36.13, top: 24.25, width: 11.5, height: 18.11 },
    { componentKey: "worktop", left: 14.89, top: 55.55, width: 32.74, height: 1.01 },
    { componentKey: "base-module-1", left: 14.89, top: 56.56, width: 10.62, height: 21.98, preserveManualSize: true },
    { componentKey: "oven-module", left: 25.51, top: 56.56, width: 10.62, height: 21.98, preserveManualSize: true },
    { componentKey: "base-module-2", left: 36.13, top: 56.56, width: 11.5, height: 21.98, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 65.15, top: 24.25, width: 10.17, height: 18.11 },
    { componentKey: "wall-cabinet-5", left: 75.32, top: 24.25, width: 10.62, height: 18.11 },
    { componentKey: "wall-cabinet-6", left: 85.94, top: 24.25, width: 11.13, height: 18.11 },
    { componentKey: "worktop", left: 65.15, top: 55.55, width: 31.92, height: 1.01 },
    { componentKey: "sink-faucet", left: 80.6, top: 49.0, width: 3.85, height: 7, preserveManualSize: true },
    { componentKey: "base-module-3", left: 65.15, top: 56.56, width: 10.17, height: 21.98, preserveManualSize: true },
    { componentKey: "sink-base", left: 75.32, top: 56.56, width: 10.62, height: 21.98, preserveManualSize: true },
    { componentKey: "drawer-module", left: 85.94, top: 56.56, width: 11.13, height: 21.98, preserveManualSize: true },
  ],
  "ab-105845": [
    // Exact cabinet strokes measured from the official 800 x 600 vector PDF.
    { componentKey: "refrigerator", left: 3.05625, top: 38.12667, width: 9.34125, height: 39.98833, preserveManualSize: true },
    { componentKey: "wall-cabinet-1", left: 12.88375, top: 28.80667, width: 10.08125, height: 16.19833, preserveManualSize: true },
    { componentKey: "wall-cabinet-2", left: 22.965, top: 28.80667, width: 5.04125, height: 16.19833, preserveManualSize: true },
    { componentKey: "wall-cabinet-3", left: 28.00625, top: 28.80667, width: 10.08, height: 16.19833, preserveManualSize: true },
    { componentKey: "extractor-hood", left: 28.00625, top: 45.005, width: 10.08, height: 1.12, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 38.08625, top: 28.80667, width: 10.585, height: 16.19833, preserveManualSize: true },
    { componentKey: "worktop", left: 12.615, top: 57.885, width: 36.05625, height: 0.89667, preserveManualSize: true },
    { componentKey: "base-module-1", left: 12.88375, top: 58.78167, width: 10.08125, height: 19.67, preserveManualSize: true },
    { componentKey: "base-module-2", left: 22.965, top: 58.78167, width: 5.04125, height: 19.67, preserveManualSize: true },
    { componentKey: "oven-module", left: 28.00625, top: 58.78167, width: 10.08, height: 19.67, preserveManualSize: true },
    { componentKey: "base-module-3", left: 38.08625, top: 58.78167, width: 10.585, height: 19.67, preserveManualSize: true },
    { componentKey: "wall-cabinet-5", left: 65.44125, top: 28.80667, width: 11.005, height: 16.19833, preserveManualSize: true },
    { componentKey: "wall-cabinet-6", left: 76.44625, top: 28.80667, width: 10.08125, height: 16.19833, preserveManualSize: true },
    { componentKey: "wall-cabinet-7", left: 86.5275, top: 28.80667, width: 7.56125, height: 16.19833, preserveManualSize: true },
    { componentKey: "wall-cabinet-8", left: 94.08875, top: 28.80667, width: 5.62875, height: 16.19833, preserveManualSize: true },
    { componentKey: "worktop", left: 65.44125, top: 57.885, width: 34.27625, height: 0.89667, preserveManualSize: true },
    { componentKey: "sink-faucet", left: 82.8475, top: 53.59667, width: 0.94375, height: 4.28833, preserveManualSize: true },
    { componentKey: "base-module-4", left: 65.44125, top: 58.78167, width: 11.005, height: 19.67, preserveManualSize: true },
    { componentKey: "sink-base", left: 76.44625, top: 58.78167, width: 10.08125, height: 19.67, preserveManualSize: true },
    { componentKey: "dishwasher-base", left: 86.5275, top: 58.78167, width: 7.56125, height: 19.67, preserveManualSize: true },
    { componentKey: "drawer-module", left: 94.08875, top: 58.78167, width: 5.62875, height: 19.67, preserveManualSize: true },
  ],
  "ab-105847": [
    { componentKey: "wall-cabinet-1", left: 14.90875, top: 38.54333, width: 5.69875, height: 8.72, preserveManualSize: true },
    // The extractor is sold with its HD6002 cabinet; use one contiguous package hit area.
    { componentKey: "wall-cabinet-2", left: 20.6075, top: 38.54333, width: 5.4275, height: 10.75667, preserveManualSize: true },
    { componentKey: "wall-cabinet-3", left: 26.035, top: 38.54333, width: 5.42625, height: 8.72, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 31.46125, top: 38.54333, width: 2.71375, height: 8.72, preserveManualSize: true },
    { componentKey: "worktop", left: 14.90875, top: 54.19833, width: 19.41125, height: 0.48167, preserveManualSize: true },
    { componentKey: "base-module-1", left: 14.90875, top: 54.68, width: 5.69875, height: 10.58833, preserveManualSize: true },
    { componentKey: "oven-module", left: 20.6075, top: 54.68, width: 5.4275, height: 10.58833, preserveManualSize: true },
    { componentKey: "base-module-2", left: 26.035, top: 54.68, width: 5.42625, height: 10.58833, preserveManualSize: true },
    { componentKey: "base-module-3", left: 31.46125, top: 54.68, width: 2.71375, height: 10.58833, preserveManualSize: true },
    { componentKey: "refrigerator", left: 34.62125, top: 43.56167, width: 5.02875, height: 21.52667, preserveManualSize: true },
    { componentKey: "wall-cabinet-5", left: 50.95875, top: 38.54333, width: 3.07625, height: 8.72, preserveManualSize: true },
    { componentKey: "wall-cabinet-6", left: 54.0775, top: 38.54333, width: 4.07, height: 8.72, preserveManualSize: true },
    { componentKey: "wall-cabinet-7", left: 58.1475, top: 38.54333, width: 5.42625, height: 8.72, preserveManualSize: true },
    { componentKey: "wall-cabinet-8", left: 63.57375, top: 38.54333, width: 5.83375, height: 8.72, preserveManualSize: true },
    { componentKey: "worktop", left: 50.95875, top: 54.19833, width: 18.45125, height: 0.48167, preserveManualSize: true },
    { componentKey: "sink-faucet", left: 59.25, top: 51.65, width: 0.65, height: 2.55, preserveManualSize: true },
    { componentKey: "base-module-4", left: 50.95875, top: 54.68, width: 3.07625, height: 10.58833, preserveManualSize: true },
    { componentKey: "base-module-5", left: 54.0775, top: 54.68, width: 4.07, height: 10.58833, preserveManualSize: true },
    { componentKey: "sink-base", left: 58.1475, top: 54.68, width: 5.42625, height: 10.58833, preserveManualSize: true },
    { componentKey: "base-module-6", left: 63.57375, top: 54.68, width: 5.83375, height: 10.58833, preserveManualSize: true },
  ],
  "ab-105846": [
    // Exact visible faces traced from the source PDF's vector linework.
    { componentKey: "refrigerator", points: [[67.952494, 26.265546], [80.380048, 24.45042], [90.028504, 26.447059], [77.615202, 28.242017]] },
    { componentKey: "refrigerator", points: [[67.952494, 26.265546], [77.615202, 28.242017], [77.615202, 95.643697], [67.952494, 93.647059]] },
    { componentKey: "refrigerator", points: [[77.615202, 28.242017], [90.028504, 26.447059], [90.028504, 93.828571], [77.615202, 95.643697]] },
    { componentKey: "wall-cabinet-1", points: [[46.118765, 3.717647], [46.988124, 3.89916], [46.988124, 31.347899], [46.118765, 31.166387]] },
    { componentKey: "wall-cabinet-1", points: [[46.988124, 3.89916], [57.420428, 6.036975], [57.420428, 33.485714], [46.988124, 31.347899]] },
    { componentKey: "wall-cabinet-1", points: [[46.988124, 3.89916], [54.028504, 2.870588], [64.460808, 5.008403], [57.420428, 6.036975]] },
    { componentKey: "wall-cabinet-2", points: [[57.420428, 6.036975], [67.83848, 8.17479], [67.83848, 35.623529], [57.420428, 33.485714]] },
    { componentKey: "wall-cabinet-2", points: [[57.420428, 6.036975], [64.460808, 5.008403], [74.87886, 7.166387], [67.83848, 8.17479]] },
    { componentKey: "extractor-hood", points: [[57.420428, 33.485714], [67.83848, 35.623529], [67.83848, 37.519328], [57.420428, 35.381513]] },
    { componentKey: "extractor-hood", points: [[59.2019, 40.262185], [59.771971, 37.196639], [60.213777, 37.297479], [61.239905, 40.685714]] },
    { componentKey: "extractor-hood", points: [[64.489311, 41.351261], [65.059382, 38.285714], [65.501188, 38.386555], [66.513064, 41.77479]] },
    { componentKey: "wall-cabinet-3", points: [[67.83848, 8.17479], [74.87886, 7.166387], [80.095012, 8.235294], [73.054632, 9.243697]] },
    { componentKey: "wall-cabinet-3", points: [[67.83848, 8.17479], [73.054632, 9.243697], [73.054632, 25.519328], [67.952494, 26.265546], [67.83848, 26.248739]] },
    { componentKey: "wall-cabinet-3", points: [[73.054632, 9.243697], [80.095012, 8.235294], [80.095012, 24.410084], [73.054632, 25.519328]] },
    { componentKey: "worktop", points: [[6.783848, 58.695798], [53.159145, 51.979832], [67.952494, 55.005042], [67.952494, 60.894118], [51.163895, 57.42521], [17.2019, 62.346218], [6.783848, 60.208403]] },
    { componentKey: "sink-end-blende", points: [[7.610451, 60.087395], [18.028504, 62.22521], [18.028504, 95.563025], [7.610451, 93.42521]] },
    { componentKey: "sink-base", points: [[18.028504, 62.22521], [27.349169, 60.87395], [27.349169, 94.211765], [18.028504, 95.563025]] },
    { componentKey: "base-module-3", points: [[27.349169, 60.87395], [39.776722, 59.078992], [39.776722, 92.416807], [27.349169, 94.211765]] },
    { componentKey: "base-module-1", points: [[39.776722, 59.078992], [52.033254, 57.606723], [52.033254, 90.944538], [39.776722, 92.416807]] },
    { componentKey: "oven-module", points: [[52.033254, 57.606723], [62.465558, 59.764706], [62.465558, 93.082353], [52.033254, 90.944538]] },
    { componentKey: "base-module-2", points: [[62.465558, 59.764706], [67.952494, 60.894118], [67.952494, 94.211765], [62.465558, 93.082353]] },
    { componentKey: "sink-faucet", points: [[13.268409, 51.314286], [13.268409, 51.052101], [13.28266, 50.789916], [13.311164, 50.527731], [13.353919, 50.265546], [13.410926, 50.003361], [13.467933, 49.761345], [13.553444, 49.539496], [13.638955, 49.317647], [13.738717, 49.136134], [13.83848, 48.97479], [13.952494, 48.833613], [14.066508, 48.712605], [14.194774, 48.631933], [14.308789, 48.591597], [14.437055, 48.551261], [14.551069, 48.551261], [17.016627, 48.672269], [16.95962, 49.741176], [14.593824, 49.620168], [14.437055, 49.640336], [14.280285, 49.721008], [14.123515, 49.882353], [13.995249, 50.12437], [13.881235, 50.406723], [13.809976, 50.729412], [13.767221, 51.072269], [13.752969, 51.415126]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[13.268409, 51.314286], [13.752969, 51.415126], [13.852732, 58.776471], [13.154394, 58.736134]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[16.973872, 47.72437], [17.657957, 47.986555], [17.472684, 51.737815], [16.788599, 51.536134]], preserveManualSize: true },
  ],
  "ab-105822": [
    { componentKey: "refrigerator", left: 8.54, top: 28.69, width: 13.13, height: 59.66 },
    { componentKey: "wall-cabinet-1", left: 23.62, top: 16.41, width: 11.79, height: 24.19 },
    { componentKey: "wall-cabinet-2", left: 35.41, top: 16.41, width: 14.18, height: 24.19 },
    { componentKey: "extractor-hood", left: 35.41, top: 40.6, width: 14.18, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 49.59, top: 16.41, width: 14.17, height: 24.19 },
    { componentKey: "wall-cabinet-4", left: 63.76, top: 16.41, width: 14.17, height: 24.19 },
    { componentKey: "wall-cabinet-5", left: 77.93, top: 16.41, width: 14.18, height: 24.19 },
    { componentKey: "worktop", left: 23.24, top: 58.17, width: 70.5, height: 1.33 },
    { componentKey: "worktop", left: 23.24, top: 59.5, width: 0.45, height: 29.16, preserveManualSize: true },
    { componentKey: "base-module-1", left: 23.63, top: 59.5, width: 11.8, height: 24.16 },
    { componentKey: "oven-module", left: 35.43, top: 59.5, width: 14.16, height: 24.16 },
    { componentKey: "base-module-2", left: 49.6, top: 59.5, width: 14.17, height: 24.16 },
    { componentKey: "base-module-3", left: 63.77, top: 59.5, width: 14.16, height: 24.16 },
    { componentKey: "sink-base", left: 77.94, top: 59.5, width: 14.16, height: 24.16 },
    { componentKey: "sink-faucet", left: 80.05, top: 51, width: 4.25, height: 7.5, preserveManualSize: true },
  ],
  "ab-105826": [
    { componentKey: "refrigerator", left: 6.10, top: 28.5, width: 13.0, height: 59.5 },
    { componentKey: "wall-cabinet-1", left: 20.8, top: 16.45, width: 14.05, height: 23.99 },
    { componentKey: "wall-cabinet-2", left: 34.85, top: 16.45, width: 14.1, height: 23.99 },
    { componentKey: "extractor-hood", left: 34.85, top: 40.44, width: 14.1, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 48.95, top: 16.45, width: 14.06, height: 23.99 },
    { componentKey: "wall-cabinet-4", left: 63.01, top: 16.45, width: 14.08, height: 23.99 },
    { componentKey: "wall-cabinet-5", left: 77.09, top: 16.45, width: 15.73, height: 23.99 },
    { componentKey: "worktop", left: 20.8, top: 57.89, width: 72.02, height: 1.35 },
    { componentKey: "worktop", left: 20.35, top: 57.89, width: 0.45, height: 25.3 },
    { componentKey: "sink-faucet", left: 79.05, top: 51.0, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 20.8, top: 59.15, width: 14.05, height: 24.04 },
    { componentKey: "oven-module", left: 34.85, top: 59.15, width: 14.1, height: 24.04 },
    { componentKey: "base-module-2", left: 48.95, top: 59.15, width: 14.06, height: 24.04 },
    { componentKey: "base-module-3", left: 63.01, top: 59.15, width: 14.08, height: 24.04 },
    { componentKey: "sink-base", left: 77.09, top: 59.15, width: 15.73, height: 24.04 },
  ],
  "ab-105833": [
    { componentKey: "refrigerator", left: 5.42, top: 31.88, width: 10.17, height: 46.12 },
    { componentKey: "wall-cabinet-1", left: 17.1, top: 22.37, width: 9.08, height: 18.75 },
    { componentKey: "wall-cabinet-2", left: 26.14, top: 22.37, width: 10.90, height: 18.75 },
    { componentKey: "extractor-hood", left: 26.18, top: 41.0, width: 10.91, height: 5.5 },
    { componentKey: "wall-cabinet-3", left: 37.09, top: 22.37
      , width: 11.9, height: 18.75 },
    { componentKey: "wall-cabinet-4", left: 64.21, top: 22.37, width: 10.44, height:18.75 },
    { componentKey: "wall-cabinet-5", left: 74.65, top: 22.37, width: 10.89, height: 18.75 },
    { componentKey: "wall-cabinet-6", left: 85.54, top: 22.37, width: 11.6, height: 18.75},
    { componentKey: "worktop", left: 16.81, top: 54.56, width: 32.09, height: 1.04 },
    { componentKey: "worktop", left: 64.21, top: 54.56, width: 32.83, height: 1.04 },
    { componentKey: "worktop", left: 16.81, top: 54.56, width: 0.29, height: 23.61, preserveManualSize: true },
    { componentKey: "sink-faucet", left: 81.05, top: 49.25, width: 3.35, height: 5.45, preserveManualSize: true },
    { componentKey: "base-module-1", left: 17.1, top: 55.6, width: 9.08, height: 22.57, preserveManualSize: true },
    { componentKey: "oven-module", left: 26.18, top: 55.6, width: 10.91, height: 22.57, preserveManualSize: true },
    { componentKey: "base-module-2", left: 37.09, top: 55.6, width: 11.8, height: 22.57, preserveManualSize: true },
    { componentKey: "base-module-3", left: 64.21, top: 55.6, width: 10.44, height: 22.57, preserveManualSize: true },
    { componentKey: "sink-base", left: 74.65, top: 55.6, width: 10.89, height: 22.57, preserveManualSize: true },
    { componentKey: "drawer-module", left: 85.54, top: 55.6, width: 11.6, height: 22.57, preserveManualSize: true },
  ],
  "ab-105820": [
    { componentKey: "refrigerator", left: 2.14, top: 29.82, width: 13.19, height: 60.48 },
    { componentKey: "wall-cabinet-1", left: 17.16, top: 17.5, width: 7.12, height: 24.27 },
    { componentKey: "wall-cabinet-2", left: 24.28, top: 17.5, width: 14.24, height: 24.27 },
    { componentKey: "extractor-hood", left: 24.28, top: 41.77, width: 14.24, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.52, top: 17.5, width: 14.26, height: 24.27 },
    { componentKey: "wall-cabinet-4", left: 52.78, top: 17.5, width: 14.23, height: 24.27 },
    { componentKey: "wall-cabinet-5", left: 67.01, top: 17.5, width: 14.25, height: 24.27 },
    { componentKey: "wall-cabinet-6", left: 81.26, top: 17.5, width: 14.24, height: 24.27 },
    { componentKey: "worktop", left: 17.16, top: 59.48, width: 78.34, height: 1.4 },
    { componentKey: "worktop", left: 16.71, top: 59.44, width: 0.45, height: 30.86 },
    { componentKey: "sink-faucet", left: 68.06, top: 52.88, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.16, top: 60.88, width: 7.12, height: 29.42 },
    { componentKey: "oven-module", left: 24.28, top: 60.88, width: 14.24, height: 29.42 },
    { componentKey: "base-module-2", left: 38.52, top: 60.88, width: 14.26, height: 29.42 },
    { componentKey: "base-module-3", left: 52.78, top: 60.88, width: 14.23, height: 29.42 },
    { componentKey: "sink-base", left: 67.01, top: 60.88, width: 14.25, height: 29.42 },
    { componentKey: "drawer-module", left: 81.26, top: 60.88, width: 14.24, height: 29.42 },
  ],
  "ab-105841": [
    { componentKey: "wall-cabinet-1", left: 1.55, top: 19.23, width: 13.33, height: 22.73 },
    { componentKey: "wall-cabinet-2", left: 14.88, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "extractor-hood", left: 14.88, top: 41.9, width: 13.32, height: 5.5 },
    { componentKey: "wall-cabinet-3", left: 28.2, top: 19.23, width: 13.34, height: 22.73 },
    { componentKey: "wall-cabinet-4", left: 41.54, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "wall-cabinet-5", left: 54.86, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "wall-cabinet-6", left: 68.18, top: 19.23, width: 13.34, height: 22.73 },
    { componentKey: "worktop", left: 1.55, top: 58.47, width: 80.33, height: 1.4 },
    { componentKey: "worktop", left: 81.88, top: 59.9, width: 0.45, height: 27.44 },
    { componentKey: "sink-faucet", left: 49.19, top: 51.87, width: 4.53, height: 8 },
    { componentKey: "base-module-1", left: 1.55, top: 59.9, width: 13.33, height: 27.44 },
    { componentKey: "oven-module", left: 14.88, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "base-module-2", left: 28.2, top: 59.9, width: 13.34, height: 27.44 },
    { componentKey: "sink-base", left: 41.54, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "base-module-3", left: 54.86, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "drawer-module", left: 68.18, top: 59.9, width: 13.7, height: 27.44 },
    { componentKey: "refrigerator", left: 85.15, top: 30.75, width: 12.35, height: 56.59 },
  ],
  "ab-105811": [
    // Pixel-traced from the actual 842 x 595 AB 105811 elevation. The old
    // values belonged to a cropped canvas and compressed the run leftward.
    { componentKey: "wall-cabinet-1", left: 2.850356, top: 17.310924, width: 16.508314, height: 26.722689 },
    { componentKey: "wall-cabinet-2", left: 19.358670, top: 17.310924, width: 15.676960, height: 26.722689 },
    { componentKey: "wall-cabinet-3", left: 35.035629, top: 17.310924, width: 15.676960, height: 26.722689 },
    { componentKey: "wall-cabinet-4", left: 50.712589, top: 17.310924, width: 15.558195, height: 26.722689 },
    { componentKey: "extractor-hood", left: 50.712589, top: 44.201681, width: 15.558195, height: 7.058824 },
    { componentKey: "worktop", left: 2.850356, top: 63.361345, width: 63.895487, height: 1.512605 },
    { componentKey: "sink-faucet", left: 29.928741, top: 55.966387, width: 3.206651, height: 7.731092 },
    { componentKey: "base-module-1", left: 3.681710, top: 64.873950, width: 15.676960, height: 32.605042 },
    { componentKey: "sink-base", left: 19.358670, top: 64.873950, width: 15.676960, height: 32.605042 },
    // This drawn panel is the ordered 60 cm dishwasher. Its kitchen item and
    // claim parts use base-module-3, so the plan hotspot must use the same key.
    { componentKey: "base-module-3", left: 35.035629, top: 64.873950, width: 15.676960, height: 32.605042 },
    { componentKey: "oven-module", left: 50.712589, top: 64.873950, width: 15.558195, height: 32.605042 },
    { componentKey: "refrigerator", left: 69.714964, top: 30.756303, width: 14.489312, height: 66.722689 },
  ],
  "ab-105733": [
    { componentKey: "wall-cabinet-1", left: 4.82, top: 17.18, width: 9.22, height: 26.71 },
    { componentKey: "wall-cabinet-2", left: 14.04, top: 17.18, width: 15.64, height: 26.71 },
    { componentKey: "wall-cabinet-3", left: 29.68, top: 17.18, width: 15.67, height: 26.71 },
    { componentKey: "wall-cabinet-4", left: 45.35, top: 17.18, width: 15.66, height: 26.71 },
    { componentKey: "extractor-hood", left: 45.35, top: 43.89, width: 15.66, height: 7.05 },
    { componentKey: "wall-cabinet-5", left: 61.01, top: 17.18, width: 15.66, height: 26.71 },
    { componentKey: "worktop", left: 4.82, top: 63.31, width: 72.52, height: 1.45 },
    { componentKey: "worktop", left: 76.52, top: 63.31, width: 0.42, height: 33.89 },
    { componentKey: "sink-faucet", left: 23.12, top: 57.64, width: 3.35, height: 7.12 },
    { componentKey: "base-module-1", left: 4.82, top: 64.76, width: 9.13, height: 32.44 },
    { componentKey: "sink-base", left: 13.95, top: 64.76, width: 15.67, height: 32.44 },
    { componentKey: "base-module-3", left: 29.62, top: 64.76, width: 15.65, height: 32.44 },
    { componentKey: "oven-module", left: 45.27, top: 64.76, width: 15.66, height: 32.44 },
    { componentKey: "base-module-2", left: 60.93, top: 64.76, width: 15.61, height: 32.44 },
    { componentKey: "refrigerator", left: 77.34, top: 30.77, width: 14.51, height: 65.81 },
  ],
  // 108134 MODUL 1 — single-wall run, fridge tall unit on the right. Edges auto-detected
  // from the 3509x2480 render (docs/detect-plan-hotspots.py) and overlay-verified.
  // Wall + base columns share dividers at 7.78/22.40/37.02/51.64/66.27/80.89% of width.
  "ab-105743": [
    // Exact faces retraced from the replacement 842 x 595 vector PDF.
    { componentKey: "wall-cabinet-1", points: [[45.420428,12.289076],[46.190024,12.45042],[46.190024,34.695798],[45.420428,34.534454]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[45.420428,12.289076],[51.890736,11.623529],[60.342043,13.357983],[54.64133,14.184874],[46.190024,12.45042]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[46.190024,12.45042],[54.64133,14.184874],[54.64133,36.430252],[46.190024,34.695798]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[54.64133,14.184874],[60.342043,13.357983],[68.779097,15.112605],[63.078385,15.919328]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[54.64133,14.184874],[63.078385,15.919328],[63.078385,38.164706],[54.64133,36.430252]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[54.64133,36.430252],[63.078385,38.164706],[63.078385,39.697479],[54.64133,37.963025]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[63.078385,38.164706],[67.396675,39.072269],[63.078385,39.697479]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[63.078385,15.919328],[68.779097,15.112605],[77.230404,16.847059],[71.529691,17.67395]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[63.078385,15.919328],[71.529691,17.67395],[71.529691,29.310924],[67.396675,29.915966],[67.396675,39.072269],[63.078385,38.164706]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[71.529691,17.67395],[77.230404,16.847059],[77.230404,28.484034],[71.529691,29.310924]], preserveManualSize: true },
    { componentKey: "worktop", points: [[8.351544,56.27563],[51.12114,50.084034],[59.572447,51.596639],[16.118765,57.889076]], preserveManualSize: true },
    { componentKey: "worktop", points: [[59.572447,51.596639],[67.396675,53.210084],[67.396675,56.719328],[49.496437,53.048739]], preserveManualSize: true },
    { componentKey: "worktop", points: [[8.351544,56.27563],[16.118765,57.889076],[49.496437,53.048739],[49.496437,54.278992],[16.118765,59.119328],[8.351544,57.42521]], preserveManualSize: true },
    { componentKey: "worktop", points: [[49.496437,53.048739],[67.396675,56.719328],[67.396675,57.94958],[49.496437,54.278992]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: AB_105743_FAUCET_POINTS, preserveManualSize: true },
    { componentKey: "base-module-1", points: [[8.351544,57.42521],[16.118765,59.119328],[16.118765,86.12437],[8.351544,84.289076]], preserveManualSize: true },
    { componentKey: "base-module-1", points: [[16.118765,59.119328],[16.788599,59.018487],[16.788599,86.023529],[16.118765,86.12437]], preserveManualSize: true },
    { componentKey: "base-module-1", points: [[16.788599,59.018487],[21.819477,58.292437],[21.819477,85.297479],[16.788599,86.023529]], preserveManualSize: true },
    { componentKey: "base-module-2", points: [[21.819477,58.292437],[28.532067,57.32437],[28.532067,84.329412],[21.819477,85.297479]], preserveManualSize: true },
    { componentKey: "sink-base", points: [[28.532067,57.32437],[38.593824,55.852101],[38.593824,82.857143],[28.532067,84.329412]], preserveManualSize: true },
    { componentKey: "base-module-3", points: [[38.593824,55.852101],[48.669834,54.4],[48.669834,81.405042],[38.593824,82.857143]], preserveManualSize: true },
    { componentKey: "base-module-3", points: [[48.669834,54.4],[49.496437,54.278992],[49.496437,81.284034],[48.669834,81.405042]], preserveManualSize: true },
    { componentKey: "base-module-3", points: [[49.496437,54.278992],[50.209026,54.420168],[50.209026,81.42521],[49.496437,81.284034]], preserveManualSize: true },
    { componentKey: "oven-module", points: [[50.209026,54.420168],[58.646081,56.154622],[58.646081,83.159664],[50.209026,81.42521]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[58.646081,56.154622],[67.097387,57.889076],[67.097387,84.894118],[58.646081,83.159664]], preserveManualSize: true },
    { componentKey: "worktop", points: [[67.097387,57.889076],[67.396675,57.94958],[67.396675,84.954622],[67.097387,84.894118]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[67.396675,29.915966],[75.220903,31.509244],[75.220903,86.104202],[67.396675,84.490756]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[75.220903,31.509244],[85.28266,30.057143],[85.28266,84.652101],[75.220903,86.104202]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[67.396675,29.915966],[77.458432,28.443697],[85.28266,30.057143],[75.220903,31.509244]], preserveManualSize: true },
  ],
  "ab-105748": [
    // Exact perspective faces traced from the 842 x 595 vector PDF.
    { componentKey: "refrigerator", points: [[13.467933, 29.25042], [23.087886, 27.858824], [31.795724, 29.653782], [22.175772, 31.045378]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[13.467933, 29.25042], [22.175772, 31.045378], [22.175772, 87.37479], [13.467933, 85.579832]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[22.175772, 31.045378], [31.795724, 29.653782], [31.795724, 85.983193], [22.175772, 87.37479]], preserveManualSize: true },

    // H4502: top, exposed left side and the visible front around the refrigerator.
    { componentKey: "wall-cabinet-1", points: [[30.869359, 14.789916], [23.087886, 15.919328], [28.019002, 16.947899], [35.814727, 15.818487]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[28.019002, 16.947899], [23.087886, 15.919328], [23.087886, 27.858824], [28.019002, 28.867227]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[28.019002, 16.947899], [35.814727, 15.818487], [35.814727, 38.769748], [31.795724, 39.334454], [31.795724, 29.653782], [28.019002, 28.867227]], preserveManualSize: true },
    // The two following top planes belong to their respective cabinet fronts.
    { componentKey: "wall-cabinet-2", points: [[41.258907, 13.297479], [30.869359, 14.789916], [35.814727, 15.818487], [46.204276, 14.305882]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[35.814727, 15.818487], [46.204276, 14.305882], [46.204276, 37.257143], [35.814727, 38.769748]], preserveManualSize: true },
    // FH664621E/FWK124/HD6002 fascia follows the same perspective as the cabinet.
    { componentKey: "extractor-hood", points: [[31.795724, 39.515966], [35.814727, 40.342857], [35.814727, 38.769748]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[35.814727, 38.769748], [46.204276, 37.257143], [46.204276, 38.85042], [35.814727, 40.342857]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[51.648456, 11.784874], [41.258907, 13.297479], [46.204276, 14.305882], [56.579572, 12.813445]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[46.204276, 14.305882], [56.579572, 12.813445], [56.579572, 35.764706], [46.204276, 37.257143]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[56.579572, 12.813445], [57.448931, 12.692437], [57.448931, 35.643697], [56.579572, 35.764706]], preserveManualSize: true },

    // Each worktop leg includes its top face and front fascia; the last polygon
    // is the floor-height WU16 end panel at the right edge.
    { componentKey: "worktop", points: [[31.795724, 54.278992], [52.874109, 51.233613], [61.5962, 53.008403], [51.206651, 54.521008], [51.206651, 55.791597], [31.795724, 58.594958]], preserveManualSize: true },
    { componentKey: "worktop", points: [[51.206651, 54.521008], [61.5962, 53.008403], [82.95962, 57.405042], [82.95962, 58.67563], [72.570071, 60.188235], [51.206651, 55.791597]], preserveManualSize: true },
    { componentKey: "worktop", points: [[72.342043, 60.127731], [72.570071, 60.188235], [82.95962, 58.67563], [82.95962, 86.547899], [72.570071, 88.040336], [72.342043, 88]], preserveManualSize: true },

    // One complete faucet hotspot, matching the interaction used by other kitchens.
    { componentKey: "sink-faucet", points: [[60.897862, 45.344538], [65.273159, 45.344538], [65.273159, 54.763025], [60.897862, 54.763025]], preserveManualSize: true },
    { componentKey: "base-module-1", points: [[32.08076, 58.554622], [39.862233, 57.42521], [39.862233, 85.297479], [32.08076, 86.426891]], preserveManualSize: true },
    { componentKey: "oven-module", points: [[39.862233, 57.42521], [50.251781, 55.932773], [50.251781, 83.805042], [39.862233, 85.297479]], preserveManualSize: true },
    // The UPEF65 corner face and sink cabinet are one physical default unit.
    { componentKey: "sink-base", points: [[50.251781, 55.932773], [51.933492, 55.932773], [51.933492, 83.805042], [50.251781, 83.805042]], preserveManualSize: true },
    { componentKey: "sink-base", points: [[51.933492, 55.932773], [60.64133, 57.727731], [60.64133, 85.6], [51.933492, 83.805042]], preserveManualSize: true },
    { componentKey: "base-module-3", points: [[60.64133, 57.727731], [67.182898, 59.078992], [67.182898, 86.931092], [60.64133, 85.6]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[67.182898, 59.078992], [71.543943, 59.966387], [71.543943, 87.838655], [67.182898, 86.931092]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[71.543943, 59.966387], [72.342043, 60.127731], [72.342043, 88], [71.543943, 87.838655]], preserveManualSize: true },
  ],
  "ab-105732": [
    { componentKey: "refrigerator", left: 13.45, top: 30.73, width: 14.54, height: 66.7 },
    { componentKey: "wall-cabinet-1", left: 28.98, top: 17.18, width: 10.42, height: 26.71 },
    { componentKey: "wall-cabinet-2", left: 39.4, top: 17.18, width: 15.67, height: 26.71 },
    { componentKey: "extractor-hood", left: 39.4, top: 43.89, width: 15.67, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 55.07, top: 17.18, width: 15.66, height: 26.71 },
    { componentKey: "wall-cabinet-4", left: 70.73, top: 17.18, width: 16.94, height: 26.71 },
    { componentKey: "worktop", left: 28.98, top: 63.31, width: 58.69, height: 1.45 },
    { componentKey: "worktop", left: 28.56, top: 63.31, width: 0.42, height: 33.89 },
    { componentKey: "sink-faucet", left: 73.96, top: 57.64, width: 3.35, height: 7.12 },
    { componentKey: "base-module-1", left: 28.98, top: 64.76, width: 10.42, height: 32.44, preserveManualSize: true },
    { componentKey: "oven-module", left: 39.4, top: 64.76, width: 15.67, height: 32.44 },
    { componentKey: "base-module-3", left: 55.07, top: 64.76, width: 15.66, height: 32.44 },
    { componentKey: "sink-base", left: 70.73, top: 64.76, width: 16.94, height: 32.44 },
  ],
  "ab-105746": [
    {
      componentKey: "refrigerator",
      points: [[11.52, 30.74], [26.02, 30.74], [26.02, 97.22], [11.52, 97.22]],
    },
    { componentKey: "wall-cabinet-1", left: 26.85, top: 17.18, width: 15.67, height: 26.71 },
    { componentKey: "wall-cabinet-2", left: 42.52, top: 17.18, width: 15.67, height: 26.71 },
    { componentKey: "extractor-hood", left: 42.52, top: 43.89, width: 15.67, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 58.19, top: 17.18, width: 15.65, height: 26.71 },
    { componentKey: "wall-cabinet-4", left: 73.84, top: 17.18, width: 16.99, height: 26.71 },
    { componentKey: "worktop", left: 26.85, top: 63.31, width: 63.98, height: 1.45 },
    { componentKey: "worktop", left: 26.43, top: 63.31, width: 0.42, height: 33.89 },
    { componentKey: "sink-faucet", left: 77.5, top: 57.64, width: 3.35, height: 7.12 },
    { componentKey: "base-module-1", left: 26.85, top: 64.76, width: 15.67, height: 32.44 },
    { componentKey: "oven-module", left: 42.52, top: 64.76, width: 15.67, height: 32.44 },
    { componentKey: "base-module-3", left: 58.19, top: 64.76, width: 15.65, height: 32.44 },
    { componentKey: "sink-base", left: 73.84, top: 64.76, width: 16.99, height: 32.44 },
  ],
  // AB 105757: 500/600/600/600/600/600 run with refrigerator right; hood in wall slot 2.
  "ab-105757": [
    { componentKey: "wall-cabinet-1", left: 0.37, top: 20.56, width: 12.75, height: 23.98 },
    { componentKey: "wall-cabinet-2", left: 13.12, top: 20.56, width: 14.05, height: 23.98 },
    { componentKey: "extractor-hood", left: 13.12, top: 44.54, width: 14.05, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 27.17, top: 20.56, width: 14.08, height: 23.98 },
    { componentKey: "wall-cabinet-4", left: 41.25, top: 20.56, width: 14.06, height: 23.98 },
    { componentKey: "wall-cabinet-5", left: 55.31, top: 20.56, width: 14.05, height: 23.98 },
    { componentKey: "wall-cabinet-6", left: 69.36, top: 20.56, width: 14.07, height: 23.98 },
    { componentKey: "worktop", left: 0.37, top: 61.94, width: 83.06, height: 1.45 },
    { componentKey: "worktop", left: 83.43, top: 61.94, width: 0.42, height: 25.32, separateLockedSidePanel: true },
    { componentKey: "sink-faucet", left: 43.1, top: 55.0, width: 3.35, height: 6.94 },
    { componentKey: "base-module-1", left: 0.37, top: 63.4, width: 12.75, height: 23.86 },
    { componentKey: "oven-module", left: 13.12, top: 63.4, width: 14.05, height: 23.86 },
    { componentKey: "base-module-2", left: 27.17, top: 63.4, width: 14.08, height: 23.86 },
    { componentKey: "sink-base", left: 41.25, top: 63.4, width: 14.06, height: 23.86 },
    { componentKey: "base-module-3", left: 55.31, top: 63.4, width: 14.05, height: 23.86 },
    { componentKey: "drawer-module", left: 69.36, top: 63.4, width: 14.07, height: 23.86 },
    { componentKey: "refrigerator", left: 84.07, top: 32.7, width: 13.02, height: 59.2 },
  ],
  // AB 105762-63: exact visible faces traced from the 842 x 595 vector PDF.
  // Repeated keys intentionally make every visible face of one physical item
  // select together. Sink/faucet and oven/cooktop markers also drive ASC.
  "ab-105762": [
    { componentKey: "refrigerator", points: [[18.456057,33.42521],[9.36342,31.54958],[19.396675,30.097479],[28.489311,31.973109]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[9.36342,31.54958],[18.456057,33.42521],[18.456057,68.194958],[9.36342,66.319328]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[9.36342,66.319328],[18.456057,68.194958],[18.456057,92.194958],[9.36342,90.319328]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[18.456057,33.42521],[28.489311,31.973109],[28.489311,66.742857],[18.456057,68.194958]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[18.456057,68.194958],[28.489311,66.742857],[28.489311,90.742857],[18.456057,92.194958]], preserveManualSize: true },

    { componentKey: "wall-cabinet-1", points: [[19.68171,18.944538],[26.907363,17.895798],[32.052257,18.964706],[24.826603,19.993277]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[19.68171,18.944538],[24.826603,19.993277],[24.826603,31.226891],[19.68171,30.157983]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[24.826603,19.993277],[32.052257,18.964706],[32.052257,42.884034],[28.446556,43.408403],[28.489311,31.973109],[24.826603,31.226891]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[26.907363,17.895798],[37.738717,16.322689],[42.88361,17.391597],[32.052257,18.964706]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[32.052257,18.964706],[42.88361,17.391597],[42.88361,41.331092],[32.052257,42.884034]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[32.052257,42.884034],[42.88361,41.331092],[42.88361,42.984874],[32.052257,44.537815]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[28.446556,43.408403],[32.052257,42.884034],[32.052257,44.537815],[28.489311,43.811765]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[33.91924,45.223529],[36.014252,45.223529],[36.014252,48.208403],[33.91924,48.208403]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[39.406176,44.416807],[41.5,44.416807],[41.5,47.421849],[39.406176,47.421849]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[37.738717,16.322689],[46.760095,15.031933],[51.91924,16.080672],[42.88361,17.391597]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[42.88361,17.391597],[51.91924,16.080672],[51.91924,40.020168],[42.88361,41.331092]], preserveManualSize: true },
    { componentKey: "wall-cabinet-4", points: [[46.760095,15.031933],[57.591449,13.458824],[62.750594,14.507563],[51.91924,16.080672]], preserveManualSize: true },
    { componentKey: "wall-cabinet-4", points: [[51.91924,16.080672],[62.750594,14.507563],[62.750594,38.447059],[51.91924,40.020168]], preserveManualSize: true },
    { componentKey: "wall-cabinet-4", points: [[62.750594,14.507563],[63.648456,14.386555],[63.648456,38.32605],[62.750594,38.447059]], preserveManualSize: true },

    { componentKey: "worktop", points: [[28.489311,57.647059],[58.503563,53.310924],[56.764846,56.739496],[28.489311,60.833613]], preserveManualSize: true },
    { componentKey: "worktop", points: [[28.489311,60.833613],[56.764846,56.739496],[56.764846,58.070588],[28.489311,62.164706]], preserveManualSize: true },
    { componentKey: "worktop", points: [[58.503563,53.310924],[92.437055,60.289076],[81.605701,61.862185],[56.764846,56.739496]], preserveManualSize: true },
    { componentKey: "worktop", points: [[56.764846,56.739496],[81.605701,61.862185],[81.605701,63.173109],[56.764846,58.070588]], preserveManualSize: true },
    { componentKey: "worktop", points: [[81.605701,61.862185],[92.437055,60.289076],[92.437055,61.620168],[81.605701,63.173109]], preserveManualSize: true },
    { componentKey: "worktop", points: [[28.489311,62.164706],[28.774347,62.12437],[28.774347,91.186555],[28.489311,91.226891]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[58.118765,56.578151],[64.147268,55.710924],[70.07601,56.820168],[75.76247,57.889076],[70.047506,58.776471],[63.463183,57.788235]], preserveManualSize: true, claimFixturePartKey: "sink" },
    // Four non-overlapping pieces follow the PDF's exact faucet bounds: control,
    // horizontal neck, curved spout, and vertical stem.
    { componentKey: "sink-faucet", points: [[65.244656,47.018487],[66.099762,47.018487],[66.099762,50.568067],[65.244656,50.568067]], preserveManualSize: true, claimFixturePartKey: "faucet" },
    { componentKey: "sink-faucet", points: [[65.914489,47.159664],[68.465558,47.159664],[68.465558,48.894118],[65.914489,48.894118]], preserveManualSize: true, claimFixturePartKey: "faucet" },
    { componentKey: "sink-faucet", points: [[68.437055,47.92605],[68.945368,48.087395],[69.434679,48.954622],[69.805226,50.245378],[69.805226,53.068908],[69.434679,53.068908],[69.434679,50.568067],[69.078385,49.297479],[68.693587,48.591597],[68.437055,48.853782]], preserveManualSize: true, claimFixturePartKey: "faucet" },
    { componentKey: "sink-faucet", points: [[68.992874,52.927731],[70.118765,52.927731],[70.118765,57.082353],[68.992874,57.082353]], preserveManualSize: true, claimFixturePartKey: "faucet" },

    { componentKey: "base-module-1", points: [[28.774347,62.12437],[36,61.07563],[36,90.137815],[28.774347,91.186555]], preserveManualSize: true },
    { componentKey: "oven-module", points: [[36,61.07563],[46.831354,59.502521],[46.831354,88.584874],[36,90.137815]], preserveManualSize: true, claimApplianceSurface: "oven" },
    { componentKey: "oven-module", points: [[28.489311,57.889076],[39.206651,56.336134],[47.073634,57.909244],[36,59.583193]], preserveManualSize: true, claimApplianceSurface: "cooktop" },
    { componentKey: "base-module-2", points: [[46.831354,59.502521],[55.852732,58.211765],[55.852732,87.27395],[46.831354,88.584874]], preserveManualSize: true },
    // The narrow inside-corner Blende belongs to the US50 immediately on its
    // left. Keeping it out of the locked sink base prevents a default tint.
    { componentKey: "base-module-2", points: [[55.852732,58.211765],[57.52019,58.231933],[57.52019,87.294118],[55.852732,87.27395]], preserveManualSize: true },
    { componentKey: "sink-base", points: [[57.52019,58.231933],[66.612827,60.087395],[66.612827,89.169748],[57.52019,87.294118]], preserveManualSize: true },
    { componentKey: "dishwasher-base", points: [[66.612827,60.087395],[75.691211,61.963025],[75.691211,91.02521],[66.612827,89.169748]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[75.691211,61.963025],[80.23753,62.890756],[80.23753,91.973109],[75.691211,91.02521]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[80.23753,62.890756],[81.961995,63.132773],[81.961995,92.194958],[80.23753,91.973109]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[81.961995,63.132773],[92.437055,61.620168],[92.437055,90.198319],[81.961995,91.710924]], preserveManualSize: true },
  ],
  // AB 105759-56: 400/600/300/600/600/900 mm linear run, fridge left.
  "ab-105759": [
    { componentKey: "refrigerator", left: 2.56, top: 31.45, width: 13.27, height: 60.43 },
    { componentKey: "wall-cabinet-1", left: 16.73, top: 19.13, width: 9.56, height: 24.46 },
    { componentKey: "wall-cabinet-2", left: 26.29, top: 19.13, width: 14.33, height: 24.46 },
    { componentKey: "extractor-hood", left: 26.29, top: 43.59, width: 14.33, height: 6.75 },
    { componentKey: "wall-cabinet-3", left: 40.62, top: 19.13, width: 7.16, height: 24.46 },
    { componentKey: "wall-cabinet-4", left: 47.78, top: 19.13, width: 14.33, height: 24.46 },
    { componentKey: "wall-cabinet-5", left: 62.11, top: 19.13, width: 14.32, height: 24.46 },
    { componentKey: "wall-cabinet-6", left: 76.43, top: 19.13, width: 22.59, height: 24.46 },
    { componentKey: "worktop", left: 16.24, top: 61.31, width: 82.78, height: 1.37 },
    { componentKey: "worktop", left: 16.24, top: 62.68, width: 0.4, height: 24.44, separateLockedSidePanel: true },
    { componentKey: "worktop", left: 76.318039, top: 62.66129, width: 0.370476, height: 24.435484, separateLockedSidePanel: true },
    { componentKey: "sink-faucet", left: 49.75, top: 54.25, width: 3, height: 7.06 },
    { componentKey: "base-module-1", left: 16.64, top: 62.68, width: 9.55, height: 24.44 },
    { componentKey: "oven-module", left: 26.19, top: 62.68, width: 14.33, height: 24.44 },
    { componentKey: "base-module-2", left: 40.52, top: 62.68, width: 7.16, height: 24.44 },
    { componentKey: "sink-base", left: 47.68, top: 62.68, width: 14.33, height: 24.44 },
    { componentKey: "base-module-3", left: 62.01, top: 62.68, width: 14.308039, height: 24.44 },
    { componentKey: "drawer-module", left: 76.688515, top: 62.68, width: 22.31405, height: 24.44 },
  ],
  "ab-105744": [
    { componentKey: "wall-cabinet-1", left: 0.85, top: 19.8, width: 14.8, height: 24.45 },
    { componentKey: "wall-cabinet-2", left: 15.65, top: 19.8, width: 14.33, height: 24.45 },
    { componentKey: "extractor-hood", left: 15.65, top: 44.25, width: 14.33, height: 7.77 },
    { componentKey: "wall-cabinet-3", left: 29.98, top: 19.8, width: 14.35, height: 24.45 },
    { componentKey: "wall-cabinet-4", left: 44.33, top: 19.8, width: 14.33, height: 24.45 },
    { componentKey: "wall-cabinet-5", left: 58.66, top: 19.8, width: 14.34, height: 24.45 },
    { componentKey: "wall-cabinet-6", left: 73.0, top: 19.8, width: 9.56, height: 24.45 },
    { componentKey: "worktop", left: 0.85, top: 62.02, width: 81.71, height: 1.35 },
    { componentKey: "sink-faucet", left: 46.5, top: 55.0, width: 2.5, height: 7.5 },
    { componentKey: "base-module-1", left: 0.85, top: 63.35, width: 14.8, height: 29.71 },
    { componentKey: "oven-module", left: 15.65, top: 63.35, width: 14.33, height: 29.71 },
    { componentKey: "base-module-2", left: 29.98, top: 63.35, width: 14.35, height: 29.71 },
    { componentKey: "sink-base", left: 44.33, top: 63.35, width: 14.33, height: 29.71 },
    { componentKey: "base-module-3", left: 58.66, top: 63.35, width: 14.34, height: 29.71 },
    { componentKey: "drawer-module", left: 73.0, top: 63.35, width: 9.56, height: 29.71 },
    { componentKey: "worktop", left: 82.56, top: 62.02, width: 0.66, height: 31.04 },
    {
      componentKey: "refrigerator",
      points: [[83.22, 32.19], [96.5, 32.19], [96.5, 93.08], [83.22, 93.08]],
    },
  ],
  "ab-105760": [
    { componentKey: "wall-cabinet-1", left: 6.256532, top: 17.089076, width: 18.099762, height: 26.964706, preserveManualSize: true },
    { componentKey: "wall-cabinet-2", left: 24.356295, top: 17.089076, width: 15.805225, height: 26.964706, preserveManualSize: true },
    { componentKey: "wall-cabinet-3", left: 40.161520, top: 17.089076, width: 15.790974, height: 26.964706, preserveManualSize: true },
    { componentKey: "extractor-hood", left: 40.161520, top: 44.053782, width: 15.790974, height: 6.366386, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 55.952494, top: 17.089076, width: 15.805226, height: 26.964706, preserveManualSize: true },
    { componentKey: "worktop", left: 6.256532, top: 63.616807, width: 65.743468, height: 1.492437, preserveManualSize: true },
    // The right support panel belongs to the fixed worktop, not the adjacent base cabinet.
    { componentKey: "worktop", left: 71.586698, top: 65.109244, width: 0.413302, height: 32.732773, preserveManualSize: true },
    { componentKey: "sink-faucet", left: 18.598575, top: 56.114286, width: 1.482185, height: 7.502521, preserveManualSize: true },
    { componentKey: "sink-end-blende", left: 6.256532, top: 65.109244, width: 2.109264, height: 32.732773, preserveManualSize: true },
    { componentKey: "sink-base", left: 8.365796, top: 65.109244, width: 15.805225, height: 32.732773, preserveManualSize: true },
    { componentKey: "dishwasher-base", left: 24.171021, top: 65.109244, width: 15.805226, height: 32.732773, preserveManualSize: true },
    { componentKey: "oven-module", left: 39.976247, top: 65.109244, width: 15.805226, height: 32.732773, preserveManualSize: true },
    { componentKey: "base-module-1", left: 55.781473, top: 65.109244, width: 15.805225, height: 32.732773, preserveManualSize: true },
    { componentKey: "refrigerator", left: 75.178147, top: 30.742857, width: 14.650832, height: 67.099160, preserveManualSize: true },
  ],
  // AB 105761-62: exact rectangles measured from the 842 x 595 vector PDF.
  // The right HPK2002 and UPK20 filler faces are included/selected as scheduled.
  "ab-105761": [
    { componentKey: "wall-cabinet-1", left: 26.579572, top: 17.089076, width: 15.805226, height: 26.964706, preserveManualSize: true },
    { componentKey: "wall-cabinet-2", left: 42.384798, top: 17.089076, width: 15.805226, height: 26.964706, preserveManualSize: true },
    { componentKey: "extractor-hood", left: 42.384798, top: 44.053782, width: 15.805226, height: 6.366387, preserveManualSize: true },
    { componentKey: "wall-cabinet-3", left: 58.190024, top: 17.089076, width: 15.805226, height: 26.964706, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 73.995249, top: 17.089076, width: 17.871734, height: 26.964706, preserveManualSize: true },
    { componentKey: "worktop", left: 26.123515, top: 63.616807, width: 65.743468, height: 1.492437, preserveManualSize: true },
    // The narrow left support panel is the downstand of the fixed worktop.
    { componentKey: "worktop", left: 26.123515, top: 65.109244, width: 0.413302, height: 32.732773, preserveManualSize: true },
    { componentKey: "sink-faucet", left: 77.173397, top: 56.114286, width: 1.482185, height: 7.502521, preserveManualSize: true },
    { componentKey: "base-module-1", left: 26.536817, top: 65.109244, width: 15.805226, height: 32.732773, preserveManualSize: true },
    { componentKey: "oven-module", left: 42.342043, top: 65.109244, width: 15.805226, height: 32.732773, preserveManualSize: true },
    { componentKey: "dishwasher-base", left: 58.147268, top: 65.109244, width: 15.805226, height: 32.732773, preserveManualSize: true },
    { componentKey: "sink-base", left: 73.952494, top: 65.109244, width: 15.805226, height: 32.732773, preserveManualSize: true },
    { componentKey: "sink-end-blende", left: 89.757720, top: 65.109244, width: 2.109264, height: 32.732773, preserveManualSize: true },
    { componentKey: "refrigerator", left: 10.446556, top: 30.742857, width: 14.650831, height: 67.099160, preserveManualSize: true },
  ],
  // AB 105776-66: exact rectangles measured from the 3509 x 2480 PDF render.
  // The HPK2002 is included in the rightmost wall cabinet; UPK20 stays separate.
  "ab-105776": [
    { componentKey: "refrigerator", left: 4.132231, top: 30.483871, width: 14.705045, height: 67.338710, preserveManualSize: true },
    { componentKey: "wall-cabinet-1", left: 20.661157, top: 16.733871, width: 15.873468, height: 27.096774, preserveManualSize: true },
    { componentKey: "wall-cabinet-2", left: 36.534625, top: 16.733871, width: 15.873468, height: 27.096774, preserveManualSize: true },
    { componentKey: "extractor-hood", left: 36.534625, top: 43.830645, width: 15.873468, height: 7.177420, preserveManualSize: true },
    { componentKey: "wall-cabinet-3", left: 52.408093, top: 16.733871, width: 15.844971, height: 27.096774, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 68.253064, top: 16.733871, width: 13.251638, height: 27.096774, preserveManualSize: true },
    { componentKey: "wall-cabinet-5", left: 81.504702, top: 16.733871, width: 17.127387, height: 27.096774, preserveManualSize: true },
    { componentKey: "worktop", left: 20.176689, top: 63.427419, width: 78.455400, height: 1.532258, preserveManualSize: true },
    { componentKey: "worktop", left: 20.176689, top: 64.959677, width: 0.427472, height: 32.862904, preserveManualSize: true, separateLockedSidePanel: true },
    { componentKey: "sink-faucet", left: 84.640923, top: 55.645161, width: 2.650328, height: 7.782258, preserveManualSize: true },
    { componentKey: "dishwasher-base", left: 20.604161, top: 64.959677, width: 15.901966, height: 32.862904, preserveManualSize: true },
    { componentKey: "oven-module", left: 36.506127, top: 64.959677, width: 15.844970, height: 32.862904, preserveManualSize: true },
    { componentKey: "base-module-1", left: 52.351097, top: 64.959677, width: 15.873468, height: 32.862904, preserveManualSize: true },
    { componentKey: "base-module-2", left: 68.224565, top: 64.959677, width: 13.222571, height: 32.862904, preserveManualSize: true },
    { componentKey: "sink-base", left: 81.447706, top: 64.959677, width: 15.873468, height: 32.862904, preserveManualSize: true },
    { componentKey: "sink-end-blende", left: 97.321174, top: 64.959677, width: 1.310915, height: 32.862904, preserveManualSize: true },
  ],
  // 670 105778: exact source-PDF coordinates / 842 x 595, including the plinth.
  // UPK20 is schedule row 6; the wall HPK2002 joins row 10's H5002 face.
  "ab-105778": [
    { componentKey: "wall-cabinet-1", left: 21.847981, top: 16.786555, width: 10.574822, height: 27.045378, preserveManualSize: true },
    { componentKey: "wall-cabinet-2", left: 32.422803, top: 16.786555, width: 15.862233, height: 27.045378, preserveManualSize: true },
    { componentKey: "extractor-hood", left: 32.422803, top: 43.831933, width: 15.862233, height: 1.875630, preserveManualSize: true },
    // The two LED ray symbols belong visually to the same hood selection.
    { componentKey: "extractor-hood", points: [[36.014252, 47.018487], [37.368171, 47.018487], [38.237530, 50.164706], [35.144893, 50.164706]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[44.052257, 47.018487], [45.406176, 47.018487], [46.275534, 50.164706], [43.182898, 50.164706]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", left: 48.285036, top: 16.786555, width: 15.876484, height: 27.045378, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 64.161520, top: 16.786555, width: 14.650831, height: 27.045378, preserveManualSize: true },
    { componentKey: "worktop", left: 21.420428, top: 63.475630, width: 57.391923, height: 1.512605, preserveManualSize: true },
    { componentKey: "worktop", left: 21.420428, top: 64.988235, width: 0.427553, height: 32.853782, preserveManualSize: true, separateLockedSidePanel: true },
    { componentKey: "sink-faucet", left: 66.926366, top: 55.932773, width: 1.482185, height: 7.542857, preserveManualSize: true },
    { componentKey: "base-module-1", left: 21.847981, top: 64.988235, width: 10.574822, height: 32.853782, preserveManualSize: true },
    { componentKey: "oven-module", left: 32.422803, top: 64.988235, width: 15.862233, height: 32.853782, preserveManualSize: true },
    { componentKey: "dishwasher-base", left: 48.285036, top: 64.988235, width: 15.876484, height: 32.853782, preserveManualSize: true },
    { componentKey: "sink-base", left: 64.161520, top: 64.988235, width: 13.225653, height: 32.853782, preserveManualSize: true },
    { componentKey: "sink-end-blende", left: 77.387173, top: 64.988235, width: 1.425178, height: 32.853782, preserveManualSize: true },
  ],
  // AB 105775-64: exact visible faces converted from the 842 x 595 vector PDF.
  // Repeated component keys join all exposed perspective faces of one item.
  "ab-105775": [
    { componentKey: "refrigerator", points: [[4.090261,35.603361],[11.60095,34.05042],[21.27791,35.462185],[13.752969,36.994958]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[4.090261,35.603361],[13.752969,36.994958],[13.752969,68.033613],[4.090261,66.642017]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[4.090261,66.642017],[13.752969,68.033613],[13.752969,89.472269],[4.090261,88.060504]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[13.752969,36.994958],[21.27791,35.462185],[21.27791,66.50084],[13.752969,68.033613]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[13.752969,68.033613],[21.27791,66.50084],[21.27791,87.919328],[13.752969,89.472269]], preserveManualSize: true },

    { componentKey: "wall-cabinet-1", points: [[22.56057,21.868908],[27.961995,21.042017],[37.624703,22.453782],[33.035629,23.401681],[23.35867,21.989916]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[22.56057,21.868908],[23.35867,21.989916],[23.35867,43.368067],[22.56057,43.247059]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[23.35867,21.989916],[33.035629,23.401681],[33.035629,44.759664],[23.35867,43.368067]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[33.035629,23.401681],[37.624703,22.453782],[42.470309,23.139496],[37.866983,24.087395]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[33.035629,23.401681],[37.866983,24.087395],[37.866983,45.465546],[33.035629,44.759664]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[37.866983,24.087395],[42.470309,23.139496],[49.980998,24.228571],[49.980998,24.994958],[47.543943,25.49916]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[37.866983,24.087395],[47.543943,25.49916],[47.543943,46.857143],[37.866983,45.465546]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[37.866983,45.465546],[47.543943,46.857143],[47.543943,48.329412],[37.866983,46.937815]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[39.52019,48.289076],[41.401425,48.410084],[41.401425,50.971429],[39.52019,50.689076]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[44.422803,48.994958],[46.304038,49.115966],[46.304038,51.677311],[44.422803,51.394958]], preserveManualSize: true },
    { componentKey: "wall-cabinet-4", points: [[47.543943,25.49916],[49.980998,24.994958],[49.980998,25.842017]], preserveManualSize: true },
    { componentKey: "wall-cabinet-4", points: [[47.543943,25.49916],[49.980998,25.842017],[49.980998,47.220168],[47.543943,46.857143]], preserveManualSize: true },

    { componentKey: "wall-cabinet-5", points: [[66.071259,27.576471],[70.674584,26.628571],[75.505938,27.334454],[70.902613,28.282353]], preserveManualSize: true },
    { componentKey: "wall-cabinet-5", points: [[66.085511,27.576471],[70.916865,28.282353],[70.916865,49.660504],[66.085511,48.954622]], preserveManualSize: true },
    { componentKey: "wall-cabinet-6", points: [[70.902613,28.282353],[75.505938,27.334454],[85.168646,28.72605],[80.579572,29.67395]], preserveManualSize: true },
    { componentKey: "wall-cabinet-6", points: [[70.916865,28.282353],[80.593824,29.67395],[80.593824,51.052101],[70.916865,49.660504]], preserveManualSize: true },
    { componentKey: "wall-cabinet-7", points: [[80.579572,29.67395],[85.168646,28.72605],[94.859857,30.137815],[90.256532,31.085714]], preserveManualSize: true },
    { componentKey: "wall-cabinet-7", points: [[80.593824,29.67395],[90.256532,31.085714],[90.256532,52.443697],[80.593824,51.052101]], preserveManualSize: true },
    { componentKey: "wall-cabinet-7", points: [[90.256532,31.085714],[91.225653,31.226891],[91.225653,52.584874],[90.256532,52.443697]], preserveManualSize: true },
    { componentKey: "wall-cabinet-7", points: [[91.225653,31.226891],[91.496437,31.166387],[91.496437,52.544538],[91.225653,52.584874]], preserveManualSize: true },
    { componentKey: "wall-cabinet-7", points: [[91.496437,31.166387],[94.859857,30.137815],[94.859857,51.515966],[91.496437,52.544538]], preserveManualSize: true },

    // Split the left worktop surface around the cooktop cut-out. Keeping the
    // cooktop out of the worktop polygons prevents the two selected masks from
    // stacking in the central area and follows the visible PDF seams exactly.
    { componentKey: "worktop", points: [[21.27791,57.848739],[27.149644,56.638655],[42.470309,59.018487],[34.674584,60.490756],[28.71734,59.704202],[21.27791,61.236975]], preserveManualSize: true },
    { componentKey: "worktop", points: [[27.149644,56.638655],[49.980998,59.946218],[49.980998,60.107563],[42.470309,59.018487]], preserveManualSize: true },
    { componentKey: "worktop", points: [[28.71734,59.704202],[34.674584,60.490756],[44.47981,61.902521],[49.980998,60.773109],[49.980998,62.789916]], preserveManualSize: true },
    { componentKey: "worktop", points: [[21.27791,61.236975],[28.71734,59.704202],[49.980998,62.789916],[49.980998,63.959664],[28.71734,60.894118],[21.27791,62.406723]], preserveManualSize: true },
    { componentKey: "worktop", points: [[62.551069,64.605042],[70.674584,62.931092],[95.814727,66.581513],[95.814727,67.751261],[87.691211,69.42521],[62.551069,65.77479]], preserveManualSize: true },

    { componentKey: "sink-faucet", points: [[67.581948,64.746218],[67.667458,64.685714],[73.524941,63.717647],[85.368171,65.431933],[85.467933,65.67395],[80.87886,66.621849],[79.795724,66.642017],[67.92399,64.907563]], preserveManualSize: true, claimFixturePartKey: "sink" },
    { componentKey: "sink-faucet", points: [[74.836105,56.033613],[75.434679,56.215126],[75.577197,59.240336],[74.978622,59.058824]], preserveManualSize: true, claimFixturePartKey: "faucet" },
    { componentKey: "sink-faucet", points: [[75.377672,56.759664],[77.301663,56.759664],[78.299287,57.586555],[78.299287,58.917647],[77.928741,58.998319],[77.273159,57.687395],[75.434679,57.687395]], preserveManualSize: true, claimFixturePartKey: "faucet" },
    { componentKey: "sink-faucet", points: [[77.928741,58.998319],[78.299287,58.917647],[78.299287,61.236975],[77.928741,61.317647]], preserveManualSize: true, claimFixturePartKey: "faucet" },
    { componentKey: "sink-faucet", points: [[78.057007,61.357983],[78.171021,61.49916],[78.171021,64.665546],[78.057007,64.766387]], preserveManualSize: true, claimFixturePartKey: "faucet" },

    { componentKey: "base-module-1", points: [[21.27791,62.406723],[28.033254,61.015126],[28.033254,86.971429],[21.27791,88.363025]], preserveManualSize: true },
    { componentKey: "base-module-1", points: [[28.033254,61.015126],[29.515439,60.994958],[29.515439,86.951261],[28.033254,86.971429]], preserveManualSize: true },
    { componentKey: "base-module-2", points: [[29.515439,60.994958],[34.346793,61.70084],[34.346793,87.657143],[29.515439,86.951261]], preserveManualSize: true },
    { componentKey: "oven-module", points: [[34.346793,61.70084],[44.023753,63.092437],[44.023753,89.048739],[34.346793,87.657143]], preserveManualSize: true, claimApplianceSurface: "oven" },
    { componentKey: "oven-module", points: [[42.470309,59.018487],[49.980998,60.107563],[49.980998,60.773109],[44.47981,61.902521],[34.674584,60.490756]], preserveManualSize: true, claimApplianceSurface: "cooktop" },
    { componentKey: "base-module-3", points: [[44.023753,63.092437],[49.980998,63.959664],[49.980998,89.915966],[44.023753,89.048739]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[62.551069,65.77479],[67.396675,66.480672],[67.396675,92.436975],[62.551069,91.731092]], preserveManualSize: true },
    { componentKey: "sink-base", points: [[67.396675,66.480672],[77.059382,67.892437],[77.059382,93.828571],[67.396675,92.436975]], preserveManualSize: true },
    { componentKey: "dishwasher-base", points: [[77.059382,67.892437],[86.736342,69.284034],[86.736342,95.240336],[77.059382,93.828571]], preserveManualSize: true },
    { componentKey: "dishwasher-base", points: [[86.736342,69.284034],[87.691211,69.42521],[87.691211,95.381513],[86.736342,95.240336]], preserveManualSize: true },
    { componentKey: "dishwasher-base", points: [[87.691211,69.42521],[95.814727,67.751261],[95.814727,92.396639],[87.691211,95.381513]], preserveManualSize: true },
  ],
  "108134-modul-1": [
    { componentKey: "wall-cabinet-1", left: 7.78, top: 16.96, width: 14.62, height: 24.92 },
    { componentKey: "wall-cabinet-2", left: 22.4, top: 16.96, width: 14.62, height: 24.92 },
    { componentKey: "wall-cabinet-3", left: 37.02, top: 16.96, width: 14.63, height: 24.92 },
    { componentKey: "wall-cabinet-4", left: 51.65, top: 16.96, width: 14.62, height: 24.92 },
    { componentKey: "extractor-hood", left: 51.65, top: 41.88, width: 14.62, height: 7.05 },
    // Under-cabinet LED strip — one box per light symbol drawn beneath wall cabinets 1-3.
    // All three map to the same LED set, so clicking any one toggles the whole lighting set.
    { componentKey: "under-cabinet-light", left: 12.06, top: 41.88, width: 6.0, height: 7.5 },
    { componentKey: "under-cabinet-light", left: 26.65, top: 41.88, width: 6.0, height: 7.5 },
    { componentKey: "under-cabinet-light", left: 41.39, top: 41.88, width: 6.0, height: 7.5 },
    { componentKey: "wall-cabinet-5", left: 66.27, top: 16.96, width: 14.62, height: 24.92 },
    { componentKey: "worktop", left: 7.78, top: 61.35, width: 73.11, height: 1.4 },
    { componentKey: "sink-faucet", left: 29.5, top: 54.0, width: 4.4, height: 8 },
    { componentKey: "base-module-1", left: 7.78, top: 62.72, width: 14.62, height: 25.12 },
    { componentKey: "base-module-2", left: 22.4, top: 62.72, width: 14.62, height: 25.12 },
    { componentKey: "base-module-3", left: 37.02, top: 62.72, width: 14.62, height: 25.12 },
    { componentKey: "oven-module", left: 51.64, top: 62.72, width: 14.63, height: 25.12 },
    { componentKey: "drawer-module", left: 66.27, top: 62.72, width: 14.62, height: 25.12 },
    { componentKey: "refrigerator", left: 83.7, top: 30.93, width: 13.29, height: 61.57 },
    // Left side blende/end panel of the base run — part of the (locked, blue) worktop.
    // Rendered last so its blue locked fill layers above the washing-machine body.
    { componentKey: "worktop", left: 7.34, top: 61.35, width: 0.44, height: 26.49 },
  ],
};

// Shared source geometry from the FRG order-page configurator. ASC derives its
// claim-only targets from these polygons instead of maintaining another set of
// cabinet coordinates that can drift out of alignment.
export const AB_105831_FRG_ORDER_HOTSPOTS = [
  { componentKey: "wall-cabinet-1", points: [[48.02, 15.85], [57.97, 17.85], [57.97, 41.9], [48.02, 40.35]] },
  { componentKey: "wall-cabinet-1", points: [[48.02, 15.85], [54.05, 15.05], [64.05, 16.85], [57.97, 17.85]] },
  { componentKey: "wall-cabinet-2", points: [[57.97, 18.14], [67.11, 20.0], [67.11, 43.85], [57.97, 42.45]] },
  { componentKey: "wall-cabinet-2", points: [[57.97, 18.14], [67.11, 20.0], [73.9, 19.24], [64.05, 16.85]] },
  { componentKey: "extractor-hood", points: [[57.97, 42.05], [67.11, 43.85], [66.85, 49.85], [58.25, 48.0]], preserveManualSize: true },
  { componentKey: "extractor-hood", points: [[66.85, 43.55], [70.55, 45.05], [66.85, 45.75]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[67.11, 20.0], [74.78, 21.25], [74.78, 45.48], [67.11, 43.87]] },
  { componentKey: "wall-cabinet-3", points: [[67.11, 20.0], [74.78, 21.25], [80.87, 20.18], [73.9, 19.24]] },
  { componentKey: "wall-cabinet-4", points: [[74.78, 21.25], [79.37, 20.52], [85.58, 21.25], [85.58, 33.9], [79.37, 34.9], [74.78, 35.32]] },
  { componentKey: "worktop", points: [[5.3, 60.85], [14.55, 59.0], [35.05, 56.45], [43.35, 58.3], [43.35, 59.8], [35.45, 60.55], [15.55, 63.8], [5.3, 62.0]] },
  { componentKey: "worktop", points: [[43.35, 58.3], [55.25, 56.75], [65.55, 59.05], [74.95, 61.0], [74.75, 62.65], [62.35, 61.55], [53.25, 60.35], [43.35, 59.8]] },
  { componentKey: "worktop", points: [[31.45, 60.55], [42.35, 59.8], [35.35, 60.95], [30.05, 61.5], [10.55, 62.55], [7.3, 63.05]], preserveManualSize: true },
  { componentKey: "worktop", points: [[43.5, 59.8], [55.25, 60.35], [62.35, 61.55], [75.05, 62.65], [74.75, 66.2], [59.35, 62.7], [52.25, 61.5], [45.35, 59.95]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[25.05, 47.15], [30.8, 47.15], [30.8, 58.15], [25.05, 58.65]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[5.3, 61.7], [14.55, 63.82], [14.55, 93.2], [5.3, 91.3]] },
  { componentKey: "base-module-1", points: [[14.55, 63.92], [20.45, 62.75], [20.45, 92.27], [14.55, 93.2]] },
  { componentKey: "base-module-3", points: [[20.45, 62.85], [31.45, 61.45], [31.45, 90.8], [20.45, 92.27]] },
  { componentKey: "sink-base", points: [[31.45, 61.55], [42.55, 59.8], [42.25, 89.25], [31.45, 90.8]] },
  { componentKey: "corner-blende", points: [[42.55, 59.8], [43.288686, 59.8], [43.288686, 88.442133], [42.25, 89.25]] },
  { componentKey: "base-module-2", points: [[43.288686, 59.8], [53.25, 61.55], [53.25, 91.05], [43.288686, 89.03]] },
  { componentKey: "oven-module", points: [[53.25, 61.55], [62.35, 63.55], [62.35, 92.7], [53.25, 91.2]] },
  { componentKey: "drawer-module", points: [[62.35, 63.55], [70.08, 65.24], [70.08, 94.56], [62.35, 93.0]] },
  { componentKey: "base-module-4", points: [[70.08, 65.24], [74.75, 65.95], [74.65, 95.5], [70.08, 94.56]] },
  { componentKey: "refrigerator", points: [[74.89, 35.45], [83.39, 37.34], [83.39, 96.49], [74.89, 95.16]] },
  { componentKey: "refrigerator", points: [[83.39, 37.34], [94.33, 35.65], [94.33, 95.16], [83.39, 96.49]] },
  { componentKey: "refrigerator", points: [[74.78, 35.32], [79.37, 34.9], [85.58, 33.9], [94.33, 35.65], [83.39, 37.34], [74.89, 35.45]] },
];
PLAN_HOTSPOTS_BY_SLUG["ab-105831"] = AB_105831_FRG_ORDER_HOTSPOTS.flatMap((hotspot) => {
  if (hotspot.componentKey === "sink-faucet") {
    return [
      { componentKey: "sink-faucet", points: [[17.8, 57.5], [38.05, 56.9], [38.05, 59.35], [17.8, 60.25]], preserveManualSize: true },
      { componentKey: "sink-faucet", points: [[25.05, 58.3], [25.05, 52.0], [25.1, 51.1], [25.4, 50.3], [26.0, 49.7], [26.7, 49.35], [29.0, 48.4], [29.05, 47.6], [29.7, 47.65], [29.55, 51.2], [28.95, 51.1], [29.0, 50.6], [26.9, 49.9], [26.2, 50.1], [25.7, 50.5], [25.45, 51.0], [25.35, 51.7], [25.35, 58.3]], preserveManualSize: true },
    ];
  }
  return [hotspot];
});
PLAN_HOTSPOTS_BY_SLUG["ab-109873"] = AB_109873_FRG_ORDER_HOTSPOTS;
PLAN_HOTSPOTS_BY_SLUG["ab-109874"] = AB_109874_FRG_ORDER_HOTSPOTS;
PLAN_HOTSPOTS_BY_SLUG["ab-109955"] = AB_109955_FRG_ORDER_HOTSPOTS;
PLAN_HOTSPOTS_BY_SLUG["ab-111539"] = AB_111539_FRG_ORDER_HOTSPOTS;
PLAN_HOTSPOTS_BY_SLUG["ab-110401"] = AB_110401_FRG_ORDER_HOTSPOTS;
PLAN_HOTSPOTS_BY_SLUG["ab-110402"] = AB_110402_FRG_ORDER_HOTSPOTS;
AB_105760_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG["ab-105760"];
});
AB_105761_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG["ab-105761"];
});
// AB 105837 and its perspective aliases use the same order-page source in FRG
// and ASC. Keep one table so cabinet faces cannot drift between both flows.
export const AB_105837_FRG_ORDER_HOTSPOTS = PLAN_HOTSPOTS_BY_SLUG["ab-105837"];
PLAN_HOTSPOTS_BY_SLUG["ab-105815"] = PLAN_HOTSPOTS_BY_SLUG["ab-105819"];
PLAN_HOTSPOTS_BY_SLUG["ab-105809"] = PLAN_HOTSPOTS_BY_SLUG["ab-105805"];
PLAN_HOTSPOTS_BY_SLUG["ab-105813"] = PLAN_HOTSPOTS_BY_SLUG["ab-105805"];
PLAN_HOTSPOTS_BY_SLUG["ab-105817"] = PLAN_HOTSPOTS_BY_SLUG["ab-105805"];
PLAN_HOTSPOTS_BY_SLUG["ab-105840"] = PLAN_HOTSPOTS_BY_SLUG["ab-105837"];
PLAN_HOTSPOTS_BY_SLUG["ab-105843"] = PLAN_HOTSPOTS_BY_SLUG["ab-105837"];
PLAN_HOTSPOTS_BY_SLUG["ab-105818"] = PLAN_HOTSPOTS_BY_SLUG["ab-105810"];
PLAN_HOTSPOTS_BY_SLUG["ab-105824"] = PLAN_HOTSPOTS_BY_SLUG["ab-105821"];
PLAN_HOTSPOTS_BY_SLUG["ab-105823"] = PLAN_HOTSPOTS_BY_SLUG["ab-105822"];
PLAN_HOTSPOTS_BY_SLUG["ab-105829"] = PLAN_HOTSPOTS_BY_SLUG["ab-105822"];
PLAN_HOTSPOTS_BY_SLUG["ab-105832"] = PLAN_HOTSPOTS_BY_SLUG["ab-105822"];
// AB 105822 uses the AB 105825 drawing and its two exact worktop runs, but its
// email preview must use the same calibrated sink sources as the dashboard.
PLAN_HOTSPOTS_BY_SLUG["ab-105822"] = PLAN_HOTSPOTS_BY_SLUG["ab-105825"].flatMap((hotspot) => {
  if (hotspot.componentKey === "sink-faucet") {
    return [];
  }
  if (hotspot.componentKey === "sink-base") {
    return [{
      ...hotspot,
      points: [[32.19, 56.37], [42.67, 54.78], [42.67, 83.36], [32.19, 84.87]],
    }];
  }
  return [hotspot];
});
PLAN_HOTSPOTS_BY_SLUG["ab-105822"].push({
  componentKey: "sink-faucet",
  points: [[22.35, 42.85], [29.5, 42.85], [29.5, 54.3], [22.35, 55.2]],
  preserveManualSize: true,
});
PLAN_HOTSPOTS_BY_SLUG["ab-105828"] = PLAN_HOTSPOTS_BY_SLUG["ab-105822"];
PLAN_HOTSPOTS_BY_SLUG["ab-105830"] = PLAN_HOTSPOTS_BY_SLUG["ab-105827"];
PLAN_HOTSPOTS_BY_SLUG["ab-105839"] = PLAN_HOTSPOTS_BY_SLUG["ab-105842"];
PLAN_HOTSPOTS_BY_SLUG["105845-modul-2"] = PLAN_HOTSPOTS_BY_SLUG["ab-105845"];
for (const slug of ["ab-105850", "ab-105853", "ab-105856", "ab-105859", "ab-105862"]) {
  PLAN_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG["ab-105847"];
}
for (const slug of ["ab-105848", "ab-105851", "ab-105854", "ab-105857", "ab-105860"]) {
  PLAN_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG["ab-105845"];
}
PLAN_HOTSPOTS_BY_SLUG["ab-105838"] = PLAN_HOTSPOTS_BY_SLUG["ab-105841"];
PLAN_HOTSPOTS_BY_SLUG["ab-105844"] = PLAN_HOTSPOTS_BY_SLUG["ab-105841"];
AB_105759_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG["ab-105759"];
});
AB_105762_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG["ab-105762"];
});
AB_105778_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG["ab-105778"];
});
AB_105846_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  PLAN_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG["ab-105846"];
});
// Keep service-claim previews on the exact same source-PDF faces as the
// configurator stage. Multiple polygons with one key are one physical part.
PLAN_HOTSPOTS_BY_SLUG["ab-110140"] = [
  { componentKey: "refrigerator", points: [[9.833729, 28.968067], [20.080760, 27.475630], [29.358670, 29.391597], [19.111639, 30.863866]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[9.833729, 28.968067], [19.111639, 30.863866], [19.111639, 90.823529], [9.833729, 88.927731]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[19.111639, 30.863866], [29.358670, 29.391597], [29.358670, 89.351261], [19.111639, 90.823529]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[42.370546, 12.914286], [43.140143, 13.075630], [52.418052, 14.971429], [52.418052, 39.394958], [43.140143, 37.478992], [42.370546, 37.337815]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[43.140143, 13.075630], [49.410926, 12.168067], [58.674584, 14.063866], [52.418052, 14.971429]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[52.418052, 14.971429], [61.695962, 16.887395], [61.695962, 41.290756], [52.418052, 39.394958]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[52.418052, 14.971429], [58.674584, 14.063866], [67.952494, 15.979832], [61.695962, 16.887395]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[61.695962, 16.887395], [70.959620, 18.783193], [70.959620, 43.206723], [61.695962, 41.290756]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[61.695962, 16.887395], [67.952494, 15.979832], [77.230404, 17.875630], [70.959620, 18.783193]], preserveManualSize: true },
  { componentKey: "extractor-hood", points: [[61.695962, 41.290756], [70.959620, 43.206723], [70.959620, 44.900840], [61.695962, 42.984874]], preserveManualSize: true },
  // Visible side triangle ends at source SVG point (5341, 2764).
  { componentKey: "extractor-hood", points: [[70.959620, 43.206723], [76.118765, 44.255462], [70.959620, 44.900840]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[70.959620, 18.783193], [78.698337, 20.376471], [78.698337, 44.800000], [70.959620, 43.206723]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[70.959620, 18.783193], [77.230404, 17.875630], [84.954869, 19.468908], [78.698337, 20.376471]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[78.698337, 20.376471], [84.954869, 19.468908], [84.954869, 43.892437], [78.698337, 44.800000]], preserveManualSize: true },
  { componentKey: "worktop", points: [[29.358670, 55.468908], [48.627078, 52.685714], [57.904988, 54.581513], [84.954869, 60.147899], [84.954869, 61.620168], [73.909739, 63.213445], [46.859857, 57.667227], [29.358670, 60.067227]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[32.821853, 55.892437], [32.821853, 51.939496], [32.921615, 51.919328], [32.921615, 49.277311], [34.076010, 46.816807], [36.256532, 46.937815], [36.213777, 47.885714], [34.104513, 47.764706], [33.349169, 49.378151], [33.349169, 52.020168], [33.448931, 52.020168], [33.448931, 55.932773]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[36.057007, 46.090756], [36.840855, 46.312605], [36.669834, 49.660504], [36.057007, 49.478992]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[29.358670, 60.067227], [37.638955, 58.917647], [37.638955, 88.524370], [29.358670, 89.734454]], preserveManualSize: true },
  { componentKey: "sink-base", points: [[37.638955, 58.917647], [45.933492, 57.647059], [45.933492, 87.334454], [37.638955, 88.524370]], preserveManualSize: true },
  // Keep the corner Blende in the claim group of the cabinet on its right.
  { componentKey: "base-module-2", points: [[45.933492, 57.647059], [47.629454, 57.828571], [47.629454, 87.475630], [45.933492, 87.334454]], preserveManualSize: true },
  { componentKey: "base-module-2", points: [[47.629454, 57.828571], [56.907363, 59.724370], [56.907363, 89.391597], [47.629454, 87.475630]], preserveManualSize: true },
  { componentKey: "oven-module", points: [[56.907363, 59.724370], [66.171021, 61.640336], [66.171021, 91.287395], [56.907363, 89.391597]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[66.171021, 61.640336], [73.909739, 63.213445], [73.909739, 92.880672], [66.171021, 91.287395]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[73.909739, 63.213445], [84.954869, 61.620168], [84.954869, 91.267227], [73.909739, 92.880672]], preserveManualSize: true },
];
// Use the same exact source-PDF faces as the interactive kitchen stage.
PLAN_HOTSPOTS_BY_SLUG["ab-110510"] = [
  { componentKey: "refrigerator", points: [[10.859857, 28.826891], [21.092637, 27.354622], [30.356295, 29.250420], [20.123515, 30.742857]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[10.859857, 28.826891], [20.123515, 30.742857], [20.123515, 90.621849], [10.859857, 88.726050]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[20.123515, 30.742857], [30.356295, 29.250420], [30.356295, 89.149580], [20.123515, 90.621849]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[21.092637, 14.668908], [29.372922, 13.458824], [34.631829, 14.547899], [26.351544, 15.737815]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[21.092637, 14.668908], [26.351544, 15.737815], [26.351544, 28.423529], [21.092637, 27.354622]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[26.351544, 15.737815], [34.631829, 14.547899], [34.631829, 38.931092], [30.356295, 39.636975], [30.356295, 29.250420], [26.351544, 28.423529]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[29.372922, 13.458824], [40.418052, 11.865546], [45.662708, 12.954622], [34.631829, 14.547899]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[34.631829, 14.547899], [45.662708, 12.954622], [45.662708, 37.337815], [34.631829, 38.931092]], preserveManualSize: true },
  { componentKey: "extractor-hood", points: [[34.631829, 38.931092], [45.662708, 37.337815], [45.662708, 39.032000], [34.631829, 40.625210]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[40.418052, 11.865546], [47.771971, 10.796639], [53.030879, 11.885714], [45.662708, 12.954622]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[45.662708, 12.954622], [53.030879, 11.885714], [53.030879, 36.268908], [45.662708, 37.337815]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[47.771971, 10.796639], [58.817102, 9.203361], [64.061758, 10.292437], [53.030879, 11.885714]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[53.030879, 11.885714], [64.061758, 10.292437], [64.061758, 34.675630], [53.030879, 36.268908]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[58.817102, 9.203361], [64.674584, 10.090756], [64.988124, 10.151261], [64.061758, 10.292437]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[64.061758, 10.292437], [64.988124, 10.151261], [64.988124, 34.554622], [64.061758, 34.675630]], preserveManualSize: true },
  { componentKey: "worktop", points: [[30.356295, 55.428571], [48.698337, 52.786555], [57.961995, 54.682353], [30.356295, 58.675630]], preserveManualSize: true },
  { componentKey: "worktop", points: [[48.698337, 52.786555], [59.729216, 51.173109], [87.007126, 56.779832], [75.961995, 58.373109], [57.961995, 54.682353]], preserveManualSize: true },
  { componentKey: "worktop", points: [[30.356295, 58.675630], [57.961995, 54.682353], [57.961995, 56.033613], [30.356295, 60.026891]], preserveManualSize: true },
  { componentKey: "worktop", points: [[57.961995, 54.682353], [75.961995, 58.373109], [87.007126, 56.779832], [87.007126, 58.131092], [75.961995, 59.724370], [57.961995, 56.033613]], preserveManualSize: true },
  { componentKey: "oven-module", claimApplianceSurface: "cooktop", points: [[30.356295, 55.549580], [41.030879, 53.996639], [49.054632, 55.589916], [37.752969, 57.304202]], preserveManualSize: true },
  { componentKey: "sink-faucet", claimFixturePartKey: "sink", points: [[59.330166, 53.633613], [65.586698, 52.685714], [67.011876, 52.746218], [78.356295, 55.085714], [78.228029, 55.327731], [71.971496, 56.235294], [71.102138, 56.215126], [65.258907, 55.226891], [59.201900, 53.875630]], preserveManualSize: true },
  { componentKey: "sink-faucet", claimFixturePartKey: "faucet", points: [[67.083135, 44.255462], [67.752969, 44.295798], [67.952494, 47.744538], [67.268409, 47.905882]], preserveManualSize: true },
  { componentKey: "sink-faucet", claimFixturePartKey: "faucet", points: [[67.752969, 45.163025], [70.361045, 45.203361], [71.729216, 47.663866], [71.729216, 50.305882], [72.042755, 54.157983], [72.042755, 54.500840], [70.902613, 54.500840], [70.902613, 54.157983], [71.344418, 54.319328], [71.344418, 50.426891], [71.216152, 50.366387], [71.216152, 47.724370], [70.318290, 46.110924], [67.824228, 46.151261]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[30.356295, 60.026891], [38.636580, 58.816807], [38.636580, 88.443697], [30.356295, 89.653782]], preserveManualSize: true },
  { componentKey: "oven-module", claimApplianceSurface: "oven", points: [[38.636580, 58.816807], [49.681710, 57.223529], [49.681710, 86.850420], [38.636580, 88.443697]], preserveManualSize: true },
  { componentKey: "base-module-2", points: [[49.681710, 57.223529], [57.035629, 56.154622], [57.035629, 85.781513], [49.681710, 86.850420]], preserveManualSize: true },
  { componentKey: "base-module-2", points: [[57.035629, 56.154622], [57.961995, 56.033613], [57.961995, 85.660504], [57.035629, 85.781513]], preserveManualSize: true },
  { componentKey: "base-module-2", points: [[57.961995, 56.033613], [58.731591, 56.194958], [58.731591, 85.801681], [57.961995, 85.660504]], preserveManualSize: true },
  { componentKey: "sink-base", points: [[58.731591, 56.194958], [66.456057, 57.768067], [66.456057, 87.394958], [58.731591, 85.801681]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[66.456057, 57.768067], [74.166271, 59.361345], [74.166271, 88.988235], [66.456057, 87.394958]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[74.166271, 59.361345], [75.961995, 59.724370], [75.961995, 89.351261], [74.166271, 88.988235]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[75.961995, 59.724370], [87.007126, 58.131092], [87.007126, 87.757983], [75.961995, 89.351261]], preserveManualSize: true },
];
PLAN_HOTSPOTS_BY_SLUG["ab-105750"] = PLAN_HOTSPOTS_BY_SLUG["ab-105747"];
PLAN_HOTSPOTS_BY_SLUG["ab-105753"] = PLAN_HOTSPOTS_BY_SLUG["ab-105747"];
PLAN_HOTSPOTS_BY_SLUG["ab-105756"] = PLAN_HOTSPOTS_BY_SLUG["ab-105747"];
PLAN_HOTSPOTS_BY_SLUG["ab-105736"] = PLAN_HOTSPOTS_BY_SLUG["ab-105733"];
PLAN_HOTSPOTS_BY_SLUG["ab-105739"] = PLAN_HOTSPOTS_BY_SLUG["ab-105733"];
PLAN_HOTSPOTS_BY_SLUG["ab-105742"] = PLAN_HOTSPOTS_BY_SLUG["ab-105733"];
PLAN_HOTSPOTS_BY_SLUG["ab-105749"] = PLAN_HOTSPOTS_BY_SLUG["ab-105746"];
PLAN_HOTSPOTS_BY_SLUG["ab-105752"] = PLAN_HOTSPOTS_BY_SLUG["ab-105746"];
PLAN_HOTSPOTS_BY_SLUG["ab-105755"] = PLAN_HOTSPOTS_BY_SLUG["ab-105746"];
PLAN_HOTSPOTS_BY_SLUG["ab-105735"] = PLAN_HOTSPOTS_BY_SLUG["ab-105732"];
PLAN_HOTSPOTS_BY_SLUG["ab-105738"] = PLAN_HOTSPOTS_BY_SLUG["ab-105732"];
PLAN_HOTSPOTS_BY_SLUG["ab-105741"] = PLAN_HOTSPOTS_BY_SLUG["ab-105732"];
PLAN_HOTSPOTS_BY_SLUG["ab-105751"] = PLAN_HOTSPOTS_BY_SLUG["ab-105748"];
PLAN_HOTSPOTS_BY_SLUG["ab-105754"] = PLAN_HOTSPOTS_BY_SLUG["ab-105748"];
PLAN_HOTSPOTS_BY_SLUG["ab-105745"] = PLAN_HOTSPOTS_BY_SLUG["ab-105748"];
PLAN_HOTSPOTS_BY_SLUG["ab-105734"] = PLAN_HOTSPOTS_BY_SLUG["ab-104968"];
PLAN_HOTSPOTS_BY_SLUG["ab-105737"] = PLAN_HOTSPOTS_BY_SLUG["ab-104968"];
PLAN_HOTSPOTS_BY_SLUG["ab-105740"] = PLAN_HOTSPOTS_BY_SLUG["ab-104968"];

for (const slug of AB_105777_LAYOUT_ALIAS_SLUGS) {
  PLAN_IMAGE_BY_SLUG[slug] = PLAN_IMAGE_BY_SLUG["ab-105777"];
  PLAN_IMAGE_SOURCE_SIZE_BY_SLUG[slug] = PLAN_IMAGE_SOURCE_SIZE_BY_SLUG["ab-105777"];
  PLAN_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG["ab-105777"];
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug] = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105777"];
}

for (const slug of AB_105779_LAYOUT_ALIAS_SLUGS) {
  PLAN_IMAGE_BY_SLUG[slug] = PLAN_IMAGE_BY_SLUG["ab-105779"];
  PLAN_IMAGE_SOURCE_SIZE_BY_SLUG[slug] = PLAN_IMAGE_SOURCE_SIZE_BY_SLUG["ab-105779"];
  PLAN_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG["ab-105779"];
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug] = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG["ab-105779"];
}
