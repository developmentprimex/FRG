// Source coordinates measured from AB 670 111535.pdf (842 x 595 pt).
// Keep both elevations, outer fillers and the exact drawn plinth baseline.
const points = (vertices) => vertices.map(([x, y]) => [x / 842 * 100, y / 595 * 100]);
const face = (componentKey, vertices, metadata = {}) => ({
  componentKey, points: points(vertices), preserveManualSize: true, ...metadata,
});
const rect = (x1, y1, x2, y2) => [[x1,y1],[x2,y1],[x2,y2],[x1,y2]];
export const AB_111535_HOTSPOTS = [
  face('wall-cabinet-1', rect(3.36,145.72,11.76,266.44)),
  face('wall-cabinet-1', rect(11.76,145.72,162,266.44)),
  face('wall-cabinet-2', rect(162,145.72,295.44,266.44)),
  face('wall-cabinet-3', rect(295.44,145.72,395.64,266.44)),
  face('wall-cabinet-4', rect(621.72,145.72,755.28,266.44)),
  face('worktop', rect(3.36,354.04,398.28,360.76)),
  face('worktop', rect(481.8,354.04,535.56,360.76)),
  face('worktop', rect(571.68,354.04,755.28,360.76)),
  face('worktop', rect(395.64,360.76,398.28,507.28), { claimFurniturePartKey: 'worktop-end-panel-left' }),
  face('base-module-1', rect(3.36,360.76,11.76,507.28)),
  face('base-module-1', rect(11.76,360.76,162,507.28)),
  face('sink-base', rect(162,360.76,295.44,507.28)),
  face('dishwasher-base', rect(295.44,360.76,395.64,507.28)),
  // The supplied side panel belongs to the worktop, not a separate order item.
  face('worktop', rect(481.8,360.76,484.44,507.28), { claimFurniturePartKey: 'worktop-end-panel' }),
  face('worktop', rect(484.44,360.76,535.56,507.28), { claimFurniturePartKey: 'worktop-end-panel' }),
  // The left return in the right elevation stays white in every selection state.
  // Its source linework remains visible without a selection overlay.
  face('base-module-2', rect(621.72,360.76,755.28,507.28)),
  // The faucet belongs to the included SP80 assembly.
  face('sink-base', [[243.48,354.04],[243.48,352.72],[245.28,352.72],[245.28,340.24],[243.84,340.24],[243.84,334],[245.28,334],[245.28,323.08],[246.12,321.52],[247.92,320.56],[249.72,321.52],[250.56,323.08],[250.56,334],[252,334],[252,340.24],[250.56,340.24],[250.56,352.72],[252.36,352.72],[252.36,354.04]], { claimFixturePartKey: 'faucet' }),
];
const detail = (key,x1,y1,x2,y2) => ({
  key, componentKey:'dishwasher-base', persistWhenSelected:true, preserveWhiteBackground:true,
  left:x1/842*100, top:y1/595*100, width:(x2-x1)/842*100, height:(y2-y1)/595*100,
});
export const AB_111535_LIGHT_DETAILS = [
  detail('dishwasher-basket',299,408.5,392.4,446.5),
  detail('dishwasher-gs-mark',337.3,469.2,356.3,487),
];
const bounds = (x1,y1,x2,y2) => ({left:x1/842*100,right:x2/842*100,top:y1/595*100,bottom:y2/595*100});
export const AB_111535_BLENDE_CALIBRATION = {
  'base-module-1': { side:'left', wholeFacesOnly:true, wholeBlendeFaces:[bounds(3.36,360.76,11.76,507.28)] },
  'wall-cabinet-1': { side:'left', wholeFacesOnly:true, wholeBlendeFaces:[bounds(3.36,145.72,11.76,266.44)] },
};
