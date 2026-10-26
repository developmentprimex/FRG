// Visible surfaces measured from 670 105803.pdf (842 x 595 PDF points).
export const pdf105803Points = points => points.map(([x,y]) => [
  Number((x/842*100).toFixed(6)), Number((y/595*100).toFixed(6)),
]);
const face = (componentKey, points, extra = {}) => ({
  componentKey, points: pdf105803Points(points), preserveManualSize: true, ...extra,
});
export const AB_105803_SINK_POINTS = pdf105803Points([
  [151.2,332.68],[154.2,331.96],[268.2,320.32],[271.2,320.08],
  [276.24,320.08],[280.2,320.44],[324.48,326.92],[326.52,328.36],
  [323.52,328.6],[207.96,340.12],[204.96,340.48],[202.08,340.48],
  [197.52,340.12],[153.24,333.64],[151.2,333.4],
]);
export const AB_105803_COOKTOP_POINTS = pdf105803Points([
  [447.12,331.6],[530.04,323.08],[552,326.26],[552,340.36],
  [524.64,343.12],[450.6,332.44],[447.12,331.84],
]);
export const AB_105803_OVEN_PART_POINTS = {
  oven: pdf105803Points([[445.8,340.84],[523.92,352.12],[523.92,468.76],[445.8,457.48]]),
  'oven-drawer': pdf105803Points([[445.8,457.48],[523.92,468.76],[523.92,528.64],[445.8,517.24]]),
};
export const AB_105803_HOTSPOTS = [
  face('refrigerator',[[552,172.96],[645.12,163.36],[717.48,173.92],[624.36,183.4]]),
  face('refrigerator',[[552,172.96],[624.36,183.4],[624.36,540.16],[552,529.6]]),
  face('refrigerator',[[624.36,183.4],[717.48,173.92],[717.48,530.68],[624.36,540.16]]),
  face('worktop',[[59.88,339.4],[313.08,313.48],[391.2,324.76],[138,350.68]]),
  face('worktop',[[313.08,313.48],[406.08,304],[552,325.12],[552,348.16],[391.2,324.76]]),
  face('worktop',[[59.88,339.4],[138,350.68],[391.2,324.76],[391.2,332.8],[138,358.72],[59.88,347.44]]),
  face('worktop',[[391.2,324.76],[552,348.16],[552,356.2],[391.2,332.8]]),
  face('worktop',[[70.2,348.88],[138,358.72],[138,532.6],[70.2,522.76]],{claimFurniturePartKey:'worktop-end-panel-left'}),
  face('worktop',[[138,358.72],[140.52,358.48],[140.52,534.88],[138,535.24]],{claimFurniturePartKey:'worktop-end-panel-left',separateLockedSidePanel:true}),
  face('worktop',[[380.88,333.88],[383.4,333.64],[383.4,510.04],[380.88,510.4]],{claimFurniturePartKey:'worktop-end-panel-left',separateLockedSidePanel:true}),
  face('worktop',[[549.96,355.96],[552,356.2],[552,532.72],[549.96,532.36]],{claimFurniturePartKey:'worktop-end-panel',separateLockedSidePanel:true}),
  // Row 4 includes UPK20; row 6 owns the complete UPEF65 corner, without UPK20.
  face('base-module-1',[[140.52,358.48],[148.32,357.64],[148.32,534.16],[140.52,534.88]]),
  face('base-module-1',[[148.32,357.64],[194.76,352.96],[194.76,529.36],[148.32,534.16]]),
  face('sink-base',[[194.76,352.96],[287.88,343.36],[287.88,519.88],[194.76,529.36]]),
  face('dishwasher-base',[[287.88,343.36],[380.88,333.88],[380.88,510.4],[287.88,519.88]],{claimDishwasherFront:true}),
  // Both visible corner faces belong to the right-hand 30 cm cabinet.
  face('base-module-2',[[383.4,333.64],[391.2,332.8],[391.2,509.32],[383.4,510.04]]),
  face('base-module-2',[[391.2,332.8],[406.8,335.08],[406.8,511.6],[391.2,509.32]]),
  face('base-module-2',[[406.8,335.08],[445.8,340.84],[445.8,517.24],[406.8,511.6]]),
  face('oven-module',[[445.8,340.84],[523.92,352.12],[523.92,528.64],[445.8,517.24]],{claimApplianceSurface:'oven'}),
  {componentKey:'oven-module',points:AB_105803_COOKTOP_POINTS,preserveManualSize:true,claimApplianceSurface:'cooktop'},
  face('wall-cabinet-1',[[354,58.6],[369,60.76],[369,206.08],[354,203.92]]),
  face('wall-cabinet-1',[[354,58.6],[357.12,58.24],[372.12,60.52],[369,60.76]]),
  face('wall-cabinet-1',[[369,60.76],[447.12,72.16],[447.12,217.48],[369,206.08]]),
  face('wall-cabinet-1',[[369,60.76],[421.8,55.36],[499.8,66.76],[447.12,72.16]]),
  face('wall-cabinet-2',[[447.12,72.16],[486.12,77.8],[486.12,223.12],[447.12,217.48]]),
  face('wall-cabinet-2',[[447.12,72.16],[499.8,66.76],[538.92,72.4],[486.12,77.8]]),
  // The refrigerator hides the lower right part of HD6002.
  face('wall-cabinet-3',[[486.12,77.8],[564.24,89.2],[564.24,171.64],[552,172.96],[552,232.72],[486.12,223.12]]),
  face('wall-cabinet-3',[[486.12,77.8],[538.92,72.4],[616.92,83.8],[564.24,89.2]]),
  face('wall-cabinet-3',[[564.24,89.2],[616.92,83.8],[616.92,166.24],[564.24,171.64]]),
  face('extractor-hood',[[486.12,223.12],[552,232.72],[552,242.68],[486.12,233.2]]),
  face('extractor-hood',[[503.88,242.8],[510.48,243.76],[514.68,261.16],[507.12,260.08],[499.44,258.96]]),
  face('extractor-hood',[[543.36,248.56],[549.96,249.52],[552,258.16],[552,266.61],[546.72,265.84],[539.16,264.76]]),
  {componentKey:'sink-faucet',points:AB_105803_SINK_POINTS,preserveManualSize:true,claimFixturePartKey:'sink'},
  face('sink-faucet',[[196.2,268.48],[201.6,268.96],[199.8,289.96],[195,289.72]],{claimFixturePartKey:'faucet'}),
  face('sink-faucet',[[195.96,274.48],[195.48,280.24],[174.36,284.32],[174,278.68]],{claimFixturePartKey:'faucet'}),
  face('sink-faucet',[[162.48,295.96],[162.6,293.08],[163.68,288.76],[165.84,284.68],[168.6,281.44],[171.84,279.4],[174,278.68],[174.36,284.32],[172.92,284.68],[170.16,286.6],[168,289.84],[166.92,293.68],[166.8,295.48],[166.8,311.2],[162.48,311.68]],{claimFixturePartKey:'faucet'}),
  face('sink-faucet',[[162.48,311.68],[166.8,311.2],[167.4,334.84],[163.44,335.2]],{claimFixturePartKey:'faucet'}),
];
const bounds = points => {
  const p=pdf105803Points(points),xs=p.map(p=>p[0]),ys=p.map(p=>p[1]);
  return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
};
export const AB_105803_BLENDE_CALIBRATION = {
  // ASC separates both UPEF65 faces from the right-hand 30 cm cabinet.
  'base-module-2':{side:'left',wholeFacesOnly:true,wholeBlendeFaces:[
    bounds([[383.4,333.64],[391.2,332.8],[391.2,509.32],[383.4,510.04]]),
    bounds([[391.2,332.8],[406.8,335.08],[406.8,511.6],[391.2,509.32]]),
  ]},
  'wall-cabinet-1':{side:'left',wholeFacesOnly:true,wholeBlendeFaces:[bounds([[354,58.6],[369,206.08]])]},
  'base-module-1':{side:'left',wholeFacesOnly:true,wholeBlendeFaces:[bounds([[140.52,357.64],[148.32,534.88]])]},
};
const detail=(key,x1,y1,x2,y2)=>{
  const {left,right,top,bottom}=bounds([[x1,y1],[x2,y2]]);
  return {key,componentKey:'dishwasher-base',persistWhenSelected:true,left,top,width:right-left,height:bottom-top};
};
// Basket silhouette follows its sloped rim, mounting clips and rounded lower corners.
export const AB_105803_DISHWASHER_BASKET_POINTS = pdf105803Points([
  [292.5,403],[293.5,402],[295,403],[295,404.2],
  [374.8,395.5],[374.8,394],[376,393.6],[377.4,394.2],
  [377.4,405],[376.2,405.5],[374.8,404.8],
  [373.5,405.5],[372.8,414],[371.2,425],[369.5,432.5],[368,435.2],
  [366,437.2],[364.32,438.28],[305.16,444.28],
  [303,444.3],[301.3,443.5],[300,442],[299.3,439.5],
  [296.3,418],[295.3,410.5],[295,414],[293.5,414.5],[292.5,414],
]);
export const AB_105803_LIGHT_DETAILS = [
  detail('dishwasher-basket',291.1,391.6,377.8,446.2),
  detail('dishwasher-gs-mark',326,460.3,344.3,481.8),
];
