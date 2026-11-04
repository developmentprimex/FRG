import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {AB_111535_HOTSPOTS, AB_111535_LIGHT_DETAILS} from '../lib/ab-111535-plan.js';
import {PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG} from '../lib/kitchen-plan-preview-data.js';
import {prepareKitchenPlanGeometry, getHotspotSourceBounds} from '../lib/kitchen-plan-geometry.js';
import {getLocalizedItemName} from '../components/kitchen-selection-utils.js';
import {buildServiceClaimPartHotspots, buildServiceClaimBlendeHotspots, isLShapedClaimKitchen} from '../lib/service-claim-kitchen-hotspots.js';
import {buildServiceClaimSelectableComponents} from '../lib/service-claim-kitchen-plan-selection.js';
import {loadKitchenPlanPreviewData} from '../lib/email/order-notifications.js';
import {cropPlanHotspot, getPlanDisplayCrop} from '../lib/kitchen-plan-preview.js';
import {buildServiceClaimComponentChoiceGroups, normalizeServiceClaimComponentChoiceSelection, resolveServiceClaimPlanDisplayComponentIds} from '../lib/service-claim-component-choices.js';

const slug='ab-111535';
const seed=readFileSync(new URL('../prisma/seed.js',import.meta.url),'utf8');
const block=seed.match(/const AB_111535_ITEMS = (\[[\s\S]*?\n\]);/)[1];
const items=vm.runInNewContext(block, {
  ItemType:{COMPONENT:'COMPONENT'}, DISHWASHER_CATALOG_NAME_EN:'Dishwasher', DISHWASHER_CATALOG_NAME_DE:'Geschirrspüler',
  articlePrice:()=> '0.00', articlePriceWithBlende:()=> '0.00', blendePrice:()=> '35.00',
  defaultWorktop:o=>({itemType:'COMPONENT',componentKey:'worktop',isLocked:true,price:'0.00',...o}),
  defaultAccessories:()=>[],defaultServices:()=>[],
});
const source=AB_111535_HOTSPOTS.map(h=>({...h,...getHotspotSourceBounds(h)}));

test('111535 folds the side panel into the worktop and keeps four zero-price defaults',()=>{
  assert.equal(items.length,9);
  assert.deepEqual(Array.from(items.filter(i=>i.isLocked).map(i=>i.sortOrder)),[10,20,30,60]);
  assert.ok(items.filter(i=>i.isLocked).every(i=>Number(i.price)===0 && i.catalogPriceSyncMode==='LOCKED_INCLUDED'));
  assert.deepEqual(Array.from(items.map(i=>i.catalogArticleNumber)),['SP80','PLS60','US90','A-EGSPV597210 + TGV60','U80','H9002','H8002','H6002','H8002']);
  assert.equal(items[4].name,'Lower Cabinet 80 cm');
  assert.equal(items[4].nameDe,'Unterschrank 80 cm');
  assert.equal(items[4].iconKey,'base_cabinet_plain');
  assert.ok(items.every(i=>i.catalogArticleNumber && i.useCatalogArticle !== false));
  assert.ok(!items.some(i=>/oven|extractor|refrigerator/.test(i.componentKey)));
  items.forEach(i=>assert.ok(getLocalizedItemName({...i,name:'Item'},(_k,f)=>f,'en',true).startsWith(`${i.sortOrder/10}. `)));
});

test('111535 keeps all selected surfaces inside the measured drawing after geometry preparation',()=>{
  assert.equal(PLAN_IMAGE_BY_SLUG[slug],'/plans/AB%20670%20111535.svg');
  assert.equal(PLAN_HOTSPOTS_BY_SLUG[slug],AB_111535_HOTSPOTS);
  const prepared=prepareKitchenPlanGeometry(AB_111535_HOTSPOTS,slug,items);
  assert.equal(prepared.length,source.length);
  prepared.forEach((h,n)=>assert.deepEqual(h.points,source[n].points,'geometry must not extend the measured faces'));
  assert.ok(prepared.every(h=>h.points.every(([x,y])=>x>=3.36/842*100 && x<=755.28/842*100 && y>=145.72/595*100 && y<=507.28/595*100)));
  const leftFillers=prepared.filter(h=>h.points[0][0]===3.36/842*100 && ['wall-cabinet-1','base-module-1'].includes(h.componentKey));
  assert.equal(leftFillers.length,2);
  assert.equal(AB_111535_LIGHT_DETAILS.length,2);
  assert.ok(AB_111535_LIGHT_DETAILS.every(d=>d.persistWhenSelected && d.preserveWhiteBackground));
});

test('111535 order previews resolve the same vector asset and hotspots',async()=>{
  const preview=await loadKitchenPlanPreviewData();
  assert.equal(preview.imageViews[slug],PLAN_IMAGE_BY_SLUG[slug]);
  assert.deepEqual(preview.hotspotsBySlug[slug],AB_111535_HOTSPOTS);
});

test('111535 exposes its lower filler as UPK10 in service claims',()=>{
  const selection=buildServiceClaimSelectableComponents({kitchen:{items},kitchenConfig:{components:items},kitchenSlug:slug,confirmedItems:items});
  const filler=selection.selectableComponents.find(c=>c.componentId==='component-claim-blende-base-module-1');
  assert.ok(filler);
  assert.equal(filler.articleCode,'UPK10');
  assert.equal(filler.name,'Filler Panel up to 10 cm');
  assert.equal(filler.nameDe,'Passblende bis 10 cm');
});

