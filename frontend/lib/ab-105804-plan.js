// Measured source coordinates from 670 105804.pdf (842 x 595 points).
const percent = (points) => points.map(([x, y]) => [
  Number((x / 842 * 100).toFixed(6)), Number((y / 595 * 100).toFixed(6)),
]);
const face = (componentKey, points, extra = {}) => ({ componentKey, points: percent(points), preserveManualSize: true, ...extra });
const bounds = (points) => {
  const p = percent(points), xs = p.map(([x]) => x), ys = p.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
};

const baseLeftFiller = [[105.96,387.64],[110.64,387.16],[110.64,563.56],[105.96,564.04]];
const baseRightFiller = [[547.92,345.52],[555.84,346.6],[555.84,523.12],[547.92,521.92]];
const wallLeftFiller = [[72.12,123.88],[76.8,123.4],[76.8,268.72],[72.12,269.2]];
const wallLeftFillerTop = [[69.48,123.52],[74.16,123.04],[76.8,123.4],[72.12,123.88]];
const wallRightFiller = [[433.56,86.92],[441.24,86.08],[441.24,231.4],[433.56,232.24]];
const wallRightFillerTop = [[430.92,86.56],[438.72,85.72],[441.24,86.08],[433.56,86.92]];

const sink = [[276.72,347.08],[277.8,345.52],[391.8,333.52],[403.8,334],[447,340.36],[450,341.8],[448.92,344.68],[331.44,353.68],[321,353.56]];
const cooktop = [[120.84,360.4],[121.8,359.32],[211.44,350.32],[281.04,360.52],[276.48,361.12],[188.16,370.12]];
export const AB_105804_SINK_POINTS = percent(sink);
export const AB_105804_COOKTOP_POINTS = percent(cooktop);
export const AB_105804_OVEN_PART_POINTS = {
  oven: percent([[188.16,379.24],[281.28,369.76],[281.28,486.4],[188.16,495.88]]),
  "oven-drawer": percent([[188.16,495.88],[281.28,486.4],[281.28,546.16],[188.16,555.64]]),
};

