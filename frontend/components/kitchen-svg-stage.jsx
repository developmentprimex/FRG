"use client";
import { AB_105777_LAYOUT_ALIAS_SLUGS } from "../lib/ab-105777-layout.js";
import { AB_105779_LAYOUT_ALIAS_SLUGS, AB_105779_LAYOUT_SLUGS } from "../lib/ab-105779-layout.js";

import { isBaseBodyHotspot, withBasePlinthExtension } from "../lib/kitchen-plan-plinth.js";
export { withBasePlinthExtension } from "../lib/kitchen-plan-plinth.js";

import dynamic from "next/dynamic";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import styles from "./kitchen-configurator.module.css";
import KitchenPlanSideLabels from "./kitchen-plan-side-labels";
import {
  componentIdForItem,
  componentIdForKey,
  getLinkedComponentIds,
  getLocalizedItemName,
  isHiddenLinkedComponent,
  normalizeColor,
  toggleLinkedComponentSelection,
} from "./kitchen-selection-utils";
import { usePublicI18n } from "./public-i18n";
import {
  applyPlanViewportToMarkup,
  refreshKitchenPlanSelection,
  syncKitchenPlan,
} from "./kitchen-svg-plan-utils";
import {
  AB_105759_LAYOUT_ALIAS_SLUGS,
  AB_105762_LAYOUT_ALIAS_SLUGS,
  AB_105778_LAYOUT_ALIAS_SLUGS,
  AB_110401_FRG_ORDER_HOTSPOTS,
  AB_110402_FRG_ORDER_HOTSPOTS,
  AB_109873_FRG_ORDER_HOTSPOTS,
  AB_109874_FRG_ORDER_HOTSPOTS,
  AB_109955_FRG_ORDER_HOTSPOTS,
  AB_111539_FRG_ORDER_HOTSPOTS,
  AB_105831_FRG_ORDER_HOTSPOTS,
  AB_105837_FRG_ORDER_HOTSPOTS,
  PLAN_HOTSPOTS_BY_SLUG,
  PLAN_IMAGE_BY_SLUG,
  PLAN_IMAGE_SOURCE_SIZE_BY_SLUG,
  PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG,
} from "../lib/kitchen-plan-preview-data";
import {
  getTwoPartMobilePlanCrop,
  getTwoPartMobilePlanLayout,
  shiftTwoPartPlanGeometry,
} from "../lib/two-part-mobile-plan-layout";
import {
  cropPlanHotspot as cropSharedPlanHotspot,
  getPlanDisplayCrop as getSharedPlanDisplayCrop,
  prepareKitchenPlanGeometry,
} from "../lib/kitchen-plan-geometry";

const Kitchen3DViewer = dynamic(() => import("./Kitchen3DViewer"), {
  ssr: false,
  loading: () => (
    <div className={styles.viewerLoading} role="status" aria-live="polite">
      Loading 3D preview…
    </div>
  ),
});

// Vector plans (rendered from the source PDFs via docs/render-plan-svg.py) so the drawing
// stays razor-sharp at any zoom. The pixel-perfect hotspot overlay sits on top unchanged
// (the SVG keeps the PDF's aspect ratio, so the %-based boxes still line up exactly).
export const IMAGE_VIEW_BY_SLUG = {
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
  "ab-105734": "/plans/AB%20104968-smooth.png",
  "ab-105737": "/plans/AB%20104968-smooth.png",
  "ab-105740": "/plans/AB%20104968-smooth.png",
  "ab-105837": "/jpg/AB%20105837_page-0001.jpg",
  "ab-105840": "/jpg/AB%20105837_page-0001.jpg",
  "ab-105843": "/jpg/AB%20105837_page-0001.jpg",
  "ab-105747": "/plans/AB%20105747.svg",
  "ab-105743": "/plans/AB%20105743-smooth.png",
  "ab-105748": "/plans/AB%20105748.svg",
  "ab-105751": "/plans/AB%20105748.svg",
  "ab-105754": "/plans/AB%20105748.svg",
  "ab-105745": "/plans/AB%20105748.svg",
  "ab-105758": "/plans/AB%20105758.svg",
  "ab-105750": "/plans/AB%20105747.svg",
  "ab-105753": "/plans/AB%20105747.svg",
  "ab-105756": "/plans/AB%20105747.svg",
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
  "ab-105732": "/plans/AB%20105732.svg",
  "ab-105746": "/plans/AB%20105746.svg",
  "ab-105757": "/plans/AB%20105757.svg",
  "ab-105759": "/plans/AB%20105759.svg",
  "ab-105762": "/plans/AB%20105762-63.svg?v=4",
  "ab-105775": "/plans/AB%20105775%20-%2064.svg?v=4",
  "ab-105749": "/plans/AB%20105746.svg",
  "ab-105752": "/plans/AB%20105746.svg",
  "ab-105755": "/plans/AB%20105746.svg",
  "ab-105735": "/plans/AB%20105732.svg",
  "ab-105738": "/plans/AB%20105732.svg",
  "ab-105741": "/plans/AB%20105732.svg",
  "ab-105733": "/plans/AB%20105733.svg",
  "ab-105736": "/plans/AB%20105733.svg",
  "ab-105739": "/plans/AB%20105733.svg",
  "ab-105742": "/plans/AB%20105733.svg",
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
  "ab-110140": "/plans/AB%20110140.svg",
  "ab-110510": "/plans/AB%20110510.svg",
  "ab-111539": "/plans/AB%20111539.svg",
  "ab-101246": "/plans/670%20101246.svg",
  "108134-modul-1": "/plans/108134%20MODUL%201.svg",
};

const AB_105846_LAYOUT_ALIAS_SLUGS = [
  "ab-105849",
  "ab-105852",
  "ab-105855",
  "ab-105858",
  "ab-105861",
];
AB_105846_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  IMAGE_VIEW_BY_SLUG[slug] = IMAGE_VIEW_BY_SLUG["ab-105846"];
});
AB_105759_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  IMAGE_VIEW_BY_SLUG[slug] = IMAGE_VIEW_BY_SLUG["ab-105759"];
});
AB_105762_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  IMAGE_VIEW_BY_SLUG[slug] = IMAGE_VIEW_BY_SLUG["ab-105762"];
});


