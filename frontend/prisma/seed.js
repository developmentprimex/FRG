const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const { PrismaClient, KitchenStatus, ItemType } = require("@prisma/client");
const { assertBurgerCindyArticleCode } = require("../lib/burger-cindy-article-codes.cjs");
const CLAIMS_CHATBOT_KNOWLEDGE = require("../lib/claims-chatbot-knowledge.json");
const SERVICE_CLAIM_TROUBLESHOOTING_DATA = require("../lib/service-claim-troubleshooting-data.json");
const CONTRACT_CLIENT_ADDRESS_DEFAULTS = require("../lib/contract-client-address-defaults.cjs");

const prisma = new PrismaClient();

const DEFAULT_KITCHEN_PROGRAMM_ID = "IP 2200";
const DISHWASHER_CATALOG_NAME_EN = "Fully integrated dishwasher incl. furniture front";
const DISHWASHER_CATALOG_NAME_DE = "Vollintegrierter Geschirrspüler inkl. Möbelfront";
const REFRIGERATOR_CATALOG_NAME_EN = "Freestanding Refrigerator 181 cm";
const REFRIGERATOR_CATALOG_NAME_DE = "Standkühlschrank 181 cm";
const HOOD_WALL_CABINET_CATALOG_NAME_EN = "Flat screen extractor hood + cabinet + filter 60 cm";
const HOOD_WALL_CABINET_CATALOG_NAME_DE = "Flachschirmhaube + Schrank + Filter 60 cm";
const DEFAULT_OVEN_HOB_CATALOG_CODE = "OVEN-B-600-HOB";
const DEFAULT_OVEN_HOB_CATALOG_NAME_EN = "Built-in oven and induction hob";
const DEFAULT_OVEN_HOB_CATALOG_NAME_DE = "Einbaubackofen und Kochfeld";
const DEFAULT_OVEN_HOB_CATALOG_ARTICLE = "EBX943600S + OL-KMI754000E";
const DEFAULT_OVEN_HOB_CATALOG_PRICE = "0.00";
const AB_105759_OVEN_HOB_CATALOG_ARTICLE = "A-EH923640E + 9EC744100C";
const DEFAULT_SINK_BASE_CATALOG_CODE = "SINKBASE-B-600";
const DEFAULT_SINK_BASE_CATALOG_NAME_EN = "Sink Lower Cabinet";
const DEFAULT_SINK_BASE_CATALOG_NAME_DE = "Spülenunterschrank";
const DEFAULT_SINK_BASE_CATALOG_INFO_TEXT = "Default sink base cabinet";
const DEFAULT_SINK_WORKTOP_CATALOG_CODE = "SINK-WORKTOP";
const DEFAULT_WORKTOP_CATALOG_NAME_EN = "Worktop";
const DEFAULT_WORKTOP_CATALOG_NAME_DE = "Arbeitsplatte";
const DEFAULT_WORKTOP_CATALOG_INFO_TEXT = "Worktop included with the default kitchen configuration";
const AB_105846_LAYOUT_ALIAS_CODES = ["105849", "105852", "105855", "105858", "105861"];
const AB_105762_LAYOUT_ALIAS_CODES = ["105766", "105770", "105774"];
const AB_105779_LAYOUT_ALIAS_CODES = ["105782", "105785", "105788"];
const L_SHAPED_CLAIM_KITCHEN_SLUGS = new Set([
  "ab-105803",
  ...AB_105779_LAYOUT_ALIAS_CODES.map((code) => `ab-${code}`),
  "ab-105779",
  "ab-105789",
  "ab-105790",
  "ab-105791",
  "ab-105794",
  "ab-105797",
  "ab-105800",
  "ab-104332",
  "ab-104296",
  "burger-103898",
  "ab-105762",
  "ab-105775",
  ...AB_105762_LAYOUT_ALIAS_CODES.map((code) => `ab-${code}`),
  "ab-105743",
  "ab-105748",
  "ab-105751", "ab-105754", "ab-105745",
  "ab-105758",
  "ab-104968", "ab-105734", "ab-105737", "ab-105740",
  "ab-105805", "ab-105809", "ab-105813", "ab-105817",
  "ab-105822", "ab-105825", "ab-105828", "ab-105831",
  "ab-105834", "ab-105837", "ab-105840", "ab-105843",
  "ab-105747", "ab-105750", "ab-105753", "ab-105756",
  "ab-105846",
  "ab-110140",
  "ab-110510",
  "ab-111539",
  "ab-109874",
  "ab-110401",
  ...AB_105846_LAYOUT_ALIAS_CODES.map((code) => `ab-${code}`),
]);
const TWO_PART_CLAIM_KITCHEN_SLUGS = new Set([
  "ab-105804",
  "ab-105793",
  "ab-105796",
  "ab-105799",
  "ab-105802",
  "ab-105777",
  "ab-105780",
  "ab-105783",
  "ab-105786",
  "ab-105833",
  "ab-105836",
  "ab-105839",
  "ab-105842",
  "ab-105845",
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
const WORKTOP_END_PANEL_CLAIM_KITCHEN_SLUGS = new Set([
  "ab-105804",
  "ab-105803",
  "ab-105793",
  "ab-105796",
  "ab-105799",
  "ab-105802",
  "ab-105792",
  "ab-105795",
  "ab-105798",
  "ab-105801",
  "ab-105791",
  "ab-105794",
  "ab-105797",
  "ab-105800",
  ...AB_105779_LAYOUT_ALIAS_CODES.map((code) => `ab-${code}`),
  "ab-105779",
  "ab-105789",
  "ab-105790",
  "ab-105743",
  "ab-105748",
  "ab-105751", "ab-105754", "ab-105745",
  "ab-105758",
  "ab-104968", "ab-105734", "ab-105737", "ab-105740",
  "ab-105805", "ab-105809", "ab-105813", "ab-105817",
  "ab-105806", "ab-105807", "ab-105808",
  "ab-105810", "ab-105818", "ab-105811", "ab-105812", "ab-105814",
  "ab-105815", "ab-105816", "ab-105819", "ab-105820",
  "ab-105821", "ab-105824", "ab-105823", "ab-105829", "ab-105832",
  "ab-105826", "ab-105827", "ab-105830", "ab-105833", "ab-105835",
  "ab-105836", "ab-105837", "ab-105838", "ab-105840", "ab-105841", "ab-105843", "ab-105844",
  "ab-105839", "ab-105842",
  "ab-105732", "ab-105735", "ab-105738", "ab-105741",
  "ab-105733", "ab-105736", "ab-105739", "ab-105742",
  "ab-105744", "ab-105746", "ab-105749", "ab-105752", "ab-105755",
  "ab-105757", "108134-modul-1",
]);

const ARTICLE_PRICES = {
  "517467": 89,
  "A-EGSPV587915 + TGV45": 450,
  "A-EGSPV597210 + TGV60": 579,
  "EWA34660W + TGV60 + WU16": 639,
  "FH 664 621 E": 349,
  "FH664621E + FWK124 + HD6002": 349,
  "FH664621E+FWK124+HFLH6072": 346,
  H3072: 124,
  H5072: 135,
  H6072: 146,
  H3002: 115,
  H4002: 130,
  H4502: 139,
  H5002: 135,
  H6002: 149,
  H8002: 200,
  H9002: 203,
  H10002: 209,
  "KALB KA220043_S3": 69,
  KHF664611S: 209,
  "KHF664611S + FWP18": 209,
  "OL-KGCN388140E": 579,
  SP50: 0,
  SP120: 0,
  US100: 353,
  US120: 403,
  US2A30: 298,
  US2A40: 305,
  US2A45: 316,
  US2A50: 324,
  US2A60: 347,
  US2A80: 466,
  US2A90: 471,
  US2A100: 514,
  US30: 175,
  US40: 183,
  US45: 198,
  US50: 198,
  US60: 219,
  US80: 333,
  US90: 339,
  ZB30SG: 19,
  ZB40SG: 19,
  ZB45SG: 22,
  ZB50SG: 22,
  ZB60SG: 25,
  ZB80SG: 31,
  ZB90SG: 31,
  ZB100SG: 36,
};

const BLENDE_PRICES = {
  HPEF4302: 150,
  HPK2002: 35,
  UPE65: 79,
  UPEF65: 68,
  UPK20: 25,
};

const SERVICE_PRICES = {
  MONTAGE: 349,
  PICKUP: 0,
};

const BUNDLE_PRICES = {
  "FH664621E + FWK124 + HD6002": 349,
  "FH664621E+FWK124+HFLH6072": 346,
  "KHF664611S + FWP18": 209,
};

const CATALOG_ARTICLES = [
  { articleNumber: "AP60", name: "Worktop", nameDe: "Arbeitsplatte", depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "UVADT20-01", name: "Lower pull-out cabinet", nameDe: "Unterschrank mit Auszug", widthMm: 200, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  // 670 104296: supplier-included furniture and the supplied ceramic cooker set.
  // The fridge and dishwasher appliances belong to the customer.
  { articleNumber: "GI88214-01", name: "Refrigerator housing cabinet", nameDe: "Geräteschrank für Kühlgerät", widthMm: 600, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "SP20214K", name: "Tall cabinet side filler panel", nameDe: "Seitliche Passblende für Hochschrank", widthMm: 91, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "DBK50", name: "Tall cabinet top closing panel", nameDe: "Obere Abschlussblende für Hochschrank", widthMm: 600, heightMm: 425, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "TV60", name: "Furniture front for dishwasher", nameDe: "Möbelfront für kundeneigenen Geschirrspüler", widthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "SPDT60", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", widthMm: 600, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "EHCX9330S-A", name: "Built-in oven and ceramic cooktop set", nameDe: "Einbauherd und Glaskeramikkochfeld", widthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "UHS60", name: "Lower cabinet for built-in oven", nameDe: "Herdunterschrank", widthMm: 600, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: DEFAULT_OVEN_HOB_CATALOG_ARTICLE, name: DEFAULT_OVEN_HOB_CATALOG_NAME_EN, nameDe: DEFAULT_OVEN_HOB_CATALOG_NAME_DE, widthMm: 600, price: DEFAULT_OVEN_HOB_CATALOG_PRICE, itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "PLR60", name: DEFAULT_WORKTOP_CATALOG_NAME_EN, nameDe: DEFAULT_WORKTOP_CATALOG_NAME_DE, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "SP60", name: DEFAULT_SINK_BASE_CATALOG_NAME_EN, nameDe: DEFAULT_SINK_BASE_CATALOG_NAME_DE, widthMm: 600, heightMm: 878, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "526335 + 517720", name: "Sink and faucet set", nameDe: "Spüle und Armatur", price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "A-EH923640E + 9EC744100C", name: "Built-in oven and ceramic cooktop", nameDe: "Einbauherd und Glaskeramikkochfeld", widthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, productInfoPdfPath: "/product-info/ovens/eh923640e/a-eh923640e-product-info.pdf", productInfoSummary: "Einbauherd A-EH923640E mit 62 l Garraum, Energieeffizienzklasse A und 9 Backofenfunktionen.", productInfoKeyFacts: ["Produkttyp: Einbauherd", "Artikelnummer: A-EH923640E", "Energieeffizienzklasse: A", "Energieverbrauch: 0,99 kWh konventionell / 0,77 kWh Heißluft/Umluft", "Garraumvolumen: 62 l", "Backofenfunktionen: 9", "Nischenmaße H x B x T: 600 x 560 x mindestens 560 mm", "Anschlusswert: 3,50 kW", "Spannung/Frequenz: 3N ~ 400 V / 50 Hz"], productInfoExtractedText: "Produktinformation für den architecto Einbauherd A-EH923640E. Energieeffizienzklasse A, 62 l Garraum und 9 Backofenfunktionen mit Umluft. Energieverbrauch 0,99 kWh im konventionellen Betrieb und 0,77 kWh mit Heißluft/Umluft. Nischenmaße H x B x T 600 x 560 x mindestens 560 mm. Anschlusswert 3,50 kW bei 3N ~ 400 V / 50 Hz.", isFixedPricePackage: true, isActive: true },
  { articleNumber: "A-EGSPV587915 + TGV45", name: "Fully Integrated Dishwasher incl. Furniture Front", nameDe: "Vollintegrierter Geschirrspüler inkl. Möbelfront", widthMm: 450, price: "498.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "A-EGSPV597210 + TGV60", name: "Fully integrated dishwasher incl. furniture front", nameDe: "Vollintegrierter Geschirrspüler inkl. Möbelfront", price: "579.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "EWA34660W + TGV60 + WU16", name: "Washing machine + front + side panel", nameDe: "Waschmaschine + Front + Wange", price: "639.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "FH664621E + FWK124 + HD6002", name: "Flat screen extractor hood + cabinet + filter", nameDe: "Flachschirmhaube + Schrank + Filter", price: "349.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "FH664621E+FWK124+HFLH6072", name: "Flat screen extractor hood + cabinet + filter 60 cm", nameDe: "Flachschirmhaube + Schrank + Filter 60 cm", widthMm: 600, price: "346.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "H3072", name: "Upper Cabinet 30 cm", nameDe: "Oberschrank 30 cm", widthMm: 300, heightMm: 720, price: "124.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H5072", name: "Upper Cabinet 50 cm", nameDe: "Oberschrank 50 cm", widthMm: 500, heightMm: 720, price: "135.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H6072", name: "Upper Cabinet 60 cm", nameDe: "Oberschrank 60 cm", widthMm: 600, heightMm: 720, price: "146.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H10002", name: "Upper Cabinet 100 cm", nameDe: "Oberschrank 100 cm", widthMm: 1000, heightMm: 720, price: "209.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H3002", name: "Upper Cabinet 30 cm", nameDe: "Oberschrank 30 cm", widthMm: 300, heightMm: 720, price: "115.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H4002", name: "Upper Cabinet 40 cm", nameDe: "Oberschrank 40 cm", widthMm: 400, heightMm: 720, price: "130.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H4502", name: "Upper Cabinet 45 cm", nameDe: "Oberschrank 45 cm", widthMm: 450, heightMm: 720, price: "139.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H5002", name: "Upper Cabinet 50 cm", nameDe: "Oberschrank 50 cm", widthMm: 500, heightMm: 720, price: "135.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H6002", name: "Upper Cabinet 60 cm", nameDe: "Oberschrank 60 cm", widthMm: 600, heightMm: 720, price: "149.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H8002", name: "Upper Cabinet 80 cm", nameDe: "Oberschrank 80 cm", widthMm: 800, heightMm: 720, price: "200.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H9002", name: "Upper Cabinet 90 cm", nameDe: "Oberschrank 90 cm", widthMm: 900, heightMm: 720, price: "203.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "KHF664611S", name: "Angled extractor hood", nameDe: "Schrägesse", price: "209.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "KHF664611S + FWP18", name: "Angled extractor hood + filter", nameDe: "Schrägesse + Filter", price: "209.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "OL-KGCN388140E", name: "Freestanding Refrigerator 181 cm", nameDe: "Standkühlschrank 181 cm", heightMm: 1810, depthMm: null, price: "579.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "SP50", name: "Sink Lower Cabinet 50 cm", nameDe: "Spülenunterschrank 50 cm", widthMm: 500, heightMm: 878, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "SP120", name: "Sink Base Cabinet 120 cm", nameDe: "Spülenschrank 120 cm", widthMm: 1200, heightMm: 878, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "SPB80", name: "Sink Base Cabinet 80 cm", nameDe: "Spülenschrank 80 cm", widthMm: 800, heightMm: 878, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "SPB90", name: "Sink Base Cabinet 90 cm", nameDe: "Spülenschrank 90 cm", widthMm: 900, heightMm: 878, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "U30", name: "Lower Cabinet 30 cm", nameDe: "Unterschrank 30 cm", widthMm: 300, heightMm: 878, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "U40", name: "Lower Cabinet 40 cm", nameDe: "Unterschrank 40 cm", widthMm: 400, heightMm: 878, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "UE115", name: "Lower Cabinet 60 cm", nameDe: "Unterschrank 60 cm", widthMm: 1150, heightMm: 878, depthMm: 600, price: "0.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US100", name: "Lower Cabinet with drawer 100 cm", nameDe: "Unterschrank mit Schublade 100 cm", widthMm: 1000, price: "353.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US120", name: "Lower Cabinet with drawer 120 cm", nameDe: "Unterschrank mit Schublade 120 cm", widthMm: 1200, price: "403.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A100", name: "Lower Cabinet with 3 Drawers 100 cm", nameDe: "Unterschrank mit 3 Schubladen 100 cm", widthMm: 1000, price: "514.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A30", name: "Lower Cabinet with 3 Drawers 30 cm", nameDe: "Unterschrank mit 3 Schubladen 30 cm", widthMm: 300, price: "298.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A40", name: "Lower Cabinet with 3 Drawers 40 cm", nameDe: "Unterschrank mit 3 Schubladen 40 cm", widthMm: 400, price: "305.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A45", name: "Lower Cabinet with 3 Drawers 45 cm", nameDe: "Unterschrank mit 3 Schubladen 45 cm", widthMm: 450, price: "316.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A50", name: "Lower Cabinet with 3 Drawers 50 cm", nameDe: "Unterschrank mit 3 Schubladen 50 cm", widthMm: 500, price: "324.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A60", name: "Lower Cabinet with 3 Drawers 60 cm", nameDe: "Unterschrank mit 3 Schubladen 60 cm", widthMm: 600, price: "347.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A80", name: "Lower Cabinet with 3 Drawers 80 cm", nameDe: "Unterschrank mit 3 Schubladen 80 cm", widthMm: 800, price: "466.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A90", name: "Lower Cabinet with 3 Drawers 90 cm", nameDe: "Unterschrank mit 3 Schubladen 90 cm", widthMm: 900, price: "471.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US30", name: "Lower Cabinet with drawer 30 cm", nameDe: "Unterschrank mit Schublade 30 cm", widthMm: 300, price: "175.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US40", name: "Lower Cabinet with drawer 40 cm", nameDe: "Unterschrank mit Schublade 40 cm", widthMm: 400, price: "183.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US45", name: "Lower Cabinet with drawer 45 cm", nameDe: "Unterschrank mit Schublade 45 cm", widthMm: 450, price: "198.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US50", name: "Lower Cabinet with drawer 50 cm", nameDe: "Unterschrank mit Schublade 50 cm", widthMm: 500, price: "198.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US60", name: "Lower Cabinet with drawer 60 cm", nameDe: "Unterschrank mit Schublade 60 cm", widthMm: 600, price: "219.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US80", name: "Lower Cabinet with drawer 80 cm", nameDe: "Unterschrank mit Schublade 80 cm", widthMm: 800, price: "333.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US90", name: "Lower Cabinet with drawer 90 cm", nameDe: "Unterschrank mit Schublade 90 cm", widthMm: 900, price: "339.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "517467", name: "Waste separation system Blanco Botton", nameDe: "Mülltrennsystem Blanco Botton", price: "89.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "KALB KA220043_S3", name: "LED lighting set", nameDe: "LED-Beleuchtungsset", price: "69.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB100SG", name: "Cutlery insert 100 cm", nameDe: "Besteckeinsatz 100 cm", price: "36.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB30SG", name: "Cutlery insert 30 cm", nameDe: "Besteckeinsatz 30 cm", price: "19.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB40SG", name: "Cutlery insert 40 cm", nameDe: "Besteckeinsatz 40 cm", price: "19.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB45SG", name: "Cutlery insert 45 cm", nameDe: "Besteckeinsatz 45 cm", price: "22.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB50SG", name: "Cutlery insert 50 cm", nameDe: "Besteckeinsatz 50 cm", price: "22.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB60SG", name: "Cutlery insert 60 cm", nameDe: "Besteckeinsatz 60 cm", price: "25.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB80SG", name: "Cutlery insert 80 cm", nameDe: "Besteckeinsatz 80 cm", price: "31.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB90SG", name: "Cutlery insert 90 cm", nameDe: "Besteckeinsatz 90 cm", price: "31.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
];

// Canonical catalog values exported from the live Fragmento server. Seeded
// kitchen items must reference these records instead of carrying an independent
// article definition.
const LIVE_CATALOG_ARTICLE_OVERRIDES = {
  "A-EGSPV587915 + TGV45": { price: "450.00" },
  "A-EGSPV597210 + TGV60": { name: "Fully Integrated Dishwasher incl. Furniture Front", widthMm: 600 },
  "EWA34660W + TGV60 + WU16": { name: "Washing machine + Front + Side Panel" },
  "FH664621E + FWK124 + HD6002": {
    name: "Flat screen Extractor hood + Cabinet + Filter 60 cm",
    nameDe: "Flachschirmhaube + Schrank + Filter 60 cm",
    widthMm: 600,
  },
  H10002: { heightMm: 723 },
  H3002: { heightMm: 723 },
  H4002: { heightMm: 723 },
  H4502: { heightMm: 723 },
  H5002: { heightMm: 723 },
  H6002: { heightMm: 723 },
  H8002: { heightMm: 723 },
  H9002: { heightMm: 723 },
  "KHF664611S + FWP18": { name: "Angled Extractor Hood + filter" },
  "OL-KGCN388140E": { depthMm: null },
  US30: { name: "Lower Cabinet with Drawer 30 cm" },
  US40: { name: "Lower Cabinet with Drawer 40 cm" },
  US45: { name: "Lower Cabinet with Drawer 45 cm" },
  US50: { name: "Lower Cabinet with Drawer 50 cm" },
  US60: { name: "Lower Cabinet with Drawer 60 cm" },
  US80: { name: "Lower Cabinet with Drawer 80 cm" },
  US90: { name: "Lower Cabinet with Drawer 90 cm" },
  US100: { name: "Lower Cabinet with Drawer 100 cm" },
  US120: { name: "Lower Cabinet with Drawer 120 cm" },
  ZB30SG: { widthMm: 300 },
  ZB40SG: { widthMm: 400 },
  ZB45SG: { widthMm: 450 },
  ZB50SG: { widthMm: 500 },
  ZB60SG: { widthMm: 600 },
  ZB80SG: { widthMm: 800 },
  ZB90SG: { widthMm: 900 },
  ZB100SG: { widthMm: 1000 },
};

for (const article of CATALOG_ARTICLES) {
  Object.assign(article, LIVE_CATALOG_ARTICLE_OVERRIDES[article.articleNumber] || {});
}

const CATALOG_BLENDEN = [
  { code: "UP10K", name: "Lower cabinet end filler", nameDe: "Passblende Unterschrank", price: "0.00", isActive: true },
  { code: "UPEV", name: "Corner filler panel", nameDe: "Eckpassblende Unterschrank", price: "0.00", isActive: true },
  { code: "HP2072K", name: "Upper cabinet end filler", nameDe: "Passblende Oberschrank", price: "35.00", isActive: true },
  { code: "UPE65", name: "Corner filler panel for Lower Cabinet", nameDe: "Eckpassblende Unterschrank", price: "79.00", isActive: true },
  { code: "HPEF4302", name: "Corner filler panel for Upper Cabinet", nameDe: "Eckpassblende Hängeschrank", price: "150.00", isActive: true },
  { code: "HPK2002", name: "Filler Panel up to 20 cm", nameDe: "Passblende bis 20 cm", price: "35.00", isActive: true },
  { code: "UPEF65", name: "Corner filler panel for Lower Cabinet", nameDe: "Eckpassblende Unterschrank", price: "68.00", isActive: true },
  { code: "UPK20", name: "Filler Panel up to 20 cm", nameDe: "Passblende bis 20 cm", price: "25.00", isActive: true },
];

const CATALOG_SERVICES = [
  { code: "MONTAGE", name: "Delivery, Carry-in, Assembly and Installation", nameDe: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", isActive: true },
  { code: "PICKUP", name: "Pickup at logistics location", nameDe: "Abholung an Logistikstandort", price: "0.00", isActive: true },
];

function formatSeedPrice(value) {
  return Number(value || 0).toFixed(2);
}

function articlePrice(articleNumber) {
  return formatSeedPrice(ARTICLE_PRICES[articleNumber]);
}

function blendePrice(code, quantity = 1) {
  return formatSeedPrice(BLENDE_PRICES[code] * quantity);
}

function articlePriceWithBlende(articleNumber, blendeCode, quantity = 1) {
  const article = Number(ARTICLE_PRICES[articleNumber]);
  const blende = Number(BLENDE_PRICES[blendeCode] || 0) * Number(quantity || 0);
  return formatSeedPrice(article + blende);
}

function servicePrice(code) {
  return formatSeedPrice(SERVICE_PRICES[code]);
}

function bundlePrice(bundleCode) {
  return formatSeedPrice(BUNDLE_PRICES[bundleCode]);
}

function defaultAccessories() {
  return [
    { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system Blanco Botton", nameDe: "Mülltrennsystem Blanco Botton", price: articlePrice("517467"), iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
    { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: articlePrice("ZB60SG"), iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
    { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: articlePrice("KALB KA220043_S3"), iconKey: "lighting_set", sortOrder: 220, articleNumber: "KALB KA220043_S3" },
  ];
}

function defaultServices() {
  return [
    { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Delivery, Carry-in, Assembly and Installation", nameDe: "Lieferung, Vertragen, Montage und Anschluss", price: servicePrice("MONTAGE"), iconKey: "delivery_assembly", sortOrder: 300 },
    { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Pickup at logistics location", nameDe: "Abholung an Logistikstandort", price: servicePrice("PICKUP"), iconKey: "pickup", sortOrder: 310 },
  ];
}

function defaultOvenHob(overrides = {}) {
  return {
    itemType: ItemType.COMPONENT,
    code: DEFAULT_OVEN_HOB_CATALOG_CODE,
    name: DEFAULT_OVEN_HOB_CATALOG_NAME_EN,
    nameDe: DEFAULT_OVEN_HOB_CATALOG_NAME_DE,
    articleNumber: DEFAULT_OVEN_HOB_CATALOG_ARTICLE,
    price: DEFAULT_OVEN_HOB_CATALOG_PRICE,
    iconKey: "oven_base",
    colorKey: "springgreen",
    componentKey: "oven-module",
    sortOrder: 30,
    infoText: "Built-in oven + induction hob",
    isLocked: true,
    ...overrides,
  };
}

function defaultWorktop(overrides = {}) {
  return {
    itemType: ItemType.COMPONENT,
    code: "TOP-AB105806",
    name: DEFAULT_WORKTOP_CATALOG_NAME_EN,
    price: "0.00",
    iconKey: "worktop",
    colorKey: "springgreen",
    componentKey: "worktop",
    sortOrder: 20,
    isLocked: true,
    infoText: DEFAULT_WORKTOP_CATALOG_INFO_TEXT,
    ...overrides,
  };
}

function defaultSinkBase(overrides = {}) {
  return {
    itemType: ItemType.COMPONENT,
    code: DEFAULT_SINK_BASE_CATALOG_CODE,
    name: DEFAULT_SINK_BASE_CATALOG_NAME_EN,
    nameDe: DEFAULT_SINK_BASE_CATALOG_NAME_DE,
    price: "0.00",
    iconKey: "sink_base",
    colorKey: "springgreen",
    componentKey: "sink-base",
    sortOrder: 30,
    isLocked: true,
    infoText: DEFAULT_SINK_BASE_CATALOG_INFO_TEXT,
    ...overrides,
  };
}

// A sink at the outside end of a run needs its filler panel to remain an
// independent customer choice. It must never be included with the fixed sink.
function sinkEndBlende(kitchenCode, overrides = {}) {
  return {
    itemType: ItemType.COMPONENT,
    code: `BLENDE-AB${kitchenCode}-SINK-END`,
    articleNumber: "UPK20",
    name: "Filler Panel up to 20 cm",
    nameDe: "Passblende bis 20 cm",
    price: blendePrice("UPK20", 1),
    iconKey: "blende",
    colorKey: "#f0a500",
    componentKey: "sink-end-blende",
    sortOrder: 35,
    infoText: "Optional UPK20 filler panel for the fixed end sink",
    ...overrides,
  };
}

function withSinkEndBlende(items, kitchenCode, blendeOverrides = {}) {
  return [
    ...items.map((item) => (
      item.componentKey === "sink-base" && item.isLocked
        ? {
          ...item,
          infoText: DEFAULT_SINK_BASE_CATALOG_INFO_TEXT,
          blendeCode: null,
          blendeLabel: null,
          blendePrice: null,
        }
        : item
    )),
    sinkEndBlende(kitchenCode, blendeOverrides),
  ];
}

function defaultSinkWorktop(overrides = {}) {
  return {
    itemType: ItemType.COMPONENT,
    code: DEFAULT_SINK_WORKTOP_CATALOG_CODE,
    name: DEFAULT_WORKTOP_CATALOG_NAME_EN,
    nameDe: DEFAULT_WORKTOP_CATALOG_NAME_DE,
    price: "0.00",
    iconKey: "sink_faucet",
    colorKey: "black",
    componentKey: "sink-faucet",
    sortOrder: 140,
    isLocked: true,
    infoText: DEFAULT_WORKTOP_CATALOG_INFO_TEXT,
    ...overrides,
  };
}

function normalizeBlendeCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (["UP10K", "UPEV", "HP2072K"].includes(code)) return code;
  if (code.startsWith("HPEF4302")) return "HPEF4302";
  if (code.startsWith("UPK20")) return "UPK20";
  if (code.startsWith("UPEF65")) return "UPEF65";
  if (code.startsWith("UPE65")) return "UPE65";
  if (code.startsWith("HPK2002")) return "HPK2002";
  return "";
}

function getBlendeQuantity(item) {
  const code = String(item?.blendeCode || "").trim().toUpperCase();
  const label = String(item?.blendeLabel || "").trim().toUpperCase();
  const price = Number(item?.blendePrice || 0);
  const normalizedCode = normalizeBlendeCode(code);
  const unitPrice = BLENDE_PRICES[normalizedCode];

  if (!normalizedCode || !unitPrice) return 0;
  if (/\bX2\b/.test(code) || /^2X\b/.test(label) || /\bX\s*2\b/.test(label)) return 2;
  if (price === unitPrice * 2) return 2;
  if (price === unitPrice) return 1;
  return 0;
}

function applyCentralizedArticlePricing(item) {
  const articleNumber = String(item?.articleNumber || "").trim();
  const currentPrice = item?.price == null ? null : Number(item.price);
  const hasArticlePrice = Object.prototype.hasOwnProperty.call(ARTICLE_PRICES, articleNumber);
  const normalizedBlendeCode = normalizeBlendeCode(item?.blendeCode);
  const blendeQty = getBlendeQuantity(item);
  const data = { ...item };

  if (normalizedBlendeCode && blendeQty > 0) {
    data.blendePrice = blendePrice(normalizedBlendeCode, blendeQty);
  }

  if (!hasArticlePrice || currentPrice == null) {
    return data;
  }

  const expectedPrice = normalizedBlendeCode && blendeQty > 0
    ? Number(articlePriceWithBlende(articleNumber, normalizedBlendeCode, blendeQty))
    : Number(articlePrice(articleNumber));

  if (currentPrice === expectedPrice) {
    data.price = normalizedBlendeCode && blendeQty > 0
      ? articlePriceWithBlende(articleNumber, normalizedBlendeCode, blendeQty)
      : articlePrice(articleNumber);
  }

  return data;
}

const PRODUCT_INFO_FILES = {
  dishwasher: "/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info.pdf",
  oven: "/product-info/ovens/ebx943600s/ebx943600s-product-info.pdf",
  cooktop: "/product-info/hobs/ol-kmi754000e/ol-kmi754000e-product-info.pdf",
  hood: "/product-info/extractor-hoods/fh664621s/fh664621s-product-info.pdf",
  hoodChimney: "/product-info/extractor-hoods/khf664611s/khf664611s-product-info.pdf",
  fridge: "/product-info/refrigerators/kgcn388140e/kgcn388140e-product-info.pdf",
  ledLightingLabel: "/product-info/lighting/led-set/led-set-elabel.pdf",
};

const PRODUCT_IMAGE_FILES = {
  dishwasher: "/product-images/email/a-egspv597210-dishwasher.jpg",
  oven: "/product-images/email/ebx943600s-oven.jpg",
  hob: "/product-images/email/ol-kmi754000e-hob.jpg",
  hood: "/product-images/email/fh664621s-flat-hood.jpg",
  hoodChimney: "/product-images/email/khf664611s-chimney-hood.jpg",
  fridge: "/product-images/email/kgc15495s-fridge.jpg",
  washingMachine: "/product-images/email/ewa34660w-washing-machine.jpg",
};

const PRODUCT_INFO_BY_CODE = {
  "DISH-600-STD": {
    productImagePath: PRODUCT_IMAGE_FILES.dishwasher,
    productInfoPdfPath: PRODUCT_INFO_FILES.dishwasher,
    productInfoSummary: "Vollintegrierter 60-cm-Geschirrspüler für den Einbau hinter einer Möbelfront. Die aktuelle Produktinformation nennt 12 Maßgedecke, Energieklasse D und 5 Programme.",
    productInfoKeyFacts: [
      "Energieklasse: D",
      "Energieverbrauch: 82 kWh / 100 Zyklen.",
      "Wasserverbrauch: 11.0 l/Zyklus.",
      "Geräusch: 49 dB",
      "Breite: 60 cm",
      "Gerätemaße H x B x T (mm): 815 x 598 x 550.",
      "Einbaumaße H x B x T (mm): 820 - 870 x 600 x 580.",
      "Tiefe bei geöffneter Tür (mm): 1150.",
      "Programme: 5",
      "Kapazität: 12 Maßgedecke",
    ],
    productInfoExtractedText: [
      "Produktname: Architecto / AMICA A-EGSPV597210 Geschirrspüler, 60 cm.",
      "Wichtige Punkte:",
      "- Produkttyp: vollintegrierter Einbau-Geschirrspüler.",
      "- 12 Maßgedecke, 5 Programme, 4 Temperaturen.",
      "- Energieklasse D, 82 kWh / 100 Zyklen, 11.0 l / Zyklus.",
      "- Energieverbrauch: 82 kWh / 100 Zyklen.",
      "- Wasserverbrauch: 11.0 l/Zyklus.",
      "- Geräusch: 49 dB(A), Klasse C.",
      "- Gerätemaße H x B x T (mm): 815 x 598 x 550.",
      "- Einbaumaße H x B x T (mm): 820 - 870 x 600 x 580.",
      "- Tiefe bei geöffneter Tür (mm): 1150.",
      "- Ausstattung: Aquastop, Extra Dry, OpenDry, halbe Beladung, Startzeitvorwahl 3/6/9 h.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Einbaumaß, Frontintegration und Anschlussposition prüfen.",
    ].join("\n"),
  },
  "REF-545-1800-700": {
    productImagePath: PRODUCT_IMAGE_FILES.fridge,
    productInfoPdfPath: PRODUCT_INFO_FILES.fridge,
    productInfoSummary: "Kühl-/Gefrierkombination KGCN 388 140 E, 180 cm, mit NoFrost, Inverter-Kompressor und 250 l Nutzinhalt. Die Produktinformation nennt Energieeffizienzklasse D, 174,1 kWh/Jahr und 39 dB.",
    productInfoKeyFacts: [
      "Modell: KGCN 388 140 E",
      "Produkttyp: Kühl-/Gefrierkombination, 180 cm",
      "Energieeffizienzklasse: D",
      "Energieverbrauch: 174,1 kWh/Jahr",
      "Luftschallemission: 39 dB(A), Klasse C",
      "Nutzinhalt gesamt: 250 l",
      "Nutzinhalt Kühlen / Gefrieren: 180 / 70 l",
      "Gerätemaße H x B x T: 1810 x 540 x 576 mm",
      "NoFrost: Kühl- und Gefrierteil",
      "Gefrierleistung: 3,2 kg/24 h",
      "Temperaturanstiegszeit: 9 h",
      "Türanschlag: rechts, wechselbar",
    ],
    productInfoExtractedText: [
      "Produktname: AMICA KGCN 388 140 E Kühl-/Gefrierkombination, 180 cm.",
      "Wichtige Punkte:",
      "- NoFrost-Standgerät mit elektronischer Steuerung und Inverter-Kompressor.",
      "- Energieeffizienzklasse D, 174,1 kWh/Jahr und 39 dB(A), Klasse C.",
      "- Nutzinhalt 250 l: Kühlen 180 l, Gefrieren 70 l.",
      "- Gerätemaße H x B x T: 1810 x 540 x 576 mm.",
      "- Ausstattung: FreshZone, VitControl Plus, LED-Licht, Tür-Offen-Alarm.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Gerätemaß und wechselbaren Türanschlag im Küchenplan prüfen.",
    ].join("\n"),
  },
  "HOOD-600-FLAT": {
    productImagePath: PRODUCT_IMAGE_FILES.hood,
    productInfoPdfPath: PRODUCT_INFO_FILES.hood,
    productInfoSummary: "Flachschirmhaube FH 664 621 E, 60 cm, für Abluft- oder Umluftbetrieb. Die Produktinformation nennt Energieeffizienzklasse A, 170–415 m³/h Luftleistung und 49–70 dB.",
    productInfoKeyFacts: [
      "Modell: FH 664 621 E",
      "Produkttyp: Flachschirmhaube / Teleskophaube",
      "Energieeffizienzklasse: A",
      "Energieverbrauch: 24,8 kWh/Jahr",
      "Geräusch: 49–70 dB",
      "Breite: 60 cm",
      "Luftleistung: 170–415 m³/h",
      "Leistungsstufen: 3",
      "Betriebsart: Abluft / Umluft",
      "Gerätemaße H x B x T: 173 x 599 x 303 mm",
      "Montageabstand über Kochfeld / Gaskochfeld: 450 / 650 mm",
      "Kohlefilter für Umluftbetrieb: FWK 124, 2 Stück",
    ],
    productInfoExtractedText: [
      "Produktname: AMICA FH 664 621 E Flachschirmhaube, 60 cm.",
      "Wichtige Punkte:",
      "- Teleskophaube / Flachschirmhaube in Edelstahl mit Kippschalter.",
      "- Energieeffizienzklasse A, Jahresverbrauch 24,8 kWh.",
      "- 3 Leistungsstufen, Luftleistung 170–415 m³/h, Geräusch 49–70 dB.",
      "- 2 LED-Leuchten und 2 spülmaschinengeeignete Aluminium-Fettfilter.",
      "- Gerätemaße H x B x T: 173 x 599 x 303 mm.",
      "- Montageabstand über Kochfeld / Gaskochfeld: 450 / 650 mm.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Einbauposition und Luftführung prüfen.",
    ].join("\n"),
  },
  "WM-B-EWA34660W": {
    productImagePath: PRODUCT_IMAGE_FILES.washingMachine,
    productInfoPdfPath: "/product-info/washing-machines/ewa34660w/ewa34660w-product-info.pdf",
    productInfoSummary: "Waschmaschine EWA34660W für die Küchenkonfiguration. Die Produktinformation nennt Energieeffizienzklasse A, 47 kWh / 100 Zyklen, 48 l/Zyklus, 8 kg Fassungsvermögen, 1400 U/min, 72 dB(A) und Gerätemaße 830 x 600 x 540 mm.",
    productInfoKeyFacts: [
      "Produkttyp: Waschmaschine.",
      "Modell: EWA34660W.",
      "Energieeffizienzklasse: A.",
      "Energieverbrauch: 47 kWh / 100 Zyklen.",
      "Wasserverbrauch: 48 l/Zyklus.",
      "Fassungsvermögen: 8 kg.",
      "Schleuderdrehzahl: 1400 U/min.",
      "Geräusch: 72 dB(A)",
      "Gerätemaße H x B x T (mm): 830 x 600 x 540.",
      "Einbaumaße H x B x T (mm): 825 x 600 x 580.",
      "Wasser- und Stromanschluss nach Produktinformation beachten.",
    ],
    productInfoExtractedText: [
      "Produktname: Waschmaschine EWA34660W.",
      "Wichtige Punkte:",
      "- Produkttyp: Waschmaschine.",
      "- Modell: EWA34660W.",
      "- Energieeffizienzklasse: A.",
      "- Energieverbrauch: 47 kWh / 100 Zyklen.",
      "- Wasserverbrauch: 48 l/Zyklus.",
      "- Fassungsvermögen: 8 kg.",
      "- Schleuderdrehzahl: 1400 U/min.",
      "- Geräusch: 72 dB(A)",
      "- Gerätemaße H x B x T (mm): 830 x 600 x 540.",
      "- Einbaumaße H x B x T (mm): 825 x 600 x 580.",
      "- Wasser- und Stromanschluss nach Produktinformation beachten.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Wasseranschluss, Ablauf und Stellmaß prüfen.",
    ].join("\n"),
  },
  "DISH-B-600-STD": null,
  "OVEN-B-600-HOB": null,
  "REF-B-545-1800-700": null,
  "HOOD-B-FH664621E": null,
  "OVEN-C-600-HOB": null,
  "REF-C-545-1800-700": null,
  "HOOD-C-FH664621E": null,
  "WM-C-EWA34660W": null,
  "DISH-C-600-STD": null,
};

PRODUCT_INFO_BY_CODE["DISH-B-600-STD"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-C-600-STD"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-LS-600-STD"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105806-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105807-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105815-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105819-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105732-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105733-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105841-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105744-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105821-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105822-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105827-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105836-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105842-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB109874-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB109873-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105834-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105837-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105840-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105843-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105831-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB104968-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105746-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105757-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105759-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105825-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105828-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["REF-AB105828-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB109874-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["HOOD-AB105828-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"] = PRODUCT_INFO_BY_CODE["REF-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-C-545-1800-700"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105806-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105807-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105815-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105819-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105733-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105841-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105744-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105821-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105845-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105831-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB104968-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105746-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105757-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105759-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105825-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105822-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105828-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"] = {
  ...PRODUCT_INFO_BY_CODE["HOOD-600-FLAT"],
  productInfoKeyFacts: [
    ...PRODUCT_INFO_BY_CODE["HOOD-600-FLAT"].productInfoKeyFacts,
    "Jahresverbrauch: 24.8 kWh/Jahr.",
    "Gerätemaße H x B x T (mm): 173,0 x 599 x 303.",
  ],
};
PRODUCT_INFO_BY_CODE["HOOD-C-FH664621E"] = {
  productImagePath: PRODUCT_IMAGE_FILES.hoodChimney,
  productInfoPdfPath: PRODUCT_INFO_FILES.hoodChimney,
  productInfoSummary: "Kaminhaube KHF 664 611 S Stripe X für die Kochwand. Die Produktinformation nennt Energieklasse A++, 60 cm Breite und bis zu 67 dB.",
  productInfoKeyFacts: [
    "Energieklasse: A++",
    "Geräusch: max. 67 dB",
    "Breite: 60 cm",
    "Luftleistung: 317-595 m3/h",
    "Betriebsart: Abluft / Umluft",
  ],
  productInfoExtractedText: [
    "Produktname: AMICA KHF 664 611 S Stripe X Kaminhaube, 60 cm.",
    "Wichtige Punkte:",
    "- Kaminhaube mit schwarzem Glasschirm und Edelstahlstreifen.",
    "- Energieklasse A++, Jahresverbrauch 22.7 kWh, Fluid-Dynamic-Effizienzklasse A.",
    "- 3 Leistungsstufen, Luftleistung 317-595 m3/h, Geräusch 49-67 dB.",
    "- SensorTouch, buerstenloser Motor, Nachlaufautomatik und 2 LED-Leuchten.",
    "Auswahlhinweise:",
    "- Vor der Bestellung Wandposition, Kaminschacht und Luftführung prüfen.",
  ].join("\n"),
};
PRODUCT_INFO_BY_CODE["HOOD-LS-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105806-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105807-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105732-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105733-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105837-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105840-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105843-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105831-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB104968-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105746-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105757-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105748-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105751-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105754-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105745-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105825-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105822-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105828-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105777-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["DISH-AB105777-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["HOOD-AB105845-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB109874-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["CAB-HOOD-AB109874-600"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB109873-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["CAB-HOOD-AB109873-600"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["WM-C-EWA34660W"] = PRODUCT_INFO_BY_CODE["WM-B-EWA34660W"];

const PRODUCT_INFO_BY_ARTICLE_NUMBER = {
  "OL-KGCN388140E": PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"],
  "FH 664 621 E": PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"],
  "FH664621E + HD6002": PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"],
  "FH664621E + FWK124 + HD6002": PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"],
};

PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"] = {
  productImagePath: PRODUCT_IMAGE_FILES.oven,
  productInfoPdfPath: PRODUCT_INFO_FILES.oven,
  productInfoSummary: "Kombinierte Auswahl aus Einbaubackofen EBX 943 600 S und Induktionskochfeld OL-KMI 754 000 E. Die aktuellen Produktinformationen nennen 77 l Garraum, 9 Backofenfunktionen sowie 4 Kochzonen mit 9 Leistungsstufen.",
  productInfoKeyFacts: [
    "Backofen: Energieklasse A",
    "Backofen: Energieverbrauch: 0.99 kWh conventional / 0.83 kWh hot air.",
    "Backofen: 77 l Volumen, 9 Funktionen",
    "Backofen: Gerätemaße H x B x T (mm): 595 x 595 x 575.",
    "Backofen: Einbaumaße H x B x T (mm): 595,0 x 560 x 560.",
    "Kochfeld: 60 cm, 4 Kochzonen",
    "Kochfeld: Gerätemaße B x T (mm): 590 x 520.",
    "Kochfeld: Ausschnittmasse B x T (mm): 560 x 490.",
    "Kochfeld: 9 Leistungsstufen",
    "Set: Backofen + Induktionskochfeld",
  ],
  productInfoExtractedText: [
    "Produktname: AMICA EBX 943 600 S Backofen + AMICA OL-KMI 754 000 E Induktionskochfeld.",
    "Wichtige Punkte:",
    "- Backofen: Einbau-Elektrobackofen mit 77 l Volumen, Energieklasse A und 9 Funktionen.",
    "- Backofen: Energieverbrauch: 0.99 kWh conventional / 0.83 kWh hot air.",
    "- Backofen: Gerätemaße H x B x T (mm): 595 x 595 x 575.",
    "- Backofen: Einbaumaße H x B x T (mm): 595,0 x 560 x 560.",
    "- Backofen: SensorControl Timer, versenkbare Knebel, CoolDoor3, Steam Clean.",
    "- Kochfeld: autarkes Induktionskochfeld, 60 cm, 4 Kochzonen mit Booster.",
    "- Kochfeld: Gerätemaße B x T (mm): 590 x 520.",
    "- Kochfeld: Ausschnittmasse B x T (mm): 560 x 490.",
    "- Kochfeld: 9 Leistungsstufen, Timer, Restwärmeanzeige, Topferkennung, Kindersicherung.",
    "Auswahlhinweise:",
    "- Vor der Bestellung Nischenmaß, Anschlusswert und Elektroanschluss prüfen.",
  ].join("\n"),
};
const OVEN_CLAIM_PRODUCT_INFO = {
  productImagePath: PRODUCT_IMAGE_FILES.oven,
  productInfoPdfPath: PRODUCT_INFO_FILES.oven,
  productInfoSummary: "Einbaubackofen mit 77 l Garraum, Energieeffizienzklasse A und 9 Backofenfunktionen.",
  productInfoKeyFacts: [
    "Produkttyp: Einbaubackofen",
    "Modell der Produktinformation: EBX 943 600 S",
    "Energieeffizienzklasse: A",
    "Energieverbrauch: 0,99 kWh konventionell / 0,83 kWh Heißluft",
    "Garraumvolumen: 77 l",
    "Backofenfunktionen: 9",
    "Gerätemaße H x B x T: 595 x 595 x 575 mm",
    "Einbaumaße H x B x T: 595 x 560 x 560 mm",
  ],
  productInfoExtractedText: "Produktinformation für den Einbaubackofen EBX 943 600 S. Energieeffizienzklasse A, 77 l Garraum und 9 Backofenfunktionen. Energieverbrauch 0,99 kWh im konventionellen Betrieb und 0,83 kWh mit Heißluft. Gerätemaße H x B x T 595 x 595 x 575 mm. Einbaumaße H x B x T 595 x 560 x 560 mm.",
};
const AB_109955_OVEN_CLAIM_PRODUCT_INFO = {
  productImagePath: null,
  productInfoPdfPath: "/product-info/ovens/eh923640e/a-eh923640e-product-info.pdf",
  productInfoSummary: "Einbauherd A-EH923640E mit 62 l Garraum, Energieeffizienzklasse A und 9 Backofenfunktionen.",
  productInfoKeyFacts: [
    "Produkttyp: Einbauherd",
    "Artikelnummer: A-EH923640E",
    "Energieeffizienzklasse: A",
    "Energieverbrauch: 0,99 kWh konventionell / 0,77 kWh Heißluft/Umluft",
    "Garraumvolumen: 62 l",
    "Backofenfunktionen: 9",
    "Nischenmaße H x B x T: 600 x 560 x mindestens 560 mm",
    "Anschlusswert: 3,50 kW",
    "Spannung/Frequenz: 3N ~ 400 V / 50 Hz",
  ],
  productInfoExtractedText: "Produktinformation für den architecto Einbauherd A-EH923640E. Energieeffizienzklasse A, 62 l Garraum und 9 Backofenfunktionen mit Umluft. Energieverbrauch 0,99 kWh im konventionellen Betrieb und 0,77 kWh mit Heißluft/Umluft. Nischenmaße H x B x T 600 x 560 x mindestens 560 mm. Anschlusswert 3,50 kW bei 3N ~ 400 V / 50 Hz.",
};
PRODUCT_INFO_BY_ARTICLE_NUMBER["A-EH923640E"] = AB_109955_OVEN_CLAIM_PRODUCT_INFO;
PRODUCT_INFO_BY_ARTICLE_NUMBER["A-EH923640E + 9EC744100C"] = AB_109955_OVEN_CLAIM_PRODUCT_INFO;
const COOKTOP_CLAIM_PRODUCT_INFO = {
  productImagePath: PRODUCT_IMAGE_FILES.hob,
  productInfoPdfPath: PRODUCT_INFO_FILES.cooktop,
  productInfoSummary: "Autarkes 60-cm-Induktionskochfeld mit 4 Kochzonen, Booster und 9 Leistungsstufen.",
  productInfoKeyFacts: [
    "Produkttyp: Induktionskochfeld",
    "Modell der Produktinformation: OL-KMI 754 000 E",
    "Breite: 60 cm",
    "Kochzonen: 4",
    "Leistungsstufen: 9",
    "Gerätemaße B x T: 590 x 520 mm",
    "Ausschnittmaße B x T: 560 x 490 mm",
    "Funktionen: Booster, Timer, Restwärmeanzeige, Topferkennung und Kindersicherung",
  ],
  productInfoExtractedText: "Produktinformation für das autarke Induktionskochfeld OL-KMI 754 000 E. Breite 60 cm, 4 Kochzonen mit Booster und 9 Leistungsstufen. Gerätemaße B x T 590 x 520 mm. Ausschnittmaße B x T 560 x 490 mm. Timer, Restwärmeanzeige, Topferkennung und Kindersicherung.",
};
PRODUCT_INFO_BY_CODE["OVEN-C-600-HOB"] = PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"];
PRODUCT_INFO_BY_CODE["OVEN-AB105806-600-HOB"] = PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"];
PRODUCT_INFO_BY_CODE["OVEN-AB105807-600-HOB"] = PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"];
const LED_LIGHTING_PRODUCT_INFO = {
  productInfoPdfPath: PRODUCT_INFO_FILES.ledLightingLabel,
  productInfoSummary: "Energielabel für das LED-Beleuchtungsset KA220043_S3. Das Label nennt Energieeffizienzklasse E und 3 kWh / 1000 h.",
  productInfoKeyFacts: [
    "Product type: LED lighting set.",
    "Model: KA220043_S3.",
    "Energy efficiency class: E.",
    "Energy consumption: 3 kWh / 1000 h.",
    "Document: Energy label.",
  ],
  productInfoExtractedText: [
    "Product name: LED lighting set KA220043_S3.",
    "Wichtige Punkte:",
    "- Product type: LED lighting set.",
    "- Model: KA220043_S3.",
    "- Energy efficiency class: E.",
    "- Energy consumption: 3 kWh / 1000 h.",
    "- Document: Energy label.",
    "Auswahlhinweise:",
    "- Show this label with the LED lighting set.",
  ].join("\n"),
};
PRODUCT_INFO_BY_CODE["LIGHT-B-LED-001"] = LED_LIGHTING_PRODUCT_INFO;
PRODUCT_INFO_BY_CODE["LIGHT-C-LED-001"] = LED_LIGHTING_PRODUCT_INFO;
PRODUCT_INFO_BY_CODE["ACC-LIGHT-003"] = LED_LIGHTING_PRODUCT_INFO;

Object.assign(PRODUCT_INFO_BY_ARTICLE_NUMBER, {
  "A-EGSPV597210 + TGV60": PRODUCT_INFO_BY_CODE["DISH-600-STD"],
  "EWA34660W + TGV60 + WU16": PRODUCT_INFO_BY_CODE["WM-B-EWA34660W"],
  "KALB KA220043_S3": LED_LIGHTING_PRODUCT_INFO,
  "KHF664611S + FWP18": PRODUCT_INFO_BY_CODE["HOOD-C-FH664621E"],
});

// Product documents supplied specifically for Burger kitchen 103898. These remain
// kitchen-scoped because several accessory codes are shared with the Impuls kitchens.
const BURGER_103898_PRODUCT_INFO_BY_CODE = {
  "DISH-BURGER103898-600": {
    productImagePath: "/product-images/gallery/burger-103898/dishwasher/a-egspv597210-01.jpg",
    productInfoPdfPath: "/product-info/burger-103898/dishwashers/a-egspv597210-product-info.pdf",
  },
  "CAB-HOOD-BURGER103898-HFLH6072": {
    productImagePath: "/product-images/gallery/burger-103898/extractor-hood/fh664621e-01.jpg",
    productInfoPdfPath: "/product-info/burger-103898/extractor-hoods/fh664621e-product-info.pdf",
  },
  "HOOD-BURGER103898-FH664621E": {
    productImagePath: "/product-images/gallery/burger-103898/extractor-hood/fh664621e-01.jpg",
    productInfoPdfPath: "/product-info/burger-103898/extractor-hoods/fh664621e-product-info.pdf",
  },
  "REF-BURGER103898-KGCN388140E": {
    productImagePath: "/product-images/gallery/burger-103898/fridge/ol-kgcn388140e-01.jpg",
    productInfoPdfPath: "/product-info/burger-103898/refrigerators/ol-kgcn388140e-product-info.pdf",
  },
  "ACC-LIGHT-003": {
    productImagePath: "/product-images/gallery/burger-103898/leds/led-spots-01.jpg",
    productInfoPdfPath: "/product-info/burger-103898/lighting/led-spots-product-info.pdf",
  },
  "ACC-WASTE-001": {
    productImagePath: "/product-images/gallery/burger-103898/waste-collector/blanco-517467-01.jpg",
    productInfoPdfPath: "/product-info/burger-103898/waste-collectors/blanco-517467-product-info.pdf",
  },
};

for (const article of CATALOG_ARTICLES) {
  const productInfo = PRODUCT_INFO_BY_ARTICLE_NUMBER[article.articleNumber];
  if (productInfo) {
    Object.assign(article, productInfo, {
      productInfoUpdatedAt: productInfo.productInfoPdfPath ? new Date() : null,
    });
  }
}

// 108134 MODUL 1: single-wall plan (frontend/public/pdfs/108134 MODUL 1_10.03.2026_OH.pdf).
// Same component/article/price set as the legacy single-wall layout, so it reuses
// those item codes to inherit their localized names, product info, and galleries. Layout
// left→right: washing machine, sink base, dishwasher, oven, US60 drawer, fridge tall unit;
// five wall cabinets up top with the hood at wall-cabinet-4.
const MODUL1_108134_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-B-545-1800-700", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 180 cm, NoFrost", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "WM-B-EWA34660W", name: "Washing machine + front + side panel", nameDe: "Waschmaschine + Front + Wange", price: articlePrice("EWA34660W + TGV60 + WU16"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "base-module-1", sortOrder: 20, infoText: "EWA34660W, 8 kg, 1400 rpm", articleNumber: "EWA34660W + TGV60 + WU16" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-B-600-STD", name: "Fully integrated dishwasher incl. furniture front", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 40, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 50, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-B-STR", name: "Base cabinet with drawer 600/600 mm", price: articlePrice("US60"), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  defaultWorktop({ code: "TOP-B-3036", sortOrder: 75 }),
  defaultSinkWorktop({ sortOrder: 78 }),
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-L-600", name: "Wall Cabinet left (600 x 723 x 320 mm)", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-ML-600", name: "Wall Cabinet mid-left (600 x 723 x 320 mm)", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-MR-600", name: "Wall Cabinet mid-right (600 x 723 x 320 mm)", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-B-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-B-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-R-600", name: "Wall Cabinet right (600 x 723 x 320 mm)", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#ff7f9f", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "LIGHT-B-LED-001", name: "LED Lighting Set", price: articlePrice("KALB KA220043_S3"), iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 130, infoText: "LED lighting set", articleNumber: "KALB KA220043_S3" },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105807_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-1", name: "Wall Cabinet 1", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-2", name: "Wall Cabinet 2", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-3", name: "Wall Cabinet 3", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105807-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105807-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 10, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105807-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 20, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105807", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 25, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105807-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 40, infoText: "US60 base storage cabinet", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "REF-AB105807-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  defaultSinkWorktop({ sortOrder: 45 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105806_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-400-L", name: "Base Cabinet left", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base storage cabinet, 400 mm", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-400-R", name: "Base Cabinet right", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base storage cabinet, 400 mm", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-400-L", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet, 400 mm", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-400-R", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, 400 mm", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105819_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", widthMm: 600, heightMm: null, depthMm: null, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: null, depthMm: null, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105819-US60-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105819-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105819-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-L1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105821_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105821-FILLER-500", legacyCode: "CAB-BASE-AB105821-FILLER-550", name: "Base cabinet", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "Base cabinet filler, hinge right", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1), articleNumber: "US50" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105821-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105821-US30", name: "Base Cabinet", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-FILLER-500", legacyCode: "CAB-WALL-AB105821-FILLER-550", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "Wall cabinet filler, hinge right", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-L", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H3002", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 110, infoText: "H3002, hinge left", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105821-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 120, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105824_ITEMS = AB_105821_ITEMS;

// AB 105833: two-part split run — fridge left, left run (filler, oven, US60), right run
// (filler, dishwasher, sink); wall fillers bracket hood + H6002 on each side.
const AB_105833_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-FILLER-500", name: "Base cabinet", price: articlePrice("US50"), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "base cabinet filler, hinge right", articleNumber: "US50" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105833-FILLER-500-R", name: "Base cabinet", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105833-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPK20", 1), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-FILLER-500-L", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-FILLER-500-R", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L3", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105827: fridge-right run like AB 105821 with 500 mm filler cabinets ().
const AB_105827_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105827-FILLER-500", name: "Base cabinet", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "base cabinet filler, hinge right", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105827-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105827-US30", name: "Base Cabinet", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105827-FILLER-500", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-L", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H3002", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 110, infoText: "H3002, hinge left", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105821-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 120, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105830_ITEMS = AB_105827_ITEMS;

// AB 105826: fridge-left 5-bay run — US60 R, oven, US60 L, dishwasher, sink (no end drawer).
const AB_105826_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105826-US60-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105826-US60-L", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L3", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105826_ITEMS_WITH_SINK_END_BLENDE = withSinkEndBlende(AB_105826_ITEMS, "105826");

// AB 105822: fridge-left compact run - 500 mm filler, oven, US60, dishwasher, sink (5 base bays).
const AB_105822_LEGACY_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-FILLER-500", name: "Base cabinet", price: articlePrice("US50"), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "base cabinet filler, hinge right", articleNumber: "US50" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-US60", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105822-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-FILLER-500", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105823_ITEMS = withSinkEndBlende(AB_105822_LEGACY_ITEMS.map((item) => {
  if (item.code === "CAB-WALL-AB105822-H6002-3") {
    return { ...item, price: articlePriceWithBlende("H6002", "HPK2002", 1), blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) };
  }
  return item;
}), "105823");

// AB 105829 and AB 105832 add a blende note on top of AB 105822's layout (last wall cabinet);
// AB 105822 doesn't have one, so this is a separate clone, not an alias.
const AB_105829_ITEMS = withSinkEndBlende(AB_105822_LEGACY_ITEMS.map((item) => {
  if (item.code === "CAB-WALL-AB105822-H6002-3") {
    return { ...item, price: articlePriceWithBlende("H6002", "HPK2002", 1), articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) };
  }
  return item;
}), "105829");
const AB_105832_ITEMS = withSinkEndBlende(AB_105822_LEGACY_ITEMS.map((item) => {
  if (item.code === "CAB-WALL-AB105822-H6002-3") {
    return { ...item, price: articlePriceWithBlende("H6002", "HPK2002", 1), articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) };
  }
  return item;
}), "105832");

// AB 105820 shares AB 105806's layout and appliances; identical items reuse the AB105806
// codes (per-kitchen unique, so a separate KitchenItem row is created) to inherit their
// names/product info/galleries. Only the four differently-sized cabinets get new codes.
const AB_105820_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105820-US30-300", name: "Base Cabinet", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105820-US60", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105820-H3002-300", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H3002, hinge right", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105820-H6002", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 104968: L-shaped isometric plan — US50 + oven + US40 on the main leg, US60 corner +
// dishwasher + locked sink on the return, tall fridge on the far right; H5002 + hood + H4002 +
// H6002 wall run above the main leg (Excel NR 1–12).
const AB_104968_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  defaultSinkBase({ sortOrder: 30, code: "SINKBASE-AB104968-DEFAULT", widthMm: 600 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB104968-US50-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US50 base storage cabinet, hinge right", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB104968-US40-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US40", "UPEF65", 1), widthMm: 400, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "US40 base storage cabinet, hinge left", articleNumber: "US40", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB104968-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB104968-US60-L", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB104968-KGCN388140E", name: "Freestanding refrigerator 178 cm", nameDe: "Standkühlschrank 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104968-H5002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H5002, hinge right", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB104968-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB104968-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104968-H4002-L", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H4002, hinge left", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104968-H6002-L", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105746: straight elevation — fridge left, US60 + oven + dishwasher + locked sink on the base
// run; four H6002 wall cabinets with hood in position 2 (Excel NR 1–10).
const AB_105746_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105746-DEFAULT", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet with UPK20 filler panel", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105746-KGCN388140E", name: "Freestanding refrigerator 178 cm", nameDe: "Standkühlschrank 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105746-US60-R", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105746-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105746-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105746-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105746-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 82, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105746-H6002-L1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105746-H6002-L2", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];
const AB_105746_ITEMS_WITH_SINK_END_BLENDE = withSinkEndBlende(AB_105746_ITEMS, "105746");

// These kitchens use the identical AB 105746 element plan. Keep the source
// configuration in one place while giving every kitchen its own item codes.
function createAB105746Items(kitchenCode) {
  return AB_105746_ITEMS_WITH_SINK_END_BLENDE.map((item) => ({
    ...item,
    code: item.code.replaceAll("AB105746", `AB${kitchenCode}`),
  }));
}

const AB_105749_ITEMS = createAB105746Items("105749");
const AB_105752_ITEMS = createAB105746Items("105752");
const AB_105755_ITEMS = createAB105746Items("105755");

// AB 105757: straight elevation — US50 (UPK20) + oven + US60 + locked sink + dishwasher + US60;
// fridge right; wall run is H5002 (HPK2002) + hood + four H6002 cabinets. Excel NR 1–14.
const AB_105757_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105757-DEFAULT", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105757-US50", name: "Base cabinet with drawer", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US50 base storage cabinet", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105757-US60-1", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105757-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105757-US60-2", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105757-KGCN388140E", name: "Freestanding refrigerator", nameDe: "Standkühlschrank", price: articlePrice("OL-KGCN388140E"), widthMm: 710, heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105757-H5002", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H5002 wall cabinet", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105757-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105757-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105757-H6002-1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105757-H6002-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105757-H6002-3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105757-H6002-4", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105759: straight elevation with the refrigerator on the left. The source
// schedule is 105759-56, NR 1-14. Base run: US40, oven, US30, SP60 sink,
// dishwasher, US90 + UPK20. Wall run: H4002, hood package, H3002, H6002,
// H6002, H9002 + HPK2002. Every supplied schedule row resolves to a catalog
// article (and both supplied fillers resolve to CatalogBlende records).
const AB_105759_ITEMS = [
  defaultOvenHob({
    articleNumber: AB_105759_OVEN_HOB_CATALOG_ARTICLE,
    catalogArticleNumber: AB_105759_OVEN_HOB_CATALOG_ARTICLE,
    name: "Built-in oven and ceramic cooktop",
    nameDe: "Einbauherd und Glaskeramikkochfeld",
    infoText: "A-EH923640E oven, 9EC744100C ceramic cooktop and UHK lower cabinet",
    sortOrder: 10,
    widthMm: 600,
  }),
  defaultWorktop({ code: "TOP-AB105759", sortOrder: 20, catalogArticleNumber: "PLR60" }),
  { itemType: ItemType.COMPONENT, code: "SINK-BASE-AB105759-SP60", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Included SP60 sink base cabinet", articleNumber: "SP60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105759-KGCN388140E", name: "Freestanding refrigerator", nameDe: "Standkühlschrank", price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Freestanding fridge-freezer, 181 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105759-US40", name: "Base cabinet with drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US40 base storage cabinet", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105759-US30", name: "Base cabinet with drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US30"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US30 base storage cabinet", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105759-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher incl. furniture front, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105759-US90-UPK20", name: "Base cabinet with drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US90", "UPK20", 1), widthMm: 900, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "drawer-module", sortOrder: 80, infoText: "US90 base storage cabinet with right UPK20 filler panel", articleNumber: "US90", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105759-H4002", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H4002"), widthMm: 400, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H4002 upper cabinet", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105759-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002 cabinet, FH664621E flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105759-FH664621E", name: "FH664621E Extractor Hood", nameDe: "FH664621E Flachschirmhaube", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105759-H3002", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H3002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H3002 upper cabinet", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105759-H6002-1", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H6002 upper cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105759-H6002-2", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002 upper cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105759-H9002-HPK2002", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H9002", "HPK2002", 1), widthMm: 900, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H9002 upper cabinet with right HPK2002 filler panel", articleNumber: "H9002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 150, catalogArticleNumber: "526335 + 517720" }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105762-63: L-shaped kitchen with a 40/60/50 cm left leg and a
// 60/60/30 cm sink return. The supplier schedule has thirteen callouts.
// Its layout aliases below share the drawing and catalog-linked selection while
// retaining separate kitchen, contract, order, and saved-selection records.
const AB_105762_ITEMS = [
  defaultOvenHob({
    articleNumber: "A-EH923640E + 9EC744100C",
    catalogArticleNumber: "A-EH923640E + 9EC744100C",
    name: "Built-in oven and ceramic cooktop",
    nameDe: "Einbauherd und Glaskeramikkochfeld",
    infoText: "A-EH923640E oven, 9EC744100C ceramic cooktop and UHK lower cabinet",
    sortOrder: 10,
    widthMm: 600,
  }),
  defaultWorktop({
    code: "TOP-AB105762",
    articleNumber: "PLR60-1 + PLR60-2",
    displayArticleNumber: "PLR60-1 + PLR60-2",
    catalogArticleNumber: "PLR60",
    sortOrder: 20,
  }),
  { itemType: ItemType.COMPONENT, code: "SINK-BASE-AB105762-SP60", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Included SP60 sink base cabinet", articleNumber: "SP60" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP-AB105762", name: "Sink and faucet set", nameDe: "Spüle und Armatur", price: "0.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 40, isLocked: true, infoText: "Included 526335 sink and 517720 faucet", articleNumber: "526335 + 517720", displayArticleNumber: "517720 + 526335", catalogArticleNumber: "526335 + 517720" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105762-KGCN388140E", name: "Freestanding refrigerator", nameDe: "Standkühlschrank", price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 50, infoText: "Freestanding fridge-freezer, 181 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105762-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 60, infoText: "US40 lower cabinet on the left leg", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105762-US50", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US50", "UPEF65", 1), widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 70, infoText: "US50 lower cabinet with UPEF65 corner filler panel", articleNumber: "US50", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105762-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 80, infoText: "Fully integrated dishwasher incl. furniture front, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105762-US30-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US30"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "drawer-module", sortOrder: 90, infoText: "US30 lower cabinet with supplied UPK20 filler panel", articleNumber: "US30", catalogArticleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 (25E)", blendePrice: "0.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105762-H4002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H4002"), widthMm: 400, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, infoText: "H4002 upper cabinet", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105762-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: "349.00", widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 110, infoText: "FH664621E flat pull-out hood, FWK124 filter and matching upper cabinet", articleNumber: "FH664621E + FWK124 + HD6002", displayArticleNumber: "FH664621E + FWK124 + HD6002", catalogArticleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105762-FH664621E", name: "FH664621E Extractor Hood", nameDe: "FH664621E Flachschirmhaube", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002", catalogArticleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105762-H5002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H5002"), widthMm: 500, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 120, infoText: "H5002 upper cabinet", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105762-H6002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, infoText: "H6002 upper cabinet with supplied HPK2002 filler panel", articleNumber: "H6002", catalogArticleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 (35E)", blendePrice: "0.00" },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105732_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet with UPK20 filler panel", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105732-US40-R", name: "Base cabinet with drawer", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US40 base storage cabinet, hinge right", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105732-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105732-H4002-R", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H4002, hinge right", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105732-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105732-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 82, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105732-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105732-H6002-L-FILLER", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];
const AB_105732_ITEMS_WITH_SINK_END_BLENDE = withSinkEndBlende(AB_105732_ITEMS, "105732");
// AB 105735, 105738, and 105741 reuse the same elevation. Their exposed sink-end
// UPK20 panel is an optional, independent customer selection just like AB 105732.
const AB_105735_ITEMS_WITH_SINK_END_BLENDE = withSinkEndBlende(AB_105732_ITEMS, "105735");
const AB_105738_ITEMS_WITH_SINK_END_BLENDE = withSinkEndBlende(AB_105732_ITEMS, "105738");
const AB_105741_ITEMS_WITH_SINK_END_BLENDE = withSinkEndBlende(AB_105732_ITEMS, "105741");

const AB_105733_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105733-US30-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US30 base storage cabinet, hinge right, with UPK20 filler panel", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105733-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105820-US60", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105733-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105733-H3002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H3002", "HPK2002", 1), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H3002, hinge right, with HPK2002 filler panel", articleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105733-H6002-R1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105733-H6002-R2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105733-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105733-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105812 matches AB 105820's plan and Excel rows, so it reuses the same item codes.
const AB_105812_ITEMS = AB_105820_ITEMS;

// AB 105808 shares AB 105820's Excel rows (same appliances/cabinets, fridge-left layout).
const AB_105808_ITEMS = AB_105820_ITEMS;

// AB 105809: L-shaped isometric plan (callouts 1-12).
const AB_105809_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-400-R", name: "Base cabinet with drawer", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base cabinet, hinge right", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-500-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US50", "UPEF65", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet, hinge left", articleNumber: "US50", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  defaultSinkBase({ componentKey: "corner-base", sortOrder: 60, widthMm: 300, depthMm: 600, iconKey: "drawer_base_two" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-US30-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "sink-base", sortOrder: 65, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-FILLER", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet filler", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-500-L", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, hinge left", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-H6002-L", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105805: L-shaped isometric plan (same drawing family as 105809). Identical layout —
// 400R + 500L bases + oven on the main leg, dishwasher + sink base on the
// return, 4 wall cabinets + hood. Differs from 105809 at NR 8 (priced US30 sink base,
// hinge left, EUR 175), NR 9 (a real 400 mm Oberschrank, hinge right, instead of
// a wall filler), lower base/sink blenden, and the upper-right H6002 with right blende.
// Differing cabinets get new codes.
const AB_105805_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-400-R", name: "Base cabinet with drawer", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base cabinet, hinge right", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105805-500-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US50", "UPEF65", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet, hinge left", articleNumber: "US50", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  defaultSinkBase({ componentKey: "corner-base", sortOrder: 60, widthMm: 300 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105805-US30-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "sink-base", sortOrder: 65, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105805-400-R", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet, hinge right", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-500-L", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, hinge left", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105805-H6002-L", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105834: L-shaped isometric plan (fridge left) — 500R + oven + 500R bases on the main leg,
// corner + locked sink + dishwasher on the return; 500R wall filler, hood, H6002 L.
const AB_105813_ITEMS = AB_105805_ITEMS;
const AB_105817_ITEMS = AB_105805_ITEMS;

const AB_105834_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105834-500-R", name: "Base cabinet with drawer", price: articlePrice("US50"), widthMm: 500, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base cabinet, hinge right", articleNumber: "US50" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105834-400-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US40", "UPEF65", 1), widthMm: 400, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "Base cabinet, hinge left", articleNumber: "US40", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105834-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPK20", 1), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105834-500-R", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet, hinge right", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105834-H6002-L1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "corner-base", sortOrder: 120, isLocked: true, infoText: "Default sink base cabinet" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105837: L-shaped isometric plan, measured from frontend/public/pdfs/AB 105837.pdf.
// Excel rows 1-3 are the locked default oven/worktop/sink package. Rows 4-10 are selectable.
const AB_105837_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: null, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-4", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", nameDe: "Standkühlschrank 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105837-US60-R", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105837-500-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US50", "UPEF65", 1), widthMm: 500, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "Base cabinet, hinge right", articleNumber: "US50", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105837-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105837-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105837-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105837-US60-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105837-US60-L", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const cloneAb105837Items = (targetCode) =>
  AB_105837_ITEMS.map((item) => ({
    ...item,
    code: item.code.replace("AB105837", `AB${targetCode}`),
  }));

const AB_105840_ITEMS = cloneAb105837Items("105840");
const AB_105843_ITEMS = cloneAb105837Items("105843");

// AB 105747: L-shaped perspective plan — US60 R + oven + US60 L on the main leg,
// locked sink base + dishwasher + US30 cabinet on the return, and three H6002 wall units with the
// flat-screen hood in the centre. Prices and filler-panel totals come from the catalog.
const AB_105747_ITEMS = [
  defaultOvenHob({ sortOrder: 10 }),
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: DEFAULT_WORKTOP_CATALOG_INFO_TEXT },
  defaultSinkBase({ componentKey: "sink-base", sortOrder: 30, widthMm: 600, depthMm: 600 }),
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105837-US60-R", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-US60-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPEF65", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105747-450", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV587915 + TGV45"), widthMm: 450, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher incl. furniture front, 45 cm", articleNumber: "A-EGSPV587915 + TGV45" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105747-US30", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 75, infoText: "US30 base storage cabinet with UPK20 filler panel", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105747-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105747-H6002-L", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// These three variants use one UPEF65 corner filler panel on the US30 return
// cabinet. Two UPK20 panels must never be used to represent this corner.
const AB_105750_105753_105756_ITEMS = AB_105747_ITEMS.map((item) => (
  item.code === "CAB-BASE-AB105747-US30"
    ? {
        ...item,
        price: articlePriceWithBlende("US30", "UPEF65", 1),
        infoText: "US30 base storage cabinet with one UPEF65 corner filler panel",
        blendeCode: "UPEF65",
        blendeLabel: "UPEF65 Corner filler panel",
        blendePrice: blendePrice("UPEF65", 1),
      }
    : item
));
const AB_105750_ITEMS = AB_105750_105753_105756_ITEMS;
const AB_105753_ITEMS = AB_105750_105753_105756_ITEMS;
const AB_105756_ITEMS = AB_105750_105753_105756_ITEMS;

// AB 105816 matches AB 105820 except callout 11 is an H6002 with left hinge.
const AB_105816_ITEMS = AB_105820_ITEMS.map((item) =>
  item.code === "CAB-WALL-AB105820-H6002"
    ? {
        ...item,
        code: "CAB-WALL-AB105816-H6002-L",
        name: "Wall Cabinet",
        infoText: "H6002, hinge left, 2 adjustable shelves",
      }
    : item
);

// AB 105810: fridge-left run with US45 + 400 mm filler bases, H4502 + 400 mm filler wall,
// hood, and three H6002 cabinets. Plan callouts 1–3 DEFAULT (locked); shared appliance codes reused.
const AB_105810_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105810-US45", name: "Base cabinet with drawer", price: articlePrice("US45"), widthMm: 450, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "US45 base storage cabinet, hinge right", articleNumber: "US45" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105810-FILLER-400", name: "Base cabinet", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet filler, hinge left", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105810-H4502", name: "Wall Cabinet", price: articlePrice("H4502"), widthMm: 450, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H4502, hinge right, 2 adjustable shelves", articleNumber: "H4502" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105810-FILLER-400", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet filler, hinge right", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105814 has the same item schedule and plan view as AB 105810; it keeps its own contract.
const AB_105814_ITEMS = AB_105810_ITEMS;
// AB 105818 mirrors AB 105810/105814 while keeping its own kitchen and contract.
const AB_105818_ITEMS = AB_105810_ITEMS;

// AB 105835: fridge-right 6×600 mm run — US60 R, US60 L, oven, dishwasher, sink, US60 L.
const AB_105835_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-L1", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105841-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-L2", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105841-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-L", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105836: dual elevation plan — left run (fridge, US60×2, oven, hood wall) + right run
// (500 mm fillers, sink, dishwasher). Both segments share one vector plan page.
const AB_105836_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-US60-R", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-US60-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-FILLER-500", name: "Base cabinet", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105836-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPK20", 1), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-FILLER-500", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L3", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105842: same schedule as AB 105836 — dual elevation, slightly different plan proportions.
const AB_105842_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-US60-R", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-US60-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-FILLER-500", name: "Base cabinet", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105842-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPK20", 1), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-FILLER-500", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L3", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105839_ITEMS = AB_105842_ITEMS;

// AB 105845: two straight elevations on one official plan. The left elevation contains
// the refrigerator and cooking run; the right elevation contains the sink run. Article
// numbers, dimensions, and optional UPK20/HPK2002 panels follow the 18-row schedule.
const AB_105845_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: DEFAULT_OVEN_HOB_CATALOG_NAME_EN, nameDe: DEFAULT_OVEN_HOB_CATALOG_NAME_DE, price: DEFAULT_OVEN_HOB_CATALOG_PRICE, articleNumber: DEFAULT_OVEN_HOB_CATALOG_ARTICLE, widthMm: 600, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  defaultWorktop({ sortOrder: 20 }),
  { itemType: ItemType.COMPONENT, code: "SINK-BASE-AB105845-600", name: DEFAULT_SINK_BASE_CATALOG_NAME_EN, nameDe: DEFAULT_SINK_BASE_CATALOG_NAME_DE, price: "0.00", widthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: DEFAULT_SINK_BASE_CATALOG_INFO_TEXT },
  { itemType: ItemType.COMPONENT, code: "REF-AB105845-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105845-US60-1", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105845-US30-1", name: "Base cabinet with drawer", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "base_cabinet_30", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US30 base storage cabinet", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105845-US60-2", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "US60 base storage cabinet with UPK20 filler panel", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105845-US60-3", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-4", sortOrder: 80, infoText: "US60 base storage cabinet with UPK20 filler panel", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105845-450", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV587915 + TGV45"), widthMm: 450, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 90, infoText: "Fully integrated dishwasher incl. furniture front, 45 cm", articleNumber: "A-EGSPV587915 + TGV45" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105845-US30-2", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, depthMm: 600, iconKey: "base_cabinet_30", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 100, infoText: "US30 base storage cabinet with UPK20 filler panel", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-H6002-1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-H3002-1", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 120, infoText: "H3002, 2 adjustable shelves", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105845-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 130, infoText: "HD6002 flat-screen hood cabinet package", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105845-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 132, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-H6002-2", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 140, infoText: "H6002 wall cabinet with HPK2002 filler panel", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-H6002-3", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 150, infoText: "H6002 wall cabinet with HPK2002 filler panel", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-H6002-4", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 160, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-H4502", name: "Wall Cabinet", price: articlePrice("H4502"), widthMm: 450, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-7", sortOrder: 170, infoText: "H4502, 2 adjustable shelves", articleNumber: "H4502" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-H3002-2", name: "Wall Cabinet", price: articlePriceWithBlende("H3002", "HPK2002", 1), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-8", sortOrder: 180, infoText: "H3002 wall cabinet with HPK2002 filler panel", articleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 190 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105847: two straight elevations on the supplied 800 x 600 vector plan.
// The PDF callouts map to a 60/60/30 base run on the left, a 30/45/60/60 run
// on the right (with a 45 cm dishwasher), and 60/60/60/30 plus 30/45/60/60
// wall runs. Unique codes keep this plan's callout numbers independent.
const AB_105847_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: DEFAULT_OVEN_HOB_CATALOG_NAME_EN, nameDe: DEFAULT_OVEN_HOB_CATALOG_NAME_DE, price: DEFAULT_OVEN_HOB_CATALOG_PRICE, articleNumber: DEFAULT_OVEN_HOB_CATALOG_ARTICLE, widthMm: 600, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  defaultWorktop({ sortOrder: 20 }),
  { itemType: ItemType.COMPONENT, code: "SINK-BASE-AB105847-600", name: DEFAULT_SINK_BASE_CATALOG_NAME_EN, nameDe: DEFAULT_SINK_BASE_CATALOG_NAME_DE, price: "0.00", widthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: DEFAULT_SINK_BASE_CATALOG_INFO_TEXT },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105847-US60-1", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet with UPK20 filler panel", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105847-US60-2", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 50, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105847-US30-1", name: "Base cabinet with drawer", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "base_cabinet_30", colorKey: "#ffbf00", componentKey: "base-module-3", sortOrder: 60, infoText: "US30 base storage cabinet", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105847-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105847-US30-2", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, depthMm: 600, iconKey: "base_cabinet_30", colorKey: "#ffbf00", componentKey: "base-module-4", sortOrder: 80, infoText: "US30 base storage cabinet with UPK20 filler panel", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105847-450", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV587915 + TGV45"), widthMm: 450, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-5", sortOrder: 90, infoText: "Fully integrated dishwasher incl. furniture front, 45 cm", articleNumber: "A-EGSPV587915 + TGV45" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105847-US60-3", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-6", sortOrder: 100, infoText: "US60 base storage cabinet with UPK20 filler panel", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105847-H6002-1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 110, infoText: "H6002 wall cabinet with HPK2002 filler panel", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105847-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 120, infoText: "HD6002 flat-screen hood cabinet package", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105847-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 122, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105847-H6002-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 130, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105847-H3002-1", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 140, infoText: "H3002 wall cabinet, 30 cm", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105847-H3002-2", name: "Wall Cabinet", price: articlePriceWithBlende("H3002", "HPK2002", 1), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 150, infoText: "H3002 wall cabinet with HPK2002 filler panel", articleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105847-H4502", name: "Wall Cabinet", price: articlePrice("H4502"), widthMm: 450, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 160, infoText: "H4502, 2 adjustable shelves", articleNumber: "H4502" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105847-H6002-3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-7", sortOrder: 170, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105847-H6002-4", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-8", sortOrder: 180, infoText: "H6002 wall cabinet with HPK2002 filler panel", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 190 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105841 shares AB 105806's single-wall layout (fridge on the RIGHT). Items whose callout
// number matches AB 105806's scheme reuse its codes (oven 1, worktop 2, sink base 3, hood 10,
// wall cabinets 12/13/14, sink+waste); the rest get AB105841 codes so their plan numbers (4-9, 11)
// stay correct (callout numbers are keyed by code in kitchen-selection-utils.js).
const AB_105841_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-1", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 10, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 20, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-2", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 30, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 40, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105841-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-3", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 65, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105841-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105841-H6002-1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105841-H6002-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105838_ITEMS = AB_105841_ITEMS;
const AB_105844_ITEMS = AB_105841_ITEMS;

// AB 105744: single-wall run with the fridge tall unit on the RIGHT (same drawing family as
// AB 105841). Base run (L->R): US60, oven (default), US60, sink (default), dishwasher, US40, then
// the fridge. Wall run (L->R): H6002, hood, H6002, H6002, H6002, H4002. DEFAULT rows (oven,
// worktop, sink) reuse the shared default codes; the hood package reuses AB105806's codes so it
// inherits its gallery/product info (its "10" callout also matches). Every other cabinet and
// appliance gets an AB105744 code so its plan number (4-9, 11-14) is correct.
const AB_105744_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105744-US60-1", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 10, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  defaultOvenHob({ sortOrder: 20 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105744-US60-2", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 30, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  defaultSinkBase({ sortOrder: 40, widthMm: 600 }),
  { itemType: ItemType.COMPONENT, code: "DISH-AB105744-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105744-US40", name: "Base cabinet with drawer", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US40 base storage cabinet, hinge left", articleNumber: "US40" },
  defaultWorktop({ sortOrder: 65 }),
  { itemType: ItemType.COMPONENT, code: "REF-AB105744-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105744-H6002-1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105744-H6002-3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105744-H6002-4", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105744-H6002-5", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105744-H4002", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H4002, 40 cm", articleNumber: "H4002" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105743: PDF-measured L-shaped plan. The left return contains US30 +
// UPK20, US40, the locked sink base, and the dishwasher + UPEF65 corner
// filler. The right return contains the locked oven and US60 beside the fridge.
const AB_105743_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", widthMm: 600, heightMm: null, depthMm: null, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  defaultSinkBase({ sortOrder: 30, widthMm: 600 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105743-US30-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US30 base storage cabinet, hinge right", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105743-US40-R", name: "Base cabinet with drawer", price: articlePrice("US40"), widthMm: 400, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "US40 base storage cabinet, hinge right", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105743-600", name: "Fully integrated dishwasher incl. furniture front", nameDe: "Vollintegrierter Geschirrspüler inkl. Möbelfront", price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPEF65", 1), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher with UPEF65 corner filler panel", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105743-US60", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105743-KGCN388140E", name: "Freestanding refrigerator", nameDe: "Standkühlschrank", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105743-H6002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105743-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105743-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105743-H6002-L", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 120 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105748: PDF-measured L-shaped plan. The main leg contains a US45 and
// locked oven; the return contains the locked sink base with UPEF65, a 45 cm
// dishwasher, US30 with UPK20, and the WU16 end panel. Article numbers,
// dimensions, and prices follow the supplied Excel schedule.
const AB_105748_ITEMS = [
  defaultOvenHob({ sortOrder: 10 }),
  defaultWorktop({ sortOrder: 20 }),
  defaultSinkBase({
    sortOrder: 30,
    widthMm: 600,
    depthMm: 600,
    blendeCode: "UPEF65",
    blendeLabel: "UPEF65 Corner filler panel",
    blendePrice: blendePrice("UPEF65", 1),
  }),
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105748-US45", name: "Base cabinet with drawer", price: articlePrice("US45"), widthMm: 450, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US45 base storage cabinet, hinge right", articleNumber: "US45" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105748-450", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV587915 + TGV45"), widthMm: 450, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher incl. furniture front, 45 cm", articleNumber: "A-EGSPV587915 + TGV45" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105748-US30", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US30 base storage cabinet with UPK20 filler panel", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105748-H4502", name: "Wall Cabinet", price: articlePrice("H4502"), widthMm: 450, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H4502, 2 adjustable shelves", articleNumber: "H4502" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105748-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105748-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105748-H6002", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, 2 adjustable shelves with HPK2002 filler panel", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// These kitchens use the identical AB 105748 L-shaped element plan. Keep the
// item definition central while ensuring kitchen-specific element codes.
function createAB105748Items(kitchenCode) {
  return AB_105748_ITEMS.map((item) => ({
    ...item,
    code: item.code.replaceAll("AB105748", `AB${kitchenCode}`),
  }));
}

const AB_105751_ITEMS = createAB105748Items("105751");
const AB_105754_ITEMS = createAB105748Items("105754");
const AB_105745_ITEMS = createAB105748Items("105745");

// AB 105758: compact L-shaped plan. The left return contains the locked sink
// base + UPK20 and the dishwasher + UPEF65 corner filler. The right return
// contains the locked oven and a US30 beside the refrigerator; the second US30
// is the third upper cabinet above the refrigerator. H6002 + HPK2002 and the
// hood cabinet complete the wall run.
const AB_105758_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", widthMm: 600, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  // CAB-SINK deliberately avoids the generic SINKBASE-* canonicalizer because
  // this source row has its own dimensions and locked sink-base metadata.
  { itemType: ItemType.COMPONENT, code: "CAB-SINK-AB105758-DEFAULT", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105758-600", name: "Fully integrated dishwasher incl. furniture front", nameDe: "Vollintegrierter Geschirrspüler inkl. Möbelfront", price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPEF65", 1), widthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 40, infoText: "Fully integrated dishwasher with UPEF65 corner filler panel", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105758-US30-R", name: "Base cabinet with drawer", price: articlePrice("US30"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "drawer-module", sortOrder: 50, infoText: "US30 base storage cabinet, right return", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105758-KGCN388140E", name: "Freestanding refrigerator", nameDe: "Standkühlschrank", price: articlePrice("OL-KGCN388140E"), widthMm: 710, heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105758-H6002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105758-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105758-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 82, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105758-US30", name: "Upper Cabinet", price: articlePrice("US30"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "wall_cabinet_plain", colorKey: "#ffbf00", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "US30 upper cabinet above the refrigerator", articleNumber: "US30" },
  defaultSinkWorktop({ sortOrder: 100 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105846: mirrored L-shaped vector plan with the sink on the left run and
// refrigerator on the right.  Rows 1-3 are the locked default package; rows
// 4-10 follow the supplied Excel schedule and keep their kitchen-specific
// codes because plan callout numbers are keyed by code in the configurator.
const AB_105846_ITEMS = [
  defaultOvenHob({ sortOrder: 10, widthMm: 600 }),
  defaultWorktop({ sortOrder: 20 }),
  defaultSinkBase({
    // Keep a kitchen-specific code: the shared normalized sink code is also
    // used as callout 8 in older L plans, while this drawing labels it 3.
    code: "SINK-BASE-AB105846-DEFAULT",
    sortOrder: 30,
    widthMm: 600,
    depthMm: 600,
  }),
  { itemType: ItemType.COMPONENT, code: "DISH-AB105846-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 40, infoText: "Fully integrated dishwasher incl. furniture front, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105846-US50", name: "Base cabinet with drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US50", "UPEF65", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US50 base storage cabinet with UPEF65 corner filler panel", articleNumber: "US50", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105846-US30", name: "Base cabinet with drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US30 base storage cabinet", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105846-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105846-H4502", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H4502", "UPK20", 1), widthMm: 600, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H4502 wall cabinet with UPK20 filler panel; combined Excel width 60 cm", articleNumber: "H4502", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105846-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002 cabinet, flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105846-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105846-H3002", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H3002 wall cabinet, 30 cm", articleNumber: "H3002" },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];
const AB_105846_ITEMS_WITH_SINK_END_BLENDE = withSinkEndBlende(AB_105846_ITEMS, "105846", {
  catalogBlendeCode: "UPK20",
});
const AB_105846_LAYOUT_ALIAS_ITEMS = AB_105846_ITEMS_WITH_SINK_END_BLENDE.map((item) => (
  item.code === "CAB-WALL-AB105846-H4502"
    ? {
      ...item,
      price: articlePriceWithBlende("H4502", "HPK2002", 1),
      infoText: "H4502 wall cabinet with HPK2002 filler panel; combined layout width 60 cm",
      blendeCode: "HPK2002",
      blendeLabel: "HPK2002 20 cm",
      blendePrice: blendePrice("HPK2002", 1),
    }
    : item
));

// AB 109873: straight 330 cm run traced from the supplied vector PDF. The
// white PDF callouts place rows 1-7 on the base run and rows 8-13 on the wall
// run. The two left-hand 60 cm faces form one locked SP120 sink cabinet and
// the two right-hand 45 cm faces form one locked US90 lower cabinet. The two
// right-hand upper faces form one optional H9002 wall cabinet. FRG and ASC
// select each pair together while keeping one commercial article per pair.
// The parenthesized Blenden use the centralized EUR 25 / EUR 35 schedule prices.
const AB_109873_ITEMS = [
  defaultOvenHob({ sortOrder: 10, widthMm: 600 }),
  defaultWorktop({ sortOrder: 20, widthMm: 3300, depthMm: 600 }),
  defaultSinkBase({ code: "SINK-BASE-AB109873-SP120", sortOrder: 30, widthMm: 1200, heightMm: 878, depthMm: 600, articleNumber: "SP120", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1), price: blendePrice("UPK20", 1), infoText: "Included SP120 sink cabinet with UPK20 filler panel" }),
  { itemType: ItemType.COMPONENT, code: "DISH-AB109873-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, infoText: "Fully integrated dishwasher incl. furniture front, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB109873-US90", name: "Lower Cabinet with Drawer 90 cm", nameDe: "Unterschrank mit Schublade 90 cm", price: articlePriceWithBlende("US90", "UPK20", 1), widthMm: 900, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 60, isLocked: true, infoText: "Included US90 lower cabinet with right UPK20 filler panel", articleNumber: "US90", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB109873-H6002-HPK2002-L", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 600, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002 wall cabinet with left HPK2002 filler panel", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "Passblende bis 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB109873-H6002-2", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 600, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB109873-H6002-3", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 600, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB109873-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 600, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "HD6002 cabinet, flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB109873-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB109873-H9002-HPK2002-R", name: "Upper Cabinet 90 cm", nameDe: "Oberschrank 90 cm", price: articlePriceWithBlende("H9002", "HPK2002", 1), widthMm: 900, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H9002 upper cabinet with right HPK2002 filler panel", articleNumber: "H9002", blendeCode: "HPK2002", blendeLabel: "Passblende bis 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 109874: mirrored L-shaped kitchen traced from the supplied vector PDF.
// Rows 1-5 and 8 are marked DEFAULT in the schedule and therefore remain locked.
const AB_109874_ITEMS = [
  defaultOvenHob({ sortOrder: 10, widthMm: 600 }),
  defaultWorktop({ sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB109874-DEFAULT", sortOrder: 30, widthMm: 1250, heightMm: 878, depthMm: 600, articleNumber: "SPEB125", infoText: "Included SPEB125 sink cabinet" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB109874-DEFAULT-UPK20", name: "Lower Cabinet 50 cm", nameDe: "Unterschrank 50 cm", price: blendePrice("UPK20", 1), widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "base_cabinet_plain", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, isLocked: true, infoText: "Included U50 lower cabinet with UPK20 filler panel", articleNumber: "U50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB109874-DEFAULT-2", name: "Lower Cabinet 60 cm", nameDe: "Unterschrank 60 cm", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "base_cabinet_plain", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 50, isLocked: true, infoText: "Included U60 lower cabinet", articleNumber: "U60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB109874-US60-UPEF65", name: "Base cabinet with drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 60, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "BLENDE-AB109874-UPEF65-DEFAULT", name: "Corner Filler Panel", nameDe: "Eckpassblende", price: "0.00", widthMm: 650, heightMm: 878, depthMm: 20, iconKey: "blende", colorKey: "#f0a500", componentKey: "corner-blende", sortOrder: 65, isLocked: true, infoText: "Included UPEF65 corner filler panel", articleNumber: "UPEF65", catalogPriceSyncMode: "LOCKED_INCLUDED", useCatalogArticle: false, preserveName: true },
  { itemType: ItemType.COMPONENT, code: "DISH-AB109874-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 70, infoText: "Fully integrated dishwasher incl. furniture front, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB109874-DEFAULT-3", name: "Lower Cabinet with Drawer 60 cm", nameDe: "Unterschrank mit Schublade 60 cm", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-4", sortOrder: 80, isLocked: true, infoText: "Included US60 lower cabinet with drawer", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB109874-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 90, infoText: "Freestanding fridge-freezer, 181 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB109874-H4002-HPK2002", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H4002", "HPK2002", 1), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, infoText: "H4002 wall cabinet with HPK2002 filler panel", articleNumber: "H4002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB109874-H6002-1", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 110, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB109874-H6002-2", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 120, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB109874-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 130, infoText: "HD6002 cabinet, flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB109874-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 132, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB109874-H6002-3", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 140, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 109955: straight four-module kitchen traced from the supplied vector PDF.
// Schedule rows 1, 2, 3 and 5 are DEFAULT and remain selected and locked.
const AB_109955_ITEMS = [
  defaultOvenHob({
    catalogArticleNumber: "A-EH923640E + 9EC744100C",
    infoText: "Built-in oven + ceramic cooktop",
    sortOrder: 10,
    widthMm: 600,
  }),
  defaultWorktop({ sortOrder: 20 }),
  { itemType: ItemType.COMPONENT, code: "SINK-BASE-AB109955-DEFAULT-UPK20", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: blendePrice("UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Included SP60 sink base cabinet with supplied UPK20 filler panel", articleNumber: "SP60", useCatalogArticle: false, preserveName: true, blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB109955-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: "579.00", widthMm: 600, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 40, infoText: "Fully integrated dishwasher incl. furniture front, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB109955-DEFAULT", name: "Lower Cabinet with Drawer 60 cm", nameDe: "Unterschrank mit Schublade 60 cm", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, isLocked: true, infoText: "Included US60 lower cabinet with drawer", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB109955-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: "579.00", heightMm: 1810, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "Freestanding fridge-freezer, 181 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB109955-H6002-HPK2002", name: "Wall Cabinet", nameDe: "Oberschrank", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002 wall cabinet with supplied HPK2002 filler panel", articleNumber: "H6002", catalogArticleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB109955-H6002-2", name: "Wall Cabinet", nameDe: "Oberschrank", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002 wall cabinet, 60 cm", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB109955-H6002-3", name: "Wall Cabinet", nameDe: "Oberschrank", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002 wall cabinet, 60 cm", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB109955-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002 cabinet, flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB109955-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// 670 104296: Excel callouts 1..7 are included. The customer's refrigerator
// and dishwasher are represented only by their supplied furniture. The cooker
// is one EHCX9330S-A appliance; UHS60 is its separate furniture cabinet.
const AB_104296_HOUSING_CLAIM_PARTS = [
  { partKey: "housing-top-front", name: "Tall cabinet top closing panel", nameDe: "Obere Abschlussblende für Hochschrank", articleCode: "DBK50", sourceComponentKey: "fridge-top-panel", sortOrder: 80 },
  { partKey: "housing-cabinet", name: "Refrigerator housing cabinet", nameDe: "Kühlschrankumbau", sortOrder: 81 },
  { partKey: "housing-side-panel", name: "Tall cabinet side filler panel", nameDe: "Seitliche Passblende für Hochschrank", articleCode: "SP20214K", sourceComponentKey: "fridge-side-filler", sortOrder: 85 },
];
const AB_104296_ITEMS = [
  defaultWorktop({ code: "TOP-AB104296", sortOrder: 10, catalogArticleNumber: "PLR60" }),
  defaultSinkBase({ code: "SINK-BASE-AB104296-SPDT60-R", sortOrder: 20, widthMm: 600, depthMm: 600, articleNumber: "SPDT60", catalogArticleNumber: "SPDT60" }),
  defaultSinkWorktop({ code: "FAUCET-AB104296", name: "Sink and faucet set", nameDe: "Spüle und Armatur", sortOrder: 22, articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", infoText: "Included BLANCO TIPO 45 S sink and faucet" }),
  { itemType: ItemType.COMPONENT, code: "FRONT-AB104296-TV60", name: "Furniture front for dishwasher", nameDe: "Möbelfront für kundeneigenen Geschirrspüler", price: "0.00", widthMm: 600, iconKey: "base_cabinet_plain", colorKey: "#001f7f", componentKey: "dishwasher-front", sortOrder: 30, isLocked: true, articleNumber: "TV60", catalogArticleNumber: "TV60", infoText: "Included furniture front only; dishwasher supplied by customer" },
  defaultOvenHob({ code: "OVEN-AB104296-SET", name: "Built-in oven and ceramic cooktop set", nameDe: "Einbauherd und Glaskeramikkochfeld", sortOrder: 40, widthMm: 600, articleNumber: "EHCX9330S-A", catalogArticleNumber: "EHCX9330S-A", infoText: "Included oven and ceramic cooktop as one appliance set" }),
  { itemType: ItemType.COMPONENT, code: "CAB-OVEN-AB104296-UHS60", name: "Lower cabinet for built-in oven", nameDe: "Herdunterschrank", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "base_cabinet_plain", colorKey: "springgreen", componentKey: "oven-cabinet", sortOrder: 42, isLocked: true, articleNumber: "UHS60", catalogArticleNumber: "UHS60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB104296-US2A30", name: "Lower Cabinet with Drawers", nameDe: "Unterschrank mit Schubladen", price: "0.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_three", colorKey: "#f0a500", componentKey: "drawer-module", sortOrder: 50, isLocked: true, articleNumber: "US2A30", catalogArticleNumber: "US2A30" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB104296-US2A50", name: "Lower Cabinet with Drawers", nameDe: "Unterschrank mit Schubladen", price: "0.00", widthMm: 500, depthMm: 600, iconKey: "drawer_base_three", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 60, isLocked: true, articleNumber: "US2A50", catalogArticleNumber: "US2A50" },
  { itemType: ItemType.COMPONENT, code: "BLENDE-AB104296-UPE65", name: "Corner filler panel", nameDe: "Eckpassblende Unterschrank", price: "0.00", iconKey: "blende", colorKey: "springgreen", componentKey: "corner-blende", sortOrder: 62, isLocked: true, catalogBlendeCode: "UPE65", articleNumber: "UPE65", catalogPriceSyncMode: "LOCKED_INCLUDED" },
  { itemType: ItemType.COMPONENT, code: "CAB-TALL-AB104296-GI88214-01-L", name: "Refrigerator housing cabinet", nameDe: "Geräteschrank für Kühlgerät", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "tall_cabinet", colorKey: "springgreen", componentKey: "fridge-cabinet", sortOrder: 70, isLocked: true, articleNumber: "GI88214-01", catalogArticleNumber: "GI88214-01", infoText: "Included housing with BLUM Aventos HK-S lift-up front, refrigerator furniture door, drawer, lower door and shelves; refrigerator supplied by customer" },
  { itemType: ItemType.COMPONENT, code: "PANEL-AB104296-SP20214K", name: "Tall cabinet side filler panel", nameDe: "Seitliche Passblende für Hochschrank", price: "0.00", widthMm: 91, iconKey: "blende", colorKey: "springgreen", componentKey: "fridge-side-filler", sortOrder: 72, isLocked: true, articleNumber: "SP20214K", catalogArticleNumber: "SP20214K", catalogPriceSyncMode: "LOCKED_INCLUDED", infoText: "Included side filler, cut to fit during installation" },
  { itemType: ItemType.COMPONENT, code: "PANEL-AB104296-DBK50", name: "Tall cabinet top closing panel", nameDe: "Obere Abschlussblende für Hochschrank", price: "0.00", widthMm: 600, heightMm: 425, iconKey: "blende", colorKey: "springgreen", componentKey: "fridge-top-panel", sortOrder: 74, isLocked: true, articleNumber: "DBK50", catalogArticleNumber: "DBK50", catalogPriceSyncMode: "LOCKED_INCLUDED" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104296-H6002-1", name: "Wall Cabinet", nameDe: "Oberschrank", price: "181.00", widthMm: 600, heightMm: 723, depthMm: null, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, articleNumber: "H6072", catalogArticleNumber: "H6072", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104296-H3002", name: "Wall Cabinet", nameDe: "Oberschrank", price: "124.00", widthMm: 300, heightMm: 723, depthMm: null, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, articleNumber: "H3072", catalogArticleNumber: "H3072" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB104296-HD6002", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: "346.00", widthMm: 600, heightMm: null, depthMm: null, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 100, articleNumber: "FH664621E+FWK124+HFLH6072", catalogArticleNumber: "FH664621E+FWK124+HFLH6072" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB104296-FH664621E", name: "Extractor Hood", price: "346.00", widthMm: 600, heightMm: null, depthMm: null, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, isActive: false, articleNumber: "FH664621E+FWK124+HFLH6072", catalogArticleNumber: "FH664621E+FWK124+HFLH6072" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104296-H6002-2", name: "Wall Cabinet", nameDe: "Oberschrank", price: "146.00", widthMm: 600, heightMm: 723, depthMm: null, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, articleNumber: "H6072", catalogArticleNumber: "H6072" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104296-H6002-3", name: "Wall Cabinet", nameDe: "Oberschrank", price: "146.00", widthMm: 600, heightMm: 723, depthMm: null, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, articleNumber: "H6072", catalogArticleNumber: "H6072" },
  ...defaultAccessories().map((item) => item.code === "ACC-CUTLERY-ZB60SG"
    ? { ...item, price: "20.00", articleNumber: "ZBE60", catalogArticleNumber: "ZBE60" }
    : item.code === "ACC-WASTE-001"
      ? { ...item, articleNumber: "Blanco Botton 517467", catalogArticleNumber: "Blanco Botton 517467" }
      : item),
  ...defaultServices(),
];

// 670 104332: supplier rows 1..8 are included; 9..12 are optional upper cabinets.
const AB_104332_ITEMS = [
  defaultWorktop({ code: "TOP-AB104332", sortOrder: 10, articleNumber: "AP60", catalogArticleNumber: "AP60", depthMm: 600 }),
  defaultSinkBase({ code: "SINK-BASE-AB104332-SPDT60-R", sortOrder: 60, widthMm: 600, depthMm: 600, articleNumber: "SPDT60", catalogArticleNumber: "SPDT60", infoText: "Included sink cabinet, left hinge (SPDT60 L)" }),
  defaultSinkWorktop({ code: "FAUCET-AB104332", name: "Sink and faucet set", nameDe: "Spüle und Armatur", sortOrder: 62, articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", infoText: "Included BLANCO TIPO 45 S sink and faucet" }),
  { itemType: ItemType.COMPONENT, code: "FRONT-AB104332-TV60", name: "Furniture front for dishwasher", nameDe: "Möbelfront für kundeneigenen Geschirrspüler", price: "0.00", widthMm: 600, iconKey: "base_cabinet_plain", colorKey: "#001f7f", componentKey: "dishwasher-front", sortOrder: 70, isLocked: true, articleNumber: "TV60", catalogArticleNumber: "TV60", infoText: "Included furniture front only; dishwasher supplied by customer" },
  defaultOvenHob({ code: "OVEN-AB104332-SET", name: "Built-in oven and ceramic cooktop set", nameDe: "Einbauherd und Glaskeramikkochfeld", sortOrder: 40, widthMm: 600, articleNumber: "EHCX9330S-A", catalogArticleNumber: "EHCX9330S-A", infoText: "Included oven and ceramic cooktop as one appliance set" }),
  { itemType: ItemType.COMPONENT, code: "CAB-OVEN-AB104332-UHS60", name: "Lower cabinet for built-in oven", nameDe: "Herdunterschrank", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "base_cabinet_plain", colorKey: "springgreen", componentKey: "oven-cabinet", sortOrder: 42, isLocked: true, articleNumber: "UHS60", catalogArticleNumber: "UHS60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB104332-US2A60-1", name: "Lower Cabinet with Drawers", nameDe: "Unterschrank mit Schubladen", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_three", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 30, isLocked: true, articleNumber: "US2A60", catalogArticleNumber: "US2A60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB104332-US2A60-2", name: "Lower Cabinet with Drawers", nameDe: "Unterschrank mit Schubladen", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_three", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 50, isLocked: true, articleNumber: "US2A60", catalogArticleNumber: "US2A60" },
  { itemType: ItemType.COMPONENT, code: "BLENDE-AB104332-UPEV", name: "Corner filler panel", nameDe: "Eckpassblende Unterschrank", price: "0.00", iconKey: "blende", colorKey: "springgreen", componentKey: "corner-blende", sortOrder: 52, isLocked: true, catalogBlendeCode: "UPEV", articleNumber: "UPEV", catalogPriceSyncMode: "LOCKED_INCLUDED" },
  { itemType: ItemType.COMPONENT, code: "CAB-TALL-AB104332-GI88214-01-L", name: "Refrigerator housing cabinet", nameDe: "Geräteschrank für Kühlgerät", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "tall_cabinet", colorKey: "springgreen", componentKey: "fridge-cabinet", sortOrder: 20, isLocked: true, articleNumber: "GI88214-01", catalogArticleNumber: "GI88214-01", infoText: "Included housing with BLUM Aventos HK-S lift-up front, refrigerator furniture door, drawer, lower door and shelves; refrigerator supplied by customer" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104332-H6002-1", name: "Wall Cabinet", nameDe: "Oberschrank", price: "146.00", widthMm: 600, heightMm: 723, depthMm: null, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, articleNumber: "H6072", catalogArticleNumber: "H6072" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB104332-HD6002", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: "346.00", widthMm: 600, heightMm: null, depthMm: null, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, articleNumber: "FH664621E+FWK124+HFLH6072", catalogArticleNumber: "FH664621E+FWK124+HFLH6072" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB104332-FH664621E", name: "Extractor Hood", price: "346.00", widthMm: 600, heightMm: null, depthMm: null, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, isActive: false, articleNumber: "FH664621E+FWK124+HFLH6072", catalogArticleNumber: "FH664621E+FWK124+HFLH6072" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104332-H6002-2", name: "Wall Cabinet", nameDe: "Oberschrank", price: "146.00", widthMm: 600, heightMm: 723, depthMm: null, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, articleNumber: "H6072", catalogArticleNumber: "H6072" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104332-H6002-3", name: "Wall Cabinet", nameDe: "Oberschrank", price: "181.00", widthMm: 600, heightMm: 723, depthMm: null, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, articleNumber: "H6072", catalogArticleNumber: "H6072", blendeCode: "HP2072K", blendeLabel: "HP2072K", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB104332-UVADT20-01-R", name: "Lower pull-out cabinet", nameDe: "Unterschrank mit Auszug", price: "0.00", widthMm: 200, depthMm: 600, iconKey: "base_cabinet_plain", colorKey: "springgreen", componentKey: "drawer-module", sortOrder: 80, isLocked: true, articleNumber: "UVADT20-01", catalogArticleNumber: "UVADT20-01", infoText: "Included pull-out cabinet, right hinge" },
  { itemType: ItemType.COMPONENT, code: "BLENDE-AB104332-UP10K", name: "Lower cabinet end filler", nameDe: "Passblende Unterschrank", price: "0.00", iconKey: "blende", colorKey: "springgreen", componentKey: "end-blende", sortOrder: 82, isLocked: true, articleNumber: "UP10K", catalogBlendeCode: "UP10K", catalogPriceSyncMode: "LOCKED_INCLUDED" },
  ...defaultAccessories().map((item) => item.code === "ACC-CUTLERY-ZB60SG"
    ? { ...item, price: "20.00", articleNumber: "ZBE60", catalogArticleNumber: "ZBE60" }
    : item.code === "ACC-WASTE-001"
      ? { ...item, articleNumber: "Blanco Botton 517467", catalogArticleNumber: "Blanco Botton 517467" }
      : item),
  ...defaultServices(),
];


// Protect all eight supplied DEFAULT rows from optional catalog prices.
for (const item of AB_104332_ITEMS) {
  if (item.isLocked) item.catalogPriceSyncMode = "LOCKED_INCLUDED";
}

// 670 101246: the supplier schedule has ten included rows. The catalog
// articles below identify the visible modules inferred from their plan widths;
// the two priced schedule rows are the dishwasher (4) and refrigerator (7).
const AB_101246_ITEMS = [
  defaultWorktop({ code: "TOP-AB101246", sortOrder: 10, widthMm: 2650, depthMm: 600, catalogArticleNumber: "PLR60" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB101246-US50-DEFAULT", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: "0.00", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, isLocked: true, infoText: "Included left cabinet and narrow end filler", articleNumber: "US50", catalogArticleNumber: "US50" },
  defaultSinkBase({ code: "SINK-BASE-AB101246-SP50", sortOrder: 30, widthMm: 500, heightMm: 878, depthMm: 600, articleNumber: "SP50", catalogArticleNumber: "SP50", infoText: "Included 50 cm sink cabinet" }),
  { itemType: ItemType.COMPONENT, code: "DISH-AB101246-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: "586.00", widthMm: 600, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 40, infoText: "Fully integrated dishwasher with furniture front", articleNumber: "A-EGSPV597210 + TGV60", catalogArticleNumber: "A-EGSPV597210 + TGV60" },
  defaultOvenHob({ code: "OVEN-AB101246-DEFAULT", sortOrder: 50, widthMm: 600, catalogArticleNumber: "A-EH923640E + 9EC744100C", articleNumber: "A-EH923640E + 9EC744100C", infoText: "Included oven, ceramic cooktop and lower drawer" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB101246-U40-DEFAULT", name: "Lower Cabinet", nameDe: "Unterschrank", price: "0.00", widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "base_cabinet_plain", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 60, isLocked: true, infoText: "Included right lower cabinet", articleNumber: "U40", catalogArticleNumber: "U40" },
  { itemType: ItemType.COMPONENT, code: "REF-AB101246-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), heightMm: 1810, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Freestanding fridge-freezer", articleNumber: "OL-KGCN388140E", catalogArticleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB101246-H10072-DEFAULT", name: "Wall Cabinet", nameDe: "Oberschrank", price: "0.00", widthMm: 1000, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, isLocked: true, infoText: "Included Burger 100 cm wall cabinet with two doors", articleNumber: "H10072", catalogArticleNumber: "H10072" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB101246-H6002-DEFAULT", name: "Wall Cabinet", nameDe: "Oberschrank", price: "0.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, isLocked: true, infoText: "Included Burger 60 cm wall cabinet", articleNumber: "H6072", catalogArticleNumber: "H6072" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB101246-DEFAULT", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: "0.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 110, isLocked: true, infoText: "Included Burger hood cabinet and extractor", articleNumber: "FH664621E+FWK124+HFLH6072", displayArticleNumber: "FH664621E + FWK124 + HFLH6072", catalogArticleNumber: "FH664621E+FWK124+HFLH6072" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB101246-FH664621E", name: "Extractor Hood", price: "0.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, isLocked: true, isActive: false, infoText: "Extractor included with wall cabinet 11", articleNumber: "FH664621E+FWK124+HFLH6072", catalogArticleNumber: "FH664621E+FWK124+HFLH6072" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB101246-H4002-DEFAULT", name: "Wall Cabinet", nameDe: "Oberschrank", price: "0.00", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, isLocked: true, infoText: "Included Burger right wall cabinet", articleNumber: "H4072", catalogArticleNumber: "H4072" },
  defaultSinkWorktop({ code: "FAUCET-AB101246", sortOrder: 130, name: "Sink and faucet set", nameDe: "Spüle und Armatur", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", infoText: "Included sink and faucet" }),
  ...defaultAccessories().map((item) => item.code === "ACC-CUTLERY-ZB60SG"
    ? { ...item, price: "20.00", articleNumber: "ZBE60", catalogArticleNumber: "ZBE60" }
    : item.code === "ACC-WASTE-001"
      ? { ...item, articleNumber: "Blanco Botton 517467", catalogArticleNumber: "Blanco Botton 517467" }
      : item),
  ...defaultServices(),
];

// ASC replacement parts use their own article identities. Keep the Burger
// kitchen items above unchanged: they define the configurator and orders.
const AB_101246_CLAIM_PARTS = [
  { partKey: "sink-cabinet", articleCode: "SPDT50", name: "Sink Lower Cabinet 50 cm", nameDe: "Spülen-Unterschrank 50 cm", sourceKitchenItemCode: "SINK-BASE-AB101246-SP50", sourceComponentKey: "sink-base", sortOrder: 20 },
  { partKey: "faucet", articleCode: "519723", name: "Kitchen Faucet", nameDe: "Küchenarmatur", sourceKitchenItemCode: "FAUCET-AB101246", sourceComponentKey: "sink-faucet", sortOrder: 30 },
  { partKey: "filter", articleCode: "KF17146", name: "Extractor Hood Filter", nameDe: "Filter für Dunstabzugshaube", sourceKitchenItemCode: "CAB-HOOD-AB101246-DEFAULT", sourceComponentKey: "wall-cabinet-4", sortOrder: 35 },
  { partKey: "oven", articleCode: "EH9236SM-A", name: "Built-in Oven", nameDe: "Einbauherd", sourceKitchenItemCode: "OVEN-AB101246-DEFAULT", sourceComponentKey: "oven-module", sortOrder: 40 },
  { partKey: "oven-drawer", articleCode: "UH60", name: "Lower Cabinet for Built-in Oven", nameDe: "Unterschrank für Einbauherde", sourceKitchenItemCode: "OVEN-AB101246-DEFAULT", sourceComponentKey: "oven-module", sortOrder: 45 },
  { partKey: "cooktop", articleCode: "9EC744100E", name: "Ceramic Cooktop 60 cm", nameDe: "Glaskeramikkochfeld 60 cm", sourceKitchenItemCode: "OVEN-AB101246-DEFAULT", sourceComponentKey: "oven-module", sortOrder: 50 },
  { partKey: "cabinet-base-module-2", articleCode: "UDT40", name: "Lower Cabinet 40 cm", nameDe: "Unterschrank 40 cm", sourceKitchenItemCode: "CAB-BASE-AB101246-U40-DEFAULT", sourceComponentKey: "base-module-2", sortOrder: 60 },
  { partKey: "cabinet-extractor-hood", articleCode: "9FH17161E", name: "Extractor Hood", nameDe: "Flachschirmhaube", sourceKitchenItemCode: "CAB-HOOD-AB101246-DEFAULT", sourceComponentKey: "extractor-hood", sortOrder: 112 },
  { partKey: "blende-wall-cabinet-1", articleCode: "HP1072K", name: "Filler Panel for Upper Cabinet", nameDe: "Passblende Hängeschrank", sourceKitchenItemCode: "CAB-WALL-AB101246-H10072-DEFAULT", sourceComponentKey: "wall-cabinet-1", sortOrder: 80 },
  { partKey: "blende-base-module-1", articleCode: "UP10K", name: "Filler Panel for Lower Cabinet", nameDe: "Passblende Unterschrank", sourceKitchenItemCode: "CAB-BASE-AB101246-US50-DEFAULT", sourceComponentKey: "base-module-1", sortOrder: 21 },
];

// AB 110402: straight 30/60/60/40/40/40 cm kitchen traced from the supplied
// vector PDF. Supplier rows 1, 2, 3, 4, 6 and 7 are DEFAULT and remain locked.
const AB_110402_ITEMS = [
  defaultOvenHob({ catalogArticleNumber: "A-EH923640E + 9EC744100C", infoText: "Built-in oven + ceramic cooktop", sortOrder: 10, widthMm: 600 }),
  defaultWorktop({ sortOrder: 20, widthMm: 3200, depthMm: 600 }),
  defaultSinkBase({ code: "SINK-BASE-AB110402-DEFAULT", name: "Sink Base Cabinet 80 cm", nameDe: "Spülenschrank 80 cm", sortOrder: 30, widthMm: 800, heightMm: 878, depthMm: 600, articleNumber: "SPB80", infoText: "Included SPB80 sink cabinet with two connected fronts" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB110402-DEFAULT-UPK20-1", name: "Lower Cabinet 30 cm", nameDe: "Unterschrank 30 cm", price: blendePrice("UPK20", 1), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, isLocked: true, infoText: "Included U30 lower cabinet with left UPK20 filler panel", articleNumber: "U30", useCatalogArticle: false, preserveName: true, blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB110402-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, infoText: "Fully integrated dishwasher incl. furniture front", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB110402-DEFAULT-UPK20-2", name: "Lower Cabinet with Drawer 40 cm", nameDe: "Unterschrank mit Schublade 40 cm", price: blendePrice("UPK20", 1), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, isLocked: true, infoText: "Included US40 lower cabinet with right UPK20 filler panel", articleNumber: "US40", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110402-H3002-HPK2002", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H3002", "HPK2002", 1), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H3002 wall cabinet with left HPK2002 filler panel", articleNumber: "H3002", catalogArticleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB110402-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 600, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002 cabinet, flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB110402-FH664621E", name: "FH664621E Extractor Hood", nameDe: "FH664621E Flachschirmhaube", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood + cabinet + filter", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110402-H6002", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 600, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110402-H4002-1", name: "Upper Cabinet 80 cm", nameDe: "Oberschrank 80 cm", price: articlePrice("H8002"), widthMm: 800, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H8002 upper cabinet with two connected fronts", articleNumber: "H8002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110402-H4002-HPK2002", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H4002", "HPK2002", 1), widthMm: 400, heightMm: 600, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H4002 wall cabinet with right HPK2002 filler panel", articleNumber: "H4002", catalogArticleNumber: "H4002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 110401: L-shaped kitchen traced from the supplied vector PDF. Schedule
// rows 1-5, 7 and 8 are DEFAULT and remain selected and locked.
const AB_110401_ITEMS = [
  defaultOvenHob({ catalogArticleNumber: "A-EH923640E + 9EC744100C", infoText: "Built-in oven + ceramic cooktop", sortOrder: 10, widthMm: 600 }),
  defaultWorktop({ sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB110401-DEFAULT", name: "Sink Base Cabinet 90 cm", nameDe: "Spülenschrank 90 cm", sortOrder: 30, widthMm: 900, heightMm: 878, depthMm: 600, articleNumber: "SPB90", infoText: "Included SPB90 sink cabinet with two connected fronts" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB110401-DEFAULT-UPK20-1", name: "Lower Cabinet with Drawer 45 cm", nameDe: "Unterschrank mit Schublade 45 cm", price: "0.00", widthMm: 450, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, isLocked: true, infoText: "Included US45 lower cabinet with separate UPK20 filler panel to the left of the sink", articleNumber: "US45", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB110401-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 60, infoText: "Fully integrated dishwasher incl. furniture front, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB110401-DEFAULT-3", name: "Lower Cabinet 60 cm", nameDe: "Unterschrank 60 cm", price: "0.00", widthMm: 1150, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, isLocked: true, infoText: "Included UE115 lower cabinet, displayed as 60 cm", articleNumber: "UE115", preserveName: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB110401-DEFAULT-UPK20-2", name: "Lower Cabinet with Drawer 60 cm", nameDe: "Unterschrank mit Schublade 60 cm", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-4", sortOrder: 80, isLocked: true, infoText: "Included US60 lower cabinet with separate UPK20 filler panel at the far right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110401-H4502-1", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H4502"), widthMm: 450, heightMm: 600, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H4502 wall cabinet, 45 x 60 cm", articleNumber: "H4502" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110401-H4502-2", name: "Upper Cabinet 90 cm", nameDe: "Oberschrank 90 cm", price: articlePrice("H9002"), widthMm: 900, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "H9002 upper cabinet with two connected fronts", articleNumber: "H9002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110401-H6002-1", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 600, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H6002 wall cabinet, 60 x 60 cm", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB110401-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 600, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "HD6002 cabinet, flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB110401-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 132, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110401-H6002-HPK2002", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 600, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002 wall cabinet with HPK2002 filler panel, 60 x 60 cm", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "Passblende bis 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];
const AB_105758_ITEMS_WITH_SINK_END_BLENDE = withSinkEndBlende(AB_105758_ITEMS, "105758");

const AB_105831_ITEMS = [

  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", widthMm: 600, heightMm: null, depthMm: null, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  defaultSinkBase({ sortOrder: 30, widthMm: 600 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-US30-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US30 base storage cabinet, hinge right", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105831-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-US60-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPEF65", 1), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "BLENDE-AB105831-CORNER-LEFT", articleNumber: "UPK20", catalogBlendeCode: "UPK20", name: "Filler Panel up to 20 cm", nameDe: "Passblende bis 20 cm", price: blendePrice("UPK20", 1), widthMm: 200, iconKey: "blende", colorKey: "#f0a500", componentKey: "corner-blende", sortOrder: 65, infoText: "Separate left UPK20 filler panel at the inside corner" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-500-L", name: "Base cabinet with drawer", price: articlePrice("US50"), widthMm: 500, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "Base cabinet, hinge left", articleNumber: "US50" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-US30-L", name: "Base cabinet with drawer", price: articlePrice("US30"), widthMm: 300, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-4", sortOrder: 80, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105831-KGCN388140E", name: "Freestanding refrigerator 178 cm", nameDe: "Standkühlschrank 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 90, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105831-H6002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105831-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105831-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105831-500-L", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 120, infoText: "Wall cabinet, hinge left", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105831-H3002-L", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, infoText: "H3002, hinge left", articleNumber: "H3002" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 110140: L-shaped vector plan with six supplier-schedule DEFAULT rows.
// The plan's white callout labels place row 4 on the tall left-hand refrigerator
// and rows 3/5/6/7 on the lower run, so component keys follow those source marks.
const AB_110140_ITEMS = [
  defaultOvenHob({ catalogArticleNumber: "A-EH923640E + 9EC744100C", infoText: "Built-in oven + ceramic cooktop", sortOrder: 10, widthMm: 600 }),
  defaultWorktop({ sortOrder: 20 }),
  defaultSinkBase({
    // Preserve callout 3 instead of normalizing to the shared legacy sink code,
    // whose global photo label is 8 in older kitchens.
    code: "SINK-BASE-AB110140-DEFAULT",
    sortOrder: 30,
    widthMm: 1100,
    heightMm: 878,
    depthMm: 600,
    articleNumber: "SPEB110",
    infoText: "Included SPEB110 sink cabinet",
  }),
  { itemType: ItemType.COMPONENT, code: "REF-AB110140-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: "579.00", heightMm: 1810, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 181 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB110140-DEFAULT-SINK-RUN", name: "Lower Cabinet 45 cm", nameDe: "Unterschrank 45 cm", price: "0.00", widthMm: 450, heightMm: 878, depthMm: 600, iconKey: "base_cabinet_plain", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, isLocked: true, infoText: "Included U45 lower cabinet to the left of the sink", articleNumber: "U45" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB110140-DEFAULT-LEFT", name: "Lower Cabinet with Drawer 60 cm", nameDe: "Unterschrank mit Schublade 60 cm", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, isLocked: true, infoText: "Included US60 lower cabinet with UPEF65 corner filler panel", articleNumber: "US60", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB110140-DEFAULT-RIGHT", name: "Lower Cabinet 50 cm", nameDe: "Unterschrank 50 cm", price: "0.00", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "base_cabinet_plain", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, isLocked: true, infoText: "Included U50 lower cabinet at the far right", articleNumber: "U50" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110140-H6002-HPK2002", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002 wall cabinet with the supplied HPK2002 filler panel", articleNumber: "H6002", catalogArticleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110140-H6002", name: "Wall Cabinet", nameDe: "Oberschrank", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "H6002 wall cabinet, 60 cm", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB110140-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "HD6002 cabinet, flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB110140-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110140-H5002", name: "Wall Cabinet", nameDe: "Oberschrank", price: "135.00", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H5002 wall cabinet, 50 cm", articleNumber: "H5002" },
  defaultSinkWorktop({ sortOrder: 120 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 110510: L-shaped vector plan with six supplier-schedule DEFAULT rows.
// Rows 6, 7, and 11 include commercially linked Blenden whose bracketed
// amounts are added to the source cabinet price.
const AB_110510_ITEMS = [
  defaultOvenHob({ catalogArticleNumber: "A-EH923640E + 9EC744100C", infoText: "Built-in oven + ceramic cooktop", sortOrder: 10, widthMm: 600 }),
  defaultWorktop({ sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB110510-DEFAULT", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", componentKey: "sink-base", sortOrder: 30, widthMm: 1100, heightMm: 878, depthMm: 600, articleNumber: "SPEB110", infoText: "Included SPEB110 sink cabinet" }),
  { itemType: ItemType.COMPONENT, code: "REF-AB110510-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: "579.00", heightMm: 1810, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 181 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB110510-DEFAULT-LEFT", name: "Lower Cabinet 40 cm", nameDe: "Unterschrank 40 cm", price: "0.00", widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "base_cabinet_plain", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, isLocked: true, infoText: "Included U40 lower cabinet to the left of the oven", articleNumber: "U40", useCatalogArticle: false, preserveName: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB110510-DEFAULT-CORNER", name: "Lower Cabinet 45 cm", nameDe: "Unterschrank 45 cm", price: blendePrice("UPEF65", 1), widthMm: 450, heightMm: 878, depthMm: 600, iconKey: "base_cabinet_plain", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, isLocked: true, infoText: "Included U45 lower cabinet with UPEF65 corner filler panel", articleNumber: "U45", useCatalogArticle: false, preserveName: true, blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB110510-DEFAULT-SINK-RUN", name: "Lower Cabinet with Drawer 50 cm", nameDe: "Unterschrank mit Schublade 50 cm", price: blendePrice("UPK20", 1), widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, isLocked: true, infoText: "Included US50 lower cabinet with drawer and UPK20 filler panel", articleNumber: "US50", preserveName: true, blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110510-H4502", name: "Wall Cabinet", nameDe: "Oberschrank", price: "139.00", widthMm: 450, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H4502 wall cabinet, 45 cm", articleNumber: "H4502" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB110510-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002 cabinet, flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB110510-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110510-H4002", name: "Wall Cabinet", nameDe: "Oberschrank", price: "130.00", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H4002 wall cabinet, 40 cm", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB110510-H6002-HPK2002", name: "Wall Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002 wall cabinet with HPK2002 filler panel", articleNumber: "H6002", catalogArticleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 120 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 111539: L-shaped kitchen from the supplied vector PDF and schedule.
// SP50, US40 and U30 are supplier DEFAULT cabinets and therefore stay locked
// in FRG while remaining separate physical targets in the ASC claim plan.
const AB_111539_ITEMS = [
  defaultOvenHob({ catalogArticleNumber: "A-EH923640E + 9EC744100C", infoText: "Built-in oven + ceramic cooktop", sortOrder: 10, widthMm: 600 }),
  defaultWorktop({ sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB111539-SP50", name: "Sink Lower Cabinet 50 cm", nameDe: "Spülenunterschrank 50 cm", sortOrder: 30, widthMm: 500, heightMm: 878, depthMm: 600, articleNumber: "SP50", catalogArticleNumber: "SP50", infoText: "Included SP50 sink cabinet with UPK20 filler panel", blendeCode: "UPK20", blendeLabel: "UPK20 Filler panel", blendePrice: "0.00" }),
  { itemType: ItemType.COMPONENT, code: "DISH-AB111539-450", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: "450.00", widthMm: 450, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 40, infoText: "Fully integrated dishwasher incl. TGV45 furniture front, 45 cm", articleNumber: "A-EGSPV587915 + TGV45" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB111539-US40-DEFAULT", name: "Lower Cabinet with Drawer 40 cm", nameDe: "Unterschrank mit Schublade 40 cm", price: "183.00", widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, isLocked: true, infoText: "Included US40 lower cabinet with UPEF65 corner filler panel", articleNumber: "US40", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: "0.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB111539-U30-DEFAULT", name: "Lower Cabinet 30 cm", nameDe: "Unterschrank 30 cm", price: "0.00", widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "base_cabinet_plain", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 60, isLocked: true, infoText: "Included U30 lower cabinet with UPK20 filler panel", articleNumber: "U30", useCatalogArticle: false, preserveName: true, blendeCode: "UPK20", blendeLabel: "UPK20 Filler panel", blendePrice: "0.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB111539-H6002-HPK2002", name: "Wall Cabinet", nameDe: "Oberschrank", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002 wall cabinet with supplied HPK2002 filler panel", articleNumber: "H6002", catalogArticleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "Passblende bis 20 cm", blendePrice: "0.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB111539-H4002", name: "Wall Cabinet", nameDe: "Oberschrank", price: "130.00", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H4002 wall cabinet", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB111539-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "HD6002 cabinet, flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB111539-FH664621E", name: "FH664621E Extractor Hood", nameDe: "FH664621E Flachschirmhaube", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB111539-H3002-HPK2002", name: "Wall Cabinet", nameDe: "Oberschrank", price: "115.00", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "H3002 wall cabinet with supplied HPK2002 filler panel", articleNumber: "H3002", catalogArticleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "Passblende bis 20 cm", blendePrice: "0.00" },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105825_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", widthMm: 600, heightMm: null, depthMm: null, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-base", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  defaultSinkBase({ sortOrder: 30, widthMm: 600 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US30-R", name: "Base cabinet with drawer", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US30 base storage cabinet, hinge right", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105825-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US60-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPEF65", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US60-L", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US30-L", name: "Base cabinet with drawer", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-base", sortOrder: 80, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105825-KGCN388140E", name: "Freestanding refrigerator 178 cm", nameDe: "Standkühlschrank 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 90, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105825-H6002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105825-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105825-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105825-H6002-L", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105825-H3002-L", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, infoText: "H3002, hinge left, 2 adjustable shelves", articleNumber: "H3002" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105825_ITEMS_WITH_US30_BLENDE = AB_105825_ITEMS.map((item) => (
  item.code === "CAB-BASE-AB105825-US30-R"
    ? {
      ...item,
      price: articlePriceWithBlende("US30", "UPK20", 1),
      blendeCode: "UPK20",
      blendeLabel: "UPK20 20 cm",
      blendePrice: blendePrice("UPK20", 1),
    }
    : item
));

const cloneAB105825ItemsForKitchen = (kitchenNumber) =>
  AB_105825_ITEMS.map((item) => ({
    ...item,
    code: item.code.replaceAll("AB105825", `AB${kitchenNumber}`),
  }));

const AB_105822_ITEMS = cloneAB105825ItemsForKitchen("105822").map((item) => (
  item.code === "CAB-BASE-AB105822-US30-R"
    ? {
      ...item,
      price: articlePriceWithBlende("US30", "UPK20", 1),
      blendeCode: "UPK20",
      blendeLabel: "UPK20 20 cm",
      blendePrice: blendePrice("UPK20", 1),
    }
    : item
));
const AB_105828_ITEMS = cloneAB105825ItemsForKitchen("105828");

const AB_105811_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105811-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105811-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105811-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105811-1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105811-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105811-3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 E"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105815_ITEMS = AB_105811_ITEMS.map((item) => ({
  ...item,
  code: item.code.replace("AB105811", "AB105815"),
}));

// AB 105760-61: straight four-unit run with the refrigerator on the right.
// Schedule rows 1-3 are the included oven, worktop, and sink cabinet. The
// separately priced UPK20 is the slim left end filler beside the sink.
const AB_105760_ITEMS = [
  defaultOvenHob({ catalogArticleNumber: "A-EH923640E + 9EC744100C", infoText: "A-EH923640E oven, 9EC744100C ceramic cooktop and UHK lower cabinet", widthMm: 600, sortOrder: 10 }),
  defaultWorktop({ sortOrder: 20 }),
  defaultSinkBase({ widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30 }),
  sinkEndBlende("105760", { sortOrder: 40, catalogBlendeCode: "UPK20" }),
  { itemType: ItemType.COMPONENT, code: "DISH-AB105760-600", name: "Fully integrated dishwasher incl. furniture front", nameDe: "Vollintegrierter Geschirrspüler inkl. Möbelfront", price: "579.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, infoText: "Fully integrated dishwasher incl. furniture front, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105760-US60", name: "Lower Cabinet with Drawer 60 cm", nameDe: "Unterschrank mit Schublade 60 cm", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 60, infoText: "US60 lower cabinet at the right end of the run", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105760-KGCN388140E", name: "Freestanding refrigerator", nameDe: "Standkühlschrank", price: "579.00", widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Freestanding fridge-freezer, 181 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105760-H6002-HPK2002", name: "Upper Cabinet 60 cm", nameDe: "Oberschrank 60 cm", price: "149.00", widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002 upper cabinet with supplied HPK2002 filler panel", articleNumber: "H6002", catalogArticleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 (35E)", blendePrice: "0.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105760-H6002-2", name: "Upper Cabinet 60 cm", nameDe: "Oberschrank 60 cm", price: "149.00", widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "H6002 upper cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105760-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: "349.00", widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "FH664621E extractor hood, FWK124 filter, and HD6002 upper cabinet", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105760-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 E", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105760-H6002-4", name: "Upper Cabinet 60 cm", nameDe: "Oberschrank 60 cm", price: "149.00", widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002 upper cabinet", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 120 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105761-62: mirrored counterpart of AB 105760 with the refrigerator on
// the left. All eleven supplier-schedule rows are linked to their catalog
// article or Blende records; rows 1-3 remain included/locked.
const AB_105761_ITEMS = [
  defaultOvenHob({
    articleNumber: "A-EH923640E + 9EC744100C",
    catalogArticleNumber: "A-EH923640E + 9EC744100C",
    infoText: "A-EH923640E oven, 9EC744100C ceramic cooktop and UHK lower cabinet",
    widthMm: 600,
    sortOrder: 10,
  }),
  defaultWorktop({ code: "TOP-AB105761", sortOrder: 20, catalogArticleNumber: "PLR60" }),
  { itemType: ItemType.COMPONENT, code: "SINK-BASE-AB105761-SP60", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Included SP60 sink base cabinet", articleNumber: "SP60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105761-KGCN388140E", name: "Freestanding refrigerator", nameDe: "Standkühlschrank", price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Freestanding fridge-freezer, 181 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105761-US60", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 lower cabinet at the left end of the run", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105761-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 60, infoText: "Fully integrated dishwasher incl. furniture front, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  sinkEndBlende("105761", { sortOrder: 70, catalogBlendeCode: "UPK20" }),
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105761-H6002-1", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002 upper cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105761-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "FH664621E extractor hood, FWK124 filter, and HD6002 upper cabinet", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105761-FH664621E", name: "FH664621E Extractor Hood", nameDe: "FH664621E Flachschirmhaube", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105761-H6002-3", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002 upper cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105761-H6002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002 upper cabinet with supplied HPK2002 filler panel", articleNumber: "H6002", catalogArticleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 (35E)", blendePrice: "0.00" },
  defaultSinkWorktop({ sortOrder: 120, catalogArticleNumber: "526335 + 517720" }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const cloneAB105761ItemsForKitchen = (kitchenNumber) =>
  AB_105761_ITEMS.map((item) => ({
    ...item,
    code: item.code.replaceAll("AB105761", `AB${kitchenNumber}`),
  }));

const AB_105765_ITEMS = cloneAB105761ItemsForKitchen("105765");
const AB_105769_ITEMS = cloneAB105761ItemsForKitchen("105769");

const cloneAB105760ItemsForKitchen = (kitchenNumber) =>
  AB_105760_ITEMS.map((item) => ({
    ...item,
    code: item.code.replaceAll("AB105760", `AB${kitchenNumber}`),
  }));

const AB_105764_ITEMS = cloneAB105760ItemsForKitchen("105764");
const AB_105768_ITEMS = cloneAB105760ItemsForKitchen("105768");
const AB_105772_ITEMS = cloneAB105760ItemsForKitchen("105772");

// AB 105776-66: straight elevation with the refrigerator on the left.
// Supplier schedule rows 1-3 are the included oven, worktop, and sink cabinet.
// The right-end UPK20 remains a separate catalog-linked customer selection.
const AB_105776_ITEMS = [
  defaultOvenHob({
    articleNumber: "A-EH923640E + 9EC744100C",
    catalogArticleNumber: "A-EH923640E + 9EC744100C",
    infoText: "A-EH923640E oven, 9EC744100C ceramic cooktop and UHK lower cabinet",
    widthMm: 600,
    sortOrder: 10,
  }),
  defaultWorktop({ code: "TOP-AB105776", sortOrder: 20, catalogArticleNumber: "PLR60" }),
  defaultSinkBase({
    code: "SINK-BASE-AB105776-SP60",
    widthMm: 600,
    heightMm: 878,
    depthMm: 600,
    articleNumber: "SP60",
    catalogArticleNumber: "SP60",
    infoText: "Included SP60 sink base cabinet",
    sortOrder: 30,
  }),
  { itemType: ItemType.COMPONENT, code: "REF-AB105776-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Freestanding fridge-freezer, 181 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105776-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, infoText: "Fully integrated dishwasher incl. furniture front, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105776-US60", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 60, infoText: "US60 lower cabinet with drawer", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105776-US50", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US50"), widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 70, infoText: "US50 lower cabinet with drawer", articleNumber: "US50" },
  sinkEndBlende("105776", { sortOrder: 80, catalogBlendeCode: "UPK20" }),
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105776-H6002-1", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002 upper cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105776-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002 cabinet, FH664621E flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105776-FH664621E", name: "FH664621E Extractor Hood", nameDe: "FH664621E Flachschirmhaube", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105776-H6002-2", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002 upper cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105776-H5002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H5002 upper cabinet", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105776-H6002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002 upper cabinet with supplied HPK2002 filler panel", articleNumber: "H6002", catalogArticleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 (35E)", blendePrice: "0.00" },
  defaultSinkWorktop({ sortOrder: 140, catalogArticleNumber: "526335 + 517720" }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// 670 105778: supplier callouts 1..10, measured from the vector elevation.
// SP50 R uses the SP50 catalog article; the right hinge is retained in its note.
// The independently scheduled UPK20 stays selectable; HPK2002 belongs to H5002.
const AB_105778_ITEMS = [
  defaultOvenHob({
    catalogArticleNumber: "A-EH923640E + 9EC744100C",
    widthMm: 600,
    heightMm: 878,
    depthMm: 600,
    sortOrder: 10,
    infoText: "Supplier EH92364E-A oven (catalog A-EH923640E), 9EC744100C cooktop and UHK lower cabinet",
    catalogPriceSyncMode: "LOCKED_INCLUDED",
  }),
  defaultWorktop({ code: "TOP-AB105778", sortOrder: 20, catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED" }),
  defaultSinkBase({
    code: "SINK-BASE-AB105778-SP50-R",
    articleNumber: "SP50",
    catalogArticleNumber: "SP50",
    widthMm: 500,
    heightMm: 878,
    depthMm: 600,
    sortOrder: 30,
    infoText: "Included SP50 R sink base cabinet, hinge right",
    catalogPriceSyncMode: "LOCKED_INCLUDED",
  }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105778-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US40 lower cabinet with drawer", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105778-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, infoText: "Fully integrated dishwasher incl. furniture front, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  sinkEndBlende("105778", { sortOrder: 60, catalogBlendeCode: "UPK20" }),
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105778-H4002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H4002 upper cabinet", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105778-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "HD6002 cabinet, FH664621E flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105778-FH664621E", name: "FH664621E Extractor Hood", nameDe: "FH664621E Flachschirmhaube", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 82, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105778-H6002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002 upper cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105778-H5002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "H5002 upper cabinet with HPK2002 end filler panel", articleNumber: "H5002", catalogArticleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 110, catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED" }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// 670 105789: eleven supplier rows, with cabinet fillers linked to the catalog;
// the standalone UPK20 keeps its own supplier callout and selection.
const AB_105789_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105789", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105789-SP60-R", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge right (SP60 R)" }),
  { itemType: ItemType.COMPONENT, code: "REF-AB105789-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, articleNumber: "OL-KGCN388140E" },
  sinkEndBlende("105789", { code: "BLENDE-AB105789-OVEN-END", componentKey: "base-end-blende", sortOrder: 50, catalogBlendeCode: "UPK20", infoText: "Standalone UPK20 between refrigerator and oven" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105789-US30-UPK20-1", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US30", "UPK20"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 60, articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20"), infoText: "US30 lower cabinet with UPK20 filler on the oven leg" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105789-600-UPEF65", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPEF65"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 70, articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPEF65", blendeLabel: "UPEF65", blendePrice: blendePrice("UPEF65"), infoText: "Dishwasher incl. furniture front and UPEF65 corner filler" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105789-US30-UPK20-2", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US30", "UPK20"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 80, articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20"), infoText: "US30 lower cabinet with UPK20 at the right end" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105789-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-1", sortOrder: 90, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105789-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105789-H3002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H3002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 100, articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105789-H6002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002"), infoText: "H6002 upper cabinet with HPK2002 end filler" },
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105789", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, right orientation (526335 R), and 517720 faucet" }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105790: two separate perspective blocks; supplier rows 1-4 are included.
const AB_105790_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105790", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105790-SP60-L", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge left (SP60 L)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105790", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, left orientation (526335 L), and 517720 faucet" }),
  defaultWorktop({ code: "TOP-AB105790-SECONDARY", componentKey: "worktop-secondary", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 40, infoText: "Included separate PLR60 worktop on the left block, supplier row 4" }),
  { itemType: ItemType.COMPONENT, code: "REF-AB105790-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 50, articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105790-US60-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US60", "UPK20"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 60, articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20") },
  sinkEndBlende("105790", { sortOrder: 70, catalogBlendeCode: "UPK20" }),
  { itemType: ItemType.COMPONENT, code: "DISH-AB105790-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 80, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105790-US50-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US50", "UPK20"), widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 90, articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105790-H6002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105790-H6002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 110, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105790-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 120, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105790-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 122, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105790-H5002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H5002", "HPK2002"), widthMm: 500, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, articleNumber: "H5002", catalogArticleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002"), catalogBlendeQuantity: 1, infoText: "H5002 upper cabinet with HPK2002 right end filler panel" },
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105793: two front elevations, supplier rows 1-17 and corrected dishwasher model.
const AB_105793_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105793", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultWorktop({ code: "TOP-AB105793-SECONDARY", componentKey: "worktop-secondary", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 170, infoText: "Included separate PLR60 worktop on the right block, supplier row 17" }),
  defaultSinkBase({ code: "SINK-BASE-AB105793-SP60-R", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge right (SP60 R)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105793", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, right orientation (526335 R), and 517720 faucet" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105793-US30-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US30", "UPK20"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-1", sortOrder: 40, articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20") },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105793-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-2", sortOrder: 50, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105793-US60", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-3", sortOrder: 60, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105793-US50-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US50", "UPK20"), widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-4", sortOrder: 90, articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105793-H3002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H3002", "HPK2002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, articleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105793-H4002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H4002"), widthMm: 400, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 110, articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105793-H6002-13", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105793-H6002-14", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 140, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105793-H6002-15", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 150, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105793-H5002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H5002", "HPK2002"), widthMm: 500, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-7", sortOrder: 160, articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002") },
  { itemType: ItemType.COMPONENT, code: "REF-AB105793-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105793-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 80, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105793-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 120, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105793-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 122, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105796_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105796", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultWorktop({ code: "TOP-AB105796-SECONDARY", componentKey: "worktop-secondary", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 170, infoText: "Included separate PLR60 worktop on the right block, supplier row 17" }),
  defaultSinkBase({ code: "SINK-BASE-AB105796-SP60-R", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge right (SP60 R)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105796", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, right orientation (526335 R), and 517720 faucet" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105796-US30-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US30", "UPK20"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-1", sortOrder: 40, articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20") },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105796-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-2", sortOrder: 50, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105796-US60", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-3", sortOrder: 60, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105796-US50-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US50", "UPK20"), widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-4", sortOrder: 90, articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105796-H3002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H3002", "HPK2002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, articleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105796-H4002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H4002"), widthMm: 400, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 110, articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105796-H6002-13", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105796-H6002-14", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 140, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105796-H6002-15", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 150, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105796-H5002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H5002", "HPK2002"), widthMm: 500, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-7", sortOrder: 160, articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002") },
  { itemType: ItemType.COMPONENT, code: "REF-AB105796-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105796-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 80, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105796-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 120, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105796-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 122, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105799_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105799", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultWorktop({ code: "TOP-AB105799-SECONDARY", componentKey: "worktop-secondary", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 170, infoText: "Included separate PLR60 worktop on the right block, supplier row 17" }),
  defaultSinkBase({ code: "SINK-BASE-AB105799-SP60-R", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge right (SP60 R)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105799", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, right orientation (526335 R), and 517720 faucet" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105799-US30-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US30", "UPK20"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-1", sortOrder: 40, articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20") },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105799-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-2", sortOrder: 50, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105799-US60", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-3", sortOrder: 60, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105799-US50-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US50", "UPK20"), widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-4", sortOrder: 90, articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105799-H3002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H3002", "HPK2002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, articleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105799-H4002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H4002"), widthMm: 400, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 110, articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105799-H6002-13", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105799-H6002-14", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 140, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105799-H6002-15", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 150, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105799-H5002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H5002", "HPK2002"), widthMm: 500, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-7", sortOrder: 160, articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002") },
  { itemType: ItemType.COMPONENT, code: "REF-AB105799-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105799-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 80, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105799-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 120, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105799-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 122, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105802_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105802", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultWorktop({ code: "TOP-AB105802-SECONDARY", componentKey: "worktop-secondary", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 170, infoText: "Included separate PLR60 worktop on the right block, supplier row 17" }),
  defaultSinkBase({ code: "SINK-BASE-AB105802-SP60-R", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge right (SP60 R)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105802", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, right orientation (526335 R), and 517720 faucet" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105802-US30-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US30", "UPK20"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-1", sortOrder: 40, articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20") },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105802-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-2", sortOrder: 50, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105802-US60", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-3", sortOrder: 60, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105802-US50-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US50", "UPK20"), widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "base-module-4", sortOrder: 90, articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105802-H3002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H3002", "HPK2002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, articleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105802-H4002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H4002"), widthMm: 400, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 110, articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105802-H6002-13", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105802-H6002-14", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 140, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105802-H6002-15", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 150, articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105802-H5002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H5002", "HPK2002"), widthMm: 500, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-7", sortOrder: 160, articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002") },
  { itemType: ItemType.COMPONENT, code: "REF-AB105802-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105802-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 80, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105802-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 120, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105802-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 122, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  ...defaultAccessories(),
  ...defaultServices(),
];

// 670 105792: supplier rows 1-10; SP50 and 526335 use the left orientation.
const AB_105792_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105792", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105792-SP50-L", articleNumber: "SP50", catalogArticleNumber: "SP50", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 500, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP50 sink base cabinet, hinge left (SP50 L)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105792", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, left orientation (526335 L), and 517720 faucet" }),
  sinkEndBlende("105792", { catalogBlendeCode: "UPK20" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105792-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 60, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105792-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105792-H5002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H5002", "HPK2002"), widthMm: 500, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002"), infoText: "H5002 upper cabinet with HPK2002 left end filler panel" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105792-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 90, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105792-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105792-H4002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H4002"), widthMm: 400, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 100, articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105792-H6002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, articleNumber: "H6002" },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105795_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105795", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105795-SP50-L", articleNumber: "SP50", catalogArticleNumber: "SP50", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 500, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP50 sink base cabinet, hinge left (SP50 L)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105795", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, left orientation (526335 L), and 517720 faucet" }),
  sinkEndBlende("105795", { catalogBlendeCode: "UPK20" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105795-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 60, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105795-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105795-H5002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H5002", "HPK2002"), widthMm: 500, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002"), infoText: "H5002 upper cabinet with HPK2002 left end filler panel" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105795-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 90, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105795-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105795-H4002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H4002"), widthMm: 400, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 100, articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105795-H6002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, articleNumber: "H6002" },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105798_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105798", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105798-SP50-L", articleNumber: "SP50", catalogArticleNumber: "SP50", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 500, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP50 sink base cabinet, hinge left (SP50 L)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105798", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, left orientation (526335 L), and 517720 faucet" }),
  sinkEndBlende("105798", { catalogBlendeCode: "UPK20" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105798-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 60, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105798-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105798-H5002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H5002", "HPK2002"), widthMm: 500, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002"), infoText: "H5002 upper cabinet with HPK2002 left end filler panel" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105798-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 90, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105798-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105798-H4002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H4002"), widthMm: 400, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 100, articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105798-H6002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, articleNumber: "H6002" },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105801_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105801", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105801-SP50-L", articleNumber: "SP50", catalogArticleNumber: "SP50", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 500, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP50 sink base cabinet, hinge left (SP50 L)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105801", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, left orientation (526335 L), and 517720 faucet" }),
  sinkEndBlende("105801", { catalogBlendeCode: "UPK20" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105801-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 60, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105801-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105801-H5002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H5002", "HPK2002"), widthMm: 500, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002"), infoText: "H5002 upper cabinet with HPK2002 left end filler panel" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105801-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 90, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105801-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105801-H4002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H4002"), widthMm: 400, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 100, articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105801-H6002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, articleNumber: "H6002" },
  ...defaultAccessories(),
  ...defaultServices(),
];

// 670 105791: supplier rows 1-11, linked to existing master catalog articles.
const AB_105791_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105791", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105791-SP60-R", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge right (SP60 R)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105791", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, right orientation (526335 R), and 517720 faucet" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105791-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105791-US60", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 50, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105791-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 60, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105791-US30", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US30"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105791-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105791-H6002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002"), infoText: "H6002 upper cabinet with HPK2002 left end filler panel" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105791-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105791-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105791-H3002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H3002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, articleNumber: "H3002" },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105794_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105794", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105794-SP60-R", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge right (SP60 R)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105794", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, right orientation (526335 R), and 517720 faucet" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105794-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105794-US60", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 50, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105794-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 60, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105794-US30", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US30"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105794-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105794-H6002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002"), infoText: "H6002 upper cabinet with HPK2002 left end filler panel" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105794-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105794-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105794-H3002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H3002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, articleNumber: "H3002" },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105797_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105797", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105797-SP60-R", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge right (SP60 R)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105797", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, right orientation (526335 R), and 517720 faucet" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105797-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105797-US60", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 50, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105797-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 60, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105797-US30", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US30"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105797-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105797-H6002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002"), infoText: "H6002 upper cabinet with HPK2002 left end filler panel" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105797-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105797-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105797-H3002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H3002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, articleNumber: "H3002" },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105800_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105800", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105800-SP60-R", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge right (SP60 R)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105800", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, right orientation (526335 R), and 517720 faucet" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105800-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105800-US60", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 50, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105800-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 60, articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105800-US30", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US30"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105800-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105800-H6002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002"), infoText: "H6002 upper cabinet with HPK2002 left end filler panel" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105800-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105800-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105800-H3002", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H3002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, articleNumber: "H3002" },
  ...defaultAccessories(),
  ...defaultServices(),
];

// 670 105803: supplier rows 1-11; secondary articles stay catalog-linked.
const AB_105803_ITEMS = [
  defaultOvenHob({ articleNumber: "A-EH923640E + 9EC744100C", catalogArticleNumber: "A-EH923640E + 9EC744100C", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, sortOrder: 10, infoText: "Included UHK, A-EH923640E oven (supplier EH92364E-A) and 9EC744100C ceramic cooktop" }),
  defaultWorktop({ code: "TOP-AB105803", articleNumber: "PLR60", catalogArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105803-SP60-L", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge left (SP60 L)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105803", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, left orientation (526335 L), and 517720 faucet" }),
  { ...AB_105802_ITEMS.find(item => item.code === "CAB-BASE-AB105802-US30-UPK20"), sortOrder: 40 },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105803-600-UPEF65", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, articleNumber: "A-EGSPV597210 + TGV60", catalogArticleNumber: "A-EGSPV597210 + TGV60", blendeCode: null, blendeLabel: null, blendePrice: null },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105803-US30-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US30", "UPEF65"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 60, articleNumber: "US30", catalogArticleNumber: "US30", blendeCode: "UPEF65", blendeLabel: "UPEF65", blendePrice: blendePrice("UPEF65") },
  { ...AB_105800_ITEMS.find(item => item.componentKey === "refrigerator"), sortOrder: 80 },
  { ...AB_105800_ITEMS.find(item => item.componentKey === "wall-cabinet-1"), sortOrder: 90 },
  { ...AB_105800_ITEMS.find(item => item.componentKey === "wall-cabinet-3"), code: "CAB-WALL-AB105803-H3002", componentKey: "wall-cabinet-2", sortOrder: 100 },
  { ...AB_105800_ITEMS.find(item => item.componentKey === "wall-cabinet-2"), code: "CAB-HOOD-AB105803-600", componentKey: "wall-cabinet-3", sortOrder: 110 },
  { ...AB_105800_ITEMS.find(item => item.componentKey === "extractor-hood"), code: "HOOD-AB105803-FH664621E", catalogArticleNumber: "FH664621E + FWK124 + HD6002", sortOrder: 112 },
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105775-64: two-leg perspective kitchen. Supplier rows 1-3 are the
// included oven, split worktop, and sink cabinet. Every secondary UPK/UPEF/HPK
// article remains attached to its scheduled cabinet through a catalog Blende.
const AB_105775_ITEMS = [
  defaultOvenHob({
    articleNumber: "A-EH923640E + 9EC744100C",
    catalogArticleNumber: "A-EH923640E + 9EC744100C",
    infoText: "A-EH923640E oven, 9EC744100C ceramic cooktop and UHK lower cabinet",
    widthMm: 600,
    sortOrder: 10,
  }),
  defaultWorktop({
    code: "TOP-AB105775",
    articleNumber: "PLR60-1 + PLR60-2",
    displayArticleNumber: "PLR60-1 + PLR60-2",
    catalogArticleNumber: "PLR60",
    sortOrder: 20,
  }),
  defaultSinkBase({
    code: "SINK-BASE-AB105775-SP60",
    widthMm: 600,
    heightMm: 878,
    depthMm: 600,
    articleNumber: "SP60",
    catalogArticleNumber: "SP60",
    infoText: "Included SP60 sink base cabinet",
    sortOrder: 30,
  }),
  { itemType: ItemType.COMPONENT, code: "REF-AB105775-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: articlePrice("OL-KGCN388140E"), widthMm: 540, heightMm: 1810, depthMm: 576, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Freestanding fridge-freezer, 181 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105775-US50-UPEF65", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US50", "UPEF65", 1), widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US50 lower cabinet with UPEF65 corner filler panel", articleNumber: "US50", catalogArticleNumber: "US50", blendeCode: "UPEF65", blendeLabel: "UPEF65 Corner filler panel", blendePrice: blendePrice("UPEF65", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105775-US30-1", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US30"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 60, infoText: "US30 lower cabinet", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105775-US30-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "US30 lower cabinet with UPK20 filler panel", articleNumber: "US30", catalogArticleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105775-US30-2", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", price: articlePrice("US30"), widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "drawer-module", sortOrder: 80, infoText: "US30 lower cabinet on the sink leg", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105775-600-UPK20", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPK20", 1), widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 90, infoText: "Fully integrated dishwasher incl. furniture front and UPK20 filler panel", articleNumber: "A-EGSPV597210 + TGV60", catalogArticleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105775-H6002-HPK2002-L", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, infoText: "H6002 upper cabinet with left HPK2002 filler panel", articleNumber: "H6002", catalogArticleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105775-H3002-1", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H3002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 110, infoText: "H3002 upper cabinet", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105775-600", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 120, infoText: "HD6002 cabinet, FH664621E flat pull-out hood and FWK124 filter", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105775-FH664621E", name: "FH664621E Extractor Hood", nameDe: "FH664621E Flachschirmhaube", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 122, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105775-H3002-2", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H3002", "HPK2002", 1), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, infoText: "H3002 upper cabinet with HPK2002 filler panel", articleNumber: "H3002", catalogArticleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105775-H3002-3", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H3002"), widthMm: 300, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 140, infoText: "H3002 upper cabinet on the sink leg", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105775-H6002-1", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 150, infoText: "H6002 upper cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105775-H6002-HPK2002-R", name: "Upper Cabinet", nameDe: "Oberschrank", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 723, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-7", sortOrder: 160, infoText: "H6002 upper cabinet with right HPK2002 filler panel", articleNumber: "H6002", catalogArticleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105775", sortOrder: 170, articleNumber: "526335 + 517720", displayArticleNumber: "517720 + 526335", catalogArticleNumber: "526335 + 517720" }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// Burger 103898: L-shaped Cindy kitchen from contract plan 670 103898.
// Supplier schedule codes are retained for display while catalogArticleNumber links
// each row to the shared catalog identity used by the Burger program price list.
const BURGER_103898_ITEMS = [
  defaultOvenHob({ catalogArticleNumber: "A-EH923640E + 9EC744100C", infoText: "Built-in oven + ceramic cooktop", sortOrder: 10, widthMm: 600 }),
  defaultWorktop({ sortOrder: 20 }),
  { itemType: ItemType.COMPONENT, code: "SINK-BASE-BURGER103898-600", name: DEFAULT_SINK_BASE_CATALOG_NAME_EN, nameDe: DEFAULT_SINK_BASE_CATALOG_NAME_DE, price: "0.00", widthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: DEFAULT_SINK_BASE_CATALOG_INFO_TEXT },
  { itemType: ItemType.COMPONENT, code: "REF-BURGER103898-KGCN388140E", name: REFRIGERATOR_CATALOG_NAME_EN, nameDe: REFRIGERATOR_CATALOG_NAME_DE, price: "579.00", heightMm: 1810, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 181 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-BURGER103898-US50", name: "Lower Cabinet with Drawer", price: "247.00", widthMm: 500, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, isLocked: true, infoText: "US50 base storage cabinet", articleNumber: "US50" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-BURGER103898-US60-UPE65", name: "Lower Cabinet with Drawer and corner end panel", price: "349.00", widthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, isLocked: true, infoText: "US60 base cabinet with UPE65 corner end panel", articleNumber: "US60", displayArticleNumber: "US60 + UPE65", catalogArticleNumber: "US60", blendeCode: "UPE65", blendeLabel: "UPE65 65 cm", blendePrice: "79.00" },
  { itemType: ItemType.COMPONENT, code: "DISH-BURGER103898-600", name: DISHWASHER_CATALOG_NAME_EN, nameDe: DISHWASHER_CATALOG_NAME_DE, price: "586.00", widthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 70, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-BURGER103898-US30", name: "Base cabinet with drawer", price: "222.00", widthMm: 300, depthMm: 600, iconKey: "base_cabinet_30", colorKey: "#f0a500", componentKey: "drawer-module", sortOrder: 80, isLocked: true, infoText: "US30 base storage cabinet", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-BURGER103898-H5072", name: "Wall Cabinet", price: "135.00", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H5072, 2 adjustable shelves", articleNumber: "H5072", displayArticleNumber: "H5072", catalogArticleNumber: "H5072" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-BURGER103898-HFLH6072", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, price: "346.00", widthMm: 600, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HFLH6072 flat-screen hood cabinet package", articleNumber: "FH664621E+FWK124+HFLH6072", displayArticleNumber: "FH664621E + FWK124 + HFLH6072", catalogArticleNumber: "FH664621E+FWK124+HFLH6072" },
  { itemType: ItemType.COMPONENT, code: "HOOD-BURGER103898-FH664621E", name: "FH664621E Extractor Hood", price: "346.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH 664 621 E", catalogArticleNumber: "FH664621E+FWK124+HFLH6072", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-BURGER103898-H6072", name: "Wall Cabinet", price: "146.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6072, 2 adjustable shelves", articleNumber: "H6072", displayArticleNumber: "H6072", catalogArticleNumber: "H6072" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-BURGER103898-H3072", name: "Wall Cabinet", price: "124.00", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H3072, 2 adjustable shelves", articleNumber: "H3072", displayArticleNumber: "H3072", catalogArticleNumber: "H3072" },
  defaultSinkWorktop({ sortOrder: 130 }),
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system Blanco Botton", nameDe: "Mülltrennsystem Blanco Botton", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467", catalogArticleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "20.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZBE60", catalogArticleNumber: "ZBE60" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KALB KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Delivery, Carry-in, Assembly and Installation", nameDe: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Pickup at logistics location", nameDe: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105777: supplier rows 1-16; two measured front elevations.
const AB_105777_ITEMS = [
  defaultOvenHob({
    catalogArticleNumber: "A-EH923640E + 9EC744100C",
    displayArticleNumber: "EH92364E-A + 9EC744100C",
    claimArticleNumber: "EH92364E-A",
    claimProductInfoByPartKey: {
      oven: AB_109955_OVEN_CLAIM_PRODUCT_INFO,
      cooktop: {
        productImagePath: null,
        productInfoPdfPath: "/product-info/hobs/ec744100c/ec744100c-product-info.pdf",
        productInfoSummary: "Glaskeramikkochfeld 9EC744100C",
        productInfoKeyFacts: [],
        productInfoExtractedText: null,
      },
    },
    widthMm: 600,
    sortOrder: 10,
    infoText: "Included EH92364E-A oven, 9EC744100C cooktop and UHK lower cabinet",
  }),
  defaultWorktop({ code: "TOP-AB105777", catalogArticleNumber: "PLR60", displayArticleNumber: "PLR60", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105777-SP60", catalogArticleNumber: "SP60", articleNumber: "SP60", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30 }),
  AB_105776_ITEMS.find((item) => item.componentKey === "refrigerator"),
  { ...AB_105776_ITEMS.find((item) => item.componentKey === "dishwasher-base"), code: "DISH-AB105777-600", sortOrder: 90, price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPK20", 1), blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1), infoText: "Fully integrated dishwasher incl. furniture front and right UPK20 filler panel" },
  { ...AB_105776_ITEMS.find((item) => item.componentKey === "wall-cabinet-2"), code: "CAB-HOOD-AB105777-600", sortOrder: 110 },
  { ...AB_105776_ITEMS.find((item) => item.componentKey === "extractor-hood"), code: "HOOD-AB105777-FH664621E", sortOrder: 112 },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105777-US60-5", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, articleNumber: "US60", price: articlePrice("US60") },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105777-US40-6", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-2", sortOrder: 60, articleNumber: "US40", price: articlePrice("US40") },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105777-US30-7", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", price: articlePriceWithBlende("US30", "UPK20", 1), blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105777-US50-8", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "drawer-module", sortOrder: 80, articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", price: articlePriceWithBlende("US50", "UPK20", 1), blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105777-H6002-10", name: "Upper Cabinet", nameDe: "Oberschrank", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, articleNumber: "H6002", price: articlePrice("H6002") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105777-H4002-12", name: "Upper Cabinet", nameDe: "Oberschrank", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 120, articleNumber: "H4002", price: articlePrice("H4002") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105777-H3002-13", name: "Upper Cabinet", nameDe: "Oberschrank", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, articleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", price: articlePriceWithBlende("H3002", "HPK2002", 1), blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105777-H5002-14", name: "Upper Cabinet", nameDe: "Oberschrank", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 140, articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", price: articlePriceWithBlende("H5002", "HPK2002", 1), blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105777-H6002-15", name: "Upper Cabinet", nameDe: "Oberschrank", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 150, articleNumber: "H6002", price: articlePrice("H6002") },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105777-H6002-16", name: "Upper Cabinet", nameDe: "Oberschrank", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-7", sortOrder: 160, articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", price: articlePriceWithBlende("H6002", "HPK2002", 1), blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ catalogArticleNumber: "526335 + 517720", displayArticleNumber: "526335 + 517720", sortOrder: 35 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105779: the customer excluded supplier row 6 (UPEF65) from the configuration.
const AB_105779_ITEMS = [
  { ...AB_105777_ITEMS.find((item) => item.componentKey === "oven-module") },
  defaultWorktop({ code: "TOP-AB105779", catalogArticleNumber: "PLR60", displayArticleNumber: "PLR60", sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105779-SP60", catalogArticleNumber: "SP60", articleNumber: "SP60", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30 }),
  defaultSinkWorktop({ catalogArticleNumber: "526335 + 517720", displayArticleNumber: "526335 + 517720", sortOrder: 35 }),
  AB_105777_ITEMS.find((item) => item.componentKey === "refrigerator"),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105779-US30", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", articleNumber: "US30", price: articlePrice("US30"), widthMm: 300, heightMm: 878, depthMm: 600, componentKey: "base-module-1", iconKey: "drawer_base_two", colorKey: "#f0a500", sortOrder: 50 },
  { ...AB_105776_ITEMS.find((item) => item.componentKey === "dishwasher-base"), code: "DISH-AB105779-600", sortOrder: 70 },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105779-US60", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", articleNumber: "US60", price: articlePrice("US60"), widthMm: 600, heightMm: 878, depthMm: 600, componentKey: "base-module-2", iconKey: "drawer_base_two", colorKey: "#f0a500", sortOrder: 80 },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105779-US40", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", articleNumber: "US40", price: articlePrice("US40"), widthMm: 400, heightMm: 878, depthMm: 600, componentKey: "base-module-3", iconKey: "drawer_base_two", colorKey: "#f0a500", sortOrder: 90 },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105779-H3002", name: "Upper Cabinet", nameDe: "Oberschrank", articleNumber: "H3002", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, componentKey: "wall-cabinet-1", iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", sortOrder: 100 },
  AB_105777_ITEMS.find((item) => item.componentKey === "wall-cabinet-2"),
  AB_105777_ITEMS.find((item) => item.componentKey === "extractor-hood"),
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105779-H6002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", articleNumber: "H6002", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, componentKey: "wall-cabinet-3", iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", sortOrder: 120, blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  ...defaultAccessories(),
  ...defaultServices(),
];
PRODUCT_INFO_BY_CODE["DISH-AB105779-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];

// 670 105804: two independent perspective runs; supplier rows 1-12.
const AB_105804_ITEMS = [
  { ...AB_105777_ITEMS.find((item) => item.componentKey === "oven-module"), catalogPriceSyncMode: "LOCKED_INCLUDED", heightMm: 878, depthMm: 600 },
  defaultWorktop({ code: "TOP-AB105804", catalogArticleNumber: "PLR60", displayArticleNumber: "PLR60", catalogPriceSyncMode: "LOCKED_INCLUDED", depthMm: 600, sortOrder: 20 }),
  defaultSinkBase({ code: "SINK-BASE-AB105804-SP60-R", articleNumber: "SP60", catalogArticleNumber: "SP60", catalogPriceSyncMode: "LOCKED_INCLUDED", widthMm: 600, heightMm: 878, depthMm: 600, sortOrder: 30, infoText: "Included SP60 sink base cabinet, hinge right (SP60 R)" }),
  defaultSinkWorktop({ code: "SINK-WORKTOP-AB105804", articleNumber: "526335 + 517720", catalogArticleNumber: "526335 + 517720", catalogPriceSyncMode: "LOCKED_INCLUDED", sortOrder: 32, infoText: "Included 526335 sink, right orientation (526335 R), and 517720 faucet" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105804-US50-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", articleNumber: "US50", price: articlePriceWithBlende("US50", "UPK20"), blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20"), widthMm: 500, heightMm: 878, depthMm: 600, componentKey: "base-module-1", iconKey: "drawer_base_two", colorKey: "#f0a500", sortOrder: 40 },
  { ...AB_105779_ITEMS.find((item) => item.componentKey === "dishwasher-base"), code: "DISH-AB105804-600", heightMm: 878, depthMm: 600, sortOrder: 50 },
  sinkEndBlende("105804", { catalogBlendeCode: "UPK20", sortOrder: 60, heightMm: 878, depthMm: 16 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105804-US60-UPK20", name: "Lower Cabinet with Drawer", nameDe: "Unterschrank mit Schublade", articleNumber: "US60", price: articlePriceWithBlende("US60", "UPK20"), blendeCode: "UPK20", blendeLabel: "UPK20", blendePrice: blendePrice("UPK20"), widthMm: 600, heightMm: 878, depthMm: 600, componentKey: "base-module-2", iconKey: "drawer_base_two", colorKey: "#f0a500", sortOrder: 70 },
  { ...AB_105789_ITEMS.find((item) => item.componentKey === "refrigerator"), code: "REF-AB105804-KGCN388140E", sortOrder: 80 },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105804-H5002-HPK2002", name: "Upper Cabinet", nameDe: "Oberschrank", articleNumber: "H5002", price: articlePriceWithBlende("H5002", "HPK2002"), blendeCode: "HPK2002", blendeLabel: "HPK2002", blendePrice: blendePrice("HPK2002"), widthMm: 500, heightMm: 723, depthMm: 340, componentKey: "wall-cabinet-1", iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", sortOrder: 90 },
  { ...AB_105777_ITEMS.find((item) => item.componentKey === "wall-cabinet-2"), code: "CAB-HOOD-AB105804-600", heightMm: 723, depthMm: 340, sortOrder: 100 },
  { ...AB_105777_ITEMS.find((item) => item.componentKey === "extractor-hood"), code: "HOOD-AB105804-FH664621E", heightMm: 173, depthMm: 303, sortOrder: 102 },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105804-H6002", name: "Upper Cabinet", nameDe: "Oberschrank", articleNumber: "H6002", price: articlePrice("H6002"), widthMm: 600, heightMm: 723, depthMm: 340, componentKey: "wall-cabinet-3", iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", sortOrder: 110 },
  { ...AB_105779_ITEMS.find((item) => item.componentKey === "wall-cabinet-3"), code: "CAB-WALL-AB105804-H6002-HPK2002", componentKey: "wall-cabinet-4", sortOrder: 120 },
  ...defaultAccessories(),
  ...defaultServices(),
];
PRODUCT_INFO_BY_CODE["DISH-AB105804-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["REF-AB105804-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["HOOD-AB105804-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];

const DEFAULT_KITCHENS = [
  { slug: "ab-105804", kitchenCode: "105 804", name: "105804", description: "Two-run kitchen based on frontend/public/pdfs/670 105804.pdf", items: AB_105804_ITEMS, reconcileExisting: true },
  { slug: "ab-105803", kitchenCode: "105 803", name: "105803", description: "L-shaped kitchen based on frontend/public/plans/670 105803.svg", items: AB_105803_ITEMS, reconcileExisting: true },
  ...AB_105779_LAYOUT_ALIAS_CODES.map((code) => ({
    slug: `ab-${code}`,
    kitchenCode: `${code.slice(0, 3)} ${code.slice(3)}`,
    name: code,
    description: "L-shaped kitchen using the AB 105779 plan and catalog-linked elements",
    items: AB_105779_ITEMS,
    reconcileExisting: true,
  })),
  { slug: "ab-105779", kitchenCode: "105 779", name: "105779", description: "L-shaped kitchen based on frontend/public/pdfs/670 105779.pdf", items: AB_105779_ITEMS, reconcileExisting: true },
  { slug: "ab-105777", kitchenCode: "105 777", name: "105777", description: "Two-elevation kitchen based on frontend/public/pdfs/670 105777.pdf", items: AB_105777_ITEMS, reconcileExisting: true },
  ...["105780", "105783", "105786"].map((code) => ({
    slug: `ab-${code}`,
    kitchenCode: `${code.slice(0, 3)} ${code.slice(3)}`,
    name: code,
    description: "Two-elevation kitchen using the AB 105777 plan and catalog-linked elements",
    items: AB_105777_ITEMS,
    reconcileExisting: true,
  })),
  {
    slug: "burger-103898",
    kitchenCode: "103 898",
    programmId: "BURGER CINDY",
    name: "103898",
    description: "Burger Cindy L-shaped kitchen configuration based on frontend/public/pdfs/670 103898.pdf",
    reconcileExisting: true,
    items: BURGER_103898_ITEMS,
  },
  {
    slug: "ab-105806",
    kitchenCode: "105 806",
    name: "105806",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105806_page-0001.jpg",
    items: AB_105806_ITEMS,
  },
  {
    slug: "ab-105807",
    kitchenCode: "105 807",
    name: "105807",
    description: "Kitchen configuration based on frontend/public/plans/AB 105807.svg",
    items: AB_105807_ITEMS,
  },
  {
    slug: "ab-105808",
    kitchenCode: "105 808",
    name: "105808",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105808_page-0001.jpg",
    items: AB_105808_ITEMS,
  },
  {
    slug: "ab-105805",
    kitchenCode: "105 805",
    name: "105805",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105805_page-0001.jpg",
    items: AB_105805_ITEMS,
  },
  {
    slug: "ab-105809",
    kitchenCode: "105 809",
    name: "105809",
    description: "Kitchen configuration using the AB 105805 layout",
    items: AB_105809_ITEMS,
  },
  {
    slug: "ab-105813",
    kitchenCode: "105 813",
    name: "105813",
    description: "Kitchen configuration using the AB 105805 layout",
    items: AB_105813_ITEMS,
  },
  {
    slug: "ab-105817",
    kitchenCode: "105 817",
    name: "105817",
    description: "Kitchen configuration using the AB 105805 layout",
    items: AB_105817_ITEMS,
  },
  {
    slug: "ab-105834",
    kitchenCode: "105 834",
    name: "105834",
    description: "L-shaped kitchen based on pdfs/AB 105834.pdf",
    items: AB_105834_ITEMS,
  },
  {
    slug: "ab-105837",
    kitchenCode: "105 837",
    name: "105837",
    description: "L-shaped kitchen based on pdfs/AB 105837.pdf",
    items: AB_105837_ITEMS,
  },
  {
    slug: "ab-105840",
    kitchenCode: "105 840",
    name: "105840",
    description: "Kitchen configuration using the AB 105837 layout",
    items: AB_105840_ITEMS,
  },
  {
    slug: "ab-105843",
    kitchenCode: "105 843",
    name: "105843",
    description: "Kitchen configuration using the AB 105837 layout",
    items: AB_105843_ITEMS,
  },
  {
    slug: "ab-105743",
    kitchenCode: "105 743",
    name: "105743",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 105743.svg",
    items: AB_105743_ITEMS,
  },
  {
    slug: "ab-105748",
    kitchenCode: "105 748",
    name: "105748",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 105748.svg",
    items: AB_105748_ITEMS,
  },
  {
    slug: "ab-105751",
    kitchenCode: "105 751",
    name: "105751",
    description: "Kitchen configuration using the AB 105748 layout and element selection",
    items: AB_105751_ITEMS,
  },
  {
    slug: "ab-105754",
    kitchenCode: "105 754",
    name: "105754",
    description: "Kitchen configuration using the AB 105748 layout and element selection",
    items: AB_105754_ITEMS,
  },
  {
    slug: "ab-105745",
    kitchenCode: "105 745",
    name: "105745",
    description: "Kitchen configuration using the AB 105748 layout and element selection",
    items: AB_105745_ITEMS,
  },
  {
    slug: "ab-105758",
    kitchenCode: "105 758",
    name: "105758",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 105758.svg",
    items: AB_105758_ITEMS_WITH_SINK_END_BLENDE,
    reconcileExisting: true,
  },
  {
    slug: "ab-105747",
    kitchenCode: "105 747",
    name: "105747",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 105747.svg",
    items: AB_105747_ITEMS,
  },
  {
    slug: "ab-105750",
    kitchenCode: "105 750",
    name: "105750",
    description: "L-shaped kitchen configuration using the AB 105747 layout and element selection",
    items: AB_105750_ITEMS,
  },
  {
    slug: "ab-105753",
    kitchenCode: "105 753",
    name: "105753",
    description: "L-shaped kitchen configuration using the AB 105747 layout and element selection",
    items: AB_105753_ITEMS,
  },
  {
    slug: "ab-105756",
    kitchenCode: "105 756",
    name: "105756",
    description: "L-shaped kitchen configuration using the AB 105747 layout and element selection",
    items: AB_105756_ITEMS,
  },
  {
    slug: "ab-105810",
    kitchenCode: "105 810",
    name: "105810",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105810_page-0001.jpg",
    items: AB_105810_ITEMS,
  },
  {
    slug: "ab-105812",
    kitchenCode: "105 812",
    name: "105812",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105812_page-0001.jpg",
    items: AB_105812_ITEMS,
  },
  {
    slug: "ab-105814",
    kitchenCode: "105 814",
    name: "105814",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105810_page-0001.jpg",
    items: AB_105814_ITEMS,
  },
  {
    slug: "ab-105818",
    kitchenCode: "105 818",
    name: "105818",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105818_page-0001.jpg",
    items: AB_105818_ITEMS,
  },
  {
    slug: "ab-105816",
    kitchenCode: "105 816",
    name: "105816",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105816_page-0001.jpg",
    items: AB_105816_ITEMS,
  },
  {
    slug: "ab-105819",
    kitchenCode: "105 819",
    name: "105819",
    description: "Kitchen configuration based on frontend/public/plans/AB 105819.svg",
    items: AB_105819_ITEMS,
  },
  {
    slug: "ab-105811",
    kitchenCode: "105 811",
    name: "105811",
    description: "Kitchen configuration based on frontend/public/plans/AB 105811.svg",
    items: AB_105811_ITEMS,
  },
  {
    slug: "ab-105815",
    kitchenCode: "105 815",
    name: "105815",
    description: "Kitchen configuration based on frontend/public/plans/AB 105815.svg",
    items: AB_105815_ITEMS,
  },
  {
    slug: "ab-105760",
    kitchenCode: "105 760",
    name: "105760",
    description: "Straight kitchen configuration based on frontend/public/plans/AB 105760-61.svg",
    items: AB_105760_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105761",
    kitchenCode: "105 761",
    name: "105761",
    description: "Straight kitchen configuration based on frontend/public/plans/AB 105761-62.svg",
    items: AB_105761_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105765",
    kitchenCode: "105 765",
    name: "105765",
    description: "Straight kitchen configuration using the AB 105761 layout, prices, and catalog selection",
    items: AB_105765_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105769",
    kitchenCode: "105 769",
    name: "105769",
    description: "Straight kitchen configuration using the AB 105761 layout, prices, and catalog selection",
    items: AB_105769_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105764",
    kitchenCode: "105 764",
    name: "105764",
    description: "Straight kitchen configuration using the AB 105760 layout and element selection",
    items: AB_105764_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105768",
    kitchenCode: "105 768",
    name: "105768",
    description: "Straight kitchen configuration using the AB 105760 layout and element selection",
    items: AB_105768_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105772",
    kitchenCode: "105 772",
    name: "105772",
    description: "Straight kitchen configuration using the AB 105760 layout and element selection",
    items: AB_105772_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105776",
    kitchenCode: "105 776",
    name: "105776",
    description: "Straight kitchen configuration based on frontend/public/plans/AB 105776 - 66.svg",
    items: AB_105776_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105775",
    kitchenCode: "105 775",
    name: "105775",
    description: "Two-leg perspective kitchen configuration based on frontend/public/plans/AB 105775 - 64.svg",
    items: AB_105775_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105778",
    kitchenCode: "105 778",
    name: "105778",
    description: "Straight kitchen configuration based on frontend/public/plans/670 105778.svg",
    items: AB_105778_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105789", kitchenCode: "105 789", name: "105789",
    description: "L-shaped kitchen configuration based on frontend/public/plans/670 105789.svg",
    items: AB_105789_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105790", kitchenCode: "105 790", name: "105790",
    description: "Two separate kitchen blocks based on frontend/public/plans/AB 105790.svg",
    items: AB_105790_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105793", kitchenCode: "105 793", name: "105793",
    description: "Two front elevations based on frontend/public/plans/AB 105793.svg",
    items: AB_105793_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105796", kitchenCode: "105 796", name: "105796",
    description: "Two front elevations based on frontend/public/plans/AB 105796.svg",
    items: AB_105796_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105799", kitchenCode: "105 799", name: "105799",
    description: "Two front elevations based on frontend/public/plans/AB 105799.svg",
    items: AB_105799_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105802", kitchenCode: "105 802", name: "105802",
    description: "Two front elevations based on frontend/public/plans/AB 105802.svg",
    items: AB_105802_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105792", kitchenCode: "105 792", name: "105792",
    description: "Linear kitchen configuration based on frontend/public/plans/670 105792.svg",
    items: AB_105792_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105795", kitchenCode: "105 795", name: "105795",
    description: "Linear kitchen configuration based on frontend/public/plans/670 105795.svg",
    items: AB_105795_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105798", kitchenCode: "105 798", name: "105798",
    description: "Linear kitchen configuration based on frontend/public/plans/670 105798.svg",
    items: AB_105798_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105801", kitchenCode: "105 801", name: "105801",
    description: "Linear kitchen configuration based on frontend/public/plans/670 105801.svg",
    items: AB_105801_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105791", kitchenCode: "105 791", name: "105791",
    description: "L-shaped kitchen configuration based on frontend/public/plans/670 105791.svg",
    items: AB_105791_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105794", kitchenCode: "105 794", name: "105794",
    description: "L-shaped kitchen configuration based on frontend/public/plans/670 105794.svg",
    items: AB_105794_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105797", kitchenCode: "105 797", name: "105797",
    description: "L-shaped kitchen configuration based on frontend/public/plans/670 105797.svg",
    items: AB_105797_ITEMS, reconcileExisting: true,
  },
  {
    slug: "ab-105800", kitchenCode: "105 800", name: "105800",
    description: "L-shaped kitchen configuration based on frontend/public/plans/670 105800.svg",
    items: AB_105800_ITEMS, reconcileExisting: true,
  },
  // Separate kitchen records with the same article schedule and measured plan.
  ...["105781", "105784", "105787"].map((number) => ({
    slug: `ab-${number}`,
    kitchenCode: `${number.slice(0, 3)} ${number.slice(3)}`,
    name: number,
    description: "Straight kitchen configuration using the identical 105778 layout and articles",
    items: AB_105778_ITEMS.map((item) => ({ ...item })),
    reconcileExisting: true,
  })),
  {
    slug: "ab-105828",
    kitchenCode: "105 828",
    name: "105828",
    description: "Kitchen configuration using the AB 105825 layout and element selection",
    items: AB_105828_ITEMS,
  },
  {
    slug: "ab-105820",
    kitchenCode: "105 820",
    name: "105820",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105820_page-0001.jpg",
    items: AB_105820_ITEMS,
  },
  {
    slug: "ab-105757",
    kitchenCode: "105 757",
    name: "105757",
    description: "Straight kitchen configuration based on frontend/public/jpg/AB 105757_page-0001.jpg",
    items: AB_105757_ITEMS,
  },
  {
    slug: "ab-105759",
    kitchenCode: "105 759",
    name: "105759",
    description: "Straight kitchen configuration based on frontend/public/plans/AB 105759.svg",
    items: AB_105759_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105762",
    kitchenCode: "105 762",
    name: "105762",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 105762-63.svg",
    items: AB_105762_ITEMS,
    reconcileExisting: true,
  },
  ...AB_105762_LAYOUT_ALIAS_CODES.map((code) => ({
    slug: `ab-${code}`,
    kitchenCode: `${code.slice(0, 3)} ${code.slice(3)}`,
    name: code,
    description: "Independent kitchen configuration using the AB 105762-63 layout, items, and catalog selection",
    items: AB_105762_ITEMS,
    reconcileExisting: true,
  })),
  {
    slug: "ab-105763",
    kitchenCode: "105 763",
    name: "105763",
    description: "Kitchen configuration using the AB 105759 layout and element selection",
    items: AB_105759_ITEMS,
  },
  {
    slug: "ab-105767",
    kitchenCode: "105 767",
    name: "105767",
    description: "Kitchen configuration using the AB 105759 layout and element selection",
    items: AB_105759_ITEMS,
  },
  {
    slug: "ab-105771",
    kitchenCode: "105 771",
    name: "105771",
    description: "Kitchen configuration using the AB 105759 layout and element selection",
    items: AB_105759_ITEMS,
  },
  {
    slug: "ab-105746",
    kitchenCode: "105 746",
    name: "105746",
    description: "Straight kitchen configuration based on frontend/public/jpg/AB 105746_page-0001.jpg",
    items: AB_105746_ITEMS_WITH_SINK_END_BLENDE,
  },
  {
    slug: "ab-105749",
    kitchenCode: "105 749",
    name: "105749",
    description: "Kitchen configuration using the AB 105746 layout and element selection",
    items: AB_105749_ITEMS,
  },
  {
    slug: "ab-105752",
    kitchenCode: "105 752",
    name: "105752",
    description: "Kitchen configuration using the AB 105746 layout and element selection",
    items: AB_105752_ITEMS,
  },
  {
    slug: "ab-105755",
    kitchenCode: "105 755",
    name: "105755",
    description: "Kitchen configuration using the AB 105746 layout and element selection",
    items: AB_105755_ITEMS,
  },
  {
    slug: "ab-104968",
    kitchenCode: "104 968",
    name: "104968",
    description: "L-shaped kitchen configuration based on frontend/public/jpg/AB 104968_page-0001.jpg",
    items: AB_104968_ITEMS,
  },
  {
    slug: "ab-105734",
    kitchenCode: "105 734",
    name: "105734",
    description: "Kitchen configuration using the AB 104968 layout and element selection",
    items: AB_104968_ITEMS,
  },
  {
    slug: "ab-105737",
    kitchenCode: "105 737",
    name: "105737",
    description: "Kitchen configuration using the AB 104968 layout and element selection",
    items: AB_104968_ITEMS,
  },
  {
    slug: "ab-105740",
    kitchenCode: "105 740",
    name: "105740",
    description: "Kitchen configuration using the AB 104968 layout and element selection",
    items: AB_104968_ITEMS,
  },
  {
    slug: "ab-105732",
    kitchenCode: "105 732",
    name: "105732",
    description: "Kitchen configuration based on frontend/public/plans/AB 105732.svg",
    items: AB_105732_ITEMS_WITH_SINK_END_BLENDE,
  },
  {
    slug: "ab-105735",
    kitchenCode: "105 735",
    name: "105735",
    description: "Kitchen configuration using the AB 105732 layout and element selection",
    items: AB_105735_ITEMS_WITH_SINK_END_BLENDE,
  },
  {
    slug: "ab-105738",
    kitchenCode: "105 738",
    name: "105738",
    description: "Kitchen configuration using the AB 105732 layout and element selection",
    items: AB_105738_ITEMS_WITH_SINK_END_BLENDE,
  },
  {
    slug: "ab-105741",
    kitchenCode: "105 741",
    name: "105741",
    description: "Kitchen configuration using the AB 105732 layout and element selection",
    items: AB_105741_ITEMS_WITH_SINK_END_BLENDE,
  },
  {
    slug: "ab-105733",
    kitchenCode: "105 733",
    name: "105733",
    description: "Kitchen configuration based on frontend/public/plans/AB 105733.svg",
    items: AB_105733_ITEMS,
  },
  {
    slug: "ab-105736",
    kitchenCode: "105 736",
    name: "105736",
    description: "Kitchen configuration using the AB 105733 layout and element selection",
    items: AB_105733_ITEMS,
  },
  {
    slug: "ab-105739",
    kitchenCode: "105 739",
    name: "105739",
    description: "Kitchen configuration using the AB 105733 layout and element selection",
    items: AB_105733_ITEMS,
  },
  {
    slug: "ab-105742",
    kitchenCode: "105 742",
    name: "105742",
    description: "Kitchen configuration using the AB 105733 layout and element selection",
    items: AB_105733_ITEMS,
  },
  {
    slug: "ab-105821",
    kitchenCode: "105 821",
    name: "105821",
    description: "Kitchen configuration based on frontend/public/plans/AB 105821.svg",
    items: AB_105821_ITEMS,
  },
  {
    slug: "ab-105824",
    kitchenCode: "105 824",
    name: "105824",
    description: "Kitchen configuration based on the AB 105821 kitchen layout",
    items: AB_105824_ITEMS,
  },
  {
    slug: "ab-105822",
    kitchenCode: "105 822",
    name: "105822",
    description: "Kitchen configuration using the AB 105825 layout and element selection",
    items: AB_105822_ITEMS,
  },
  {
    slug: "ab-105823",
    kitchenCode: "105 823",
    name: "105823",
    description: "Kitchen configuration based on the AB 105822 kitchen layout",
    items: AB_105823_ITEMS,
  },
  {
    slug: "ab-105829",
    kitchenCode: "105 829",
    name: "105829",
    description: "Kitchen configuration based on the AB 105822 kitchen layout",
    items: AB_105829_ITEMS,
  },
  {
    slug: "ab-105832",
    kitchenCode: "105 832",
    name: "105832",
    description: "Kitchen configuration based on the AB 105822 kitchen layout",
    items: AB_105832_ITEMS,
  },
  {
    slug: "ab-105825",
    kitchenCode: "105 825",
    name: "105825",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 105825.svg",
    items: AB_105825_ITEMS_WITH_US30_BLENDE,
  },
  {
    slug: "ab-105831",
    kitchenCode: "105 831",
    name: "105831",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 105831.svg",
    items: AB_105831_ITEMS,
  },
  {
    slug: "ab-105833",
    kitchenCode: "105 833",
    name: "105833",
    description: "Kitchen configuration based on frontend/public/plans/AB 105833.svg",
    items: AB_105833_ITEMS,
  },
  {
    slug: "ab-105826",
    kitchenCode: "105 826",
    name: "105826",
    description: "Kitchen configuration based on frontend/public/plans/AB 105826.svg",
    items: AB_105826_ITEMS_WITH_SINK_END_BLENDE,
  },
  {
    slug: "ab-105827",
    kitchenCode: "105 827",
    name: "105827",
    description: "Kitchen configuration based on frontend/public/plans/AB 105827.svg",
    items: AB_105827_ITEMS,
  },
  {
    slug: "ab-105830",
    kitchenCode: "105 830",
    name: "105830",
    description: "Kitchen configuration based on the AB 105827 kitchen layout",
    items: AB_105830_ITEMS,
  },
  {
    slug: "ab-105835",
    kitchenCode: "105 835",
    name: "105835",
    description: "Kitchen configuration based on frontend/public/plans/AB 105835.svg",
    items: AB_105835_ITEMS,
  },
  {
    slug: "ab-105836",
    kitchenCode: "105 836",
    name: "105836",
    description: "Kitchen configuration based on frontend/public/plans/AB 105836.svg",
    items: AB_105836_ITEMS,
  },
  {
    slug: "ab-105842",
    kitchenCode: "105 842",
    name: "105842",
    description: "Kitchen configuration based on frontend/public/plans/AB 105842.svg",
    items: AB_105842_ITEMS,
  },
  {
    slug: "ab-105845",
    kitchenCode: "105 845",
    name: "105845",
    description: "Two-elevation kitchen configuration based on frontend/public/pdfs/105845.pdf",
    items: AB_105845_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105847",
    kitchenCode: "105 847",
    name: "105847",
    description: "Two-elevation kitchen configuration based on frontend/public/pdfs/105847.pdf",
    items: AB_105847_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105850",
    kitchenCode: "105 850",
    name: "105850",
    description: "Kitchen configuration using the AB 105847 two-elevation layout",
    items: AB_105847_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105853",
    kitchenCode: "105 853",
    name: "105853",
    description: "Kitchen configuration using the AB 105847 two-elevation layout",
    items: AB_105847_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105856",
    kitchenCode: "105 856",
    name: "105856",
    description: "Kitchen configuration using the AB 105847 two-elevation layout",
    items: AB_105847_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105859",
    kitchenCode: "105 859",
    name: "105859",
    description: "Kitchen configuration using the AB 105847 two-elevation layout",
    items: AB_105847_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105862",
    kitchenCode: "105 862",
    name: "105862",
    description: "Kitchen configuration using the AB 105847 two-elevation layout",
    items: AB_105847_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105848",
    kitchenCode: "105 848",
    name: "105848",
    description: "Kitchen configuration using the AB 105845 two-elevation layout",
    items: AB_105845_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105851",
    kitchenCode: "105 851",
    name: "105851",
    description: "Kitchen configuration using the AB 105845 two-elevation layout",
    items: AB_105845_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105854",
    kitchenCode: "105 854",
    name: "105854",
    description: "Kitchen configuration using the AB 105845 two-elevation layout",
    items: AB_105845_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105857",
    kitchenCode: "105 857",
    name: "105857",
    description: "Kitchen configuration using the AB 105845 two-elevation layout",
    items: AB_105845_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105860",
    kitchenCode: "105 860",
    name: "105860",
    description: "Kitchen configuration using the AB 105845 two-elevation layout",
    items: AB_105845_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105846",
    kitchenCode: "105 846",
    name: "105846",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 105846.svg",
    items: AB_105846_ITEMS_WITH_SINK_END_BLENDE,
    reconcileExisting: true,
  },
  {
    slug: "ab-109873",
    kitchenCode: "109 873",
    name: "109873",
    description: "Linear kitchen configuration based on frontend/public/pdfs/AB 109873 fin.pdf",
    items: AB_109873_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-109874",
    kitchenCode: "109 874",
    name: "109874",
    description: "L-shaped kitchen configuration based on frontend/public/pdfs/AB 109874.pdf",
    items: AB_109874_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-109955",
    kitchenCode: "109 955",
    name: "109955",
    description: "Straight kitchen configuration based on frontend/public/pdfs/AB 109955.pdf",
    items: AB_109955_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-110401",
    kitchenCode: "110 401",
    name: "110401",
    description: "L-shaped kitchen configuration based on frontend/public/pdfs/AB 110401.pdf",
    items: AB_110401_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-110402",
    kitchenCode: "110 402",
    name: "110402",
    description: "Straight kitchen configuration based on frontend/public/plans/AB 110402.svg",
    items: AB_110402_ITEMS,
    reconcileExisting: true,
  },
  ...AB_105846_LAYOUT_ALIAS_CODES.map((code) => ({
    slug: `ab-${code}`,
    kitchenCode: `${code.slice(0, 3)} ${code.slice(3)}`,
    name: code,
    description: "L-shaped kitchen configuration based on the AB 105846 layout",
    items: AB_105846_LAYOUT_ALIAS_ITEMS,
    reconcileExisting: true,
  })),
  {
    slug: "ab-105839",
    kitchenCode: "105 839",
    name: "105839",
    description: "Kitchen configuration based on the AB 105842 kitchen layout",
    items: AB_105839_ITEMS,
  },
  {
    slug: "ab-105841",
    kitchenCode: "105 841",
    name: "105841",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105841_page-0001.jpg",
    items: AB_105841_ITEMS,
  },
  {
    slug: "ab-105838",
    kitchenCode: "105 838",
    name: "105838",
    description: "Kitchen configuration based on the AB 105841 kitchen layout",
    items: AB_105838_ITEMS,
  },
  {
    slug: "ab-105844",
    kitchenCode: "105 844",
    name: "105844",
    description: "Kitchen configuration based on the AB 105841 kitchen layout",
    items: AB_105844_ITEMS,
  },
  {
    slug: "ab-105744",
    kitchenCode: "105 744",
    name: "105744",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105744_page-0001.jpg",
    items: AB_105744_ITEMS,
  },
  {
    slug: "ab-110140",
    kitchenCode: "110 140",
    name: "110140",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 110140.svg",
    items: AB_110140_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-110510",
    kitchenCode: "110 510",
    name: "110510",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 110510.svg",
    items: AB_110510_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-111539",
    kitchenCode: "111 539",
    name: "111539",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 111539.svg",
    items: AB_111539_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-104332",
    kitchenCode: "104 332",
    programmId: "BURGER CINDY",
    seedCatalogProgramPrices: true,
    name: "104332",
    description: "L-shaped kitchen based on frontend/public/pdfs/670 104332.pdf; eight included supplier rows",
    items: AB_104332_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-104296",
    kitchenCode: "104 296",
    programmId: "BURGER CINDY",
    seedCatalogProgramPrices: true,
    name: "104296",
    description: "L-shaped kitchen based on frontend/public/pdfs/670 104296.pdf; customer-owned fridge and dishwasher",
    items: AB_104296_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-101246",
    kitchenCode: "101 246",
    programmId: "BURGER CINDY",
    name: "101246",
    description: "Straight kitchen based on frontend/public/pdfs/670 101246.pdf",
    items: AB_101246_ITEMS,
    reconcileExisting: true,
  },
];

const DEFAULT_KITCHEN_CONTRACTS = [
  { contractNumber: "670103898", kitchenSlug: "burger-103898" },
  { contractNumber: "111103898", kitchenSlug: "burger-103898" },
  ...DEFAULT_KITCHENS
    .filter((kitchen) => kitchen.slug.startsWith("ab-"))
    .flatMap((kitchen) => [
      {
        contractNumber: buildKitchenContractNumber(kitchen, "670"),
        kitchenSlug: kitchen.slug,
      },
      {
        contractNumber: buildKitchenContractNumber(kitchen, "111"),
        kitchenSlug: kitchen.slug,
      },
    ]),
];

const OBSOLETE_KITCHENS = [
  { slug: "kitchen-model-c", contractNumbers: ["736269"] },
  { slug: "kitchen-model-b", contractNumbers: ["736268"] },
  { slug: "l-shaped-kitchen", contractNumbers: ["736270"] },
  { slug: "l-kitchen-new", contractNumbers: ["736271"] },
];

function buildKitchenContractNumber(kitchen, prefix) {
  const code = String(kitchen.kitchenCode || kitchen.slug).replace(/\D/g, "");

  if (!code) {
    throw new Error(`Cannot build kitchen contract number without a code: ${kitchen.slug}`);
  }

  return `${prefix}${code}`;
}

function normalizeSeedSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function isDefaultOvenHobItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  return Boolean(item?.isLocked) && (
    code === DEFAULT_OVEN_HOB_CATALOG_CODE ||
    /^OVEN-.+-HOB$/.test(code)
  );
}

function isDefaultSinkBaseItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  return Boolean(item?.isLocked) && code.startsWith("SINKBASE-");
}

function applyDefaultSinkBaseCatalogFields(item) {
  return {
    ...item,
    code: DEFAULT_SINK_BASE_CATALOG_CODE,
    name: DEFAULT_SINK_BASE_CATALOG_NAME_EN,
    nameDe: DEFAULT_SINK_BASE_CATALOG_NAME_DE,
    price: "0.00",
    widthMm: null,
    heightMm: null,
    depthMm: null,
    articleNumber: null,
    blendeCode: null,
    blendeLabel: null,
    blendePrice: null,
    infoText: DEFAULT_SINK_BASE_CATALOG_INFO_TEXT,
  };
}

function isDefaultSinkWorktopItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  return Boolean(item?.isLocked) && (
    code === DEFAULT_SINK_WORKTOP_CATALOG_CODE ||
    /^SINK-.+BOTTON/.test(code) ||
    (code.startsWith("SINK-") && item?.iconKey === "sink_faucet")
  );
}

function isDefaultWorktopItem(item) {
  if (isDefaultSinkWorktopItem(item)) return true;

  const code = String(item?.code || "").trim().toUpperCase();
  return Boolean(item?.isLocked) && (
    item?.iconKey === "worktop" ||
    item?.componentKey === "worktop" ||
    code.startsWith("TOP-")
  );
}

function applyDefaultWorktopCatalogFields(item) {
  return {
    ...item,
    name: DEFAULT_WORKTOP_CATALOG_NAME_EN,
    nameDe: DEFAULT_WORKTOP_CATALOG_NAME_DE,
    price: "0.00",
    widthMm: null,
    heightMm: null,
    depthMm: null,
    articleNumber: null,
    blendeCode: null,
    blendeLabel: null,
    blendePrice: null,
    infoText: DEFAULT_WORKTOP_CATALOG_INFO_TEXT,
  };
}

function isDishwasherItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const iconKey = String(item?.iconKey || "").trim().toLowerCase();
  const name = String(item?.name || "").trim().toLowerCase();
  return code.startsWith("DISH-") || iconKey === "dishwasher_base" || name.includes("dishwasher");
}

function applyDishwasherCatalogFields(item) {
  return {
    ...item,
    widthMm: null,
    heightMm: null,
    depthMm: null,
  };
}

function applyDefaultCatalogItem(item) {
  if (isDefaultOvenHobItem(item)) {
    return applyCentralizedArticlePricing({
      ...item,
      code: DEFAULT_OVEN_HOB_CATALOG_CODE,
      name: DEFAULT_OVEN_HOB_CATALOG_NAME_EN,
      nameDe: DEFAULT_OVEN_HOB_CATALOG_NAME_DE,
      articleNumber: item.catalogArticleNumber || null,
      price: DEFAULT_OVEN_HOB_CATALOG_PRICE,
      blendeCode: null,
      blendeLabel: null,
      blendePrice: null,
    });
  }

  if (isDefaultSinkBaseItem(item)) {
    return applyCentralizedArticlePricing(applyDefaultSinkBaseCatalogFields(item));
  }

  if (isDefaultSinkWorktopItem(item)) {
    return applyCentralizedArticlePricing(applyDefaultWorktopCatalogFields({
      ...item,
      code: DEFAULT_SINK_WORKTOP_CATALOG_CODE,
    }));
  }

  if (isDefaultWorktopItem(item)) {
    return applyCentralizedArticlePricing(applyDefaultWorktopCatalogFields(item));
  }

  if (isDishwasherItem(item)) {
    return applyCentralizedArticlePricing(applyDishwasherCatalogFields(item));
  }

  return applyCentralizedArticlePricing(item);
}

const LOWER_CABINET_ICON_KEYS = new Set([
  "base_cabinet_30",
  "drawer_base",
  "drawer_base_two",
  "drawer_base_three",
]);

const UPPER_CABINET_ICON_KEYS = new Set([
  "wall_cabinet_l",
  "wall_cabinet_plain",
  "wall_cabinet_r",
  "wall_cabinet_standard",
]);

const EXCLUDED_CABINET_CODE_PREFIXES = [
  "CAB-HOOD-",
  "HOOD-",
  "DISH-",
  "LIGHT-",
  "OVEN-",
  "REF-",
  "SINKBASE-",
  "TOP-",
  "WM-",
];

const EXCLUDED_CABINET_ICON_KEYS = new Set([
  "dishwasher_base",
  "extractor_hood",
  "hood",
  "oven_base",
  "tall_refrigerator",
  "under_cabinet_light",
  "washing_machine_base",
  "worktop",
]);

function firstPositiveNumber(values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }
  return null;
}

function extractCabinetWidthFromText(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const patterns = [
    /\b(?:US|H)(?:2A)?(\d{2})(?:\d{2})?\b/i,
    /\b(\d{3})\s*(?:x|\u00d7|\/)\s*\d{2,4}\b/i,
    /\b(?:width|breite)\D{0,12}(\d{3})\b/i,
    /\b(\d{3})\s*mm\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const number = Number.parseInt(match[1], 10);
    if (Number.isFinite(number) && number > 0) {
      return number < 100 ? number * 10 : number;
    }
  }

  return null;
}

function extractCabinetWidthFromCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!code) return null;

  const patterns = [
    /(?:^|[-_])(?:TOP|BOTTOM)[-_]?(\d{3})(?:$|[-_])/,
    /(?:^|[-_])(\d{3})(?:$|[-_])/,
    /(?:^|[-_])US(?:2A)?(\d{2})(?:$|[-_])/,
    /(?:^|[-_])H(\d{2})\d{2}(?:$|[-_])/,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (!match) continue;
    const number = Number.parseInt(match[1], 10);
    if (Number.isFinite(number) && number > 0) {
      return number < 100 ? number * 10 : number;
    }
  }

  return null;
}

function getCabinetWidthMm(item) {
  return firstPositiveNumber([
    item?.widthMm,
    extractCabinetWidthFromCode(item?.code),
    extractCabinetWidthFromText(item?.name),
    extractCabinetWidthFromText(item?.infoText),
    extractCabinetWidthFromText(item?.articleNumber),
  ]);
}

function getCabinetKind(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const iconKey = String(item?.iconKey || "").trim().toLowerCase();
  const componentKey = String(item?.componentKey || "").trim().toLowerCase();
  const name = String(item?.name || "").trim().toLowerCase();

  if (!code && !iconKey && !componentKey && !name) return null;
  if (EXCLUDED_CABINET_CODE_PREFIXES.some((prefix) => code.startsWith(prefix))) return null;
  if (EXCLUDED_CABINET_ICON_KEYS.has(iconKey)) return null;
  if (code.startsWith("CAB-BASE-")
    || code.startsWith("CAB-COOK-")
    || code.startsWith("CAB-DRAWER-")
    || code.startsWith("LKNEW-BOTTOM-")
    || code.startsWith("T3D-CAB-BASE-")
    || code.startsWith("T3D-CAB-CORNER-")
    || code.startsWith("T3D-CAB-DRAWERS-")
    || code.startsWith("T3D-CAB-STORAGE-")
    || LOWER_CABINET_ICON_KEYS.has(iconKey)) {
    return "lower";
  }

  if (code.startsWith("CAB-WALL-")
    || code.startsWith("LKNEW-TOP-")
    || code.startsWith("T3D-CAB-WALL-")
    || UPPER_CABINET_ICON_KEYS.has(iconKey)
    || componentKey.includes("wall-cabinet")) {
    return "upper";
  }

  if (/^(base cabinet|sink base cabinet|drawer base cabinet|return base cabinet|corner base cabinet)\b/.test(name)) {
    return "lower";
  }
  if (/^wall cabinet\b/.test(name)) {
    return "upper";
  }

  return null;
}

function getCabinetWidthDisplayName(item, language = "en") {
  const kind = getCabinetKind(item);
  const widthMm = getCabinetWidthMm(item);
  if (!kind || !Number.isFinite(Number(widthMm)) || Number(widthMm) <= 0) return "";
  const widthCm = Number(widthMm) / 10;
  const widthLabel = Number.isInteger(widthCm)
    ? String(widthCm)
    : String(Number(widthCm.toFixed(2))).replace(/\.0+$/, "");
  if (language === "de") {
    return kind === "lower" ? `Unterschrank mit Schublade ${widthLabel} cm` : `Oberschrank ${widthLabel} cm`;
  }
  return kind === "lower"
    ? `Lower Cabinet with Drawer ${widthLabel} cm`
    : `Upper Cabinet ${widthLabel} cm`;
}

function formatBlendeLabel(label) {
  let normalized = String(label || "").trim().replace(/\s+/g, " ").replace(/^blende\s+/i, "");
  if (!normalized) return null;

  normalized = normalized.replace(/(\d)\s*cm\b/gi, "$1 cm");

  const doublePrefix = normalized.match(/^2\s*x,?\s*(UPK20|HPK2002)\s+(.+)$/i);
  if (doublePrefix) {
    normalized = `${doublePrefix[1]} ${doublePrefix[2]} x 2`;
  }

  const match = normalized.match(/^([A-Z0-9-]+)\s+(.+)$/i);
  if (!match) return normalized;

  return `${match[1]}, ${match[2]}`;
}

function mapClaimsDecisionGuideEntry(entry) {
  const priorityByDecision = {
    URGENT_CLAIM_STOP_USE: 130,
    CREATE_CLAIM_SERVICE: 115,
    SELF_CHECK_FIRST_CLAIM_IF_UNSOLVED: 100,
    NO_CLAIM_NORMAL: 70,
  };

  return {
    slug: `claims-guide-${normalizeSeedSlug(entry.id || `${entry.productCode}-${entry.problem}`)}`,
    brand: "Amica",
    applianceType: entry.itemType,
    topicType: "claims_decision_guide",
    code: null,
    titleKey: entry.problem,
    symptomKeys: [entry.problem],
    checkKeys: [entry.safeUserCheck].filter(Boolean),
    causeKeys: [entry.possibleCause].filter(Boolean),
    actionKeys: [entry.claimTrigger, entry.chatbotDecision].filter(Boolean),
    triggerTerms: [
      ...new Set([
        ...(Array.isArray(entry.aliases) ? entry.aliases : []),
        ...(Array.isArray(entry.matchTerms) ? entry.matchTerms : []),
      ]),
    ],
    priority: priorityByDecision[entry.chatbotDecision] || 80,
    isActive: true,
  };
}

const SERVICE_CLAIM_KNOWLEDGE_ENTRIES = [
  ...SERVICE_CLAIM_TROUBLESHOOTING_DATA.lookupEntries,
  ...CLAIMS_CHATBOT_KNOWLEDGE.entries.map(mapClaimsDecisionGuideEntry),
];

const DEFAULT_HOUSING_COMPANY = {
  name: "ARGE Nördliche Riedsiedlung",
  address: "Beekbreite 2-8, 49124 Georgsmarienhütte, Germany",
  email: null,
  phone: null,
  notes: "c/o MBN GmbH",
};

const DEFAULT_PROPERTY_PROJECT = {
  objectName: "Hamburg",
  projectName: "Hamburg",
  projectCode: "Hamburg",
  projectStatus: "active",
  projectDescription: "Kitchens for Hamburg project",
  projectManagerName: null,
  contactPhone: null,
  country: "Germany",
  city: "Hamburg",
  postalCode: "22111",
  address1: "Hermannstal 92-114",
  address2: null,
};

async function pruneNonDefaultHousingCompanies() {
  const defaultCompanyName = DEFAULT_HOUSING_COMPANY.name;

  const unlinkedContracts = await prisma.kitchenContract.updateMany({
    where: {
      projectId: { not: null },
      project: {
        housingCompany: {
          name: { not: defaultCompanyName },
        },
      },
    },
    data: { projectId: null },
  });

  const deletedHousingCompanies = await prisma.housingCompany.deleteMany({
    where: {
      name: { not: defaultCompanyName },
    },
  });

  return {
    deletedHousingCompanies: deletedHousingCompanies.count,
    unlinkedContracts: unlinkedContracts.count,
  };
}

async function ensureDefaultPropertyProject(projectSeed = DEFAULT_PROPERTY_PROJECT) {
  const company = DEFAULT_HOUSING_COMPANY;

  const existingOwner = await prisma.housingCompany.findFirst({
    where: { name: company.name },
  });

  const ownerId = existingOwner?.id || randomUUID();
  if (existingOwner) {
    await prisma.housingCompany.update({
      where: { id: ownerId },
      data: {
        name: company.name,
        address: company.address,
        email: company.email,
        phone: company.phone,
        notes: company.notes,
      },
    });
  } else {
    await prisma.housingCompany.create({
      data: {
        id: ownerId,
        name: company.name,
        address: company.address,
        email: company.email,
        phone: company.phone,
        notes: company.notes,
      },
    });
  }

  const existingObject = await prisma.propertyObject.findFirst({
    where: {
      housingCompanyId: ownerId,
      name: projectSeed.objectName,
    },
  });

  const objectId = existingObject?.id || randomUUID();
  if (existingObject) {
    await prisma.propertyObject.update({
      where: { id: objectId },
      data: {
        name: projectSeed.objectName,
        contactPhone: projectSeed.contactPhone,
        country: projectSeed.country,
        city: projectSeed.city,
        postalCode: projectSeed.postalCode,
        address1: projectSeed.address1,
        address2: projectSeed.address2,
      },
    });
  } else {
    await prisma.propertyObject.create({
      data: {
        id: objectId,
        name: projectSeed.objectName,
        housingCompanyId: ownerId,
        contactPhone: projectSeed.contactPhone,
        country: projectSeed.country,
        city: projectSeed.city,
        postalCode: projectSeed.postalCode,
        address1: projectSeed.address1,
        address2: projectSeed.address2,
      },
    });
  }

  const project = await prisma.project.upsert({
    where: { propertyObjectId: objectId },
    update: {
      name: projectSeed.projectName,
      projectCode: projectSeed.projectCode,
      status: projectSeed.projectStatus,
      description: projectSeed.projectDescription,
      managerName: projectSeed.projectManagerName,
      housingCompanyId: ownerId,
    },
    create: {
      propertyObjectId: objectId,
      housingCompanyId: ownerId,
      name: projectSeed.projectName,
      projectCode: projectSeed.projectCode,
      status: projectSeed.projectStatus,
      description: projectSeed.projectDescription,
      managerName: projectSeed.projectManagerName,
    },
  });

  return project.id;
}

async function applyConfirmedContractAddresses(onlyKitchenSlug = "") {
  for (const [contractNumber, address] of Object.entries(CONTRACT_CLIENT_ADDRESS_DEFAULTS)) {
    const contract = await prisma.kitchenContract.findUnique({
      where: { contractNumber },
      select: { id: true, kitchen: { select: { slug: true } } },
    });
    if (!contract || (onlyKitchenSlug && contract.kitchen.slug !== onlyKitchenSlug)) continue;

    const projectName = `${address.city} - ${address.address1}`;
    const projectId = await ensureDefaultPropertyProject({
      ...DEFAULT_PROPERTY_PROJECT,
      objectName: projectName,
      projectName,
      projectCode: contractNumber,
      projectDescription: `Confirmed supplier address for contract ${contractNumber}`,
      country: address.country,
      city: address.city,
      postalCode: address.postalCode,
      address1: address.address1,
      address2: address.address2 || null,
    });
    await prisma.kitchenContract.update({
      where: { id: contract.id },
      data: { projectId, floor: address.floor || null, unitNumber: address.unitNumber || null },
    });
  }
}

async function linkImplementedKitchenContracts(projectId) {
  await prisma.kitchenContract.updateMany({
    where: {
      contractNumber: { not: { startsWith: "DM-" } },
      kitchen: { status: KitchenStatus.ACTIVE },
    },
    data: { projectId },
  });

  const linkedContracts = await prisma.kitchenContract.findMany({
    where: {
      projectId,
      contractNumber: { not: { startsWith: "DM-" } },
      kitchen: { status: KitchenStatus.ACTIVE },
    },
    select: { contractNumber: true },
    orderBy: { contractNumber: "asc" },
  });

  return linkedContracts.map((contract) => contract.contractNumber);
}

function compactSeedRecord(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

// Upgrade the first 104296 import without changing kitchen-item IDs/codes or
// creating a second sink/faucet package that differs only by an orientation.
async function normalizeAb104296CatalogArticles() {
  const mappings = [
    ["GI88214-01 L", "GI88214-01"],
    ["SPDT60 R", "SPDT60"],
    ["526335 R + 517720", "526335 + 517720"],
  ];
  await prisma.$transaction(async (tx) => {
    for (const [sourceNumber, targetNumber] of mappings) {
      const source = await tx.catalogArticle.findUnique({
        where: { articleNumber: sourceNumber }, include: { programPrices: true },
      });
      if (!source) continue;
      const target = await tx.catalogArticle.findUnique({ where: { articleNumber: targetNumber } });
      if (target) {
        await tx.kitchenItem.updateMany({
          where: { catalogArticleId: source.id },
          data: { catalogArticleId: target.id, articleNumber: targetNumber },
        });
        for (const price of source.programPrices) {
          await tx.catalogArticleProgramPrice.upsert({
            where: { programmId_catalogArticleId: { programmId: price.programmId, catalogArticleId: target.id } },
            create: { programmId: price.programmId, catalogArticleId: target.id, articleNumber: targetNumber, price: price.price, isActive: price.isActive },
            update: {},
          });
        }
        await tx.catalogArticlePriceHistory.updateMany({
          where: { catalogArticleId: source.id },
          data: { catalogArticleId: target.id, articleNumber: targetNumber },
        });
        await tx.catalogArticle.delete({ where: { id: source.id } });
      } else {
        await tx.catalogArticle.update({ where: { id: source.id }, data: { articleNumber: targetNumber } });
        await tx.kitchenItem.updateMany({ where: { catalogArticleId: source.id }, data: { articleNumber: targetNumber } });
        await tx.catalogArticleProgramPrice.updateMany({ where: { catalogArticleId: source.id }, data: { articleNumber: targetNumber } });
      }
    }
  });
}

// Explicitly opted-in kitchens register their actual linked records in their
// program's catalog. Existing supplier prices and other programs are preserved.
async function seedKitchenCatalogProgramPrices(kitchenRecord) {
  const programmId = kitchenRecord.programmId;
  const items = await prisma.kitchenItem.findMany({
    where: { kitchenId: kitchenRecord.id },
    include: { catalogArticle: true, catalogBlende: true, catalogService: true },
  });
  await prisma.catalogProgram.upsert({
    where: { programmId },
    create: { programmId, name: programmId === "BURGER CINDY" ? "Burger - Cindy Type" : programmId, isActive: true },
    update: {},
  });
  for (const [relation, delegate, idField, identifierField] of [
    ["catalogArticle", "catalogArticleProgramPrice", "catalogArticleId", "articleNumber"],
    ["catalogBlende", "catalogBlendeProgramPrice", "catalogBlendeId", "code"],
    ["catalogService", "catalogServiceProgramPrice", "catalogServiceId", "code"],
  ]) {
    const records = new Map(items.filter((item) => item[relation]).map((item) => [item[relation].id, item[relation]]));
    for (const record of records.values()) {
      await prisma[delegate].upsert({
        where: { [`programmId_${idField}`]: { programmId, [idField]: record.id } },
        create: { programmId, [idField]: record.id, [identifierField]: record[identifierField], price: record.price, isActive: record.isActive },
        update: {},
      });
    }
  }
}

async function seedCatalogMasterData() {
  const result = {
    articlesCreated: 0,
    articlesExisting: 0,
    blendenCreated: 0,
    blendenExisting: 0,
    servicesCreated: 0,
    servicesExisting: 0,
  };

  for (const article of CATALOG_ARTICLES) {
    const data = compactSeedRecord({
      articleNumber: article.articleNumber,
      name: article.name,
      nameDe: article.nameDe ?? null,
      description: article.description ?? null,
      widthMm: article.widthMm ?? null,
      heightMm: article.heightMm ?? null,
      depthMm: article.depthMm ?? null,
      price: article.price,
      itemType: article.itemType,
      productImagePath: article.productImagePath ?? null,
      productInfoPdfPath: article.productInfoPdfPath ?? null,
      productInfoSummary: article.productInfoSummary ?? null,
      productInfoKeyFacts: article.productInfoKeyFacts ?? null,
      productInfoExtractedText: article.productInfoExtractedText ?? null,
      productInfoUpdatedAt: article.productInfoUpdatedAt ?? null,
      isFixedPricePackage: Boolean(article.isFixedPricePackage),
      isActive: article.isActive !== false,
    });

    const existingArticle = await prisma.catalogArticle.findUnique({
      where: { articleNumber: article.articleNumber },
      select: { id: true },
    });
    if (existingArticle) {
      result.articlesExisting += 1;
      continue;
    }

    await prisma.catalogArticle.create({ data });
    result.articlesCreated += 1;
  }

  for (const blende of CATALOG_BLENDEN) {
    const data = compactSeedRecord({
      code: blende.code,
      name: blende.name,
      nameDe: blende.nameDe ?? null,
      description: blende.description ?? null,
      price: blende.price,
      isActive: blende.isActive !== false,
    });

    const existingBlende = await prisma.catalogBlende.findUnique({
      where: { code: blende.code },
      select: { id: true },
    });
    if (existingBlende) {
      result.blendenExisting += 1;
      continue;
    }

    await prisma.catalogBlende.create({ data });
    result.blendenCreated += 1;
  }

  for (const service of CATALOG_SERVICES) {
    const data = compactSeedRecord({
      code: service.code,
      name: service.name,
      nameDe: service.nameDe ?? null,
      description: service.description ?? null,
      price: service.price,
      isActive: service.isActive !== false,
    });

    const existingService = await prisma.catalogService.findUnique({
      where: { code: service.code },
      select: { id: true },
    });
    if (existingService) {
      result.servicesExisting += 1;
      continue;
    }

    await prisma.catalogService.create({ data });
    result.servicesCreated += 1;
  }

  console.log(
    `Catalog seed created ${result.articlesCreated}/${CATALOG_ARTICLES.length} articles, ${result.blendenCreated}/${CATALOG_BLENDEN.length} blenden, and ${result.servicesCreated}/${CATALOG_SERVICES.length} services; existing rows were left unchanged.`,
  );
}

async function ensureBurgerCindyCatalogArticles() {
  // These identities and prices come from the Burger CINDY supplier list.
  // Keep their internal kitchen item codes stable for existing orders.
  const articles = [
    { articleNumber: "H10072", name: "Upper Cabinet 100 cm", nameDe: "Oberschrank 100 cm", widthMm: 1000, price: "211.00" },
    { articleNumber: "H6072", name: "Upper Cabinet 60 cm", nameDe: "Oberschrank 60 cm", widthMm: 600, price: "146.00" },
    { articleNumber: "H4072", name: "Upper Cabinet 40 cm", nameDe: "Oberschrank 40 cm", widthMm: 400, price: "128.00" },
    { articleNumber: "H5072", name: "Upper Cabinet 50 cm", nameDe: "Oberschrank 50 cm", widthMm: 500, price: "135.00" },
    { articleNumber: "H3072", name: "Upper Cabinet 30 cm", nameDe: "Oberschrank 30 cm", widthMm: 300, price: "124.00" },
    { articleNumber: "FH664621E+FWK124+HFLH6072", name: HOOD_WALL_CABINET_CATALOG_NAME_EN, nameDe: HOOD_WALL_CABINET_CATALOG_NAME_DE, widthMm: 600, price: "346.00", isFixedPricePackage: true },
    { articleNumber: "ZBE60", name: "Cutlery insert 60 cm", nameDe: "Besteckeinsatz 60 cm", widthMm: 600, price: "20.00" },
    { articleNumber: "Blanco Botton 517467", name: "Waste separation system Blanco Botton", nameDe: "Mülltrennsystem Blanco Botton", widthMm: null, price: "89.00" },
  ];
  for (const spec of articles) {
    const article = await prisma.catalogArticle.upsert({
      where: { articleNumber: spec.articleNumber },
      update: {},
      create: {
        ...spec,
        heightMm: ["ZBE60", "Blanco Botton 517467"].includes(spec.articleNumber) ? null : 720,
        depthMm: ["ZBE60", "Blanco Botton 517467"].includes(spec.articleNumber) ? null : 340,
        itemType: ["ZBE60", "Blanco Botton 517467"].includes(spec.articleNumber) ? ItemType.ACCESSORY : ItemType.COMPONENT,
        isFixedPricePackage: Boolean(spec.isFixedPricePackage),
        isActive: true,
      },
    });
    await prisma.catalogArticleProgramPrice.upsert({
      where: {
        programmId_catalogArticleId: {
          programmId: "BURGER CINDY",
          catalogArticleId: article.id,
        },
      },
      update: {},
      create: {
        programmId: "BURGER CINDY",
        catalogArticleId: article.id,
        articleNumber: spec.articleNumber,
        price: spec.price,
        isActive: true,
      },
    });
  }
  const cornerBlende = await prisma.catalogBlende.upsert({
    where: { code: "UPE65" },
    update: {},
    create: {
      code: "UPE65",
      name: "Corner filler panel 65 cm",
      nameDe: "Eckblende 65 cm",
      price: "79.00",
      isActive: true,
    },
  });
  await prisma.catalogBlendeProgramPrice.upsert({
    where: {
      programmId_catalogBlendeId: {
        programmId: "BURGER CINDY",
        catalogBlendeId: cornerBlende.id,
      },
    },
    update: {},
    create: {
      programmId: "BURGER CINDY",
      catalogBlendeId: cornerBlende.id,
      code: "UPE65",
      price: "79.00",
      isActive: true,
    },
  });
}

// A kitchen item stores its own W/H/D snapshot. To keep those in sync with the catalog that
// actually lives in the target database, we prefer the catalog article's dimension whenever it
// specifies a positive value, and fall back to the item's seeded value otherwise (e.g. appliance
// packages whose catalog rows carry no dimensions).
function pickCatalogDimension(catalogValue, itemValue) {
  const catalogNumber = Number(catalogValue);
  if (Number.isFinite(catalogNumber) && catalogNumber > 0) {
    return catalogNumber;
  }
  return itemValue ?? null;
}

async function loadCatalogArticleDimensions() {
  const byArticleNumber = new Map();
  const articles = await prisma.catalogArticle.findMany({
    select: { articleNumber: true, widthMm: true, heightMm: true, depthMm: true },
  });
  for (const article of articles) {
    const key = String(article.articleNumber || "").trim();
    if (key) {
      byArticleNumber.set(key, article);
    }
  }
  return byArticleNumber;
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const onlyKitchenSlug = String(process.env.SEED_ONLY_KITCHEN_SLUG || "").trim().toLowerCase();
  // Production deploys must not recreate or overwrite records that an admin
  // has edited. Set SEED_RECONCILE_EXISTING=true only for an intentional,
  // operator-approved structural reconciliation.
  const reconcileExistingEnabled = String(process.env.SEED_RECONCILE_EXISTING || "")
    .trim()
    .toLowerCase() === "true";
  const kitchensToSeed = onlyKitchenSlug
    ? DEFAULT_KITCHENS.filter((kitchen) => kitchen.slug === onlyKitchenSlug)
    : DEFAULT_KITCHENS;

  if (onlyKitchenSlug && !kitchensToSeed.length) {
    throw new Error(`Unknown kitchen seed slug: ${onlyKitchenSlug}`);
  }

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash, role: "SUPERADMIN", isActive: true },
      create: { email: adminEmail, passwordHash, role: "SUPERADMIN" },
    });
  }

  if (kitchensToSeed.some((kitchen) => kitchen.slug === "ab-104296")) {
    await normalizeAb104296CatalogArticles();
  }
  await seedCatalogMasterData();

  if (kitchensToSeed.some((kitchen) => kitchen.programmId === "BURGER CINDY")) {
    await ensureBurgerCindyCatalogArticles();
  }

  const catalogArticleByNumber = new Map(
    (await prisma.catalogArticle.findMany()).map((article) => [article.articleNumber, article]),
  );
  const catalogBlendeByCode = new Map(
    (await prisma.catalogBlende.findMany()).map((blende) => [blende.code, blende]),
  );
  const catalogServiceByCode = new Map(
    (await prisma.catalogService.findMany()).map((service) => [service.code, service]),
  );
  if (!onlyKitchenSlug) {
    const housingCompanyCleanup = await pruneNonDefaultHousingCompanies();
    if (housingCompanyCleanup.deletedHousingCompanies || housingCompanyCleanup.unlinkedContracts) {
      console.log(
        `Removed ${housingCompanyCleanup.deletedHousingCompanies} non-ARGE housing companies and unlinked ${housingCompanyCleanup.unlinkedContracts} contracts.`,
      );
    }
  }

  const defaultProjectId = await ensureDefaultPropertyProject();

  // Read the catalog dimensions that exist in *this* database so newly seeded kitchen items
  // inherit them (option 2: kitchen item W/H/D follows the catalog article by articleNumber).
  const catalogArticleDimsByNumber = await loadCatalogArticleDimensions();

  for (const kitchen of kitchensToSeed) {
    const existingKitchen = await prisma.kitchen.findUnique({
      where: { slug: kitchen.slug },
      select: { id: true },
    });

    const reconcileExisting = reconcileExistingEnabled
      && Boolean(existingKitchen && kitchen.reconcileExisting);
    if (existingKitchen && !reconcileExisting) {
      continue;
    }

    const kitchenData = {
      kitchenCode: kitchen.kitchenCode || null,
      programmId: kitchen.programmId || DEFAULT_KITCHEN_PROGRAMM_ID,
      name: kitchen.name,
      status: KitchenStatus.ACTIVE,
      description: kitchen.description,
    };
    const kitchenRecord = existingKitchen
      ? await prisma.kitchen.update({
        where: { id: existingKitchen.id },
        data: kitchenData,
      })
      : await prisma.kitchen.create({
        data: {
          slug: kitchen.slug,
          ...kitchenData,
        },
      });
    const seededItemCodes = [];

    for (const rawItem of kitchen.items) {
      const item = applyDefaultCatalogItem(rawItem);
      seededItemCodes.push(item.code);
      const itemCode = String(item.code || "").trim().toUpperCase();
      const catalogArticleNumber = item.useCatalogArticle === false
        ? ""
        : item.catalogArticleNumber || (item.isActive === false
          && itemCode.startsWith("HOOD-")
          && String(item.articleNumber || "").trim() === "FH 664 621 E"
            ? "FH664621E + FWK124 + HD6002"
            : String(item.articleNumber || "").trim());
      if (item.isActive !== false && catalogArticleNumber) {
        assertBurgerCindyArticleCode(catalogArticleNumber, kitchen.programmId);
      }
      const catalogArticle = catalogArticleNumber
        ? catalogArticleByNumber.get(catalogArticleNumber)
        : null;
      const defaultProductInfo =
        PRODUCT_INFO_BY_ARTICLE_NUMBER[String(item.articleNumber || "").trim()] ||
        PRODUCT_INFO_BY_CODE[item.code] ||
        PRODUCT_INFO_BY_CODE[rawItem.code] ||
        {};
      const burgerProductInfo = kitchen.slug === "burger-103898"
        ? BURGER_103898_PRODUCT_INFO_BY_CODE[item.code]
        : null;
      const productInfo = burgerProductInfo
        ? { ...defaultProductInfo, ...burgerProductInfo }
        : defaultProductInfo;
      // Resolve the item's stored dimensions against the catalog that exists in this database, so
      // the width-based display name (e.g. "Upper Cabinet 60 cm") stays consistent with the dims.
      const catalogDims = catalogArticleNumber
        ? catalogArticleDimsByNumber.get(catalogArticleNumber)
        : null;
      // A 45 cm dishwasher must keep the FRG width even if an existing database row
      // was previously linked to the generic 60 cm dishwasher catalog article.
      const resolvedWidthMm = itemCode.startsWith("DISH-") && itemCode.endsWith("-450")
        ? Number(rawItem.widthMm) || 450
        : pickCatalogDimension(catalogDims?.widthMm, item.widthMm);
      const resolvedHeightMm = pickCatalogDimension(catalogDims?.heightMm, item.heightMm);
      const resolvedDepthMm = pickCatalogDimension(catalogDims?.depthMm, item.depthMm);
      const itemForName = { ...item, widthMm: resolvedWidthMm };
      const cabinetWidthName = item.preserveName ? "" : getCabinetWidthDisplayName(itemForName);
      const cabinetWidthNameDe = item.preserveName ? "" : getCabinetWidthDisplayName(itemForName, "de");
      const isDishwasherItem = itemCode.startsWith("DISH-")
        || item.iconKey === "dishwasher_base";
      const isRefrigeratorItem = itemCode.startsWith("REF-")
        || itemCode === "LKNEW-REFRIGERATOR"
        || item.iconKey === "tall_refrigerator";
      const isHoodWallCabinetItem = itemCode.startsWith("CAB-HOOD-");
      const isDefaultCatalogItem = isDefaultOvenHobItem(item)
        || isDefaultSinkBaseItem(item)
        || isDefaultWorktopItem(item);
      const itemName = isDefaultOvenHobItem(item)
        ? DEFAULT_OVEN_HOB_CATALOG_NAME_EN
        : isDefaultSinkBaseItem(item)
          ? DEFAULT_SINK_BASE_CATALOG_NAME_EN
          : isDefaultWorktopItem(item)
            ? DEFAULT_WORKTOP_CATALOG_NAME_EN
            : isDishwasherItem
              ? DISHWASHER_CATALOG_NAME_EN
            : isRefrigeratorItem
              ? REFRIGERATOR_CATALOG_NAME_EN
              : isHoodWallCabinetItem
                ? HOOD_WALL_CABINET_CATALOG_NAME_EN
                : cabinetWidthName || item.name;
      const itemNameDe = isDefaultOvenHobItem(item)
        ? DEFAULT_OVEN_HOB_CATALOG_NAME_DE
        : isDefaultSinkBaseItem(item)
          ? DEFAULT_SINK_BASE_CATALOG_NAME_DE
          : isDefaultWorktopItem(item)
            ? DEFAULT_WORKTOP_CATALOG_NAME_DE
            : isDishwasherItem
              ? DISHWASHER_CATALOG_NAME_DE
            : isRefrigeratorItem
              ? REFRIGERATOR_CATALOG_NAME_DE
              : isHoodWallCabinetItem
                ? HOOD_WALL_CABINET_CATALOG_NAME_DE
                : cabinetWidthNameDe || item.nameDe || null;
      const normalizedAttachedBlendeCode = normalizeBlendeCode(item.blendeCode);
      const normalizedStandaloneBlendeCode = normalizeBlendeCode(item.catalogBlendeCode);
      const normalizedBlendeCode = normalizedAttachedBlendeCode || normalizedStandaloneBlendeCode;
      const isStandaloneCatalogBlende = Boolean(
        normalizedStandaloneBlendeCode && !normalizedAttachedBlendeCode,
      );
      const catalogBlende = normalizedBlendeCode
        ? catalogBlendeByCode.get(normalizedBlendeCode)
        : null;
      const catalogServiceCode = item.code === "SVC-MONTAGE-001"
        ? "MONTAGE"
        : item.code === "SVC-PICKUP-001"
          ? "PICKUP"
          : "";
      const catalogService = catalogServiceCode
        ? catalogServiceByCode.get(catalogServiceCode)
        : null;
      const catalogBlendeQuantity = catalogBlende ? Math.max(1, getBlendeQuantity(item)) : null;
      const resolvedCatalogBlendeQuantity = isStandaloneCatalogBlende ? 1 : catalogBlendeQuantity;
      const dimensionlessCatalogBlende = (isStandaloneCatalogBlende && catalogBlende?.code === "UPK20")
        || (!catalogArticle
          && (item.iconKey === "blende" || String(item.componentKey || "").endsWith("-blende"))
          && String(item.articleNumber || "").trim().toUpperCase() === "UPK20");
      const data = {
        ...productInfo,
        productInfoUpdatedAt: productInfo.productInfoPdfPath ? new Date() : null,
        itemType: item.itemType,
        code: item.code,
        articleNumber: item.displayArticleNumber
          || catalogArticle?.articleNumber
          || (isStandaloneCatalogBlende ? catalogBlende?.code : item.articleNumber)
          || null,
        name: item.preserveName
          ? itemName
          : catalogArticle?.name
            || (isStandaloneCatalogBlende ? catalogBlende?.name : itemName),
        nameDe: item.preserveName
          ? itemNameDe
          : catalogArticle?.nameDe
            || (isStandaloneCatalogBlende ? catalogBlende?.nameDe : itemNameDe)
            || null,
        price: isStandaloneCatalogBlende && catalogBlende ? catalogBlende.price : item.price,
        widthMm: dimensionlessCatalogBlende ? null : resolvedWidthMm,
        heightMm: dimensionlessCatalogBlende ? null : resolvedHeightMm,
        depthMm: dimensionlessCatalogBlende ? null : resolvedDepthMm,
        infoText: item.infoText || null,
        iconKey: item.iconKey || null,
        colorKey: item.colorKey || null,
        componentKey: item.componentKey || null,
        sortOrder: item.sortOrder || 0,
        isLocked: Boolean(item.isLocked),
        isActive: item.isActive !== false,
        blendeCode: isStandaloneCatalogBlende
          ? null
          : catalogBlende?.code || item.blendeCode || null,
        blendeLabel: isStandaloneCatalogBlende
          ? null
          : catalogBlende?.nameDe || catalogBlende?.name || formatBlendeLabel(item.blendeLabel),
        blendePrice: isStandaloneCatalogBlende ? null : item.blendePrice ?? null,
        catalogArticleId: catalogArticle?.id || null,
        catalogBlendeId: catalogBlende?.id || null,
        catalogBlendeQuantity: resolvedCatalogBlendeQuantity,
        catalogServiceId: catalogService?.id || null,
        catalogLinkStatus: catalogArticle || catalogBlende || catalogService ? "MATCHED" : null,
        ...(item.catalogPriceSyncMode
          ? { catalogPriceSyncMode: item.catalogPriceSyncMode }
          : {}),
      };

      if (reconcileExisting) {
        await prisma.kitchenItem.upsert({
          where: {
            kitchenId_code: {
              kitchenId: kitchenRecord.id,
              code: item.code,
            },
          },
          update: data,
          create: {
            kitchenId: kitchenRecord.id,
            ...data,
          },
        });
      } else {
        await prisma.kitchenItem.create({
          data: {
            kitchenId: kitchenRecord.id,
            ...data,
          },
        });
      }
    }

    if (reconcileExisting) {
      await prisma.kitchenItem.updateMany({
        where: {
          kitchenId: kitchenRecord.id,
          code: { notIn: seededItemCodes },
          isActive: true,
        },
        data: { isActive: false },
      });
    }

    if (kitchen.seedCatalogProgramPrices) {
      await seedKitchenCatalogProgramPrices(kitchenRecord);
    }

    const claimSourceItems = kitchen.items.map(applyDefaultCatalogItem);
    const sinkCabinet = claimSourceItems.find((item) => (
      item?.isActive !== false
      && (
        String(item?.code || "").toUpperCase().startsWith("SINKBASE-")
        || String(item?.componentKey || "").toLowerCase() === "sink-base"
      )
    ));
    const sinkFixture = claimSourceItems.find((item) => (
      item?.isActive !== false
      && String(item?.componentKey || "").toLowerCase() === "sink-faucet"
    ));
    const sinkCabinetArticleCode = String(sinkCabinet?.articleNumber || "").trim().toUpperCase() || "SP60";
    const sinkCabinetClaimNames = {
      SP120: { name: "Sink Base Cabinet 120 cm", nameDe: "Spülenschrank 120 cm" },
      SPB90: { name: "Sink Base Cabinet 90 cm", nameDe: "Spülenschrank 90 cm" },
    };
    const sinkCabinetClaimName = sinkCabinetClaimNames[sinkCabinetArticleCode] || {
      name: "Sink Lower Cabinet",
      nameDe: "Spülen-Unterschrank",
    };
    for (const part of [
      { partKey: "sink", articleCode: "526335", name: "Built-in Sink BLANCO TIPO 45 S", nameDe: "Einbau-Spüle BLANCO TIPO 45 S", source: sinkFixture, sortOrder: 10 },
      { partKey: "sink-cabinet", articleCode: sinkCabinetArticleCode, ...sinkCabinetClaimName, source: sinkCabinet, sortOrder: 20 },
      { partKey: "faucet", articleCode: "517720", name: "Kitchen Faucet BLANCO DARAS HD", nameDe: "Küchenarmatur BLANCO DARAS HD", source: sinkFixture, sortOrder: 30 },
    ]) {
      if (!part.source) continue;
      const { source, ...claimPart } = part;
      await prisma.kitchenClaimPart.upsert({
        where: {
          kitchenId_partKey: {
            kitchenId: kitchenRecord.id,
            partKey: claimPart.partKey,
          },
        },
        update: {
          ...claimPart,
          sourceKitchenItemCode: source.code,
          sourceComponentKey: source.componentKey,
          isActive: true,
        },
        create: {
          kitchenId: kitchenRecord.id,
          ...claimPart,
          sourceKitchenItemCode: source.code,
          sourceComponentKey: source.componentKey,
          isActive: true,
        },
      });
    }

    // Plain Uxx cabinets are supplier DEFAULT items with no commercial price.
    // Store them as claim-only products linked to their existing KitchenItem
    // and componentKey, so ASC reuses the exact cabinet hotspot.
    const claimOnlyCabinets = claimSourceItems.filter((item) => (
      item?.isActive !== false
      && item?.isLocked
      && (
        /^U\d+$/i.test(String(item?.articleNumber || "").trim())
        || (
          kitchen.slug === "ab-110401"
          && String(item?.articleNumber || "").trim().toUpperCase() === "UE115"
        )
      )
      && String(item?.componentKey || "").trim()
    ));
    const claimOnlyCabinetPartKeys = [];
    for (const cabinet of claimOnlyCabinets) {
      const componentKey = String(cabinet.componentKey || "").trim();
      const articleCode = String(cabinet.articleNumber || "").trim().toUpperCase();
      const partKey = `cabinet-${componentKey}`;
      claimOnlyCabinetPartKeys.push(partKey);
      const claimCabinet = {
        partKey,
        articleCode,
        name: cabinet.name || `Lower Cabinet ${articleCode.slice(1)} cm`,
        nameDe: cabinet.nameDe || `Unterschrank ${articleCode.slice(1)} cm`,
        sourceKitchenItemCode: cabinet.code,
        sourceComponentKey: componentKey,
        sortOrder: Number(cabinet.sortOrder || 0),
        isActive: true,
      };
      await prisma.kitchenClaimPart.upsert({
        where: {
          kitchenId_partKey: {
            kitchenId: kitchenRecord.id,
            partKey,
          },
        },
        update: claimCabinet,
        create: {
          kitchenId: kitchenRecord.id,
          ...claimCabinet,
        },
      });
    }
    if (reconcileExisting) {
      await prisma.kitchenClaimPart.updateMany({
        where: {
          kitchenId: kitchenRecord.id,
          partKey: {
            startsWith: "cabinet-",
            ...(claimOnlyCabinetPartKeys.length ? { notIn: claimOnlyCabinetPartKeys } : {}),
          },
        },
        data: { isActive: false },
      });
    }

    const filterSources = claimSourceItems.filter((item) => (
      item?.isActive !== false
      && String(item?.articleNumber || "")
        .split("+")
        .some((articleCode) => articleCode.trim().toUpperCase() === "FWK124")
    ));
    const filterSource = filterSources.find((item) => (
      String(item?.componentKey || "").toLowerCase().startsWith("wall-cabinet-")
    )) || filterSources[0];
    if (filterSource) {
      const filterPart = {
        partKey: "filter",
        articleCode: "FWK124",
        name: "Extractor Hood Filter",
        nameDe: "Filter für Dunstabzugshaube",
        sortOrder: 35,
        sourceKitchenItemCode: filterSource.code,
        sourceComponentKey: filterSource.componentKey,
        isActive: true,
      };
      await prisma.kitchenClaimPart.upsert({
        where: {
          kitchenId_partKey: {
            kitchenId: kitchenRecord.id,
            partKey: filterPart.partKey,
          },
        },
        update: filterPart,
        create: {
          kitchenId: kitchenRecord.id,
          ...filterPart,
        },
      });
    }

    const dishwasherSource = claimSourceItems.find((item) => (
      item?.isActive !== false
      && String(item?.code || "").toUpperCase().startsWith("DISH-")
      && String(item?.articleNumber || "")
        .split("+")
        .some((articleCode) => ["TGV45", "TGV60"].includes(articleCode.trim().toUpperCase()))
    ));
    if (dishwasherSource) {
      const dishwasherCode = String(dishwasherSource.code || "").trim().toUpperCase();
      const dishwasherArticles = String(dishwasherSource.articleNumber || "")
        .split("+")
        .map((articleCode) => articleCode.trim().toUpperCase());
      const isDishwasher45 = dishwasherCode.endsWith("-450")
        || dishwasherArticles.includes("TGV45");
      const dishwasherClaimParts = [
        {
          partKey: "dishwasher",
          articleCode: isDishwasher45 ? "A-EGSPV587915" : "A-EGSPV597210",
          name: isDishwasher45 ? "Fully Integrated Dishwasher 45 cm" : "Fully Integrated Dishwasher 60 cm",
          nameDe: isDishwasher45 ? "Vollintegrierter Geschirrspüler 45 cm" : "Vollintegrierter Geschirrspüler 60 cm",
          sortOrder: 32,
        },
        {
          partKey: "furniture-front",
          articleCode: isDishwasher45 ? "TGV45" : "TGV60",
          name: "Furniture Front (Dishwasher)",
          nameDe: "Möbelfront (Geschirrspüler)",
          sortOrder: 34,
        },
      ];
      for (const part of dishwasherClaimParts) {
        await prisma.kitchenClaimPart.upsert({
          where: {
            kitchenId_partKey: {
              kitchenId: kitchenRecord.id,
              partKey: part.partKey,
            },
          },
          update: {
            ...part,
            sourceKitchenItemCode: dishwasherSource.code,
            sourceComponentKey: dishwasherSource.componentKey,
            ...(isDishwasher45 ? {
              productImagePath: null,
              productInfoPdfPath: null,
              productInfoSummary: null,
              productInfoKeyFacts: null,
              productInfoExtractedText: null,
              productInfoUpdatedAt: null,
            } : {}),
            isActive: true,
          },
          create: {
            kitchenId: kitchenRecord.id,
            ...part,
            sourceKitchenItemCode: dishwasherSource.code,
            sourceComponentKey: dishwasherSource.componentKey,
            isActive: true,
          },
        });
      }
    } else if (reconcileExisting) {
      await prisma.kitchenClaimPart.updateMany({
        where: {
          kitchenId: kitchenRecord.id,
          partKey: { in: ["dishwasher", "furniture-front"] },
        },
        data: { isActive: false },
      });
    }
    const normalizedKitchenSlug = String(kitchen.slug || "").trim().toLowerCase();
    const ovenBundle = claimSourceItems
      .find((item) => (
        item?.isActive !== false
        && ["oven-module", "oven-base"].includes(String(item?.componentKey || "").toLowerCase())
        && String(item?.code || "").toUpperCase().startsWith("OVEN-")
      ));
    if (ovenBundle) {
      const ovenArticleCode = String(ovenBundle.claimArticleNumber || ovenBundle.articleNumber || "").split("+")[0].trim() || "EH92364E-A";
      const ovenProductInfo = PRODUCT_INFO_BY_ARTICLE_NUMBER[ovenArticleCode] || OVEN_CLAIM_PRODUCT_INFO;
      const ovenClaimParts = ["ab-104296", "ab-104332"].includes(kitchen.slug) ? [
        { partKey: "oven-set", articleCode: "EHCX9330S-A", name: "Built-in oven and ceramic cooktop set", nameDe: "Einbauherd und Glaskeramikkochfeld", sortOrder: 40 },
      ] : [
        { partKey: "oven", articleCode: ovenArticleCode, name: "Built-in Oven", nameDe: "Einbauherd", sortOrder: 40, ...ovenProductInfo, ...ovenBundle.claimProductInfoByPartKey?.oven },
        { partKey: "oven-drawer", articleCode: "UHK", name: "Lower Cabinet for Built-in Oven", nameDe: "Unterschrank für Einbauherde", sortOrder: 45 },
        { partKey: "cooktop", articleCode: "9EC744100C", name: "Ceramic Cooktop 60cm", nameDe: "Glaskeramikkochfeld 60 cm", sortOrder: 50, ...COOKTOP_CLAIM_PRODUCT_INFO, ...ovenBundle.claimProductInfoByPartKey?.cooktop },
      ];
      for (const part of ovenClaimParts) {
        await prisma.kitchenClaimPart.upsert({
          where: {
            kitchenId_partKey: {
              kitchenId: kitchenRecord.id,
              partKey: part.partKey,
            },
          },
          update: {
            ...part,
            sourceKitchenItemCode: ovenBundle.code,
            sourceComponentKey: ovenBundle.componentKey,
            productInfoUpdatedAt: part.productInfoPdfPath ? new Date() : null,
            isActive: true,
          },
          create: {
            kitchenId: kitchenRecord.id,
            ...part,
            sourceKitchenItemCode: ovenBundle.code,
            sourceComponentKey: ovenBundle.componentKey,
            productInfoUpdatedAt: part.productInfoPdfPath ? new Date() : null,
            isActive: true,
          },
        });
      }
    }

    if (kitchen.slug === "ab-104296") {
      const housing = claimSourceItems.find((item) => item.componentKey === "fridge-cabinet" && item.isActive !== false);
      if (housing) {
        // GI88214-01 is one supplied article, including its fronts, body and plinth.
        // Retire the earlier physical splits without deleting their stored records.
        await prisma.kitchenClaimPart.updateMany({
          where: {
            kitchenId: kitchenRecord.id,
            partKey: { in: ["housing-upper-front", "housing-middle-front", "housing-drawer-front", "housing-lower-front", "housing-plinth", "housing-carcase"] },
          },
          data: { isActive: false },
        });
        for (const definition of AB_104296_HOUSING_CLAIM_PARTS) {
          const sourceComponentKey = definition.sourceComponentKey || housing.componentKey;
          const source = claimSourceItems.find((item) => item.componentKey === sourceComponentKey && item.isActive !== false);
          if (!source) throw new Error(`Missing housing claim source: ${sourceComponentKey}`);
          const data = {
            ...definition,
            articleCode: source.articleNumber,
            sourceKitchenItemCode: source.code,
            sourceComponentKey,
            isActive: true,
          };
          await prisma.kitchenClaimPart.upsert({
            where: { kitchenId_partKey: { kitchenId: kitchenRecord.id, partKey: definition.partKey } },
            update: data,
            create: { kitchenId: kitchenRecord.id, ...data },
          });
        }
      }
    }

    const worktop = claimSourceItems
      .find((item) => (
        item?.isActive !== false
        && String(item?.componentKey || "").toLowerCase() === "worktop"
      ));
    const hasSeparatedWorktops = (
      L_SHAPED_CLAIM_KITCHEN_SLUGS.has(normalizedKitchenSlug)
      || TWO_PART_CLAIM_KITCHEN_SLUGS.has(normalizedKitchenSlug)
    );
    if (worktop && hasSeparatedWorktops) {
      const worktopArticleCode = ["ab-104296", "ab-104332"].includes(normalizedKitchenSlug) ? "AP60" : null;
      for (const part of [
        { partKey: "worktop-left", articleCode: worktopArticleCode || "PLR60-1", name: "Left Worktop", nameDe: "Arbeitsplatte links", sortOrder: 60 },
        { partKey: "worktop-right", articleCode: worktopArticleCode || "PLR60-2", name: "Right Worktop", nameDe: "Arbeitsplatte rechts", sortOrder: 70 },
      ]) {
        const sourceWorktop = ((normalizedKitchenSlug === "ab-105790" && part.partKey === "worktop-left")
          || (["ab-105793", "ab-105796", "ab-105799", "ab-105802"].includes(normalizedKitchenSlug) && part.partKey === "worktop-right"))
          ? claimSourceItems.find((item) => item.componentKey === "worktop-secondary" && item.isActive !== false)
          : worktop;
        if (!sourceWorktop) throw new Error(`Missing worktop claim source for ${normalizedKitchenSlug}: ${part.partKey}`);
        await prisma.kitchenClaimPart.upsert({
          where: {
            kitchenId_partKey: {
              kitchenId: kitchenRecord.id,
              partKey: part.partKey,
            },
          },
          update: {
            ...part,
            sourceKitchenItemCode: sourceWorktop.code,
            sourceComponentKey: sourceWorktop.componentKey,
            isActive: true,
          },
          create: {
            kitchenId: kitchenRecord.id,
            ...part,
            sourceKitchenItemCode: sourceWorktop.code,
            sourceComponentKey: sourceWorktop.componentKey,
            isActive: true,
          },
        });
      }
    } else if (reconcileExisting) {
      await prisma.kitchenClaimPart.updateMany({
        where: {
          kitchenId: kitchenRecord.id,
          partKey: { in: ["worktop-left", "worktop-right"] },
        },
        data: { isActive: false },
      });
    }

    if (worktop && WORKTOP_END_PANEL_CLAIM_KITCHEN_SLUGS.has(normalizedKitchenSlug)) {
      const panelParts = [{
        partKey: "worktop-end-panel",
        articleCode: "WU16",
        name: "Cabinet side panel",
        nameDe: "Unterschrank-Wange",
        sortOrder: 80,
      }];
      if (["ab-105791", "ab-105794", "ab-105797", "ab-105800", "ab-105803"].includes(normalizedKitchenSlug)) {
        panelParts.push({
          partKey: "worktop-end-panel-left", articleCode: "WU16",
          name: "Left cabinet side panel", nameDe: "Unterschrank-Wange links", sortOrder: 81,
        });
      }
      if (["ab-105793", "ab-105796", "ab-105799", "ab-105802"].includes(normalizedKitchenSlug)) {
        panelParts.push({ partKey: "worktop-end-panel-right", articleCode: "WU16", name: "Right block cabinet side panel", nameDe: "Unterschrank-Wange rechts", sortOrder: 81 });
      }
      for (const part of panelParts) {
      const panelSource = part.partKey === "worktop-end-panel-right"
        ? claimSourceItems.find(item => item.componentKey === "worktop-secondary") : worktop;
      await prisma.kitchenClaimPart.upsert({
        where: {
          kitchenId_partKey: {
            kitchenId: kitchenRecord.id,
            partKey: part.partKey,
          },
        },
        update: {
          ...part,
          sourceKitchenItemCode: panelSource.code,
          sourceComponentKey: panelSource.componentKey,
          isActive: true,
        },
        create: {
          kitchenId: kitchenRecord.id,
          ...part,
          sourceKitchenItemCode: panelSource.code,
          sourceComponentKey: panelSource.componentKey,
          isActive: true,
        },
      });
      }
    }

    await prisma.kitchenClaimPart.upsert({
      where: {
        kitchenId_partKey: {
          kitchenId: kitchenRecord.id,
          partKey: "cabinet-side-panel",
        },
      },
      update: {
        articleCode: "WU16",
        name: "Cabinet side panel",
        nameDe: "Unterschrank-Wange",
        isActive: false,
        sortOrder: 80,
      },
      create: {
        kitchenId: kitchenRecord.id,
        partKey: "cabinet-side-panel",
        articleCode: "WU16",
        name: "Cabinet side panel",
        nameDe: "Unterschrank-Wange",
        isActive: false,
        sortOrder: 80,
      },
    });

    if (normalizedKitchenSlug === "ab-101246") {
      for (const part of AB_101246_CLAIM_PARTS) {
        const staleProductInfo = ["oven", "cooktop"].includes(part.partKey)
          ? {
              productImagePath: null,
              productInfoPdfPath: null,
              productInfoSummary: null,
              productInfoKeyFacts: null,
              productInfoExtractedText: null,
              productInfoUpdatedAt: null,
            }
          : {};
        await prisma.kitchenClaimPart.upsert({
          where: { kitchenId_partKey: { kitchenId: kitchenRecord.id, partKey: part.partKey } },
          update: { ...part, ...staleProductInfo, isActive: true },
          create: { kitchenId: kitchenRecord.id, ...part, ...staleProductInfo, isActive: true },
        });
      }
    }
  }

  if (onlyKitchenSlug) {
    const kitchen = await prisma.kitchen.findUnique({
      where: { slug: onlyKitchenSlug },
      select: { id: true },
    });

    for (const contract of DEFAULT_KITCHEN_CONTRACTS.filter(
      (entry) => entry.kitchenSlug === onlyKitchenSlug,
    )) {
      await prisma.kitchenContract.upsert({
        where: { contractNumber: contract.contractNumber },
        update: {
          kitchenId: kitchen.id,
          projectId: defaultProjectId,
          isActive: true,
        },
        create: {
          contractNumber: contract.contractNumber,
          kitchenId: kitchen.id,
          projectId: defaultProjectId,
          isActive: true,
        },
      });
    }

    await applyConfirmedContractAddresses(onlyKitchenSlug);
    console.log(`Seeded kitchen ${onlyKitchenSlug}.`);
    return;
  }

  for (const obsolete of OBSOLETE_KITCHENS) {
    const kitchen = await prisma.kitchen.findUnique({
      where: { slug: obsolete.slug },
      select: { id: true },
    });
    const contracts = await prisma.kitchenContract.findMany({
      where: {
        OR: [
          ...(kitchen ? [{ kitchenId: kitchen.id }] : []),
          { contractNumber: { in: obsolete.contractNumbers } },
        ],
      },
      select: { id: true },
    });
    const contractIds = contracts.map((contract) => contract.id);

    if (!kitchen && contractIds.length === 0) continue;

    await prisma.order.deleteMany({
      where: {
        OR: [
          ...(kitchen ? [{ kitchenId: kitchen.id }] : []),
          ...(contractIds.length ? [{ kitchenContractId: { in: contractIds } }] : []),
        ],
      },
    });
    await prisma.kitchenContract.deleteMany({
      where: {
        OR: [
          ...(kitchen ? [{ kitchenId: kitchen.id }] : []),
          { contractNumber: { in: obsolete.contractNumbers } },
        ],
      },
    });
    if (kitchen) {
      await prisma.kitchen.delete({
        where: { id: kitchen.id },
      });
    }
  }

  for (const contract of DEFAULT_KITCHEN_CONTRACTS) {
    const kitchen = await prisma.kitchen.findUnique({
      where: { slug: contract.kitchenSlug },
      select: { id: true },
    });

    if (!kitchen) {
      throw new Error(`Kitchen not found for contract seed: ${contract.kitchenSlug}`);
    }

    await prisma.kitchenContract.upsert({
      where: { contractNumber: contract.contractNumber },
      update: {
        kitchenId: kitchen.id,
        projectId: defaultProjectId,
        isActive: true,
      },
      create: {
        contractNumber: contract.contractNumber,
        kitchenId: kitchen.id,
        projectId: defaultProjectId,
        isActive: true,
      },
    });
  }

  const linkedContractNumbers = await linkImplementedKitchenContracts(defaultProjectId);
  await applyConfirmedContractAddresses();
  console.log(
    `Linked ${linkedContractNumbers.length} kitchen contract numbers to ${DEFAULT_PROPERTY_PROJECT.projectName}.`,
  );

  for (const entry of SERVICE_CLAIM_KNOWLEDGE_ENTRIES) {
    await prisma.serviceClaimKnowledgeEntry.upsert({
      where: { slug: entry.slug },
      update: entry,
      create: entry,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
