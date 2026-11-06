import { stripProductDimensionsFromLabel } from "./product-label-format.js";

const normalize = value => stripProductDimensionsFromLabel(value).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
// Stable identities keep legacy DE/EN labels in one ranking and allow the
// browser to switch language without re-counting cases or changing saved data.
const definitions = [
  ["dishwasher", "Dishwasher", "Geschirrspüler", ["spülmaschine", "spuelmaschine", "geschirrspueler", "vollintegrierter geschirrspüler"]],
  ["hood", "Extractor hood", "Dunstabzugshaube", ["flachschirmhaube", "fh664621e extractor hood"]],
  ["chimney-hood", "Chimney extractor hood", "Kamin-Dunstabzugshaube", ["khf664611s chimney extractor hood"]],
  ["fridge", "Fridge / freezer", "Kühlschrank / Gefrierschrank", ["refrigerator", "fridge", "freezer", "kühlschrank", "kuehlschrank", "kühl-/gefrierkombination", "kühl-gefrierkombination", "standkühlschrank 178 cm", "standkuehlschrank 178 cm", "freestanding refrigerator 178 cm", "freestanding refrigerator 178cm"]],
  ["washing-machine", "Washing machine", "Waschmaschine", []],
  ["dryer", "Dryer", "Trockner", ["wäschetrockner"]],
  ["oven", "Oven", "Backofen", ["einbaubackofen"]],
  ["hob", "Cooktop", "Kochfeld", ["hob", "cerankochfeld", "induktionskochfeld"]],
  ["oven-hob", "Built-in oven and hob", "Einbaubackofen und Kochfeld", ["oven and hob", "oven set", "herd"]],
  ["microwave", "Microwave", "Mikrowelle", []],
  ["tap-light", "Tap light", "Armaturenleuchte", ["faucet light"]],
  ["lighting", "LED lighting set", "LED-Beleuchtungsset", ["lighting", "beleuchtung"]],
  ["front", "Furniture front", "Möbelfront", ["furniture-front", "dishwasher front", "geschirrspülerfront", "möbelfront geschirrspüler"]],
  ["drawer", "Drawer under oven", "Schublade unter Backofen", ["oven drawer", "oven-drawer"]],
  ["sink-cabinet", "Sink base cabinet", "Spülenunterschrank", ["sink cabinet", "sink lower cabinet", "spülenschrank", "spuelenunterschrank"]],
  ["wall-left", "Wall cabinet left", "Oberschrank links", ["oberschrank (links)"]],
  ["wall-mid-left", "Wall cabinet mid-left", "Oberschrank mittig links", ["oberschrank (mittig links)"]],
  ["wall-mid-right", "Wall cabinet mid-right", "Oberschrank mittig rechts", ["oberschrank (mittig rechts)"]],
  ["wall-right", "Wall cabinet right", "Oberschrank rechts", ["oberschrank (rechts)"]],
  ["wall-cabinet", "Wall cabinet", "Oberschrank", ["upper cabinet"]],
  ["hood-cabinet", "Upper cabinet for extractor hood", "Oberschrank für Flachschirmhaube", ["hood wall cabinet", "extractor hood upper cabinet", "upper cabinet with extractor hood 60 cm", "upper cabinet with extractor hood 60", "oberschrank für flachschirmhaube 60 cm", "oberschrank für flachschirmhaube 60"]],
  ["storage-cabinet", "Base storage cabinet", "Stauraum-Unterschrank", []],
  ["cabinet", "Cabinet", "Schrank", ["base cabinet", "unterschrank"]],
  ["worktop", "Worktop", "Arbeitsplatte", ["sink and worktop"]],
  ["worktop-left", "Worktop left", "Arbeitsplatte links", []],
  ["worktop-right", "Worktop right", "Arbeitsplatte rechts", []],
  ["end-panel", "Worktop end panel", "Unterschrank-Wange", ["worktop-end-panel"]],
  ["end-panel-left", "Worktop end panel left", "Unterschrank-Wange links", []],
  ["end-panel-right", "Worktop end panel right", "Unterschrank-Wange rechts", []],
  ["sink", "Sink", "Spüle", ["spuele"]],
  ["sink-waste", "Sink and waste system", "Spüle und Mülltrennsystem", []],
  ["faucet", "Faucet", "Armatur", ["tap", "wasserhahn"]],
  ["filter", "Extractor hood filter", "Filter für Dunstabzugshaube", ["filter", "hood filter"]],
  ["filler", "Filler panel", "Passblende", ["blende"]],
  ["cutlery", "Cutlery insert", "Besteckeinsatz", ["besteckeinsatz zb60sg", "cutlery insert 60", "cutlery insert 60 cm"]],
  ["waste", "Waste separation system", "Mülltrennsystem", ["muelltrennsystem"]],
];
const byKey = new Map(definitions.map(([key, name, nameDe]) => [key, { key: `item:${key}`, name, nameDe }]));
const byLabel = new Map(definitions.flatMap(([key, name, nameDe, aliases]) => [name, nameDe, ...aliases].map(label => [normalize(label), byKey.get(key)])));
const partKeys = { dishwasher: "dishwasher", oven: "oven", cooktop: "hob", "oven-set": "oven-hob", "oven-drawer": "drawer", "furniture-front": "front", "sink-cabinet": "sink-cabinet", sink: "sink", faucet: "faucet", filter: "filter", blende: "filler", "worktop-left": "worktop-left", "worktop-right": "worktop-right", "worktop-end-panel": "end-panel", "worktop-end-panel-left": "end-panel-left", "worktop-end-panel-right": "end-panel-right" };
const components = { "component-dishwasher-base": "dishwasher", "component-refrigerator": "fridge", "component-extractor-hood": "hood", "component-wm-base": "washing-machine", "component-worktop": "worktop", "component-sink-base": "sink-cabinet" };
const applianceTypes = { dishwasher: "dishwasher", fridge: "fridge", freezer: "fridge", washing_machine: "washing-machine", extractor_hood: "hood", oven: "oven", hob: "hob", microwave: "microwave", dryer: "dryer" };
const fallbacks = { cabinets: ["Cabinet", "Schrank"], electrical: ["Electrical appliance", "Elektrogerät"], other: ["Other component", "Sonstige Komponente"], unknown: ["Unspecified item", "Nicht zugeordneter Artikel"] };