// Clickable selection boxes drawn on top of a flat plan image.
// Coordinates are percentages of the rendered image (left/top/width/height),
// so they stay aligned at any display size. `componentKey` must match the
// component's `componentKey` in the kitchen data (see prisma/seed.js).
// Coordinates auto-detected from the 3509x2480 plan render by edge-detecting the CAD
// linework (see docs/detect-plan-hotspots.py). Values are % of image width/height, so they
// stay pixel-aligned at any display size. Use ?calibrate=1 on the kitchen page to verify.
export const IMAGE_HOTSPOTS_BY_SLUG = {
  // The right block's end panel remains white in orders; ASC keeps its own selector.
  "ab-105793": PLAN_HOTSPOTS_BY_SLUG["ab-105793"].filter(
    (hotspot) => hotspot.claimFurniturePartKey !== "worktop-end-panel-right",
  ),
  "ab-105796": PLAN_HOTSPOTS_BY_SLUG["ab-105796"].filter(
    (hotspot) => hotspot.claimFurniturePartKey !== "worktop-end-panel-right",
  ),
  "ab-105799": PLAN_HOTSPOTS_BY_SLUG["ab-105799"].filter(
    (hotspot) => hotspot.claimFurniturePartKey !== "worktop-end-panel-right",
  ),
  "ab-105802": PLAN_HOTSPOTS_BY_SLUG["ab-105802"].filter(
    (hotspot) => hotspot.claimFurniturePartKey !== "worktop-end-panel-right",
  ),
  "ab-105792": PLAN_HOTSPOTS_BY_SLUG["ab-105792"],
  "ab-105795": PLAN_HOTSPOTS_BY_SLUG["ab-105795"],
  "ab-105798": PLAN_HOTSPOTS_BY_SLUG["ab-105798"],
  "ab-105801": PLAN_HOTSPOTS_BY_SLUG["ab-105801"],
  "ab-105791": PLAN_HOTSPOTS_BY_SLUG["ab-105791"],
  "ab-105794": PLAN_HOTSPOTS_BY_SLUG["ab-105794"],
  "ab-105797": PLAN_HOTSPOTS_BY_SLUG["ab-105797"],
  "ab-105800": PLAN_HOTSPOTS_BY_SLUG["ab-105800"],
  "ab-105803": PLAN_HOTSPOTS_BY_SLUG["ab-105803"],
  "ab-105789": PLAN_HOTSPOTS_BY_SLUG["ab-105789"],
  "ab-105790": PLAN_HOTSPOTS_BY_SLUG["ab-105790"],
  "burger-103898": [
    // Exact visible faces traced from the 842 x 595 Burger vector plan.
    { componentKey: "refrigerator", points: [[9.562945, 36.813445], [17.75772, 35.139496], [28.304038, 36.652101], [20.109264, 38.346218]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[9.562945, 36.813445], [20.109264, 38.346218], [20.109264, 95.563025], [9.562945, 94.030252]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[20.109264, 38.346218], [28.304038, 36.652101], [28.304038, 93.889076], [20.109264, 95.563025]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[17.75772, 21.929412], [24.39905, 20.557983], [30.370546, 21.42521], [23.743468, 22.796639]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[17.75772, 21.929412], [23.743468, 22.796639], [23.743468, 36.006723], [17.75772, 35.139496]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[23.743468, 22.796639], [30.370546, 21.42521], [30.370546, 44.739496], [28.304038, 45.163025], [28.304038, 36.652101], [23.743468, 36.006723]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[24.39905, 20.557983], [33.249406, 18.742857], [39.220903, 19.610084], [30.370546, 21.42521]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[30.370546, 21.42521], [39.220903, 19.610084], [39.220903, 42.904202], [30.370546, 44.739496]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[30.370546, 44.739496], [39.220903, 42.904202], [39.220903, 44.517647], [30.370546, 46.352941]], preserveManualSize: true },
    // Two visible light symbols belong to the single three-spot LED accessory set.
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
    // Three tight faces follow the nozzle, curved spout, and vertical faucet stem.
    { componentKey: "sink-faucet", points: [[65.971496, 50.12437], [66.64133, 50.12437], [66.7981, 53.633613], [66.142518, 53.633613]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[66.584323, 50.910924], [68.679335, 50.910924], [69.36342, 51.818487], [69.776722, 53.270588], [69.776722, 55.872269], [69.36342, 55.872269], [69.36342, 53.351261], [68.650831, 51.939496], [66.64133, 51.939496]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[69.505938, 55.791597], [69.890736, 55.791597], [69.890736, 59.684034], [69.76247, 59.946218], [69.178147, 60.006723], [69.178147, 59.905882], [69.505938, 59.643697]], preserveManualSize: true },
  ],
  "ab-105758": [
    // Exact faces traced from the 842 x 595 vector PDF. Repeated keys keep
    // every visible perspective face of one physical article synchronized.
    { componentKey: "wall-cabinet-1", points: [[40.860, 7.711], [41.644, 7.872], [41.644, 32.719], [40.860, 32.558]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[41.644, 7.872], [48.029, 6.965], [57.463, 8.901], [51.093, 9.829]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[41.644, 7.872], [51.093, 9.829], [51.093, 34.676], [41.644, 32.719]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[51.093, 9.829], [57.463, 8.901], [66.898, 10.837], [60.527, 11.765]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[51.093, 9.829], [60.527, 11.765], [60.527, 36.612], [51.093, 34.676]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[51.093, 34.676], [60.527, 36.612], [60.527, 38.326], [51.093, 36.390]], preserveManualSize: true },
    // The two visible symbols represent the three-spot LED accessory set.
    // Their five-point envelopes follow the outer PDF rays exactly.
    { componentKey: "under-cabinet-light", points: [[53.216152, 38.023529], [54.028504, 38.205042], [54.541568, 41.189916], [53.629454, 40.988235], [52.703088, 40.806723]], preserveManualSize: true },
    { componentKey: "under-cabinet-light", points: [[58.004751, 39.011765], [58.802850, 39.173109], [59.315914, 42.157983], [58.403800, 41.976471], [57.491686, 41.794958]], preserveManualSize: true },
    // NR 9 (US30) is the third upper cabinet above the refrigerator. Its
    // top, left face, and right face follow the PDF's six outer strokes.
    { componentKey: "wall-cabinet-3", points: [[60.527, 11.765], [66.898, 10.837], [71.615, 11.805], [65.245, 12.733]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[60.527, 11.765], [65.245, 12.733], [65.245, 25.741], [60.613, 26.407]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[65.245, 12.733], [71.615, 11.805], [71.615, 24.733], [65.245, 25.741]], preserveManualSize: true },

    { componentKey: "worktop", points: [[10.603, 54.965], [47.159, 49.681], [56.594, 51.617], [20.038, 56.901]], preserveManualSize: true },
    { componentKey: "worktop", points: [[56.594, 51.617], [60.613, 52.444], [60.613, 56.376], [45.349, 53.230]], preserveManualSize: true },
    { componentKey: "worktop", points: [[10.603, 54.965], [20.038, 56.901], [45.349, 53.230], [45.349, 54.622], [20.038, 58.272], [10.603, 56.336]], preserveManualSize: true },
    { componentKey: "worktop", points: [[45.349, 53.230], [60.613, 56.376], [60.613, 57.748], [45.349, 54.622]], preserveManualSize: true },
    { componentKey: "worktop", points: [[60.371, 57.708], [60.613, 57.748], [60.613, 87.919], [60.371, 87.879]], preserveManualSize: true },

    // Trace the faucet as three narrow PDF-vector silhouettes instead of one
    // bounding polygon, which used to fill the empty area beneath the spout.
    { componentKey: "sink-faucet", points: [[16.261, 48.450], [16.318, 47.724], [16.575, 46.756], [17.002, 45.970], [17.658, 45.506], [20.309, 44.800], [20.252, 45.768], [17.686, 46.474], [17.359, 46.676], [17.045, 47.119], [16.846, 47.745], [16.789, 48.390]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[16.261, 48.450], [16.789, 48.390], [16.860, 55.106], [16.375, 55.166]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[20.337, 43.771], [20.993, 43.852], [20.793, 47.462], [20.109, 47.361]], preserveManualSize: true },
    // The optional UPK20 is the narrow divider beside the fixed end sink.
    { componentKey: "sink-base", points: [[12.299, 56.679], [20.038, 58.272], [19.724, 88.383], [12.299, 86.266]], preserveManualSize: true },
    { componentKey: "sink-end-blende", points: [[20.038, 58.272], [21.734, 58.030], [21.734, 88.202], [19.724, 88.383]], preserveManualSize: true },
    { componentKey: "sink-base", points: [[21.734, 58.030], [32.979, 56.397], [32.979, 86.588], [21.734, 88.202]], preserveManualSize: true },
    { componentKey: "base-module-3", points: [[32.979, 56.397], [44.223, 54.783], [44.223, 84.955], [32.979, 86.588]], preserveManualSize: true },
    // The dishwasher's UPEF65 is drawn as two adjacent projected bands.
    { componentKey: "base-module-3", points: [[44.223, 54.783], [45.349, 54.622], [45.349, 84.793], [44.223, 84.955]], preserveManualSize: true },
    { componentKey: "base-module-3", points: [[45.349, 54.622], [46.219, 54.783], [46.219, 84.975], [45.349, 84.793]], preserveManualSize: true },
    { componentKey: "oven-module", points: [[46.219, 54.783], [55.653, 56.739], [55.653, 86.911], [46.219, 84.975]], preserveManualSize: true },
    { componentKey: "drawer-module", points: [[55.653, 56.739], [60.371, 57.708], [60.371, 87.879], [55.653, 86.911]], preserveManualSize: true },

    { componentKey: "refrigerator", points: [[60.613, 26.407], [69.363, 28.202], [69.363, 89.210], [60.613, 87.415]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[69.363, 28.202], [80.608, 26.568], [80.608, 87.576], [69.363, 89.210]], preserveManualSize: true },
    { componentKey: "refrigerator", points: [[60.613, 26.407], [71.872, 24.773], [80.608, 26.568], [69.363, 28.202]], preserveManualSize: true },
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
    // Trace shared cabinet/hood seams from the 3509 x 2480 source JPG.
    // Adjacent faces use identical endpoints to avoid gaps and doubled tint.
    { componentKey: "wall-cabinet-1", points: [[19.80621, 11.49194], [29.75207, 10.04032], [35.48019, 11.20968], [25.50584, 12.66129]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[19.80621, 11.49194], [25.50584, 12.66129], [25.50584, 26.6129], [19.80621, 25.40323]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[25.50584, 12.66129], [35.48019, 11.20968], [35.48019, 37.74194], [29.52408, 38.58871], [29.52408, 27.33871], [25.50584, 26.6129]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[29.75207, 10.04032], [41.69279, 8.30645], [47.47791, 9.43548], [35.48019, 11.20968]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[35.48019, 11.20968], [47.47791, 9.43548], [47.47791, 36.00806], [35.48019, 37.74194]], preserveManualSize: true },
    // The fascia ends at the hood cabinet's right edge, above the light symbols.
    { componentKey: "extractor-hood", points: [[29.52408, 38.58871], [35.48019, 37.74194], [47.47791, 36.00806], [47.47791, 37.8629], [46.37988, 38.02177], [46.37988, 42.75], [36.57994, 44.07984], [36.57994, 39.40121], [35.48019, 39.55645]], preserveManualSize: true },
    // Follow the cabinet's sloping top outline, including its visible right return.
    { componentKey: "wall-cabinet-3", points: [[41.69279, 8.30645], [53.74751, 6.53226], [59.47563, 7.70161], [47.47791, 9.43548]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[47.47791, 9.43548], [59.47563, 7.70161], [59.47563, 34.27419], [47.47791, 36.00806]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[59.47563, 7.70161], [60.50157, 7.58065], [60.50157, 34.1129], [59.47563, 34.27419]], preserveManualSize: true },
    {
      componentKey: "worktop",
      points: [
        [29.55, 55.73], [46.4, 53.29], [54.81, 52.08], [67.92, 54.79], [94.73, 60.3], [94.82, 61.69],
        [82.83, 63.47], [67.92, 60.45], [53.81, 57.42], [31.81, 60.36], [29.55, 60.67],
      ],
    },
    { componentKey: "base-module-1", points: [[29.55, 60.65], [39.81, 59.41], [39.81, 91.94], [29.65, 93.09]] },
    { componentKey: "oven-module", points: [[39.81, 59.51], [51.81, 57.35], [51.81, 89.52], [39.81, 91.94]] },
    { componentKey: "base-module-2", points: [[51.92, 57.31], [62.3, 59.31], [62.3, 91.55], [51.92, 89.52]] },
    { componentKey: "base-module-3", points: [[72.33, 61.34], [82.67, 63.36], [82.67, 95.55], [72.33, 93.56]] },
    // The broad exposed return is the fixed WU16 cabinet side panel, not a
    // second face of the optional dishwasher. Keep it with the locked worktop.
    { componentKey: "worktop", points: [[82.67, 63.46], [94.54, 62.03], [94.54, 93.74], [82.67, 95.55]], preserveManualSize: true },
    { componentKey: "corner-base", points: [[62.31, 59.71], [72.3, 61.25], [72.41, 93.32], [62.22, 91.82]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[69.95, 45.98], [76.1, 45.98], [76.1, 58.89], [69.95, 58.89]], preserveManualSize: true },
  ],
  // AB 105747: exact CAD endpoints from the 842 x 595 vector PDF. Separate polygons retain
  // the visible top/side faces and include the lower/upper corner filler panels with their cabinet.
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
    {
      componentKey: "worktop",
      points: [[29.615, 58.514], [50.181, 55.55], [57.762, 57.103], [66.784, 55.792], [84.955, 59.523], [84.955, 60.632], [75.933, 61.943], [57.762, 58.212], [29.615, 62.266]],
    },
    { componentKey: "base-module-1", points: [[29.857, 62.245], [38.879, 60.934], [38.879, 85.156], [29.857, 86.447]] },
    { componentKey: "oven-module", points: [[38.879, 60.934], [47.9, 59.624], [47.9, 83.845], [38.879, 85.156]] },
    { componentKey: "base-module-2", points: [[47.9, 59.624], [56.936, 58.313], [58.39, 58.279], [58.39, 82.555], [56.936, 82.534], [47.9, 83.845]] },
    { componentKey: "sink-base", points: [[58.39, 58.279], [65.957, 59.832], [65.957, 84.108], [58.39, 82.555]], preserveManualSize: true },
    // Callout 7: the 45 cm dishwasher front ends at the photographed 45/30 cm seam.
    { componentKey: "base-module-3", points: [[65.957, 59.886], [71.635, 61.06], [71.635, 85.27], [65.957, 84.108]] },
    // Callout 8: the US30 owns its front, the thin end-panel strip, and the visible side face.
    { componentKey: "drawer-module", points: [[71.635, 61.06], [75.42, 61.842], [76.233, 61.903], [76.233, 86.084], [75.42, 86.044], [71.635, 85.27]] },
    { componentKey: "drawer-module", points: [[76.233, 61.903], [84.456, 60.713], [84.456, 84.733], [76.233, 86.084]], preserveManualSize: true },
    { componentKey: "sink-faucet", points: [[67.097, 49.277], [70.903, 49.277], [70.903, 57.506], [67.097, 57.506]], preserveManualSize: true },
  ],
  "ab-105837": [
    { componentKey: "refrigerator", points: [[10.74, 29.62], [20.82, 28.18], [29.74, 30.02], [19.92, 31.56]] },
    { componentKey: "refrigerator", points: [[10.74, 29.62], [19.92, 31.56], [19.92, 90.92], [10.8, 89.05]] },
    { componentKey: "refrigerator", points: [[19.92, 31.56], [30.2, 30.02], [30.2, 89.62], [19.92, 90.92]] },
    { componentKey: "wall-cabinet-1", points: [[20.92, 15.56], [32.09, 13.87], [37.08, 15.07], [26.1, 16.50]] },
    { componentKey: "wall-cabinet-1", points: [[20.92, 15.50], [26.1, 16.5], [26.1, 29.25], [20.8, 28.3]] },
    { componentKey: "wall-cabinet-1", points: [[26.1, 16.70], [37.08, 15.07], [37.08, 39.28], [30.09, 40.45], [30.09, 30.25], [26.1, 29.15]] },
    { componentKey: "wall-cabinet-2", points: [[37.10, 15.17], [48.07, 13.6], [43.02, 12.29], [32.08, 13.87]] },
    { componentKey: "wall-cabinet-2", points: [[37.08, 15.17], [48.02, 13.59], [48.02, 37.69], [37.08, 39.38]] },
    { componentKey: "extractor-hood", points: [[37.09, 41.05], [37.08, 39.28], [32.08, 40.08]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[37.08, 39.38], [48.02, 37.69], [48.02, 39.38], [37.08, 41.0]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[38.08, 45.38], [47.02, 44.09], [47.02, 39.58], [38.08, 41.0]] },
    { componentKey: "wall-cabinet-3", points: [[43.1, 12.22], [53.55, 10.85], [58.76, 11.9], [48.02, 13.75]] },
    { componentKey: "wall-cabinet-3", points: [[48.02, 13.55], [60.02, 11.80], [60.02, 36.0], [48.02, 37.85]] },
   
    // Keep the ASC worktop split on the other red-marked seam: source pixels
    // (1621, 1331) to (1858, 1386) in the 3509 x 2480 plan render.
    { componentKey: "worktop", points: [[30.34, 56.08], [33.07, 55.93], [43.76, 54.03], [46.195497, 53.669355], [52.949558, 55.887097], [52.05, 55.82], [41.07, 58.02], [30.34, 60.02]] },
    { componentKey: "worktop", points: [[46.195497, 53.669355], [52.05, 53.0], [53.98, 52.7], [54.687945, 52.419355], [61.64, 53.95], [70.85, 55.88], [80.05, 57.72], [91.22, 59.92], [91.22, 60.48], [80.05, 61.82], [70.85, 59.38], [61.64, 57.48], [53.98, 55.95], [52.949558, 55.887097]] },
    // Split the short inside-corner fascia exactly in half. Both runs meet on
    // the midpoint line from (53.015, 55.885) to (53.015, 57.4343).
    { componentKey: "worktop", points: [[30.34, 60.02], [41.07, 58.02], [52.05, 55.82], [53.015, 55.885], [53.015, 57.4343], [52.05, 57.45], [41.07, 59.05], [30.09, 60.73]], preserveManualSize: true },
    { componentKey: "worktop", points: [[53.015, 55.885], [53.98, 55.95], [61.64, 57.48], [70.85, 59.38], [80.05, 61.82], [91.22, 60.48], [91.22, 61.3], [80.05, 63.02], [70.85, 61.08], [61.64, 59.08], [53.015, 57.4343]], preserveManualSize: true },
    { componentKey: "base-module-1", points: [[30.09, 60.73], [41.07, 59.05], [41.07, 88.51], [30.09, 89.90]] },
    { componentKey: "oven-module", points: [[41.07, 59.05], [52.05, 57.45], [52.05, 86.80], [41.07, 88.51]] },
    { componentKey: "base-module-2", points: [[52.05, 57.25], [61.64, 58.92], [61.64, 88.5], [52.05, 86.62]] },
    { componentKey: "base-module-4", points: [[61.64, 59.08], [70.85, 60.88], [70.85, 90.69], [61.64, 88.69]] },
    { componentKey: "base-module-3", points: [[70.85, 61.08], [80.05, 62.82], [80.05, 92.25], [70.85, 90.55]] },
    // The broad face at the far right is the separately claimable WU16 cabinet
    // side panel, not a second face of base-module-3.
    { componentKey: "worktop", points: [[80.05, 63.02], [91.22, 61.30], [91.22, 91.1], [80.05, 92.25]], preserveManualSize: true },
    
    { componentKey: "sink-faucet", points: [[68.6, 46.7], [75.1, 46.7], [75.1, 56.5], [68.6, 56.75]], preserveManualSize: true },
  ],
  "ab-105825": [
    {
      componentKey: "wall-cabinet-1",
      points: [[48.1, 12.2], [57.90, 14.08], [57.90, 37.63], [48.1, 35.63]],
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
      points: [[57.98, 37.42], [66.98, 39.25], [66.75, 46.22], [58.43, 45.21]],
      preserveManualSize: true,
    },
    {
      componentKey: "extractor-hood",
      points: [[66.75, 39.25], [71.95, 40.55], [66.75, 41.08]],
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
      points: [[6.65, 55.63], [16.75, 54.12], [34.92, 51.09], [41.69, 52.77], [43.71, 54.45], [39.55, 55.13], [34.92, 55.8], [15.8, 58.49], [6.65, 56.81]],
    },
    {
      componentKey: "worktop",
      points: [[42.2, 53.45], [54.51, 51.43], [75.77, 56.13], [75.65, 61.34], [70.43, 59.83], [65.8, 58.82], [55.46, 56.64], [49.64, 55.8]],
    },
    {
      componentKey: "worktop",
      points: [[44.71, 54.45], [75.65, 61.55], [75.65, 61.12], [70.43, 59.83], [65.8, 58.82], [55.46, 56.64], [49.64, 55.8], [45.71, 54.95]],
      preserveManualSize: true,
    },
   
    {
      componentKey: "sink-faucet",
      points: [[22.35, 42.85], [29.5, 42.85], [29.5, 54.3], [22.35, 55.2]],
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
      points: [[21.62, 57.88], [32.19, 56.27], [32.19, 84.87], [21.62, 86.39]],
    },
    {
      componentKey: "sink-base",
      // Stop at the calibrated UPEF65 boundary so this cabinet never paints
      // or captures the independently selectable corner Blende beside it.
      points: [[32.19, 56.37], [42.661727, 54.78], [42.661727, 83.36], [32.19, 84.87]],
    },
    {
      componentKey: "base-module-2",
      points: [[42.47, 54.8], [44.18, 54.8], [53.44, 56.8], [53.44, 85.21], [45.18, 83.36], [42.7, 83.36]],
    },
    {
      componentKey: "oven-base",
      points: [[53.44, 56.8], [62.20, 58.55], [62.20, 87.06], [53.44, 85.21]],
    },
    {
      componentKey: "base-module-3",
      points: [[62.0, 58.55], [71.02, 60.20], [71.02, 88.74], [62.0, 87.06]],
    },
    {
      componentKey: "drawer-base",
      points: [[71.02, 60.40], [75.65, 61.2], [75.65, 89.75], [71.02, 88.74]],
    },
    {
      componentKey: "refrigerator",
      points: [[75.65, 31.76], [84.2, 33.61], [84.2, 90.92], [75.65, 89.75]],
    },
    {
      componentKey: "refrigerator",
      points: [[84.2, 33.61], [94.89, 31.93], [94.79, 89.28], [84.2, 90.92]],
    },
    {
      componentKey: "refrigerator",
      points: [[75.65, 31.76], [85.99, 30.25], [94.89, 31.93], [84.2, 33.61]],
    },
  ],
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
    { componentKey: "sink-faucet", points: PLAN_HOTSPOTS_BY_SLUG["ab-105743"].find(h => h.componentKey === "sink-faucet").points, preserveManualSize: true },
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
      points: [[57.97, 18.14], [67.11, 20.0], [67.11, 43.85], [57.97, 42.45]],
    },
    {
      componentKey: "wall-cabinet-2",
      points: [[57.97, 18.14], [67.11, 20.0], [73.9, 19.24], [64.05, 16.85]],
    },
    {
      componentKey: "extractor-hood",
      points: [[57.97, 42.05], [67.11, 43.85], [66.85, 49.85], [58.25, 48.0]],
      preserveManualSize: true,
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
      componentKey: "wall-cabinet-3",
      points: [[67.11, 20.0], [74.78, 21.25], [80.87, 20.18], [73.9, 19.24]],
    },
    {
      componentKey: "wall-cabinet-4",
      points: [[74.78, 21.25], [79.37, 20.52], [85.58, 21.25], [85.58, 33.9], [79.37, 34.9], [74.78, 35.32]],
    },
    {
      componentKey: "worktop",
      points: [[5.3, 60.85], [14.55, 59.0], [35.05, 56.45], [43.35, 58.3], [43.35, 59.8], [35.45, 60.55], [15.55, 63.8], [5.3, 62.0]],
    },
    {
      componentKey: "worktop",
      points: [[43.35, 58.3], [55.25, 56.75], [65.55, 59.05], [74.95, 61.0], [74.75, 62.65], [62.35, 61.55], [53.25, 60.35], [43.35, 59.8]],
    },
    {
      componentKey: "worktop",
      points: [  [31.45, 60.55], [42.35, 59.8], [35.35, 60.95], [30.05, 61.5], [10.55, 62.55], [7.3, 63.05]],
      preserveManualSize: true,
    },
    {
      componentKey: "worktop",
      points: [[43.5, 59.8], [55.25, 60.35], [62.35, 61.55], [75.05, 62.65], [74.75, 66.2], [59.35, 62.7], [52.25, 61.5], [45.35, 59.95]],
      preserveManualSize: true,
    },
  
    {
      componentKey: "sink-faucet",
      points: [[25.05, 47.15], [30.8, 47.15], [30.8, 58.15], [25.05, 58.65]],
      preserveManualSize: true,
    },
    {
      componentKey: "base-module-1",
      points: [[5.3, 61.70], [14.55, 63.82], [14.55, 93.2], [5.3, 91.3]],
    },
    {
      componentKey: "base-module-1",
      points: [[14.55, 63.92], [20.45, 62.75], [20.45, 92.27], [14.55, 93.2]],
    },
    {
      componentKey: "base-module-3",
      points: [[20.45, 62.85], [31.45, 61.45], [31.45, 90.8], [20.45, 92.27]],
    },
    {
      componentKey: "sink-base",
      points: [[31.45, 61.55], [42.55, 59.8], [42.25, 89.25], [31.45, 90.8]],
    },
    {
      componentKey: "corner-blende",
      points: [[42.55, 59.8], [43.288686, 59.8], [43.288686, 88.442133], [42.25, 89.25]],
    },
    {
      componentKey: "base-module-2",
      points: [[43.288686, 59.8], [53.25, 61.55], [53.25, 91.2], [43.288686, 88.442133]],
    },
    {
      componentKey: "oven-module",
      points: [[53.25, 61.55], [62.35, 63.55], [62.35, 92.70], [53.25, 91.2]],
    },
    {
      componentKey: "drawer-module",
      points: [[62.35, 63.55], [70.08, 65.24], [70.08, 94.56], [62.35, 93.0]],
    },
    {
      componentKey: "base-module-4",
      points: [[70.08, 65.24], [74.75, 65.95], [74.65, 95.5], [70.08, 94.56]],
    },
    {
      componentKey: "refrigerator",
      points: [[74.89, 35.91], [83.39, 37.34], [83.39, 96.49], [74.89, 95.16]],
    },
    {
      componentKey: "refrigerator",
      points: [[83.39, 37.04], [94.33, 36.01], [94.33, 95.16], [83.39, 96.89]],
    },
    {
      componentKey: "refrigerator",
      points: [[85.89, 34.31], [85.39, 33.45], [86.33, 34.31], [94.53, 35.65], [83.39, 37.34], [73.89, 35.45]],
    },
  ],
  "ab-104968": [
    { componentKey: "refrigerator", points: [[72.41, 90.47], [81.02, 92.08], [91.71, 90.47], [91.71, 31.3], [83.29, 29.69], [72.41, 31.17], [72.41, 90.57]], preserveManualSize: true },
    { componentKey: "wall-cabinet-1", points: [[6.8, 15.05], [15.89, 13.89], [20.8, 14.76], [21, 38.91], [11.91, 40.22], [6.69, 39.06], [6.59, 15.19]], preserveManualSize: true },
    { componentKey: "wall-cabinet-2", points: [[16.59, 39.64], [20.88, 40.51], [31.82, 38.92], [31.82, 13.31], [26.91, 12.16], [16.08, 13.75], [20.99, 15.05], [20.99, 38.92], [16.9, 39.64]], preserveManualSize: true },
    { componentKey: "extractor-hood", points: [[20.83, 45.69], [20.88, 40.51], [31.82, 38.92], [31.7, 45.11]], preserveManualSize: true },
    { componentKey: "wall-cabinet-3", points: [[31.82, 13.31], [26.81, 12.01], [34.17, 11.14], [39.18, 12.16], [39.08, 36.32], [31.82, 37.33], [31.82, 13.46]] },
    // Exact cabinet outline plus its narrow HPK2002 side face. The claims
    // splitter uses the PDF divider at x=49.995249 to keep them independent.
    { componentKey: "wall-cabinet-4", points: [[39.092637, 12.208403], [33.904988, 11.139496], [44.807601, 9.566387], [49.995249, 10.635294], [50.893112, 10.494118], [50.893112, 34.47395], [49.995249, 34.715966], [39.092637, 36.289076]] },
    { componentKey: "worktop", points: [[14.7, 59.97], [5.57, 58.11], [5.57, 56.64], [45.69, 50.91], [72.34, 56.36], [72.34, 60.09], [72.34, 61.55], [43.9, 55.82], [14.61, 59.96]] },
    // The exposed side and front are separate perspective faces of one US50
    // cabinet. Keeping the same source key selects both faces together.
    { componentKey: "base-module-1", points: [[6.655582, 58.373109], [15.805226, 59.865546], [15.805226, 89.109244], [6.655582, 87.233613]], preserveManualSize: true },
    { componentKey: "base-module-1", points: [[15.805226, 59.865546], [24.88361, 58.554622], [24.88361, 87.798319], [15.805226, 89.109244]], preserveManualSize: true },
    { componentKey: "oven-module", points: [[24.84, 58.62], [35.72, 57.01], [35.72, 86.09], [24.84, 87.83], [24.84, 58.47]] },
    // US40 front followed by its two projected UPK20 corner faces. The three
    // seams use the vector-PDF coordinates so claims can select each strip.
    { componentKey: "base-module-2", points: [[35.786223, 56.981513], [43.054632, 55.912605], [43.966746, 55.791597], [44.72209, 55.952941], [44.72209, 85.196639], [43.966746, 85.035294], [43.054632, 85.156303], [35.786223, 86.22521]] },
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
    { componentKey: "wall-cabinet-6", left: 80.01, top: 15.77, width: 14.85, height: 23.91 },
    { componentKey: "worktop", left: 18.12, top: 57.02, width: 76.61, height: 1.35 },
    { componentKey: "worktop", left: 17.67, top: 56.98, width: 0.45, height: 30.38 },
    { componentKey: "sink-faucet", left: 67.65, top: 50.15, width: 4.35, height: 8 },
    { componentKey: "base-module-1", left: 18.12, top: 58.37, width: 10.51, height: 28.99 },
    { componentKey: "oven-module", left: 28.63, top: 58.37, width: 14.02, height: 28.99 },
    { componentKey: "base-module-2", left: 42.65, top: 58.37, width: 9.34, height: 28.99 },
    { componentKey: "base-module-3", left: 51.99, top: 58.37, width: 14.01, height: 28.99 },
    { componentKey: "sink-base", left: 66, top: 58.37, width: 14.01, height: 28.99 },
    { componentKey: "drawer-module", left: 80.01, top: 58.37, width: 14.85, height: 28.99 },
  ],
  "ab-105812": [
    { componentKey: "refrigerator", left: 2.51, top: 29.15, width: 13.19, height: 60.54 },
    { componentKey: "wall-cabinet-1", left: 17.07, top: 16.85, width: 7.11, height: 24.32 },
    { componentKey: "wall-cabinet-2", left: 24.18, top: 16.85, width: 14.28, height: 24.32 },
    { componentKey: "extractor-hood", left: 24.18, top: 41.17, width: 14.28, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.46, top: 16.85, width: 14.26, height: 24.32 },
    { componentKey: "wall-cabinet-4", left: 52.72, top: 16.85, width: 14.25, height: 24.32 },
    { componentKey: "wall-cabinet-5", left: 66.97, top: 16.85, width: 14.26, height: 24.32 },
    { componentKey: "wall-cabinet-6", left: 81.23, top: 16.85, width: 15.17, height: 24.32 },
    { componentKey: "worktop", left: 17.07, top: 58.83, width: 79.33, height: 1.33 },
    { componentKey: "worktop", left: 16.62, top: 58.79, width: 0.45, height: 30.91 },
    { componentKey: "sink-faucet", left: 68.77, top: 52.16, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.07, top: 60.16, width: 7.11, height: 29.54 },
    { componentKey: "oven-module", left: 24.18, top: 60.16, width: 14.28, height: 29.54 },
    { componentKey: "base-module-2", left: 38.46, top: 60.16, width: 14.26, height: 29.54 },
    { componentKey: "base-module-3", left: 52.72, top: 60.16, width: 14.25, height: 29.54 },
    { componentKey: "sink-base", left: 66.97, top: 60.16, width: 14.26, height: 29.54 },
    { componentKey: "drawer-module", left: 81.23, top: 60.16, width: 15.17, height: 29.54 },
  ],
  "ab-105814": [
    { componentKey: "refrigerator", left: 3.9, top: 27.88, width: 12.97, height: 59.48 },
    { componentKey: "wall-cabinet-1", left: 18.12, top: 15.77, width: 10.51, height: 23.91 },
    { componentKey: "wall-cabinet-2", left: 28.63, top: 15.77, width: 14.02, height: 23.91 },
    { componentKey: "extractor-hood", left: 28.63, top: 39.68, width: 14.02, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 42.65, top: 15.77, width: 9.34, height: 23.91 },
    { componentKey: "wall-cabinet-4", left: 51.99, top: 15.77, width: 14.01, height: 23.91 },
    { componentKey: "wall-cabinet-5", left: 66, top: 15.77, width: 14.01, height: 23.91 },
    { componentKey: "wall-cabinet-6", left: 80.01, top: 15.77, width: 14.85, height: 23.91 },
    { componentKey: "worktop", left: 17.77, top: 57.04, width: 76.96, height: 1.33 },
    { componentKey: "worktop", left: 17.77, top: 57.04, width: 0.37, height: 30.33 },
    { componentKey: "sink-faucet", left: 68.2, top: 51.95, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.77, top: 58.37, width: 10.88, height: 29.0 },
    { componentKey: "oven-module", left: 28.65, top: 58.37, width: 14.01, height: 29.0 },
    { componentKey: "base-module-2", left: 42.66, top: 58.37, width: 9.35, height: 29.0 },
    { componentKey: "base-module-3", left: 52.01, top: 58.37, width: 14.0, height: 29.0 },
    { componentKey: "sink-base", left: 66.01, top: 58.37, width: 14.01, height: 29.0 },
    { componentKey: "drawer-module", left: 80.02, top: 58.37, width: 14.71, height: 29.0 },
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
    { componentKey: "wall-cabinet-1", left: 3.0, top: 17.34, width: 16.51, height: 26.73 },
    { componentKey: "wall-cabinet-2", left: 19.34, top: 17.34, width: 15.67, height: 26.73 },
    { componentKey: "wall-cabinet-3", left: 35.01, top: 17.34, width: 15.67, height: 26.73 },
    { componentKey: "wall-cabinet-4", left: 50.68, top: 17.34, width: 15.68, height: 26.73 },
    { componentKey: "extractor-hood", left: 50.68, top: 44.07, width: 15.68, height: 7.05 },
    { componentKey: "worktop", left: 3.08, top: 63.47, width: 62.88, height: 1.35 },
    { componentKey: "worktop", left: 66.36, top: 63.57, width: 0.45, height: 33.87 },
    { componentKey: "sink-faucet", left: 30.18, top: 56.05, width: 1.48, height: 7.42 },
    { componentKey: "base-module-1", left: 3.0, top: 64.82, width: 16.51, height: 32.62 },
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
    { componentKey: "worktop", left: 82.09, top: 58.25, width: 0.55, height: 24.05 },
    { componentKey: "sink-faucet", left: 49.5, top: 51.5, width: 3.85, height: 8 },
    { componentKey: "base-module-1", left: 0.9, top: 59.48, width: 14.46, height: 22.82 },
    { componentKey: "oven-module", left: 15.36, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "base-module-2", left: 28.74, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "sink-base", left: 42.12, top: 59.48, width: 13.38, height: 22.82 },
    { componentKey: "base-module-3", left: 55.5, top: 59.48, width: 13.23, height: 22.82 },
    { componentKey: "drawer-module", left: 68.87, top: 59.48, width: 12.17, height: 22.82 },
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
  "ab-105822": [
    { componentKey: "refrigerator", left: 8.54, top: 28.69, width: 13.13, height: 59.66 },
    { componentKey: "wall-cabinet-1", left: 23.62, top: 16.41, width: 11.79, height: 24.19 },
    { componentKey: "wall-cabinet-2", left: 35.41, top: 16.41, width: 14.18, height: 24.19 },
    { componentKey: "extractor-hood", left: 35.41, top: 40.6, width: 14.18, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 49.59, top: 16.41, width: 14.17, height: 24.19 },
    { componentKey: "wall-cabinet-4", left: 63.76, top: 16.41, width: 14.17, height: 24.19 },
    { componentKey: "wall-cabinet-5", left: 77.93, top: 16.41, width: 15.81, height: 24.19 },
    { componentKey: "worktop", left: 23.24, top: 58.17, width: 70.5, height: 1.33 },
    { componentKey: "worktop", left: 23.24, top: 59.5, width: 0.45, height: 29.16, preserveManualSize: true },
    { componentKey: "base-module-1", left: 23.63, top: 59.5, width: 11.8, height: 24.16 },
    { componentKey: "oven-module", left: 35.43, top: 59.5, width: 14.16, height: 24.16 },
    { componentKey: "base-module-2", left: 49.6, top: 59.5, width: 14.17, height: 24.16 },
    { componentKey: "base-module-3", left: 63.77, top: 59.5, width: 14.16, height: 24.16 },
    { componentKey: "sink-base", left: 77.94, top: 59.5, width: 15.8, height: 24.16 },
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
    { componentKey: "wall-cabinet-6", left: 81.26, top: 17.5, width: 15.04, height: 24.27 },
    { componentKey: "worktop", left: 17.16, top: 59.48, width: 79.14, height: 1.4 },
    { componentKey: "worktop", left: 16.71, top: 59.44, width: 0.45, height: 30.86 },
    { componentKey: "sink-faucet", left: 68.06, top: 52.88, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.16, top: 60.88, width: 7.12, height: 29.42 },
    { componentKey: "oven-module", left: 24.28, top: 60.88, width: 14.24, height: 29.42 },
    { componentKey: "base-module-2", left: 38.52, top: 60.88, width: 14.26, height: 29.42 },
    { componentKey: "base-module-3", left: 52.78, top: 60.88, width: 14.23, height: 29.42 },
    { componentKey: "sink-base", left: 67.01, top: 60.88, width: 14.25, height: 29.42 },
    { componentKey: "drawer-module", left: 81.26, top: 60.88, width: 15.04, height: 29.42 },
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
  // Grid measured from the rendered PDF; base overlays begin immediately below the worktop.
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
  // AB 105759-56: 400/600/300/600/600/900 mm linear run, fridge left.
  // The last 900 mm base/wall boxes include their right-side schedule fillers.
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
  "ab-105841": [
    { componentKey: "wall-cabinet-1", left: 0.9, top: 19.23, width: 13.98, height: 22.73 },
    { componentKey: "wall-cabinet-2", left: 14.88, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "extractor-hood", left: 14.88, top: 41.9, width: 13.32, height: 5.5 },
    { componentKey: "wall-cabinet-3", left: 28.2, top: 19.23, width: 13.34, height: 22.73 },
    { componentKey: "wall-cabinet-4", left: 41.54, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "wall-cabinet-5", left: 54.86, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "wall-cabinet-6", left: 68.18, top: 19.23, width: 13.34, height: 22.73 },
    { componentKey: "worktop", left: 0.9, top: 58.47, width: 80.98, height: 1.4 },
    { componentKey: "worktop", left: 81.88, top: 59.9, width: 0.45, height: 27.44 },
    { componentKey: "sink-faucet", left: 49.19, top: 51.87, width: 4.53, height: 8 },
    { componentKey: "base-module-1", left: 0.9, top: 59.9, width: 13.98, height: 27.44 },
    { componentKey: "oven-module", left: 14.88, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "base-module-2", left: 28.2, top: 59.9, width: 13.34, height: 27.44 },
    { componentKey: "sink-base", left: 41.54, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "base-module-3", left: 54.86, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "drawer-module", left: 68.55, top: 59.9, width: 13.34, height: 27.44 },
    { componentKey: "refrigerator", left: 85.15, top: 30.75, width: 12.35, height: 56.59 },
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
  "ab-105846": [
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
  // AB 105811 uses the AB 105819 vector-plan geometry in the service picker.
  // Keep these bounds in that rendered coordinate system.
  "ab-105811": [
    { componentKey: "wall-cabinet-1", left: 2.8, top: 17.34, width: 16.54, height: 26.73 },
    { componentKey: "wall-cabinet-2", left: 19.34, top: 17.34, width: 15.67, height: 26.73 },
    { componentKey: "wall-cabinet-3", left: 35.01, top: 17.34, width: 15.67, height: 26.73 },
    { componentKey: "wall-cabinet-4", left: 50.68, top: 17.34, width: 15.68, height: 26.73 },
    { componentKey: "extractor-hood", left: 50.68, top: 44.07, width: 15.68, height: 7.05 },
    { componentKey: "worktop", left: 2.8, top: 63.57, width: 63.56, height: 1.35 },
    { componentKey: "worktop", left: 66.36, top: 63.57, width: 0.45, height: 33.87 },
    { componentKey: "sink-faucet", left: 30.18, top: 56.05, width: 1.48, height: 7.42 },
    { componentKey: "base-module-1", left: 2.8, top: 64.92, width: 16.54, height: 32.52 },
    { componentKey: "sink-base", left: 19.34, top: 64.92, width: 15.67, height: 32.52 },
    { componentKey: "base-module-3", left: 35.01, top: 64.92, width: 15.67, height: 32.52 },
    { componentKey: "oven-module", left: 50.68, top: 64.92, width: 15.68, height: 32.52 },
    { componentKey: "refrigerator", left: 69.75, top: 31.0, width: 14.52, height: 66.43 },
  ],
  // 108134 MODUL 1 — single-wall run, fridge tall unit on the right. Edges auto-detected
  // from the 3509x2480 render (docs/detect-plan-hotspots.py) and overlay-verified.
  // Wall + base columns share dividers at 7.78/22.40/37.02/51.64/66.27/80.89% of width.
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
    { componentKey: "worktop", left: 7.78, top: 61.35, width: 73.55, height: 1.4 },
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
  // AB 105744 — single-wall run, fridge tall unit on the RIGHT. Edges auto-detected from the
  // 3509x2480 render (docs/detect-plan-hotspots.py) and overlay-verified. Wall + base columns
  // share dividers at 1.31/15.65/29.98/44.33/58.66/73.00/82.56% of width.
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
  // AB 105760-61: exact rectangles measured from the 842 x 595 vector PDF.
  // The separately priced UPK20 keeps its own narrow hotspot at the left end.
  "ab-105760": [
    { componentKey: "wall-cabinet-1", left: 6.256532, top: 17.089076, width: 18.099762, height: 26.964706, preserveManualSize: true },
    { componentKey: "wall-cabinet-2", left: 24.356295, top: 17.089076, width: 15.805225, height: 26.964706, preserveManualSize: true },
    { componentKey: "wall-cabinet-3", left: 40.161520, top: 17.089076, width: 15.790974, height: 26.964706, preserveManualSize: true },
    { componentKey: "extractor-hood", left: 40.161520, top: 44.053782, width: 15.790974, height: 6.366386, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 55.952494, top: 17.089076, width: 15.805226, height: 26.964706, preserveManualSize: true },
    { componentKey: "worktop", left: 6.256532, top: 63.616807, width: 65.743468, height: 1.492437, preserveManualSize: true },
    // The 29-unit-wide right support panel is the downstand of the fixed worktop.
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
  "ab-105761": [
    { componentKey: "wall-cabinet-1", left: 26.579572, top: 17.089076, width: 15.805226, height: 26.964706, preserveManualSize: true },
    { componentKey: "wall-cabinet-2", left: 42.384798, top: 17.089076, width: 15.805226, height: 26.964706, preserveManualSize: true },
    { componentKey: "extractor-hood", left: 42.384798, top: 44.053782, width: 15.805226, height: 6.366387, preserveManualSize: true },
    { componentKey: "wall-cabinet-3", left: 58.190024, top: 17.089076, width: 15.805226, height: 26.964706, preserveManualSize: true },
    { componentKey: "wall-cabinet-4", left: 73.995249, top: 17.089076, width: 17.871734, height: 26.964706, preserveManualSize: true },
    { componentKey: "worktop", left: 26.123515, top: 63.616807, width: 65.743468, height: 1.492437, preserveManualSize: true },
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
};

// FRG and ASC intentionally share the exact same AB 105831 cabinet polygons.
IMAGE_HOTSPOTS_BY_SLUG["ab-105831"] = AB_105831_FRG_ORDER_HOTSPOTS;
IMAGE_HOTSPOTS_BY_SLUG["ab-109873"] = AB_109873_FRG_ORDER_HOTSPOTS;
IMAGE_HOTSPOTS_BY_SLUG["ab-109874"] = AB_109874_FRG_ORDER_HOTSPOTS;
IMAGE_HOTSPOTS_BY_SLUG["ab-109955"] = AB_109955_FRG_ORDER_HOTSPOTS;
IMAGE_HOTSPOTS_BY_SLUG["ab-111539"] = AB_111539_FRG_ORDER_HOTSPOTS;
IMAGE_HOTSPOTS_BY_SLUG["ab-101246"] = PLAN_HOTSPOTS_BY_SLUG["ab-101246"];
IMAGE_HOTSPOTS_BY_SLUG["ab-104332"] = PLAN_HOTSPOTS_BY_SLUG["ab-104332"];
IMAGE_HOTSPOTS_BY_SLUG["ab-104296"] = PLAN_HOTSPOTS_BY_SLUG["ab-104296"];
IMAGE_HOTSPOTS_BY_SLUG["ab-110401"] = AB_110401_FRG_ORDER_HOTSPOTS;
IMAGE_HOTSPOTS_BY_SLUG["ab-110402"] = AB_110402_FRG_ORDER_HOTSPOTS;
["ab-105764", "ab-105768", "ab-105772"].forEach((slug) => {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG["ab-105760"];
});
["ab-105765", "ab-105769"].forEach((slug) => {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG["ab-105761"];
});
// Keep the AB 105837 order-page polygons as the shared source for ASC claims.
IMAGE_HOTSPOTS_BY_SLUG["ab-105837"] = AB_105837_FRG_ORDER_HOTSPOTS;
IMAGE_HOTSPOTS_BY_SLUG["ab-105815"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105819"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105809"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105805"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105813"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105805"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105817"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105805"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105840"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105837"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105843"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105837"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105818"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105810"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105824"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105821"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105823"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105822"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105829"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105822"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105832"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105822"];
// Pixel-traced from the 842 x 595 source drawing. The inherited 105825
// polygons crossed at the inside corner; these two runs meet only along the
// real joint from (366, 317) to (373, 325).
const AB_105822_WORKTOP_POINTS = [
  [
    [6.650831, 55.630252], [16.745843, 54.117647], [34.916865, 51.092437],
    [43.467933, 53.277311], [44.299287, 54.621849], [39.548694, 55.12605],
    [34.916865, 55.798319], [15.795724, 58.487395], [6.650831, 56.806723],
  ],
  [
    [43.467933, 53.277311], [54.513064, 51.428571], [75.771971, 56.134454],
    [75.653207, 61.344538], [70.427553, 59.831933], [65.795724, 58.823529],
    [55.463183, 56.638655], [49.643705, 55.798319], [44.299287, 54.621849],
  ],
];
let ab105822WorktopIndex = 0;
IMAGE_HOTSPOTS_BY_SLUG["ab-105822"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105825"].flatMap(
  (hotspot) => {
    if (hotspot.componentKey !== "worktop") return [hotspot];
    const points = AB_105822_WORKTOP_POINTS[ab105822WorktopIndex];
    ab105822WorktopIndex += 1;
    return points ? [{ ...hotspot, points }] : [];
  },
);
IMAGE_HOTSPOTS_BY_SLUG["ab-105828"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105825"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105830"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105827"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105839"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105842"];
IMAGE_HOTSPOTS_BY_SLUG["105845-modul-2"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105845"];

// Some side panels are visible only as narrow seams between adjacent units.
// Keep them as visual indicators instead of hotspots so they cannot alter the
// worktop selection or order value.
const PLAN_SIDE_PANEL_INDICATORS_BY_SLUG = {
  "ab-105825": [{ left: 75.65, top: 61.2, height: 28.55 }],
  "ab-105828": [{ left: 75.65, top: 61.2, height: 28.55 }],
  "ab-105831": [{ left: 74.75, top: 65.95, height: 29.55 }],
  "ab-105834": [
    { left: 29.55, top: 60.65, height: 32.44 },
    { left: 82.55, top: 63.46, height: 32.09 },
    { left: 94.42, top: 62.03, height: 31.71 },
  ],
  "ab-105838": [{ left: 68.36, top: 59.9, height: 27.44 }],
  "ab-105841": [{ left: 68.36, top: 59.9, height: 27.44 }],
  "ab-105844": [{ left: 68.36, top: 59.9, height: 27.44 }],
};

// The AB 105825 drawing splits its L-shaped worktop across overlapping source
// faces. Use one mask for an even tint, while preserving the inward white
// recess above the two real angled worktop seams at the inside corner.
const AB_105825_COMBINED_WORKTOP_MASK = [
  [6.65, 55.63], [16.75, 54.12], [34.92, 51.09], [41.69, 52.77],
  [42.2, 53.45], [54.51, 51.43], [75.77, 56.13], [75.65, 61.55],
  [44.71, 54.45],
  [43.71, 54.45], [39.55, 55.13], [34.92, 55.8], [15.8, 58.49],
  [6.65, 56.81],
];
const PLAN_COMBINED_WORKTOP_MASKS_BY_SLUG = {
  "ab-105825": AB_105825_COMBINED_WORKTOP_MASK,
  "ab-105828": AB_105825_COMBINED_WORKTOP_MASK,
};

IMAGE_HOTSPOTS_BY_SLUG["ab-105847"] = [
  { componentKey: "wall-cabinet-1", left: 14.90875, top: 38.54333, width: 5.69875, height: 8.72, preserveManualSize: true },
  // The extractor is sold with its HD6002 cabinet; highlight the complete package once.
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
];
for (const slug of ["ab-105850", "ab-105853", "ab-105856", "ab-105859", "ab-105862"]) {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG["ab-105847"];
}
for (const slug of ["ab-105848", "ab-105851", "ab-105854", "ab-105857", "ab-105860"]) {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG["ab-105845"];
}
IMAGE_HOTSPOTS_BY_SLUG["ab-105838"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105841"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105844"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105841"];
AB_105846_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG["ab-105846"];
});
AB_105759_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG["ab-105759"];
});
IMAGE_HOTSPOTS_BY_SLUG["ab-105762"] = PLAN_HOTSPOTS_BY_SLUG["ab-105762"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105777"] = PLAN_HOTSPOTS_BY_SLUG["ab-105777"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105779"] = PLAN_HOTSPOTS_BY_SLUG["ab-105779"];
IMAGE_VIEW_BY_SLUG["ab-105804"] = PLAN_IMAGE_BY_SLUG["ab-105804"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105804"] = PLAN_HOTSPOTS_BY_SLUG["ab-105804"];
for (const slug of AB_105779_LAYOUT_ALIAS_SLUGS) {
  IMAGE_VIEW_BY_SLUG[slug] = IMAGE_VIEW_BY_SLUG["ab-105779"];
  IMAGE_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG[slug];
}
for (const slug of AB_105777_LAYOUT_ALIAS_SLUGS) {
  IMAGE_VIEW_BY_SLUG[slug] = IMAGE_VIEW_BY_SLUG["ab-105777"];
  IMAGE_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG[slug];
}
IMAGE_HOTSPOTS_BY_SLUG["ab-105775"] = PLAN_HOTSPOTS_BY_SLUG["ab-105775"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105778"] = PLAN_HOTSPOTS_BY_SLUG["ab-105778"];
AB_105778_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  IMAGE_VIEW_BY_SLUG[slug] = IMAGE_VIEW_BY_SLUG["ab-105778"];
  IMAGE_HOTSPOTS_BY_SLUG[slug] = PLAN_HOTSPOTS_BY_SLUG[slug];
});
AB_105762_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG["ab-105762"];
});
// Exact visible faces traced from the 842 x 595 AB 110140 vector PDF. Repeated
// component keys make every exposed top, front, side, fascia, and fixture face
// respond as one catalog element without flattening the perspective drawing.
IMAGE_HOTSPOTS_BY_SLUG["ab-110140"] = [
  { componentKey: "refrigerator", points: [[9.833729, 28.968067], [20.080760, 27.475630], [29.358670, 29.391597], [19.111639, 30.863866]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[9.833729, 28.968067], [19.111639, 30.863866], [19.111639, 90.823529], [9.833729, 88.927731]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[19.111639, 30.863866], [29.358670, 29.391597], [29.358670, 89.351261], [19.111639, 90.823529]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[42.370546, 12.914286], [43.140143, 13.075630], [52.418052, 14.971429], [52.418052, 39.394958], [43.140143, 37.478992], [42.370546, 37.337815]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[43.140143, 13.075630], [49.410926, 12.168067], [58.674584, 14.063866], [52.418052, 14.971429]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[52.418052, 14.971429], [61.695962, 16.887395], [61.695962, 41.290756], [52.418052, 39.394958]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[52.418052, 14.971429], [58.674584, 14.063866], [67.952494, 15.979832], [61.695962, 16.887395]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[61.695962, 16.887395], [70.959620, 18.783193], [70.959620, 43.206723], [61.695962, 41.290756]], preserveManualSize: true },
  { componentKey: "wall-cabinet-3", points: [[61.695962, 16.887395], [67.952494, 15.979832], [77.230404, 17.875630], [70.959620, 18.783193]], preserveManualSize: true },
  // The pull-out hood has a front fascia plus a separate right side face.
  // End the side face at the PDF's short diagonal seam (CAD point 5341,2764).
  { componentKey: "extractor-hood", points: [[70.959620, 43.206723], [76.118765, 44.255462], [70.959620, 44.900840]], preserveManualSize: true },
  { componentKey: "extractor-hood", points: [[61.695962, 41.290756], [70.959620, 43.206723], [70.959620, 44.900840], [61.695962, 42.984874]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[70.959620, 18.783193], [78.698337, 20.376471], [78.698337, 44.800000], [70.959620, 43.206723]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[70.959620, 18.783193], [77.230404, 17.875630], [84.954869, 19.468908], [78.698337, 20.376471]], preserveManualSize: true },
  { componentKey: "wall-cabinet-4", points: [[78.698337, 20.376471], [84.954869, 19.468908], [84.954869, 43.892437], [78.698337, 44.800000]], preserveManualSize: true },
  { componentKey: "worktop", points: [[29.358670, 55.468908], [48.627078, 52.685714], [57.904988, 54.581513], [84.954869, 60.147899], [84.954869, 61.620168], [73.909739, 63.213445], [46.859857, 57.667227], [29.358670, 60.067227]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[32.821853, 55.892437], [32.821853, 51.939496], [32.921615, 51.919328], [32.921615, 49.277311], [34.076010, 46.816807], [36.256532, 46.937815], [36.213777, 47.885714], [34.104513, 47.764706], [33.349169, 49.378151], [33.349169, 52.020168], [33.448931, 52.020168], [33.448931, 55.932773]], preserveManualSize: true },
  { componentKey: "sink-faucet", points: [[36.057007, 46.090756], [36.840855, 46.312605], [36.669834, 49.660504], [36.057007, 49.478992]], preserveManualSize: true },
  { componentKey: "base-module-1", points: [[29.358670, 60.067227], [37.638955, 58.917647], [37.638955, 88.524370], [29.358670, 89.734454]], preserveManualSize: true },
  { componentKey: "sink-base", points: [[37.638955, 58.917647], [45.933492, 57.647059], [45.933492, 87.334454], [37.638955, 88.524370]], preserveManualSize: true },
  // The narrow inside-corner Blende belongs to the cabinet immediately to its right.
  { componentKey: "base-module-2", points: [[45.933492, 57.647059], [47.629454, 57.828571], [47.629454, 87.475630], [45.933492, 87.334454]], preserveManualSize: true },
  { componentKey: "base-module-2", points: [[47.629454, 57.828571], [56.907363, 59.724370], [56.907363, 89.391597], [47.629454, 87.475630]], preserveManualSize: true },
  { componentKey: "oven-module", points: [[56.907363, 59.724370], [66.171021, 61.640336], [66.171021, 91.287395], [56.907363, 89.391597]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[66.171021, 61.640336], [73.909739, 63.213445], [73.909739, 92.880672], [66.171021, 91.287395]], preserveManualSize: true },
  { componentKey: "base-module-3", points: [[73.909739, 63.213445], [84.954869, 61.620168], [84.954869, 91.267227], [73.909739, 92.880672]], preserveManualSize: true },
];
// Exact visible faces traced from the 842 x 595 AB 110510 vector PDF. Separate
// polygons preserve the perspective seams and keep each Blende selectable.
IMAGE_HOTSPOTS_BY_SLUG["ab-110510"] = [
  { componentKey: "refrigerator", points: [[10.859857, 28.826891], [21.092637, 27.354622], [30.356295, 29.250420], [20.123515, 30.742857]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[10.859857, 28.826891], [20.123515, 30.742857], [20.123515, 90.621849], [10.859857, 88.726050]], preserveManualSize: true },
  { componentKey: "refrigerator", points: [[20.123515, 30.742857], [30.356295, 29.250420], [30.356295, 89.149580], [20.123515, 90.621849]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[21.092637, 14.668908], [29.372922, 13.458824], [34.631829, 14.547899], [26.351544, 15.737815]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[21.092637, 14.668908], [26.351544, 15.737815], [26.351544, 28.423529], [21.092637, 27.354622]], preserveManualSize: true },
  { componentKey: "wall-cabinet-1", points: [[26.351544, 15.737815], [34.631829, 14.547899], [34.631829, 38.931092], [30.356295, 39.636975], [30.356295, 29.250420], [26.351544, 28.423529]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[29.372922, 13.458824], [40.418052, 11.865546], [45.662708, 12.954622], [34.631829, 14.547899]], preserveManualSize: true },
  { componentKey: "wall-cabinet-2", points: [[34.631829, 14.547899], [45.662708, 12.954622], [45.662708, 37.337815], [34.631829, 38.931092]], preserveManualSize: true },
  // Left side face of the pull-out hood, trimmed at the PDF's short diagonal
  // seam so the selection does not continue along the unrelated upper line.
  { componentKey: "extractor-hood", points: [[32.437055, 39.294118], [34.631829, 38.931092], [34.631829, 40.625210]], preserveManualSize: true },
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
  { componentKey: "sink-faucet", claimFixturePartKey: "sink", points: [[59.330166, 52.685714], [65.586698, 53.633613], [67.011876, 52.746218], [78.356295, 55.085714], [78.228029, 56.235294], [71.971496, 55.327731], [71.102138, 56.215126], [65.258907, 55.166387], [59.201900, 53.875630]], preserveManualSize: true },
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
IMAGE_HOTSPOTS_BY_SLUG["ab-105749"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105746"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105752"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105746"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105755"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105746"];

// These UPK20 boundaries are traced directly from each source SVG's CAD lines
// (all source drawings are 842 px wide at a 0.12 scale). They must not be
// inferred from the sink width: the end panel is a separately drawn face.
const SINK_END_BLENDE_BOUNDS_BY_SLUG = {
  "ab-105732": { left: 86.394299, width: 1.296912 },
  "ab-105746": { left: 89.501188, width: 1.325416 },
  "ab-105749": { left: 89.501188, width: 1.325416 },
  "ab-105752": { left: 89.501188, width: 1.325416 },
  "ab-105755": { left: 89.501188, width: 1.325416 },
  "ab-105823": { left: 92.109264, width: 1.895487 },
  "ab-105826": { left: 91.182898, width: 1.638955 },
  "ab-105829": { left: 92.109264, width: 1.895487 },
  "ab-105832": { left: 92.109264, width: 1.895487 },
};
Object.entries(SINK_END_BLENDE_BOUNDS_BY_SLUG).forEach(([slug, sourceBounds]) => {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG[slug].flatMap((hotspot) => {
    if (hotspot.componentKey !== "sink-base" || hotspot.width == null) return [hotspot];

    return [
      { ...hotspot, width: sourceBounds.left - hotspot.left },
      {
        ...hotspot,
        componentKey: "sink-end-blende",
        left: sourceBounds.left,
        width: sourceBounds.width,
      },
    ];
  });
});
IMAGE_HOTSPOTS_BY_SLUG["ab-105750"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105747"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105753"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105747"];
IMAGE_HOTSPOTS_BY_SLUG["ab-105756"] = IMAGE_HOTSPOTS_BY_SLUG["ab-105747"];


const PDF_VIEW_BY_SLUG = {};

const CALIBRATION_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const PLAN_IMAGE_SOURCE_WIDTH = 842;
export const PLAN_IMAGE_SOURCE_HEIGHT = 595;
const WALL_CABINET_COMPONENT_KEY_PATTERN = /^wall-cabinet-\d+$/;
const CORNER_BLENDE_MAX_WIDTH = 1.25;
const CORNER_BLENDE_MIN_HEIGHT = 15;
const CORNER_BLENDE_EDGE_TOLERANCE = 1.2;
const CORNER_BLENDE_VERTICAL_TOLERANCE = 0.35;
const PLAN_DISPLAY_CROP_TUNING_BY_SLUG = {
  // Keep a small visual margin after the refrigerator instead of retaining
  // the unused right third of the source CAD sheet.
  "ab-109955": {
    rightLimit: 70.5,
  },
  // AB 105833 has a split run with a large blank page area below the lower cabinets.
  // Keep the crop close to the plinth/floor line instead of carrying the full page tail.
  "ab-105833": {
    bottomPadding: 4,
    bottomLimit: 84,
  },
  "ab-105842": {
    bottomPadding: 4.8,
  },
  "ab-105845": {
    bottomPadding: 4.8,
    leftPadding: 3,
    rightLimit: 100,
  },
  "ab-105848": {
    bottomPadding: 4.8,
    leftPadding: 3,
    rightLimit: 100,
  },
  "ab-105851": {
    bottomPadding: 4.8,
    leftPadding: 3,
    rightLimit: 100,
  },
  "ab-105854": {
    bottomPadding: 4.8,
    leftPadding: 3,
    rightLimit: 100,
  },
  "ab-105857": {
    bottomPadding: 4.8,
    leftPadding: 3,
    rightLimit: 100,
  },
  "ab-105860": {
    bottomPadding: 4.8,
    leftPadding: 3,
    rightLimit: 100,
  },
  "ab-105847": {
    topPadding: 7,
    bottomPadding: 3,
    leftPadding: 3,
    rightLimit: 73,
    bottomLimit: 70,
  },
  "ab-105850": {
    topPadding: 7,
    bottomPadding: 3,
    leftPadding: 3,
    rightLimit: 73,
    bottomLimit: 70,
  },
  "ab-105853": {
    topPadding: 7,
    bottomPadding: 3,
    leftPadding: 3,
    rightLimit: 73,
    bottomLimit: 70,
  },
  "ab-105856": {
    topPadding: 7,
    bottomPadding: 3,
    leftPadding: 3,
    rightLimit: 73,
    bottomLimit: 70,
  },
  "ab-105859": {
    topPadding: 7,
    bottomPadding: 3,
    leftPadding: 3,
    rightLimit: 73,
    bottomLimit: 70,
  },
  "ab-105862": {
    topPadding: 7,
    bottomPadding: 3,
    leftPadding: 3,
    rightLimit: 73,
    bottomLimit: 70,
  },
  "105845-modul-2": {
    bottomPadding: 4.8,
    leftPadding: 3,
    rightLimit: 100,
  },
  "ab-105839": {
    bottomPadding: 4.8,
  },
  "ab-105836": {
    bottomPadding: 4.8,
  },
};
const SPLIT_SIDE_WORKTOP_GAP_PERCENT = 8;
// Horizontal frame edges traced from these SVGs' original CAD coordinates.
const SPLIT_SIDE_A_FRAME_EDGES_BY_SLUG = {
  "ab-105833": [47, 3432],
  "ab-105836": [60, 3483],
  "ab-105839": [47, 3342],
  "ab-105842": [47, 3342],
};
const SPLIT_SIDE_OVEN_KEYS = new Set(["oven-module", "oven-base"]);
const SPLIT_SIDE_SINK_KEYS = new Set(["sink-base"]);
const AB_105793_SIDE_LABEL_SLUGS = new Set(["ab-105793", "ab-105796", "ab-105799", "ab-105802"]);
const SPLIT_SIDE_LABEL_SLUGS = new Set([
  ...AB_105793_SIDE_LABEL_SLUGS,
  ...AB_105777_LAYOUT_ALIAS_SLUGS,
  "ab-105777",
  "ab-105833",
  "ab-105836",
  "ab-105839",
  "ab-105842",
  "ab-105845",
  "105845-modul-2",
  "ab-105848",
  "ab-105851",
  "ab-105854",
  "ab-105857",
  "ab-105860",
  "ab-105847",
  "ab-105850",
  "ab-105853",
  "ab-105856",
  "ab-105859",
  "ab-105862",
]);

function isWallCabinetHotspot(definition) {
  return WALL_CABINET_COMPONENT_KEY_PATTERN.test(definition.componentKey);
}

function isHorizontalWorktopHotspot(definition) {
  return (
    definition.componentKey === "worktop" &&
    definition.width >= 5 &&
    definition.height <= 2
  );
}

function isCornerBlendeHotspot(definition) {
  return (
    !definition.separateLockedSidePanel &&
    definition.componentKey === "worktop" &&
    definition.width > 0 &&
    definition.width <= CORNER_BLENDE_MAX_WIDTH &&
    definition.height >= CORNER_BLENDE_MIN_HEIGHT
  );
}

function canExtendToCornerBlende(definition) {
  if (Array.isArray(definition.points) && definition.points.length) {
    return false;
  }
  if (definition.preserveManualSize) {
    return false;
  }
  return (
    isWallCabinetHotspot(definition) ||
    isBaseBodyHotspot(definition) ||
    isHorizontalWorktopHotspot(definition)
  );
}

function roundHotspotPercent(value) {
  return Math.round(value * 100) / 100;
}

function getHotspotSourceBounds(definition) {
  const points = Array.isArray(definition.points) ? definition.points : [];
  if (points.length) {
    const xs = points.map((point) => Number(point[0])).filter(Number.isFinite);
    const ys = points.map((point) => Number(point[1])).filter(Number.isFinite);
    if (xs.length && ys.length) {
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const right = Math.max(...xs);
      const bottom = Math.max(...ys);
      return {
        left,
        top,
        right,
        bottom,
        width: Math.max(right - left, 0),
        height: Math.max(bottom - top, 0),
      };
    }
  }

  const left = Number(definition.left || 0);
  const top = Number(definition.top || 0);
  const width = Number(definition.width || 0);
  const height = Number(definition.height || 0);
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export function withHotspotSourceBounds(definition) {
  if (!Array.isArray(definition.points) || !definition.points.length) {
    return definition;
  }

  const bounds = getHotspotSourceBounds(definition);
  return {
    ...definition,
    left: roundHotspotPercent(bounds.left),
    top: roundHotspotPercent(bounds.top),
    width: roundHotspotPercent(bounds.width),
    height: roundHotspotPercent(bounds.height),
  };
}

function verticallyOverlapsCornerBlende(definition, blende) {
  const top = definition.top;
  const bottom = definition.top + definition.height;
  const blendeTop = blende.top;
  const blendeBottom = blende.top + blende.height;

  return (
    blendeBottom >= top - CORNER_BLENDE_VERTICAL_TOLERANCE &&
    blendeTop <= bottom + CORNER_BLENDE_VERTICAL_TOLERANCE
  );
}

export function withCornerBlendeExtensions(definitions) {
  const cornerBlenden = definitions.filter(isCornerBlendeHotspot);
  if (!cornerBlenden.length) return definitions;

  return definitions.map((definition) => {
    if (!canExtendToCornerBlende(definition) || isCornerBlendeHotspot(definition)) {
      return definition;
    }

    let left = definition.left;
    let right = definition.left + definition.width;

    cornerBlenden.forEach((blende) => {
      const blendeLeft = blende.left;
      const blendeRight = blende.left + blende.width;
      if (!verticallyOverlapsCornerBlende(definition, blende)) {
        return;
      }

      if (
        blendeRight >= left - CORNER_BLENDE_EDGE_TOLERANCE &&
        blendeRight <= left + CORNER_BLENDE_EDGE_TOLERANCE
      ) {
        left = Math.min(left, blendeLeft);
      }

      if (
        blendeLeft >= right - CORNER_BLENDE_EDGE_TOLERANCE &&
        blendeLeft <= right + CORNER_BLENDE_EDGE_TOLERANCE
      ) {
        right = Math.max(right, blendeRight);
      }
    });

    const nextLeft = roundHotspotPercent(left);
    const nextWidth = roundHotspotPercent(right - left);
    if (nextLeft === definition.left && nextWidth === definition.width) {
      return definition;
    }

    return {
      ...definition,
      left: nextLeft,
      width: nextWidth,
    };
  });
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

export function getPlanDisplayCrop(hotspots, slug) {
  if (!hotspots.length) {
    return { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
  }

  const bounds = hotspots.reduce(
    (current, hotspot) => {
      const hotspotBounds = getHotspotSourceBounds(hotspot);
      return {
        left: Math.min(current.left, hotspotBounds.left),
        top: Math.min(current.top, hotspotBounds.top),
        right: Math.max(current.right, hotspotBounds.right),
        bottom: Math.max(current.bottom, hotspotBounds.bottom),
      };
    },
    { left: 100, top: 100, right: 0, bottom: 0 },
  );

  // Hotspots hug cabinet bodies; the CAD frame, end panels, and fridge alcove often extend
  // beyond them. Pull the crop toward the page edges when there is still margin left.
  const trailingX = 100 - bounds.right;
  const trailingY = 100 - bounds.bottom;
  const leadingX = bounds.left;
  const leadingY = bounds.top;
  const cropTuning = PLAN_DISPLAY_CROP_TUNING_BY_SLUG[slug] || {};

  const leftPadding = cropTuning.leftPadding ?? Math.max(2.6, leadingX * 0.6);
  const left = clampPercent(bounds.left - leftPadding);
  const top = clampPercent(bounds.top - (cropTuning.topPadding ?? Math.max(4, leadingY * 0.5)));
  const rightLimit = cropTuning.rightLimit ?? 99.5;
  const right = clampPercent(
    Math.min(rightLimit, bounds.right + Math.max(3.2, trailingX * 0.92)),
  );
  const bottomPadding = cropTuning.bottomPadding ?? Math.max(1, trailingY * 0.85);
  const bottomLimit = cropTuning.bottomLimit ?? 99.5;
  const bottom = clampPercent(Math.min(bottomLimit, bounds.bottom + bottomPadding));

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(right - left, 1),
    height: Math.max(bottom - top, 1),
  };
}

export function cropPlanHotspot(hotspot, crop) {
  const points = Array.isArray(hotspot.points) ? hotspot.points : [];
  if (points.length) {
    const croppedPoints = points.map((point) => [
      (Number(point[0]) - crop.left) / crop.width * 100,
      (Number(point[1]) - crop.top) / crop.height * 100,
    ]);
    const xs = croppedPoints.map((point) => point[0]).filter(Number.isFinite);
    const ys = croppedPoints.map((point) => point[1]).filter(Number.isFinite);
    if (!xs.length || !ys.length) {
      return { ...hotspot, left: 0, top: 0, width: 0, height: 0 };
    }

    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    const width = Math.max(right - left, 0);
    const height = Math.max(bottom - top, 0);
    const clipPathPoints = croppedPoints
      .map(([x, y]) => {
        const localX = width > 0 ? (x - left) / width * 100 : 0;
        const localY = height > 0 ? (y - top) / height * 100 : 0;
        return `${roundHotspotPercent(localX)}% ${roundHotspotPercent(localY)}%`;
      })
      .join(", ");

    return {
      ...hotspot,
      left,
      top,
      width,
      height,
      clipPath: `polygon(${clipPathPoints})`,
    };
  }

  const left = Math.max(hotspot.left, crop.left);
  const top = Math.max(hotspot.top, crop.top);
  const right = Math.min(hotspot.left + hotspot.width, crop.right);
  const bottom = Math.min(hotspot.top + hotspot.height, crop.bottom);

  return {
    ...hotspot,
    left: (left - crop.left) / crop.width * 100,
    top: (top - crop.top) / crop.height * 100,
    width: Math.max(right - left, 0) / crop.width * 100,
    height: Math.max(bottom - top, 0) / crop.height * 100,
  };
}

function cropPlanBox(box, crop) {
  const left = Math.max(box.left, crop.left);
  const top = Math.max(box.top, crop.top);
  const right = Math.min(box.left + box.width, crop.right);
  const bottom = Math.min(box.top + box.height, crop.bottom);

  return {
    ...box,
    left: (left - crop.left) / crop.width * 100,
    top: (top - crop.top) / crop.height * 100,
    width: Math.max(right - left, 0) / crop.width * 100,
    height: Math.max(bottom - top, 0) / crop.height * 100,
  };
}

export function getSplitKitchenSideLabels(definitions, crop, slug, translate, language, isCompactMobilePlan = false) {
  if (!SPLIT_SIDE_LABEL_SLUGS.has(slug)) return [];

  if (["ab-105847", "ab-105850", "ab-105853", "ab-105856", "ab-105859", "ab-105862"].includes(slug)) {
    // Use the actual SVG header bands, between the frame and cabinet tops.
    const layout = isCompactMobilePlan ? getTwoPartMobilePlanLayout(slug) : null;
    return [[119.27, 327.67, "A"], [407.66, 555.27, "B"]].map(([left, right, side]) => {
      const header = {
        label: translate(`configurator.splitKitchenSide${side}`, language === "de" ? `Seite ${side}` : `Side ${side}`),
        left: left / 800 * 100,
        top: 207.82 / 600 * 100,
        width: (right - left) / 800 * 100,
        height: 23.44 / 600 * 100,
        isFrameHeader: true,
      };
      return cropPlanBox(shiftTwoPartPlanGeometry(header, layout), crop);
    });
  }

  const worktopRuns = definitions
    .filter((definition) => {
      if (!AB_105793_SIDE_LABEL_SLUGS.has(slug)) return isHorizontalWorktopHotspot(definition);
      const bounds = getHotspotSourceBounds(definition);
      return ["worktop", "worktop-secondary"].includes(definition.componentKey)
        && bounds.width >= 5 && bounds.height <= 2;
    })
    .map(getHotspotSourceBounds)
    .filter((bounds) => bounds.width >= 8)
    .sort((a, b) => a.left - b.left);
  if (worktopRuns.length < 2) return [];

  const separatedRuns = getTwoPartMobilePlanLayout(slug)
    ? worktopRuns.slice(0, 2)
    : worktopRuns.filter((run, index) => {
        const previous = worktopRuns[index - 1];
        const next = worktopRuns[index + 1];
        return (
          (previous && run.left - previous.right >= SPLIT_SIDE_WORKTOP_GAP_PERCENT) ||
          (next && next.left - run.right >= SPLIT_SIDE_WORKTOP_GAP_PERCENT)
        );
      });
  if (separatedRuns.length < 2) return [];

  const findRunForComponent = (componentKeys) => {
    const component = definitions
      .filter((definition) => componentKeys.has(definition.componentKey))
      .map(getHotspotSourceBounds)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
    if (!component) return null;

    const centerX = component.left + component.width / 2;
    return separatedRuns.find((run) => centerX >= run.left && centerX <= run.right) || null;
  };

  const ovenRun = findRunForComponent(SPLIT_SIDE_OVEN_KEYS);
  const sinkRun = findRunForComponent(SPLIT_SIDE_SINK_KEYS);
  if (!ovenRun || !sinkRun || ovenRun === sinkRun) return [];

  // Side A includes the freestanding refrigerator as well as the worktop run.
  // Center its label over the complete elevation for every split layout.
  let sideARun = ovenRun;
  const refrigerator = definitions.find((definition) => definition.componentKey === "refrigerator");
  if (refrigerator) {
    const bounds = getHotspotSourceBounds(refrigerator);
    if (bounds.right <= ovenRun.left + 0.5) {
      const left = Math.min(bounds.left, ovenRun.left);
      sideARun = { ...ovenRun, left, width: ovenRun.right - left };
    }
  }
  if (AB_105793_SIDE_LABEL_SLUGS.has(slug)) {
    const refrigerator = definitions.find((definition) => definition.componentKey === "refrigerator");
    if (refrigerator) {
      const bounds = getHotspotSourceBounds(refrigerator);
      if (bounds.left >= ovenRun.right && bounds.right < sinkRun.left) {
        sideARun = { ...ovenRun, right: bounds.right, width: bounds.right - ovenRun.left };
      }
    }
  }

  const sideAFrameEdges = SPLIT_SIDE_A_FRAME_EDGES_BY_SLUG[slug];
  if (sideAFrameEdges) {
    const [frameLeft, frameRight] = sideAFrameEdges.map((x) => x * 0.12 / 842 * 100);
    sideARun = { ...sideARun, left: frameLeft, right: frameRight, width: frameRight - frameLeft };
  }

  const getRunLabelTop = (run) => {
    const runElements = definitions
      .map(getHotspotSourceBounds)
      .filter((bounds) => bounds.left < run.right && bounds.right > run.left);
    const runTop = runElements.length ? Math.min(...runElements.map((bounds) => bounds.top)) : run.top;
    return Math.max(0, runTop - 7);
  };

  const toLabel = (run, label) =>
    cropPlanBox(
      {
        label,
        left: run.left,
        top: getRunLabelTop(run),
        width: run.width,
        height: 6,
      },
      crop,
    );

  return [
    toLabel(
      sideARun,
      translate("configurator.splitKitchenSideA", language === "de" ? "Seite A" : "Side A"),
    ),
    toLabel(
      sinkRun,
      translate("configurator.splitKitchenSideB", language === "de" ? "Seite B" : "Side B"),
    ),
  ].filter((label) => label.width > 0 && label.height > 0);
}

["ab-105735", "ab-105738", "ab-105741"].forEach((slug) => {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG["ab-105732"];
});
["ab-105751", "ab-105754", "ab-105745"].forEach((slug) => {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG["ab-105748"];
});

// The narrow face between the fixed oven and sink is a visual-only corner
// blende in these plans. It remains white and cannot be selected by customers.
["ab-105745", "ab-105748", "ab-105751", "ab-105754"].forEach((slug) => {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG[slug].map((hotspot) => {
    const isCornerBlende =
      hotspot.componentKey === "sink-base" &&
      hotspot.points?.[0]?.[0] === 50.251781 &&
      hotspot.points?.[0]?.[1] === 55.932773;

    return isCornerBlende
      ? { ...hotspot, componentKey: "static-corner-blende" }
      : hotspot;
  });
});

["ab-105736", "ab-105739", "ab-105742"].forEach((slug) => {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG["ab-105733"];
});

["ab-105734", "ab-105737", "ab-105740"].forEach((slug) => {
  IMAGE_HOTSPOTS_BY_SLUG[slug] = IMAGE_HOTSPOTS_BY_SLUG["ab-104968"];
});

// The sink (faucet + waste) is always part of the default configuration and usually sits on
// the worktop directly above the sink base. Derive a consistent fallback box for those plans,
// while allowing manually calibrated hotspots when the visible bowl/faucet is offset.
export function withDerivedSinkFaucet(definitions, components) {
  if (!definitions.length) return definitions;
  const hasFaucetComponent = components.some(
    (item) => String(item?.componentKey || "").toLowerCase() === "sink-faucet",
  );
  if (!hasFaucetComponent) return definitions;

  const sinkBase = definitions.find((definition) => definition.componentKey === "sink-base");
  const worktop = definitions.find((definition) => definition.componentKey === "worktop");
  if (!sinkBase || !worktop) return definitions;

  const existingFaucet = definitions.find((definition) => definition.componentKey === "sink-faucet");
  if (existingFaucet?.preserveManualSize) {
    return definitions;
  }

  const width = Math.max(4.6, Math.min(sinkBase.width * 0.34, 5.1));
  const height = 8;
  const center = existingFaucet
    ? existingFaucet.left + existingFaucet.width / 2
    : sinkBase.left + sinkBase.width / 2;
  const faucet = {
    componentKey: "sink-faucet",
    left: center - width / 2,
    top: worktop.top - height,
    width,
    height,
  };
  return [
    ...definitions.filter((definition) => definition.componentKey !== "sink-faucet"),
    faucet,
  ];
}

function CompactMobilePlanArtwork({
  href,
  crop,
  layout,
  className,
  style,
  idSuffix,
  label = "",
  clipGeometry = null,
}) {
  const safeIdSuffix = String(idSuffix || "plan").replace(/[^a-z0-9_-]/gi, "-");
  const leftClipId = `compact-plan-left-${safeIdSuffix}`;
  const rightClipId = `compact-plan-right-${safeIdSuffix}`;
  const detailClipId = `compact-plan-detail-${safeIdSuffix}`;
  const rightStart = layout.splitX - layout.shiftX;
  const planLayers = (
    <>
      <g clipPath={`url(#${leftClipId})`}>
        <image href={href} x="0" y="0" width="100" height="100" preserveAspectRatio="none" />
      </g>
      <g clipPath={`url(#${rightClipId})`}>
        <image
          href={href}
          x={-layout.shiftX}
          y="0"
          width="100"
          height="100"
          preserveAspectRatio="none"
        />
      </g>
    </>
  );

  return (
    <svg
      className={className}
      style={style}
      viewBox={`${crop.left} ${crop.top} ${crop.width} ${crop.height}`}
      preserveAspectRatio="none"
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : "true"}
    >
      <defs>
        <clipPath id={leftClipId}>
          <rect x="0" y="0" width={layout.splitX} height="100" />
        </clipPath>
        <clipPath id={rightClipId}>
          <rect x={rightStart} y="0" width={100 - layout.splitX} height="100" />
        </clipPath>
        {clipGeometry ? (
          <clipPath id={detailClipId}>
            <rect
              x={clipGeometry.left}
              y={clipGeometry.top}
              width={clipGeometry.width}
              height={clipGeometry.height}
            />
          </clipPath>
        ) : null}
      </defs>
      {clipGeometry ? <g clipPath={`url(#${detailClipId})`}>{planLayers}</g> : planLayers}
    </svg>
  );
}

export default function useKitchenSvgStage({
  svgMarkup,
  kitchenConfig,
  kitchenSlug,
  planViewport,
  fixedComponentIds,
  planLockedComponentIds = fixedComponentIds,
  selectedComponentIds,
  setSelectedComponentIds,
  onToggleComponent,
  onResetSelection,
}) {
  const { translate, language } = usePublicI18n();
  const svgHostRef = useRef(null);
  const planTraceImageRef = useRef(null);
  const polygonTraceLayerRef = useRef(null);
  const has3dModel = kitchenSlug === "test-3d-kitchen";
  const normalizedKitchenSlug = String(kitchenSlug || "").trim().toLowerCase();
  const imageViewHref = IMAGE_VIEW_BY_SLUG[normalizedKitchenSlug] || "";
  const pdfViewHref = PDF_VIEW_BY_SLUG[normalizedKitchenSlug] || "";
  const hasImageView = Boolean(imageViewHref);
  const hasPdfView = Boolean(pdfViewHref);
  const [activeView, setActiveView] = useState("2d");
  const [isMobilePlanViewport, setIsMobilePlanViewport] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const updateMobilePlanViewport = () => setIsMobilePlanViewport(mediaQuery.matches);
    updateMobilePlanViewport();
    mediaQuery.addEventListener?.("change", updateMobilePlanViewport);
    return () => mediaQuery.removeEventListener?.("change", updateMobilePlanViewport);
  }, []);
  const resolvedSvgMarkup = useMemo(
    () => applyPlanViewportToMarkup(svgMarkup, kitchenConfig.kitchen.slug),
    [kitchenConfig.kitchen.slug, svgMarkup],
  );
  const fixedComponentIdsKey = fixedComponentIds.join("|");
  const planLockedComponentIdsKey = planLockedComponentIds.join("|");
  const componentIds = useMemo(
    () =>
      new Set(
        kitchenConfig.components
          .map((item) => componentIdForItem(item))
          .filter((componentId) => !isHiddenLinkedComponent(kitchenSlug, componentId)),
      ),
    [kitchenConfig.components, kitchenSlug],
  );

  function toggleComponentSelection(componentId) {
    if (typeof onToggleComponent === "function") {
      onToggleComponent(componentId);
      return;
    }
    setSelectedComponentIds((current) =>
      toggleLinkedComponentSelection(kitchenSlug, current, componentId, fixedComponentIds),
    );
  }

  const imageHotspots = useMemo(() => {
    const rawDefinitions = IMAGE_HOTSPOTS_BY_SLUG[normalizedKitchenSlug] || [];
    const combinedWorktopMask = PLAN_COMBINED_WORKTOP_MASKS_BY_SLUG[normalizedKitchenSlug];
    const visualDefinitions = combinedWorktopMask
      ? [
          ...rawDefinitions.filter((definition) => definition.componentKey !== "worktop"),
          {
            componentKey: "worktop",
            points: combinedWorktopMask,
            preserveManualSize: true,
          },
        ]
      : rawDefinitions;
    const definitions = prepareKitchenPlanGeometry(
      visualDefinitions,
      normalizedKitchenSlug,
      kitchenConfig.components,
    );
    if (!definitions.length) return [];

    const componentById = new Map(
      kitchenConfig.components.map((item) => [componentIdForItem(item), item]),
    );

    return definitions
      .map((definition) => {
        const componentId = componentIdForKey(definition.componentKey);
        const item =
          componentById.get(componentId) ||
          getLinkedComponentIds(normalizedKitchenSlug, componentId)
            .map((linkedComponentId) => componentById.get(linkedComponentId))
            .find(Boolean) ||
          (normalizedKitchenSlug === "ab-101246" && definition.componentKey === "under-cabinet-light"
            ? kitchenConfig.accessories.find((accessory) => accessory.code === "ACC-LIGHT-003")
            : null);
        if (!item) {
          return null;
        }
        return {
          ...definition,
          componentId,
          label: getLocalizedItemName(item, translate, language) || item.name || "",
        };
      })
      .filter(Boolean);
  }, [kitchenConfig.components, kitchenConfig.accessories, normalizedKitchenSlug, translate, language]);
  const hasImageHotspots = imageHotspots.length > 0;
  const legendFixedText = translate("configurator.stageLegendFixed", "Fixed parts always remain active");
  const legendPrimaryText =
    has3dModel && activeView === "3d"
      ? "Click parts in the 3D preview or choose on the right"
      : hasImageView
        ? hasImageHotspots
          ? translate("configurator.stageLegendClick", "Click in the plan or choose on the right")
          : translate("configurator.stageLegendChooseRight", "Choose elements on the right")
        : hasPdfView
          ? translate("configurator.stageLegendChooseRight", "Choose elements on the right")
          : translate("configurator.stageLegendClick", "Click in the plan or choose on the right");
  const legendPrimaryMobileText =
    has3dModel && activeView === "3d"
      ? translate("configurator.stageLegend3dMobile", "Tap parts in the 3D preview or choose below")
      : hasImageView && hasImageHotspots
        ? translate("configurator.stageLegendClickMobile", "Tap the plan or choose below")
        : translate("configurator.stageLegendChooseBelow", "Choose elements below");
  const planDisplayCrop = useMemo(
    () => getSharedPlanDisplayCrop(imageHotspots, normalizedKitchenSlug),
    [imageHotspots, normalizedKitchenSlug],
  );
  const mobilePlanLayout = useMemo(
    () => getTwoPartMobilePlanLayout(normalizedKitchenSlug),
    [normalizedKitchenSlug],
  );
  const isCompactMobilePlan = Boolean(isMobilePlanViewport && mobilePlanLayout);
  const compactMobileImageHotspots = useMemo(
    () => imageHotspots.map((hotspot) => shiftTwoPartPlanGeometry(hotspot, mobilePlanLayout)),
    [imageHotspots, mobilePlanLayout],
  );
  const compactMobilePlanCrop = useMemo(
    () => getTwoPartMobilePlanCrop(planDisplayCrop, mobilePlanLayout),
    [planDisplayCrop, mobilePlanLayout],
  );
  const activeImageHotspots = isCompactMobilePlan ? compactMobileImageHotspots : imageHotspots;
  const activePlanDisplayCrop = isCompactMobilePlan ? compactMobilePlanCrop : planDisplayCrop;
  const croppedImageHotspots = useMemo(
    () =>
      activeImageHotspots
        .map((hotspot) => cropSharedPlanHotspot(hotspot, activePlanDisplayCrop))
        .filter((hotspot) => hotspot.width > 0 && hotspot.height > 0),
    [activeImageHotspots, activePlanDisplayCrop],
  );
  const sidePanelIndicators = useMemo(() => {
    const indicators = PLAN_SIDE_PANEL_INDICATORS_BY_SLUG[normalizedKitchenSlug] || [];
    return indicators.map((indicator) => cropPlanBox(
      { ...indicator, width: 0.001 },
      activePlanDisplayCrop,
    ));
  }, [activePlanDisplayCrop, normalizedKitchenSlug]);
  const splitKitchenSideLabels = useMemo(
    () => getSplitKitchenSideLabels(activeImageHotspots, activePlanDisplayCrop, normalizedKitchenSlug, translate, language, isCompactMobilePlan),
    [activeImageHotspots, activePlanDisplayCrop, normalizedKitchenSlug, translate, language, isCompactMobilePlan],
  );
  const planImageSourceSize =
    PLAN_IMAGE_SOURCE_SIZE_BY_SLUG[normalizedKitchenSlug] || {
      width: PLAN_IMAGE_SOURCE_WIDTH,
      height: PLAN_IMAGE_SOURCE_HEIGHT,
    };
  const persistentLightDetails =
    PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[normalizedKitchenSlug] || [];
  const activePersistentLightDetails = isCompactMobilePlan
    ? persistentLightDetails.map((detail) => shiftTwoPartPlanGeometry(detail, mobilePlanLayout))
    : persistentLightDetails;
  const croppedPlanAspectRatio =
    `${activePlanDisplayCrop.width * planImageSourceSize.width} / ${activePlanDisplayCrop.height * planImageSourceSize.height}`;
  const planImageInteractiveStyle = {
    left: `${-(activePlanDisplayCrop.left / activePlanDisplayCrop.width) * 100}%`,
    top: `${-(activePlanDisplayCrop.top / activePlanDisplayCrop.height) * 100}%`,
    width: `${(100 / activePlanDisplayCrop.width) * 100}%`,
    height: `${(100 / activePlanDisplayCrop.height) * 100}%`,
  };
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isTracePolygonRequested, setIsTracePolygonRequested] = useState(false);
  const [isTracingPolygon, setIsTracingPolygon] = useState(false);
  const [polygonTracePoints, setPolygonTracePoints] = useState([]);
  const [polygonTraceCursorPoint, setPolygonTraceCursorPoint] = useState(null);
  const [hoveredComponentId, setHoveredComponentId] = useState(null);
  const canTracePolygon =
    process.env.NODE_ENV === "development" &&
    hasImageView &&
    isTracePolygonRequested;
  const formattedPolygonTracePoints = useMemo(
    () =>
      `points: [${polygonTracePoints
        .map((point) => `[${point[0].toFixed(2)}, ${point[1].toFixed(2)}]`)
        .join(", ")}]`,
    [polygonTracePoints],
  );
  const visiblePolygonTracePoints = useMemo(
    () =>
      polygonTracePoints.map(([x, y]) => ({
        x: ((x - planDisplayCrop.left) / planDisplayCrop.width) * 100,
        y: ((y - planDisplayCrop.top) / planDisplayCrop.height) * 100,
      })),
    [planDisplayCrop, polygonTracePoints],
  );
  const visiblePolygonTraceCursorPoint = useMemo(() => {
    if (!polygonTraceCursorPoint) return null;
    return {
      x: ((polygonTraceCursorPoint[0] - planDisplayCrop.left) / planDisplayCrop.width) * 100,
      y: ((polygonTraceCursorPoint[1] - planDisplayCrop.top) / planDisplayCrop.height) * 100,
    };
  }, [planDisplayCrop, polygonTraceCursorPoint]);
  const lastPolygonTracePoint = polygonTracePoints[polygonTracePoints.length - 1] || null;
  // Linked parts (e.g. the hood wall cabinet + its pull-out extractor hood) should react as
  // one unit, so hovering either hotspot highlights the whole group.
  const hoveredLinkedGroup = useMemo(
    () => (hoveredComponentId ? getLinkedComponentIds(normalizedKitchenSlug, hoveredComponentId) : []),
    [hoveredComponentId, normalizedKitchenSlug],
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const value = new URLSearchParams(window.location.search).get("calibrate");
    setIsCalibrating(value === "1" || value === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const value = new URLSearchParams(window.location.search).get("tracePolygon");
    setIsTracePolygonRequested(value === "1" || value === "true");
  }, []);

  useEffect(() => {
    if (canTracePolygon) return;
    setIsTracingPolygon(false);
    setPolygonTracePoints([]);
    setPolygonTraceCursorPoint(null);
  }, [canTracePolygon]);

  useEffect(() => {
    if (!isTracingPolygon) {
      setPolygonTraceCursorPoint(null);
      return;
    }
    polygonTraceLayerRef.current?.focus();
  }, [isTracingPolygon]);

  const copyPolygonTracePoints = () => {
    if (!polygonTracePoints.length || typeof navigator === "undefined") return;
    navigator.clipboard?.writeText(formattedPolygonTracePoints).catch(() => {});
  };

  const getPolygonTracePointFromEvent = (event) => {
    const planRect = planTraceImageRef.current?.getBoundingClientRect();
    if (!planRect || !planRect.width || !planRect.height) return null;

    return [
      Math.round(((event.clientX - planRect.left) / planRect.width) * 10000) / 100,
      Math.round(((event.clientY - planRect.top) / planRect.height) * 10000) / 100,
    ];
  };

  const handlePolygonTraceMove = (event) => {
    if (!canTracePolygon || !isTracingPolygon) return;
    const point = getPolygonTracePointFromEvent(event);
    if (point) setPolygonTraceCursorPoint(point);
  };

  const handlePolygonTraceClick = (event) => {
    if (!canTracePolygon || !isTracingPolygon) return;
    const point = getPolygonTracePointFromEvent(event);
    if (!point) return;

    event.preventDefault();
    event.stopPropagation();
    setPolygonTracePoints((current) => [...current, point]);
  };

  const handlePolygonTraceKeyDown = (event) => {
    if (!canTracePolygon || !isTracingPolygon || !polygonTracePoints.length) return;
    const directionByKey = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = directionByKey[event.key];
    if (!direction) return;

    event.preventDefault();
    const step = event.shiftKey ? 0.01 : event.altKey ? 0.25 : 0.05;
    setPolygonTracePoints((current) =>
      current.map((point, index) => {
        if (index !== current.length - 1) return point;
        return [
          Math.round((point[0] + direction[0] * step) * 100) / 100,
          Math.round((point[1] + direction[1] * step) * 100) / 100,
        ];
      }),
    );
  };

  useEffect(() => {
    if (activeView !== "2d" || hasImageView || hasPdfView) {
      return undefined;
    }

    const host = svgHostRef.current;
    const svg = syncKitchenPlan({
      host,
      svgMarkup: resolvedSvgMarkup,
      planViewport,
      kitchenConfig,
      selectedComponentIds,
      lockedComponentIds: planLockedComponentIds,
      componentIdForItem,
      normalizeColor,
    });

    if (!host || !svg) {
      return undefined;
    }

    const onClick = (event) => {
      const groupsAtPoint = typeof document.elementsFromPoint === "function"
        ? document.elementsFromPoint(event.clientX, event.clientY)
          .map((element) => element.closest?.("[data-component-id]"))
          .filter(Boolean)
        : [event.target.closest?.("[data-component-id]")].filter(Boolean);
      const uniqueGroups = [...new Map(groupsAtPoint.map((group) => [group.dataset.componentId, group])).values()]
        .filter((group) => group.dataset.componentId && componentIds.has(group.dataset.componentId));
      if (!uniqueGroups.length) return;

      const group = uniqueGroups
        .map((candidate) => {
          const hitbox = candidate.querySelector(".component-hitbox") || candidate;
          const rect = hitbox.getBoundingClientRect();
          return {
            group: candidate,
            area: Math.max(rect.width, 1) * Math.max(rect.height, 1),
          };
        })
        .sort((a, b) => a.area - b.area)[0]?.group;
      if (!group) return;

      const componentId = group.dataset.componentId;
      if (fixedComponentIds.includes(componentId)) return;

      toggleComponentSelection(componentId);
    };

    host.addEventListener("click", onClick, true);
    return () => {
      host.removeEventListener("click", onClick, true);
    };
  }, [
    kitchenConfig,
    kitchenSlug,
    fixedComponentIds,
    planLockedComponentIds,
    hasImageView,
    hasPdfView,
    activeView,
    componentIds,
    planViewport,
    resolvedSvgMarkup,
    selectedComponentIds,
    setSelectedComponentIds,
    onToggleComponent,
  ]);

  useEffect(() => {
    if (activeView !== "2d" || hasImageView || hasPdfView) {
      return;
    }

    refreshKitchenPlanSelection({
      host: svgHostRef.current,
      selectedComponentIds,
      lockedComponentIds: planLockedComponentIds,
      kitchenSlug,
    });
  }, [activeView, fixedComponentIdsKey, planLockedComponentIdsKey, selectedComponentIds, fixedComponentIds, planLockedComponentIds, kitchenSlug, hasImageView, hasPdfView]);

  const stageNode = (
    <div className={styles.stage}>
      <div className={styles.stageHeader}>
        <div>
          <p className={styles.eyebrow}>{translate("configurator.stageEyebrow", "Plan")}</p>
          <h2>{translate("configurator.stageTitle", "Plan your kitchen")}</h2>
        </div>
        <div className={styles.stageHeaderActions}>
          {has3dModel ? (
            <div className={styles.viewToggle} role="tablist" aria-label="Kitchen preview view">
              <button
                type="button"
                role="tab"
                aria-selected={activeView === "2d"}
                className={activeView === "2d" ? styles.viewToggleButtonActive : styles.viewToggleButton}
                onClick={() => setActiveView("2d")}
              >
                2D View
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === "3d"}
                className={activeView === "3d" ? styles.viewToggleButtonActive : styles.viewToggleButton}
                onClick={() => setActiveView("3d")}
              >
                3D View
              </button>
            </div>
          ) : null}
          <button type="button" className={styles.ghostButton} onClick={onResetSelection}>
            <span className={styles.resetDesktopText}>{translate("configurator.resetSelection", "Reset selection")}</span>
            <span className={styles.resetMobileText}>{translate("configurator.resetSelectionMobile", "Reset")}</span>
          </button>
        </div>
      </div>
      <div className={styles.stageBody}>
        {has3dModel && activeView === "3d" ? (
          <Kitchen3DViewer
            components={kitchenConfig.components}
            componentIds={componentIds}
            fixedComponentIds={fixedComponentIds}
            planLockedComponentIds={planLockedComponentIds}
            selectedComponentIds={selectedComponentIds}
            onToggleComponent={(componentId) => {
              toggleComponentSelection(componentId);
            }}
          />
        ) : hasImageView ? (
            <div className={styles.pdfCard}>
              {canTracePolygon ? (
                <div className={styles.polygonTracePanel}>
                  <label className={styles.polygonTraceToggle}>
                    <input
                      type="checkbox"
                      checked={isTracingPolygon}
                      onChange={(event) => setIsTracingPolygon(event.target.checked)}
                    />
                    Trace polygon
                  </label>
                  <div className={styles.polygonTraceActions}>
                    <button
                      type="button"
                      onClick={copyPolygonTracePoints}
                      disabled={!polygonTracePoints.length}
                    >
                      Copy points array
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolygonTracePoints((current) => current.slice(0, -1))}
                      disabled={!polygonTracePoints.length}
                    >
                      Undo last point
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolygonTracePoints([])}
                      disabled={!polygonTracePoints.length}
                    >
                      Clear points
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        copyPolygonTracePoints();
                        setIsTracingPolygon(false);
                      }}
                      disabled={polygonTracePoints.length < 3}
                    >
                      Finish polygon
                    </button>
                  </div>
                  <div className={styles.polygonTraceReadout}>
                    <span>
                      Cursor:{" "}
                      {polygonTraceCursorPoint
                        ? `${polygonTraceCursorPoint[0].toFixed(2)}, ${polygonTraceCursorPoint[1].toFixed(2)}`
                        : "-"}
                    </span>
                    <span>
                      Last:{" "}
                      {lastPolygonTracePoint
                        ? `${lastPolygonTracePoint[0].toFixed(2)}, ${lastPolygonTracePoint[1].toFixed(2)}`
                        : "-"}
                    </span>
                    <span>Arrow keys nudge last point. Shift = 0.01, Alt = 0.25.</span>
                  </div>
                  <output className={styles.polygonTraceOutput}>
                    {formattedPolygonTracePoints}
                  </output>
                </div>
              ) : null}
              {hasImageHotspots ? (
                <div
                  className={styles.planImageWrap}
                  style={{ aspectRatio: croppedPlanAspectRatio }}
                >
                  {isCompactMobilePlan ? (
                    <CompactMobilePlanArtwork
                      href={imageViewHref}
                      crop={activePlanDisplayCrop}
                      layout={mobilePlanLayout}
                      idSuffix={`${normalizedKitchenSlug}-base`}
                      label={`${kitchenConfig.kitchen.name || "Kitchen"} plan`}
                      className={styles.planImageInteractive}
                      style={{ inset: 0, width: "100%", height: "100%" }}
                    />
                  ) : (
                    <img
                      ref={planTraceImageRef}
                      src={imageViewHref}
                      alt={`${kitchenConfig.kitchen.name || "Kitchen"} plan`}
                      className={styles.planImageInteractive}
                      style={planImageInteractiveStyle}
                    />
                  )}
                  <div className={styles.planHotspotLayer}>
                    {croppedImageHotspots.map((hotspot) => {
                      const isFixed = fixedComponentIds.includes(hotspot.componentId);
                      const isDefaultLocked = planLockedComponentIds.includes(hotspot.componentId);
                      // Linked parts (e.g. the hood cabinet + its pull-out hood) toggle together,
                      // but the hidden partner isn't persisted on its own. Mirror the group's
                      // selection so both stay highlighted after a refresh.
                      const linkedIds = getLinkedComponentIds(kitchenSlug, hotspot.componentId);
                      const isSelected =
                        isDefaultLocked || linkedIds.some((linkedId) => selectedComponentIds.includes(linkedId));
                      const isGroupHovered = hoveredLinkedGroup.includes(hotspot.componentId);
                      const hotspotStyle = {
                        left: `${hotspot.left}%`,
                        top: `${hotspot.top}%`,
                        width: `${hotspot.width}%`,
                        height: `${hotspot.height}%`,
                        zIndex:
                          hotspot.claimApplianceSurface === "cooktop"
                            ? 12
                            : hotspot.componentKey === "sink-faucet"
                            ? 10
                            : hotspot.componentKey === "worktop"
                              ? 4
                              : 1,
                      };
                      if (hotspot.clipPath) {
                        hotspotStyle.clipPath = hotspot.clipPath;
                        hotspotStyle.WebkitClipPath = hotspot.clipPath;
                        hotspotStyle.borderRadius = 0;
                      }
                      // The worktop is partitioned around the sink/cooktop cutouts.
                      // Paint its pieces continuously; their internal clipping edges
                      // must not add blue borders or inset shadows to the PDF.
                      if ((AB_105779_LAYOUT_SLUGS.includes(normalizedKitchenSlug) || normalizedKitchenSlug === "ab-105804") && hotspot.componentKey === "worktop" && hotspot.clipPath) {
                        hotspotStyle.border = 0;
                        hotspotStyle.boxShadow = "none";
                        hotspotStyle.backgroundClip = "border-box";
                      }
                      const isPolygonHotspot = Boolean(hotspot.clipPath);
                      return (
                        <button
                          key={`${hotspot.componentId}-${hotspot.left}-${hotspot.top}-${hotspot.width}-${hotspot.height}`}
                          type="button"
                          className={[
                            styles.planHotspot,
                            isPolygonHotspot ? styles.planHotspotPolygon : "",
                            normalizedKitchenSlug === "ab-101246" && hotspot.componentKey === "under-cabinet-light"
                              ? styles.planHotspotLight
                              : "",
                            isGroupHovered ? styles.planHotspotHover : "",
                            isSelected ? styles.planHotspotSelected : "",
                            isDefaultLocked ? styles.planHotspotLocked : "",
                            isCalibrating ? styles.planHotspotCalibrate : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={hotspotStyle}
                          aria-pressed={isSelected}
                          aria-label={hotspot.label}
                          title={
                            isCalibrating
                              ? `${hotspot.componentKey} — left:${hotspot.left} top:${hotspot.top} width:${hotspot.width} height:${hotspot.height}`
                              : hotspot.label
                          }
                          disabled={isFixed}
                          onPointerEnter={(event) => {
                            if (event.pointerType === "mouse") setHoveredComponentId(hotspot.componentId);
                          }}
                          onPointerLeave={(event) => {
                            if (event.pointerType !== "mouse") return;
                            setHoveredComponentId((current) =>
                              current === hotspot.componentId ? null : current,
                            );
                          }}
                          onClick={() => {
                            if (fixedComponentIds.includes(hotspot.componentId)) return;
                            setHoveredComponentId(null);
                            toggleComponentSelection(hotspot.componentId);
                          }}
                        >
                          {isCalibrating ? (
                            <span className={styles.planHotspotTag}>{hotspot.componentKey}</span>
                          ) : null}
                        </button>
                      );
                    })}
                    {sidePanelIndicators.map((indicator) => (
                      <span
                        key={`${indicator.left}-${indicator.top}-${indicator.height}`}
                        aria-hidden="true"
                        className={styles.planSidePanelIndicator}
                        style={{
                          left: `${indicator.left}%`,
                          top: `${indicator.top}%`,
                          height: `${indicator.height}%`,
                        }}
                      />
                    ))}
                  </div>
                  {activePersistentLightDetails.map((detail) => {
                    const detailComponentId = componentIdForKey(detail.componentKey);
                    const detailLinkedIds = getLinkedComponentIds(kitchenSlug, detailComponentId);
                    const isDetailComponentSelected =
                      planLockedComponentIds.includes(detailComponentId)
                      || detailLinkedIds.some((linkedId) => selectedComponentIds.includes(linkedId));

                    // The pale source details belong to the unselected plan drawing. Once the
                    // component is selected, let the green selection tint show through.
                    if (isDetailComponentSelected && !detail.persistWhenSelected) return null;

                    const persistentDetailClassName = [
                      styles.planImageInteractive,
                      styles.planPersistentLightDetail,
                      isDetailComponentSelected ? styles.planPersistentSelectedDetail : "",
                      styles.planPersistentSourceLinework,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    if (isCompactMobilePlan) {
                      return (
                        <Fragment key={detail.key}>
                          {!isDetailComponentSelected ? (
                            <div
                              className={styles.planPersistentLightDetailBacking}
                              style={{
                                left: `${detail.left}%`,
                                top: `${detail.top}%`,
                                width: `${detail.width}%`,
                                height: `${detail.height}%`,
                              }}
                            />
                          ) : null}
                          <CompactMobilePlanArtwork
                            key={detail.key}
                            href={imageViewHref}
                            crop={activePlanDisplayCrop}
                            layout={mobilePlanLayout}
                            idSuffix={`${normalizedKitchenSlug}-${detail.key}`}
                            clipGeometry={detail}
                            className={persistentDetailClassName}
                            style={{ inset: 0, width: "100%", height: "100%", opacity: detail.sourceLineworkOpacity }}
                          />
                        </Fragment>
                      );
                    }

                    const right = detail.left + detail.width;
                    const bottom = detail.top + detail.height;
                    const clipPath = `polygon(${detail.left}% ${detail.top}%, ${right}% ${detail.top}%, ${right}% ${bottom}%, ${detail.left}% ${bottom}%)`;

                    return (
                      <Fragment key={detail.key}>
                        {!isDetailComponentSelected ? (
                          <div
                            className={styles.planPersistentLightDetailBacking}
                            style={{
                              ...planImageInteractiveStyle,
                              clipPath,
                              WebkitClipPath: clipPath,
                            }}
                          />
                        ) : null}
                        <img
                          key={detail.key}
                          src={imageViewHref}
                          alt=""
                          aria-hidden="true"
                          className={persistentDetailClassName}
                          style={{
                            ...planImageInteractiveStyle,
                            opacity: detail.sourceLineworkOpacity,
                            clipPath,
                            WebkitClipPath: clipPath,
                          }}
                        />
                      </Fragment>
                    );
                  })}
                  <KitchenPlanSideLabels labels={splitKitchenSideLabels} twoPart={Boolean(mobilePlanLayout)} />
                  {isCalibrating ? (
                    <div className={styles.planCalibrationGrid} aria-hidden="true">
                      {CALIBRATION_TICKS.map((tick) => (
                        <div
                          key={`v-${tick}`}
                          className={styles.planCalibrationLineV}
                          style={{ left: `${tick}%` }}
                        >
                          <span className={styles.planCalibrationLabel}>{tick}</span>
                        </div>
                      ))}
                      {CALIBRATION_TICKS.map((tick) => (
                        <div
                          key={`h-${tick}`}
                          className={styles.planCalibrationLineH}
                          style={{ top: `${tick}%` }}
                        >
                          <span className={styles.planCalibrationLabelH}>{tick}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {canTracePolygon ? (
                    <div
                      ref={polygonTraceLayerRef}
                      className={[
                        styles.polygonTraceLayer,
                        isTracingPolygon ? styles.polygonTraceLayerActive : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      tabIndex={isTracingPolygon ? 0 : -1}
                      onClick={handlePolygonTraceClick}
                      onMouseMove={handlePolygonTraceMove}
                      onMouseLeave={() => setPolygonTraceCursorPoint(null)}
                      onKeyDown={handlePolygonTraceKeyDown}
                      aria-hidden={!isTracingPolygon}
                    >
                      {visiblePolygonTraceCursorPoint ? (
                        <>
                          <span
                            className={styles.polygonTraceCursorLineV}
                            style={{ left: `${visiblePolygonTraceCursorPoint.x}%` }}
                          />
                          <span
                            className={styles.polygonTraceCursorLineH}
                            style={{ top: `${visiblePolygonTraceCursorPoint.y}%` }}
                          />
                        </>
                      ) : null}
                      {visiblePolygonTracePoints.length ? (
                        <svg className={styles.polygonTraceSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polyline
                            points={visiblePolygonTracePoints
                              .map((point) => `${point.x},${point.y}`)
                              .join(" ")}
                            className={styles.polygonTraceLine}
                          />
                        </svg>
                      ) : null}
                      {visiblePolygonTracePoints.map((point, index) => (
                        <span
                          key={`${point.x}-${point.y}-${index}`}
                          className={styles.polygonTracePoint}
                          style={{ left: `${point.x}%`, top: `${point.y}%` }}
                        >
                          {index + 1}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <img
                  src={imageViewHref}
                  alt={`${kitchenConfig.kitchen.name || "Kitchen"} plan`}
                  className={styles.planImage}
                />
              )}
            </div>
        ) : hasPdfView ? (
            <div className={styles.pdfCard}>
              <iframe
                src={pdfViewHref}
                title={`${kitchenConfig.kitchen.name || "Kitchen"} PDF view`}
                className={styles.pdfFrame}
              />
            </div>
        ) : (
            <div className={styles.svgCard}>
              <div
                ref={svgHostRef}
                className={[
                  styles.svgCanvas,
                  planViewport?.canvasClassName === "wide" ? styles.svgCanvasWide : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </div>
        )}
      </div>
    </div>
  );

  const legendNode = (
    <div className={styles.stageLegend}>
      <span className={styles.legendChip}>
        <span className={styles.legendSwatch} />
        <span className={styles.legendDesktopText}>{legendPrimaryText}</span>
        <span className={styles.legendMobileText}>{legendPrimaryMobileText}</span>
      </span>
      <span className={styles.legendChip}>
        <span className={styles.legendDot} />
        {legendFixedText}
      </span>
    </div>
  );

  return { stage: stageNode, legend: legendNode };
}
