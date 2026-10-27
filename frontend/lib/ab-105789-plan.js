// Source PDF coordinates (842 x 595). Shared by FRG and ASC; no raster guesses.
export const pdf105789Points = (points) => points.map(([x, y]) => [
  Number((x / 842 * 100).toFixed(6)), Number((y / 595 * 100).toFixed(6)),
]);
const face = (componentKey, points, extra = {}) => ({
  componentKey, points: pdf105789Points(points), preserveManualSize: true, ...extra,
});

export const AB_105789_SINK_POINTS = pdf105789Points([
  [532.2,338.8],[535.2,338.08],[588,332.44],[600,332.8],
  [695.64,346.72],[694.56,348.28],[641.88,353.68],[634.44,353.68],[534.24,339.76],
]);
export const AB_105789_COOKTOP_POINTS = pdf105789Points([
  [255.84,331],[314.4,324.76],[382.32,334.6],[382.32,335.68],
  [294.12,344.68],[287.88,345.28],[255.84,340.72],
]);
export const AB_105789_OVEN_PART_POINTS = {
  oven: pdf105789Points([[289.32,354.16],[382.32,344.68],[382.32,461.32],[289.32,470.92]]),
  "oven-drawer": pdf105789Points([[289.32,470.92],[382.32,461.32],[382.32,521.2],[289.32,530.68]]),
};

export const AB_105789_HOTSPOTS = [
  face("refrigerator", [[91.44,171.88],[177.72,163],[255.84,174.4],[169.56,183.16]]),
  face("refrigerator", [[91.44,171.88],[169.56,183.16],[169.56,539.92],[91.44,528.52]]),
  face("refrigerator", [[169.56,183.16],[255.84,174.4],[255.84,531.04],[169.56,539.92]]),
  face("wall-cabinet-1", [[211.2,84.04],[304.32,74.56],[348.48,80.92],[255.48,90.4]]),
  // The refrigerator hides the lower portion of the hood cabinet's left side.
  face("wall-cabinet-1", [[211.2,84.04],[255.48,90.4],[255.48,174.347465],[211.2,167.885407]]),
  face("wall-cabinet-1", [[255.48,90.4],[348.48,80.92],[348.48,226.24],[255.48,235.72]]),
  face("extractor-hood", [[255.48,235.72],[348.48,226.24],[348.48,236.32],[255.48,245.8]]),
  face("extractor-hood", [[276.6,250.72],[284.4,249.88],[289.56,266.2],[280.44,267.16],[271.44,268]]),
  face("extractor-hood", [[323.64,245.92],[331.56,245.08],[336.72,261.4],[327.6,262.36],[318.6,263.2]]),
  face("wall-cabinet-2", [[304.32,74.56],[350.76,69.76],[395.04,76.12],[348.48,80.92]]),
  face("wall-cabinet-2", [[348.48,80.92],[395.04,76.12],[395.04,221.44],[348.48,226.24]]),
  face("wall-cabinet-3", [[350.76,69.76],[443.88,60.28],[488.16,66.64],[395.04,76.12]]),
  face("wall-cabinet-3", [[395.04,76.12],[488.16,66.64],[488.16,211.96],[395.04,221.44]]),
  face("wall-cabinet-3", [[488.16,66.64],[506.76,64.72],[506.76,210.04],[488.16,211.96]]),
  face("wall-cabinet-3", [[485.52,66.28],[504.12,64.36],[506.76,64.72],[488.16,66.64]]),
  // Two worktop surfaces, their fascias, and the visible floor-height side panel.
  face("worktop", [[255.84,330.28],[462.48,309.16],[540.6,320.44],[255.84,349.6]]),
  face("worktop", [[540.6,320.44],[753,351.28],[659.88,360.88],[447.48,330.04]]),
  face("worktop", [[255.84,349.6],[447.48,330.04],[447.48,338.08],[255.84,357.64]]),
  face("worktop", [[447.48,330.04],[659.88,360.88],[753,351.28],[753,359.32],[659.88,368.92],[447.48,338.08]]),
  face("worktop", [[659.88,368.92],[753,359.32],[753,535.84],[659.88,545.32]]),
  face("worktop", [[255.84,357.64],[258.24,357.4],[258.24,533.8],[255.84,534.04]], { separateLockedSidePanel: true }),
  face("worktop", [[657.84,368.56],[659.88,368.92],[659.88,545.32],[657.84,545.08]], { separateLockedSidePanel: true }),
  face("base-end-blende", [[258.24,357.4],[289.32,354.16],[289.32,530.68],[258.24,533.8]]),
  face("oven-module", [[289.32,354.16],[382.32,344.68],[382.32,521.2],[289.32,530.68]], { claimApplianceSurface: "oven" }),
  { componentKey: "oven-module", points: AB_105789_COOKTOP_POINTS, preserveManualSize: true, claimApplianceSurface: "cooktop" },
  face("base-module-1", [[382.32,344.68],[428.88,340],[428.88,516.4],[382.32,521.2]]),
  // One continuous filler face: no selection border at the old UPK20 seam.
  face("base-module-1", [[428.88,340],[447.48,338.08],[447.48,514.48],[428.88,516.4]]),
  // Only the thin right edge belongs to the worktop; the left return is UPEF65.
  face("base-module-1", [[447.48,338.08],[454.08,339.04],[454.08,515.44],[447.48,514.48]]),
  face("worktop", [[454.08,339.04],[456.12,339.28],[456.12,515.8],[454.08,515.44]], { separateLockedSidePanel: true }),
  face("dishwasher-base", [[456.12,339.28],[534.24,350.68],[534.24,527.08],[456.12,515.8]]),
  face("sink-base", [[534.24,350.68],[612.24,361.96],[612.24,538.48],[534.24,527.08]]),
  face("base-module-2", [[612.24,361.96],[651.36,367.6],[651.36,544.12],[612.24,538.48]]),
  face("base-module-2", [[651.36,367.6],[657.84,368.56],[657.84,545.08],[651.36,544.12]]),
  { componentKey: "sink-faucet", points: AB_105789_SINK_POINTS, preserveManualSize: true, claimFixturePartKey: "sink" },
  face("sink-faucet", [[599.4,280.84],[605.16,280.84],[606.84,302.56],[601.08,302.56]], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [[605.16,286.48],[627.12,286.24],[626.76,291.88],[605.64,292.12]], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [
    [627.12,286.24],[628.2,286.24],[629.28,286.48],[630.36,286.72],[631.44,287.2],
    [632.52,287.8],[633,288.16],[633.48,288.52],[633.96,289],[634.44,289.48],
    [634.92,289.96],[635.28,290.44],[635.76,291.04],[636.12,291.64],[636.48,292.24],
    [636.84,292.84],[637.08,293.44],[637.32,294.16],[637.8,295.48],[638.16,296.92],
    [638.4,298.24],[638.64,299.68],[638.64,301.12],[638.64,316.84],
    [639.48,317.56],[633.6,317.56],[634.32,316.84],[634.32,301.48],
    [634.32,300.64],[634.2,299.68],[633.96,298.84],[633.84,297.88],[633.48,297.04],
    [633.12,296.2],[632.64,295.36],[632.16,294.64],[631.56,293.92],[630.96,293.44],
    [630.24,292.96],[629.64,292.48],[628.92,292.24],[628.2,292],[627.48,291.88],[626.76,291.88],
  ], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [[635.4,317.56],[637.56,318.64],[637.56,340.12],[635.4,340.84]], { claimFixturePartKey: "faucet" }),
];