export function getAscClaimItem(area, category = "unknown") {
  const component = String(area.componentId || "").toLowerCase();
  const part = String(area.claimPartKey || "").toLowerCase() || component.replace(/^component-claim-/, "");
  const explicit = byKey.get(partKeys[part]);
  if (explicit) return explicit;
  const label = byLabel.get(normalize(area.name)) || byLabel.get(normalize(area.nameDe));
  if (label) return label;
  const identity = byKey.get(components[component]) || (category === "electrical" ? byKey.get(applianceTypes[area.applianceType]) : null);
  if (identity) return identity;
  const name = stripProductDimensionsFromLabel(area.name).trim();
  const nameDe = stripProductDimensionsFromLabel(area.nameDe).trim();
  const article = String(area.articleCode || area.code || "").trim();
  const realArticle = article && !/^REFERENCE(?:-|$)/i.test(article) ? article : "";
  if (name && nameDe && normalize(name) !== normalize(nameDe)) return {
    key: `custom:${category}:${realArticle ? normalize(realArticle) : normalize(name)}`,
    name: realArticle ? `${name} · ${realArticle}` : name,
    nameDe: realArticle ? `${nameDe} · ${realArticle}` : nameDe,
  };
  const [fallbackEn, fallbackDe] = fallbacks[category] || fallbacks.unknown;
  if (realArticle) return { key: `item:custom:${category}:${normalize(realArticle)}`, name: `${fallbackEn} · ${realArticle}`, nameDe: `${fallbackDe} · ${realArticle}` };
  return { key: `item:unclassified:${category}`, name: fallbackEn, nameDe: fallbackDe };
}
