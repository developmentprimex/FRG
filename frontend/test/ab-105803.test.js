import assert from 'node:assert/strict';
import test from 'node:test';
import { AB_105803_HOTSPOTS, AB_105803_SINK_POINTS, AB_105803_COOKTOP_POINTS } from '../lib/ab-105803-plan.js';
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG } from '../lib/kitchen-plan-preview-data.js';
import { prepareKitchenPlanGeometry } from '../lib/kitchen-plan-geometry.js';
import { buildServiceClaimBlendeHotspots, buildServiceClaimPartHotspots, isLShapedClaimKitchen } from '../lib/service-claim-kitchen-hotspots.js';
import { buildServiceClaimComponentChoiceGroups, resolveServiceClaimPlanDisplayComponentIds } from '../lib/service-claim-component-choices.js';
import { toggleLinkedComponentSelection } from '../components/kitchen-selection-utils.js';
import { loadKitchenSvgMarkup } from '../lib/load-kitchen-svg.js';

const contains = (points,[x,y]) => {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if(((yi>y)!==(yj>y)) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
};
const maskContains=(hotspot,point)=>{
  if(hotspot.points && !hotspot.clipPath) return contains(hotspot.points,point);
  const polygon=hotspot.clipPath?.match(/^polygon\((.*)\)$/)?.[1];
  const points=polygon ? polygon.split(',').map(p=>{
    const [x,y]=p.trim().split(/\s+/).map(parseFloat);
    return [hotspot.left+x/100*hotspot.width,hotspot.top+y/100*hotspot.height];
  }) : [[hotspot.left,hotspot.top],[hotspot.left+hotspot.width,hotspot.top],[hotspot.left+hotspot.width,hotspot.top+hotspot.height],[hotspot.left,hotspot.top+hotspot.height]];
  return contains(points,point);
};
const hits=(key,x,y)=>AB_105803_HOTSPOTS.some(h=>h.componentKey===key&&maskContains(h,[x/842*100,y/595*100]));

test('105803 owns its vector plan and selectable supplier callouts',async()=>{
  assert.match(await loadKitchenSvgMarkup('ab-105803'),/viewBox="0 0 842 595"/);
  assert.equal(PLAN_IMAGE_BY_SLUG['ab-105803'],'/plans/670%20105803.svg');
  assert.equal(PLAN_HOTSPOTS_BY_SLUG['ab-105803'],AB_105803_HOTSPOTS);
  // Positions extracted from the white numbered text in the supplier PDF.
  for(const [key,x,y] of [
    ['oven-module',472.56,359.73],['worktop',410.27,313.96],['sink-base',228.66,378.49],
    ['base-module-1',173.88,428.01],['dishwasher-base',330.72,388.99],
    ['base-module-2',415.53,394.24],
    ['refrigerator',590.38,319.21],['wall-cabinet-1',410.27,141.39],
    ['wall-cabinet-2',461.83,141.39],['wall-cabinet-3',518.26,157.89],
  ]) assert.ok(hits(key,x,y),key);
  assert.deepEqual(prepareKitchenPlanGeometry(AB_105803_HOTSPOTS,'ab-105803').map(h=>h.points),AB_105803_HOTSPOTS.map(h=>h.points));
});

test('105803 fillers follow their supplier packages without crossing adjacent fronts',()=>{
  for(const [key,x,y] of [
    ['base-module-1',144,420],['base-module-2',420,420],
    ['base-module-2',387,420],['base-module-2',394,420],['base-module-2',402,420],
    ['wall-cabinet-1',360,145],
  ]) assert.ok(hits(key,x,y),key);
  assert.ok(hits('worktop',382,420));
  assert.ok(!hits('dishwasher-base',382,420));
  assert.ok(hits('worktop',551,430));
  assert.ok(!hits('end-blende',551,430));
  assert.ok(!hits('wall-cabinet-3',590,319),'hood cabinet cannot paint over the refrigerator');
  assert.ok(!hits('worktop',65,440),'left side panel starts at the drawn inset edge');
  assert.ok(hits('worktop',90,440));
  for (const x of [387,394,402]) assert.ok(!hits('dishwasher-base',x,420),'dishwasher excludes the complete corner');
  assert.equal(AB_105803_HOTSPOTS.filter(h=>h.componentKey==='base-module-2').length,3);
});

test('105803 leaves the space between oven and refrigerator unselectable',()=>{
  assert.ok(!AB_105803_HOTSPOTS.some(h=>h.componentKey==='end-blende'));
  for (const [x,y] of [[525,360],[535,430],[548,525]]) {
    assert.ok(!AB_105803_HOTSPOTS.some(h=>maskContains(h,[x/842*100,y/595*100])),`${x},${y} must stay empty`);
  }
});

test('105803 claims use the exact fixtures, oven split and physical worktop seam',()=>{
  assert.ok(isLShapedClaimKitchen('ab-105803'));
  const parts=[
    ...['sink','faucet'].map(partKey=>({partKey,sourceComponentKey:'sink-faucet'})),
    ...['oven','oven-drawer','cooktop'].map(partKey=>({partKey,sourceComponentKey:'oven-module'})),
    ...['worktop-left','worktop-right','worktop-end-panel','worktop-end-panel-left'].map(partKey=>({partKey,sourceComponentKey:'worktop'})),
  ];
  const result=buildServiceClaimPartHotspots(AB_105803_HOTSPOTS,parts,'ab-105803');
  for(const p of parts) assert.ok(result.some(h=>h.claimPartKey===p.partKey),p.partKey);
  assert.deepEqual(result.find(h=>h.claimPartKey==='sink').points,AB_105803_SINK_POINTS);
  assert.deepEqual(result.find(h=>h.claimPartKey==='cooktop').points,AB_105803_COOKTOP_POINTS);
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-left').length,2);
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-right').length,2);
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-end-panel-left').length,3);
  assert.equal(result.filter(h=>h.claimPartKey==='worktop-end-panel').length,1);
});

test('105803 linked hood toggles its cabinet while defaults stay selected',()=>{
  const locked=['component-oven-module','component-worktop','component-sink-base','component-sink-faucet'];
  const selected=toggleLinkedComponentSelection('ab-105803',locked,'component-extractor-hood',locked);
  assert.ok(selected.includes('component-wall-cabinet-3'));
  assert.deepEqual(toggleLinkedComponentSelection('ab-105803',selected,'component-wall-cabinet-3',locked),locked);
});

test('105803 ASC dropdown assigns both corner filler faces to UPEF65',()=>{
  const cabinet={componentId:'component-base-module-2',componentKey:'base-module-2',sourceComponentKey:'base-module-2'};
  const blende={componentId:'component-claim-blende-base-module-2',componentKey:'claim-blende-base-module-2',sourceComponentKey:'base-module-2',claimPartKey:'blende',isCompanionOption:true,isPlanSelectableCompanion:true};
  const groups=buildServiceClaimComponentChoiceGroups([cabinet,blende]);
  const prepared=prepareKitchenPlanGeometry(AB_105803_HOTSPOTS,'ab-105803');
  const split=buildServiceClaimBlendeHotspots(prepared,[blende],[],'ab-105803');
  const result=buildServiceClaimPartHotspots(split,[{partKey:'dishwasher',sourceComponentKey:'dishwasher-base'}],'ab-105803');
  const painted=(option,x,y)=>{
    const selected=resolveServiceClaimPlanDisplayComponentIds([cabinet.componentId],groups,{'base-module-2':[option.componentId]});
    return result.filter(h=>selected.includes(h.componentId || ('component-'+h.componentKey)) && maskContains(h,[x/842*100,y/595*100]));
  };
  for(const x of [387,394,402]) {
    assert.equal(painted(blende,x,420).length,1,'corner face belongs to filler');
    assert.equal(painted(cabinet,x,420).length,0,'cabinet-only ASC option excludes its corner filler');
  }
  assert.equal(painted(blende,330,420).length,0);
  assert.equal(painted(cabinet,420,420).length,1);
  assert.equal(painted(blende,420,420).length,0);
  assert.equal(painted(blende,382,420).length,0,'adjacent worktop panel remains separate');
  assert.equal(result.filter(h=>h.componentId===blende.componentId).length,2);
});

test('105803 ASC dishwasher paints basket and GS while furniture front paints the complete face',()=>{
  const parts=['dishwasher','furniture-front'].map(partKey=>({partKey,sourceComponentKey:'dishwasher-base'}));
  const prepared=prepareKitchenPlanGeometry(AB_105803_HOTSPOTS,'ab-105803');
  // Exercise both source coordinates and the shifted/scaled display after cropping.
  for(const crop of [{left:0,top:0,width:100,height:100},{left:10,top:5,width:75,height:90}]) {
    const display=prepared.map(h=>({...h,left:(h.left-crop.left)/crop.width*100,top:(h.top-crop.top)/crop.height*100,width:h.width/crop.width*100,height:h.height/crop.height*100,clipPath:'polygon('+h.points.map(([x,y])=>((x-h.left)/h.width*100)+'% '+((y-h.top)/h.height*100)+'%').join(', ')+')'}));
    const result=buildServiceClaimPartHotspots(display,parts,'ab-105803');
    const selected=(partKey,x,y)=>result.filter(h=>h.claimPartKey===partKey&&maskContains(h,[(x/842*100-crop.left)/crop.width*100,(y/595*100-crop.top)/crop.height*100]));
    assert.equal(result.filter(h=>h.claimPartKey==='dishwasher').length,2);
    assert.equal(result.filter(h=>h.claimPartKey==='furniture-front').length,1);
    for(const [x,y] of [[330,420],[335,470]]) {
      assert.equal(selected('dishwasher',x,y).length,1);
      assert.equal(selected('furniture-front',x,y).length,1);
    }
    for(const [x,y] of [[330,370],[300,490],[350,505],[300,395],[295,440],[370,444]]) {
      assert.equal(selected('dishwasher',x,y).length,0);
      assert.equal(selected('furniture-front',x,y).length,1);
    }
    for(const x of [387,394]) {
      assert.equal(selected('dishwasher',x,420).length,0);
      assert.equal(selected('furniture-front',x,420).length,0);
    }
  }
});