const blendeFace = (points) => {
  const xs = pdf105789Points(points).map(([x]) => x);
  const ys = pdf105789Points(points).map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
};
export const AB_105789_BLENDE_CALIBRATION = {
  "base-module-1": { side: "right", wholeFacesOnly: true, wholeBlendeFaces: [
    blendeFace([[428.88,340],[447.48,338.08],[447.48,514.48],[428.88,516.4]]),
    blendeFace([[447.48,338.08],[454.08,339.04],[454.08,515.44],[447.48,514.48]]),
  ] },
  "base-module-2": { side: "right", wholeFacesOnly: true, wholeBlendeFaces: [blendeFace([[651.36,367.6],[657.84,368.56],[657.84,545.08],[651.36,544.12]])] },
  "wall-cabinet-3": { side: "right", wholeFacesOnly: true, wholeBlendeFaces: [
    blendeFace([[488.16,66.64],[506.76,64.72],[506.76,210.04],[488.16,211.96]]),
    blendeFace([[485.52,66.28],[504.12,64.36],[506.76,64.72],[488.16,66.64]]),
  ] },
};

// The persistent-detail renderer clips by source bounds, not hotspot points.
// Missing bounds would leave its grey source image covering the entire plan.
const lightDetail = (key, points) => {
  const normalized = pdf105789Points(points);
  const xs = normalized.map(([x]) => x), ys = normalized.map(([, y]) => y);
  const left = Math.min(...xs), top = Math.min(...ys);
  return {
    key, componentKey: "dishwasher-base", persistWhenSelected: true,
    preserveWhiteBackground: true,
    left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top,
  };
};
export const AB_105789_LIGHT_DETAILS = [
  lightDetail("dishwasher-basket", [
    [459.48,401.32],[460.08,399.76],[460.2,399.52],[460.44,399.28],[461.16,399.28],
    [529.8,409.24],[530.4,409.36],[530.64,409.6],[530.76,409.84],[530.88,410.2],
    [531.36,411.76],[531.36,418.84],[524.04,447.4],[523.56,448.84],[522.96,449.92],
    [522.24,450.76],[521.28,451.24],[520.2,451.24],[470.52,444.04],[469.68,443.68],
    [468.72,442.96],[467.88,441.88],[467.28,440.56],[466.92,439.12],[459.48,408.4],
  ]),
  lightDetail("dishwasher-gs-mark", [[488.76,465.88],[503.04,467.92],[503.04,488.08],[488.76,485.92]]),
];