test('111535 left worktop includes only its own leg while the right panel stays with the right worktop',()=>{
  const worktop=items[1];
  const parts=['worktop-left','worktop-right','worktop-end-panel','worktop-end-panel-left'].map(partKey=>({partKey,articleCode:partKey.includes('panel')?'WU16':'PLS60',sourceKitchenItemCode:worktop.code,sourceComponentKey:'worktop'}));
  const selection=buildServiceClaimSelectableComponents({kitchen:{items},kitchenConfig:{components:items},kitchenSlug:slug,claimParts:parts,confirmedItems:items});
  const groups=buildServiceClaimComponentChoiceGroups(selection.selectableComponents);
  const claims=buildServiceClaimPartHotspots(source,parts,slug);
  const paintedFor=partKey=>{
    const ids=resolveServiceClaimPlanDisplayComponentIds([`component-claim-${partKey}`],groups);
    return claims.filter(h=>ids.includes(h.componentId));
  };
  const left=paintedFor('worktop-left'),right=paintedFor('worktop-right');
  const ownsLeg=hotspots=>hotspots.some(h=>Math.abs(h.left-395.64/842*100)<1e-7&&h.height>20);
  assert.ok(ownsLeg(left),'left worktop must paint the leg beside the dishwasher');
  assert.ok(!ownsLeg(right),'right worktop must leave the left leg unselected');
  assert.equal(right.filter(h=>h.claimPartKey==='worktop-end-panel').length,2);
  assert.deepEqual(normalizeServiceClaimComponentChoiceSelection(['component-claim-worktop-end-panel-left'],groups),['component-claim-worktop-left']);
});

test('111535 built-in sink selection paints the measured worktop strip above SP80',()=>{
  const parts=[
    {partKey:'sink',articleCode:'526335',sourceComponentKey:'sink-faucet'},
    {partKey:'faucet',articleCode:'517720',sourceComponentKey:'sink-faucet'},
    {partKey:'sink-cabinet',articleCode:'SP80',sourceComponentKey:'sink-base'},
  ];
  const crop=getPlanDisplayCrop(source,slug);
  for(const displayCrop of [null,crop]) {
    const input=displayCrop ? source.map(h=>cropPlanHotspot(h,displayCrop)) : source;
    const claims=buildServiceClaimPartHotspots(input,parts,slug);
    const painted=claims.filter(h=>h.componentId==='component-claim-sink');
    assert.equal(painted.length,1,'selecting Built-in Sink must have one visible highlight');
    const expected={left:162/842*100,top:354.04/595*100,width:133.44/842*100,height:6.72/595*100};
    if(displayCrop) {
      expected.left=(expected.left-displayCrop.left)/displayCrop.width*100;
      expected.top=(expected.top-displayCrop.top)/displayCrop.height*100;
      expected.width=expected.width/displayCrop.width*100;
      expected.height=expected.height/displayCrop.height*100;
    }
    for(const key of ['left','top','width','height']) assert.ok(Math.abs(painted[0][key]-expected[key])<1e-7,`${key} follows the PDF worktop, including after cropping`);
    assert.equal(claims.filter(h=>h.componentId==='component-claim-faucet').length,1);
    assert.equal(claims.filter(h=>h.componentId==='component-claim-sink-cabinet').length,1);
  }
});

test('111535 claims expose sink, faucet, SP80 and both worktops without adding order defaults',()=>{
  const sink=items[0],worktop=items[1];
  const parts=[
    {partKey:'sink',articleCode:'526335',sourceKitchenItemCode:sink.code,sourceComponentKey:'sink-faucet'},
    {partKey:'faucet',articleCode:'517720',sourceKitchenItemCode:sink.code,sourceComponentKey:'sink-faucet'},
    {partKey:'sink-cabinet',articleCode:'SP80',sourceKitchenItemCode:sink.code,sourceComponentKey:'sink-base'},
    ...['worktop-left','worktop-right'].map(partKey=>({partKey,articleCode:'PLS60',sourceKitchenItemCode:worktop.code,sourceComponentKey:'worktop'})),
    {partKey:'worktop-end-panel',articleCode:'WU16',sourceKitchenItemCode:worktop.code,sourceComponentKey:'worktop'},
    {partKey:'worktop-end-panel-left',articleCode:'WU16',sourceKitchenItemCode:worktop.code,sourceComponentKey:'worktop'},
  ];
  const result=buildServiceClaimSelectableComponents({kitchen:{items},kitchenConfig:{components:items},kitchenSlug:slug,claimParts:parts,confirmedItems:items});
  for(const key of ['sink','faucet','sink-cabinet','worktop-left','worktop-right']) assert.ok(result.selectableComponents.some(c=>c.claimPartKey===key),key);
  assert.equal(result.selectableComponents.filter(c=>c.articleCode==='SP80').length,1);
  const claims=buildServiceClaimPartHotspots(source,parts,slug);
  assert.equal(claims.filter(h=>h.claimPartKey==='faucet').length,1);
  assert.equal(claims.filter(h=>h.claimPartKey==='sink-cabinet').length,1);
  assert.equal(claims.filter(h=>h.claimPartKey==='worktop-end-panel').length,2);
  assert.equal(claims.filter(h=>h.claimPartKey==='worktop-end-panel-left').length,1);
  assert.deepEqual(claims.filter(h=>['worktop-left','worktop-right'].includes(h.claimPartKey)).map(h=>h.claimPartKey),['worktop-left','worktop-right','worktop-right']);
  assert.equal(isLShapedClaimKitchen(slug),false);
  const blenden=['base-module-1','wall-cabinet-1'].map(sourceComponentKey=>({sourceComponentKey,componentId:`filler-${sourceComponentKey}`,claimPartKey:'blende',code:sourceComponentKey.startsWith('wall')?'HPK2002':'UPK10',sourceWidthMm:900}));
  const split=buildServiceClaimBlendeHotspots(source,blenden,items,slug);
  for(const filler of blenden) assert.equal(split.filter(h=>h.componentId===filler.componentId).length,1);
});