// Partition a convex surface around the measured appliance cutout. These
// pieces have no added outline: the original CAD strokes show physical edges.
const area = (p) => p.reduce((sum, a, i) => { const b = p[(i + 1) % p.length]; return sum + a[0]*b[1] - b[0]*a[1]; }, 0) / 2;
function clip(p, a, b, inside) {
  const distance = ([x, y]) => (b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
  return p.flatMap((start, i) => {
    const end = p[(i+1)%p.length], ds = distance(start), de = distance(end);
    const si = inside ? ds >= -1e-8 : ds <= 1e-8, ei = inside ? de >= -1e-8 : de <= 1e-8;
    const result = si ? [start] : [];
    if (si !== ei) { const t = ds/(ds-de); result.push([start[0]+t*(end[0]-start[0]),start[1]+t*(end[1]-start[1])]); }
    return result;
  });
}
function subtract(surface, cutout) {
  const hole = area(cutout) < 0 ? [...cutout].reverse() : cutout;
  let remaining = surface; const pieces = [];
  for (let i=0; i<hole.length && remaining.length; i++) {
    const outside = clip(remaining, hole[i], hole[(i+1)%hole.length], false);
    if (outside.length >= 3 && Math.abs(area(outside)) > 0.0001) pieces.push(outside);
    remaining = clip(remaining, hole[i], hole[(i+1)%hole.length], true);
  }
  return pieces;
}
const leftSurface = [[27.84,368.2],[397.08,330.52],[475.08,341.8],[105.96,379.6]];
const leftWorktop = subtract(leftSurface, cooktop).flatMap((piece) => subtract(piece, sink));
const worktopFaces = [
  ...leftWorktop.map((p) => face("worktop", p)),
  face("worktop", [[27.84,368.2],[105.96,379.6],[475.08,341.8],[475.08,349.84],[105.96,387.64],[27.84,376.24]]),
  face("worktop", [[547.92,337.48],[636,328.48],[636,350.2]]),
  face("worktop", [[547.92,337.48],[636,350.2],[636,358.24],[547.92,345.52]]),
  face("worktop", [[27.84,376.24],[105.96,387.64],[105.96,564.04],[27.84,552.76]]),
  face("worktop", [[633.84,358],[636,358.24],[636,534.76],[633.84,534.4]], { separateLockedSidePanel: true, claimExcludeFromWorktop: true }),
];
export const AB_105804_WORKTOP_PART_KEYS = [
  ...leftWorktop.map(() => "worktop-left"), "worktop-left", "worktop-right", "worktop-right",
];

export const AB_105804_HOTSPOTS = [
  face("refrigerator", [[636,175],[729,165.4],[801.36,175.96],[708.36,185.44]]),
  face("refrigerator", [[636,175],[708.36,185.44],[708.36,542.2],[636,531.76]]),
  face("refrigerator", [[708.36,185.44],[801.36,175.96],[801.36,532.72],[708.36,542.2]]),
  face("wall-cabinet-1", [[32.52,116.92],[110.04,109],[154.32,115.48],[76.8,123.4]]),
  face("wall-cabinet-1", [[32.52,116.92],[72.12,122.715],[72.12,269.2],[32.52,262.24]]),
  face("wall-cabinet-1", [[76.8,123.4],[154.32,115.48],[154.32,260.8],[76.8,268.72]]),
  face("wall-cabinet-1", wallLeftFiller),
  face("wall-cabinet-1", wallLeftFillerTop),
  face("wall-cabinet-2", [[110.04,109],[203.16,99.52],[247.44,105.88],[154.32,115.48]]),
  face("wall-cabinet-2", [[154.32,115.48],[247.44,105.88],[247.44,251.2],[154.32,260.8]]),
  face("extractor-hood", [[154.32,260.8],[247.44,251.2],[247.44,261.28],[154.32,270.76]]),
  face("extractor-hood", [[120.24,265.84],[154.32,262.36],[154.32,270.76]]),
  face("extractor-hood", [[171.24,276.16],[179.16,275.32],[184.32,291.64],[175.2,292.6],[166.2,293.44]]),
  face("extractor-hood", [[218.4,271.36],[226.32,270.52],[231.48,286.84],[222.36,287.68],[213.36,288.64]]),
  face("wall-cabinet-3", [[203.16,99.52],[296.16,90.04],[340.44,96.4],[247.44,105.88]]),
  face("wall-cabinet-3", [[247.44,105.88],[340.44,96.4],[340.44,241.72],[247.44,251.2]]),
  face("wall-cabinet-4", [[296.16,90.04],[389.28,80.44],[433.56,86.92],[340.44,96.4]]),
  face("wall-cabinet-4", [[340.44,96.4],[433.56,86.92],[433.56,232.24],[340.44,241.72]]),
  face("wall-cabinet-4", wallRightFiller),
  face("wall-cabinet-4", wallRightFillerTop),
  ...worktopFaces,
  face("base-module-1", baseLeftFiller),
  face("base-module-1", [[110.64,387.16],[188.16,379.24],[188.16,555.64],[110.64,563.56]]),
  face("oven-module", [[188.16,379.24],[281.28,369.76],[281.28,546.16],[188.16,555.64]], { claimApplianceSurface: "oven" }),
  face("oven-module", cooktop, { claimApplianceSurface: "cooktop" }),
  face("dishwasher-base", [[281.28,369.76],[374.28,360.16],[374.28,536.68],[281.28,546.16]]),
  face("sink-base", [[374.28,360.16],[467.4,350.68],[467.4,527.08],[374.28,536.68]]),
  face("sink-end-blende", [[467.4,350.68],[475.08,349.84],[475.08,526.36],[467.4,527.08]]),
  face("base-module-2", baseRightFiller),
  face("base-module-2", [[555.84,346.6],[633.84,358],[633.84,534.4],[555.84,523.12]]),
  face("sink-faucet", sink, { claimFixturePartKey: "sink" }),
  face("sink-faucet", [[368.88,283.6],[374.4,284.68],[372.48,305.2],[367.44,304.36]], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [[350.76,288.64],[369.12,289.24],[368.64,294.88],[351,294.28]], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [[341.04,303.28],[341.16,300.4],[341.76,297.64],[342.6,295],[343.8,292.72],[345.36,290.8],[347.04,289.48],[348.96,288.76],[350.76,288.64],[351,294.28],[349.8,294.4],[348.6,294.88],[347.52,295.72],[346.44,296.92],[345.72,298.36],[345.12,300.16],[344.76,301.96],[344.64,303.76],[344.64,319.48],[341.04,319]], { claimFixturePartKey: "faucet" }),
  face("sink-faucet", [[342.36,320.8],[343.44,319.72],[343.44,343],[342.36,342.28]], { claimFixturePartKey: "faucet" }),
];

export const AB_105804_BLENDE_CALIBRATION = Object.fromEntries([
  ["base-module-1", "left", [baseLeftFiller]],
  ["base-module-2", "left", [baseRightFiller]],
  ["wall-cabinet-1", "left", [wallLeftFiller, wallLeftFillerTop]],
  ["wall-cabinet-4", "right", [wallRightFiller, wallRightFillerTop]],
].map(([key, side, faces]) => [key, { side, wholeFacesOnly: true, wholeBlendeFaces: faces.map(bounds) }]));

export const AB_105804_LIGHT_DETAILS = [
  ["dishwasher-basket", [[284.64,420.04],[370.2,470.68]]],
  ["dishwasher-gs-mark", [[318.36,486.04],[335.4,507.88]]],
].map(([key, points]) => { const b = bounds(points); return { key, componentKey: "dishwasher-base", persistWhenSelected: true, preserveWhiteBackground: true, sourceLineworkOpacity: 0.08, left: b.left, top: b.top, width: b.right-b.left, height: b.bottom-b.top }; });
