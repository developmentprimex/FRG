import { getServiceClaimDishwasherMask } from "./service-claim-dishwasher-masks.js";
import { AB_105803_BLENDE_CALIBRATION, AB_105803_COOKTOP_POINTS, AB_105803_OVEN_PART_POINTS, AB_105803_SINK_POINTS } from "./ab-105803-plan.js";
import { getServiceClaimPartComponentId } from "./service-claim-kitchen-plan-selection.js";
import { AB_105793_BLENDE_CALIBRATION, AB_105793_COOKTOP_POINTS, AB_105793_OVEN_PART_POINTS } from "./ab-105793-plan.js";
import { AB_105796_BLENDE_CALIBRATION, AB_105796_COOKTOP_POINTS, AB_105796_OVEN_PART_POINTS } from "./ab-105796-plan.js";
import { AB_105799_BLENDE_CALIBRATION, AB_105799_COOKTOP_POINTS, AB_105799_OVEN_PART_POINTS } from "./ab-105799-plan.js";
import { AB_105802_BLENDE_CALIBRATION, AB_105802_COOKTOP_POINTS, AB_105802_OVEN_PART_POINTS } from "./ab-105802-plan.js";
import { AB_105792_BLENDE_CALIBRATION, AB_105792_COOKTOP_POINTS, AB_105792_OVEN_PART_POINTS } from "./ab-105792-plan.js";
import { AB_105795_BLENDE_CALIBRATION, AB_105795_COOKTOP_POINTS, AB_105795_OVEN_PART_POINTS } from "./ab-105795-plan.js";
import { AB_105798_BLENDE_CALIBRATION, AB_105798_COOKTOP_POINTS, AB_105798_OVEN_PART_POINTS } from "./ab-105798-plan.js";
import { AB_105801_BLENDE_CALIBRATION, AB_105801_COOKTOP_POINTS, AB_105801_OVEN_PART_POINTS } from "./ab-105801-plan.js";
import { AB_105791_BLENDE_CALIBRATION, AB_105791_COOKTOP_POINTS, AB_105791_OVEN_PART_POINTS, AB_105791_SINK_POINTS } from "./ab-105791-plan.js";
import { AB_105794_BLENDE_CALIBRATION, AB_105794_COOKTOP_POINTS, AB_105794_OVEN_PART_POINTS, AB_105794_SINK_POINTS } from "./ab-105794-plan.js";
import { AB_105797_BLENDE_CALIBRATION, AB_105797_COOKTOP_POINTS, AB_105797_OVEN_PART_POINTS, AB_105797_SINK_POINTS } from "./ab-105797-plan.js";
import { AB_105800_BLENDE_CALIBRATION, AB_105800_COOKTOP_POINTS, AB_105800_OVEN_PART_POINTS, AB_105800_SINK_POINTS } from "./ab-105800-plan.js";
import { AB_105790_BLENDE_CALIBRATION, AB_105790_COOKTOP_POINTS, AB_105790_OVEN_PART_POINTS, AB_105790_SINK_POINTS } from "./ab-105790-plan.js";
import { AB_105789_BLENDE_CALIBRATION, AB_105789_COOKTOP_POINTS, AB_105789_OVEN_PART_POINTS, AB_105789_SINK_POINTS } from "./ab-105789-plan.js";
import { AB_105804_BLENDE_CALIBRATION, AB_105804_COOKTOP_POINTS, AB_105804_OVEN_PART_POINTS, AB_105804_WORKTOP_PART_KEYS } from "./ab-105804-plan.js";
import { AB_105777_LAYOUT_ALIAS_SLUGS } from "./ab-105777-layout.js";
import { AB_105779_LAYOUT_ALIAS_SLUGS } from "./ab-105779-layout.js";
import { AB_105779_BLENDE_FACES, AB_105779_WORKTOP_PART_KEYS, AB_105779_SINK_POINTS, AB_105779_COOKTOP_POINTS, AB_105779_OVEN_PART_POINTS } from "./ab-105779-plan.js";

const AB_105778_LAYOUT_SLUGS = new Set(["ab-105778", "ab-105781", "ab-105784", "ab-105787"]);

const AB_105845_LAYOUT_ALIAS_SLUGS = [
  "105845-modul-2",
  "ab-105848",
  "ab-105851",
  "ab-105854",
  "ab-105857",
  "ab-105860",
];

const AB_105846_LAYOUT_ALIAS_SLUGS = [
  "ab-105849",
  "ab-105852",
  "ab-105855",
  "ab-105858",
  "ab-105861",
];

const AB_105847_LAYOUT_ALIAS_SLUGS = [
  "ab-105850",
  "ab-105853",
  "ab-105856",
  "ab-105859",
  "ab-105862",
];

const AB_105762_LAYOUT_ALIAS_SLUGS = [
  "ab-105766",
  "ab-105770",
  "ab-105774",
];

const L_SHAPED_CLAIM_KITCHEN_SLUGS = new Set([
  "ab-105803",
  "ab-105791",
  "ab-105794",
  "ab-105797",
  "ab-105800",
  ...AB_105779_LAYOUT_ALIAS_SLUGS,
  "ab-105779",
  "ab-105789",
  "ab-105790",
  "ab-104332",
  "ab-104296",
  "burger-103898",
  "ab-105762",
  "ab-105775",
  ...AB_105762_LAYOUT_ALIAS_SLUGS,
  "ab-105743",
  "ab-105748",
  "ab-105751", "ab-105754", "ab-105745",
  "ab-105758",
  "ab-104968",
  "ab-105734",
  "ab-105737",
  "ab-105740",
  "ab-105805",
  "ab-105809",
  "ab-105813",
  "ab-105817",
  "ab-105822",
  "ab-105825",
  "ab-105828",
  "ab-105831",
  "ab-105834",
  "ab-105837",
  "ab-105840",
  "ab-105843",
  "ab-105747",
  "ab-105750",
  "ab-105753",
  "ab-105756",
  "ab-105846",
  "ab-110140",
  "ab-110510",
  "ab-111539",
  "ab-109874",
  "ab-110401",
  ...AB_105846_LAYOUT_ALIAS_SLUGS,
]);

export function isLShapedClaimKitchen(kitchenSlug = "") {
  return L_SHAPED_CLAIM_KITCHEN_SLUGS.has(
    String(kitchenSlug || "").trim().toLowerCase(),
  );
}

// Measured from the full-resolution PDF renders. Coordinates are relative to each plan's
// faucet hotspot so the polygons remain aligned after the plan is cropped for display.
const L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG = {
  "ab-105779": AB_105779_SINK_POINTS.map(([x, y]) => [(x - 55.068884) / 0.88361, (y - 46.043697) / 3.569748]),
  "ab-105789": AB_105789_SINK_POINTS.map(([x, y]) => [(x - 599.4 / 842 * 100) / (40.08 / 842 * 100), (y - 280.84 / 595 * 100) / (60 / 595 * 100)]),
  "burger-103898": [[-2.075268817, 0.964447543], [-0.47311828, 0.851516208], [2.806451613, 1.071104915], [1.265232975, 1.181944929]],
  "ab-105762": [[-1.570532556,0.966873712],[-0.244514078,0.877846782],[1.059561153,0.991718454],[2.310344479,1.101449353],[1.053291465,1.19254667],[-0.394984162,1.091097317]],
  "ab-105775": [[-2.094650206,0.997690531],[-0.740740741,0.877598152],[3.041152263,1.072363356],[3.069958848,1.212471132],[1.448559671,1.2147806],[-1.995884774,1.013856813]],
  // Four outside sink strokes measured from the replacement AB 105743 vector PDF.
  "ab-105743": [[-0.200000081, 0.962376212], [3.192157039, 0.788118787], [4.741176765, 0.900990074], [1.349019645, 1.075247499]],
  // Outside sink strokes measured from the AB 105748 vector PDF.
  "ab-105748": [[-2.13834, 0.978923], [-0.217391, 0.864169], [2.743083, 1.119438], [0.841897, 1.234192]],
  // Four outside sink strokes measured from AB 105758's 842 x 595 PDF.
  "ab-105758": [[-0.21021, 0.826421], [3, 0.677419], [4.126126, 0.763441], [1.162162, 0.930876]],
  "ab-104968": [[-0.99, 1], [0.08, 0.91], [1.86, 1.13], [0.97, 1.22]],
  "ab-105734": [[-0.99, 1], [0.08, 0.91], [1.86, 1.13], [0.97, 1.22]],
  "ab-105737": [[-0.99, 1], [0.08, 0.91], [1.86, 1.13], [0.97, 1.22]],
  "ab-105740": [[-0.99, 1], [0.08, 0.91], [1.86, 1.13], [0.97, 1.22]],
  "ab-105805": [[-1.04, 0.94], [0.05, 0.85], [1.94, 1.06], [0.78, 1.18]],
  "ab-105809": [[-1.04, 0.94], [0.05, 0.85], [1.94, 1.06], [0.78, 1.18]],
  "ab-105813": [[-1.04, 0.94], [0.05, 0.85], [1.94, 1.06], [0.78, 1.18]],
  "ab-105817": [[-1.04, 0.94], [0.05, 0.85], [1.94, 1.06], [0.78, 1.18]],
  "ab-105822": [[-0.75, 0.94], [1.21, 0.78], [2.05, 0.88], [0.05, 1.05]],
  "ab-105825": [[-0.75, 0.94], [1.21, 0.78], [2.05, 0.88], [0.05, 1.05]],
  "ab-105828": [[-0.75, 0.94], [1.21, 0.78], [2.05, 0.88], [0.05, 1.05]],
  "ab-105831": [[-1.33, 1.04], [1.14, 0.85], [2.26, 0.96], [-0.22, 1.16]],
  "ab-105834": [[-1.26, 0.85], [-0.05, 0.75], [2.19, 0.96], [0.87, 1.06]],
  "ab-105837": [[-1.09, 1.02], [-0.04, 0.93], [1.9, 1.18], [0.86, 1.28]],
  // Four outside sink-bowl strokes measured from AB 105846's vector PDF.
  "ab-105846": [[-0.411949686, 0.97810219], [3.13836478, 0.768248175], [4.600628931, 0.894160584], [1.116352201, 1.138686131]],
  "ab-110140": [[-0.418439702, 0.981557439], [2.950354839, 0.778688555], [4.60992953, 0.889344227], [1.148936228, 1.11475412]],
  "ab-109874": [[-1.44262254, 0.986456027], [-0.081967077, 0.855530511], [2.301639093, 1.0835215], [0.855737585, 1.198645603]],
  "ab-110401": [[-0.538461538,1.712062257],[3.521367521,1.33463035],[5.525641026,1.548638132],[5.44017094,1.595330739],[1.371794872,1.980544747],[1.004273504,1.976653696],[-0.572649573,1.766536965],[-0.538461538,1.719844358]],
  "ab-111539": [[-1.796825393, 1.042201784], [1.577777971, 0.84220182], [3.244444637, 0.954128413], [-0.399999911, 1.20183482]],
  "ab-105840": [[-1.09, 1.02], [-0.04, 0.93], [1.9, 1.18], [0.86, 1.28]],
  "ab-105843": [[-1.09, 1.02], [-0.04, 0.93], [1.9, 1.18], [0.86, 1.28]],
  "ab-105747": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
  "ab-105750": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
  "ab-105753": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
  "ab-105756": [[-1.595113, 0.977883], [-0.291908, 0.862681], [1.089858, 1.017135], [-0.359432, 1.115202]],
};

// Absolute vector-plan outlines are preferable when one fixture is represented
// by several narrow hotspots. These coordinates remain in the uncropped source
// plan system and are projected into the ASC display crop below.
const L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG = {
  "ab-105803": AB_105803_SINK_POINTS,
  "ab-105791": AB_105791_SINK_POINTS,
  "ab-105794": AB_105794_SINK_POINTS,
  "ab-105797": AB_105797_SINK_POINTS,
  "ab-105800": AB_105800_SINK_POINTS,
  "ab-105779": AB_105779_SINK_POINTS,
  "ab-105789": AB_105789_SINK_POINTS,
  "ab-105790": AB_105790_SINK_POINTS,
  "burger-103898": [[57.662708, 59.30084], [64.033254, 58.211765], [77.073634, 60.329412], [70.945368, 61.398319]],
  "ab-105762": [[58.118765,56.578151],[64.147268,55.710924],[70.07601,56.820168],[75.76247,57.889076],[70.047506,58.776471],[63.463183,57.788235]],
  // Complete outside sink rim, including the left bowl and right drainer.
  // The earlier six-point mask cut through both end corners of the fixture.
  "ab-105775": [[67.581948,64.746218],[67.667458,64.685714],[73.524941,63.717647],[85.368171,65.431933],[85.467933,65.67395],[80.87886,66.621849],[79.795724,66.642017],[67.92399,64.907563]],
  // Four visible outside sink strokes traced from the AB 105825 source plan.
  // The wider source hotspot is only a generous click target and crosses the
  // worktop edges, so it must not be used as the painted selection mask.
  "ab-105825": [
    [16.9875, 54.6],
    [31.0015, 53.0],
    [37.0075, 54.0],
    [22.7075, 55.7],
  ],
  // Follow the four visible outside corners of the perspective sink. The
  // source hotspot remains wider for clicking, but this painted mask must not
  // whiten the surrounding worktop at its square bounding-box corners.
  "ab-105831": [
    [17.65, 59.16],
    [31.82, 56.75],
    [38.06, 58.18],
    [23.2, 60.58],
  ],
  // Four outside sink-bowl strokes in AB 105846's vector-plan coordinates.
  // The separate faucet silhouettes below remain clickable as one fixture.
  "ab-105846": [
    [11.258907, 58.534454],
    [27.349169, 56.215126],
    [33.976247, 57.606723],
    [18.185273, 60.309244],
  ],
  "ab-110140": [
    [31.140143, 55.751261],
    [44.679335, 53.754622],
    [51.349169, 54.843697],
    [37.43943, 57.062185],
  ],
  "ab-110510": [
    [59.330166, 53.633613],
    [65.586698, 52.685714],
    [67.011876, 52.746218],
    [78.356295, 55.085714],
    [78.228029, 55.327731],
    [71.971496, 56.235294],
    [71.102138, 56.215126],
    [65.258907, 55.226891],
    [59.2019, 53.87563],
  ],
  "ab-111539": [
    [17.543943, 55.368067],
    [32.693587, 53.169748],
    [40.175772, 54.4],
    [23.814727, 57.122689],
  ],
  "ab-109874": [
    [40.916865, 53.996639],
    [46.831354, 52.826891],
    [57.192399, 54.863866],
    [50.907363, 55.892437],
  ],
  "ab-110401": [
    [17.415677, 58.514286],
    [30.954869, 56.557983],
    [37.638955, 57.667227],
    [37.353919, 57.909244],
    [23.786223, 59.905882],
    [22.56057, 59.885714],
    [17.301663, 58.796639],
    [17.415677, 58.554622],
  ],
  "ab-105758": [
    [15.263658, 54.621849],
    [29.045131, 52.625210],
    [30.498812, 52.665546],
    [35.843230, 53.794958],
    [35.529691, 54.036975],
    [21.748219, 56.033613],
    [20.494062, 56.013445],
    [15.149644, 54.904202],
  ],
};

// These drawings contain one source hotspot for the sink bowl followed by a
// separate source hotspot for the faucet. Do not assign both claim identities
// to both shapes.
const DEDICATED_SINK_AND_FAUCET_HOTSPOT_SLUGS = new Set(["ab-104332", "ab-104296", "ab-105825", "ab-105831"]);
DEDICATED_SINK_AND_FAUCET_HOTSPOT_SLUGS.add("ab-105789");
DEDICATED_SINK_AND_FAUCET_HOTSPOT_SLUGS.add("ab-105790");
DEDICATED_SINK_AND_FAUCET_HOTSPOT_SLUGS.add("ab-105791");
DEDICATED_SINK_AND_FAUCET_HOTSPOT_SLUGS.add("ab-105794");
DEDICATED_SINK_AND_FAUCET_HOTSPOT_SLUGS.add("ab-105797");
DEDICATED_SINK_AND_FAUCET_HOTSPOT_SLUGS.add("ab-105800");
DEDICATED_SINK_AND_FAUCET_HOTSPOT_SLUGS.add("ab-105803");

// Thin visual silhouettes traced around the faucet body. Source hotspot boxes
// remain intentionally generous for interaction, but painting those boxes
// would add rectangular edges that do not exist in the kitchen drawing.
const FAUCET_SOURCE_POINTS_BY_SLUG = {
  "ab-110510": [
    [67.752969, 45.163025],
    [70.361045, 45.203361],
    [71.729216, 47.663866],
    [71.729216, 50.305882],
    [72.042755, 54.157983],
    [72.042755, 54.50084],
    [70.902613, 54.50084],
    [70.902613, 54.157983],
    [71.344418, 54.319328],
    [71.344418, 50.426891],
    [71.216152, 50.366387],
    [71.216152, 47.72437],
    [70.31829, 46.110924],
    [67.824228, 46.151261],
  ],
  "ab-110140": [
    [32.821853, 55.892437],
    [32.821853, 51.939496],
    [32.921615, 51.919328],
    [32.921615, 49.277311],
    [34.07601, 46.816807],
    [36.256532, 46.937815],
    [36.213777, 47.885714],
    [34.104513, 47.764706],
    [33.349169, 49.378151],
    [33.349169, 52.020168],
    [33.448931, 52.020168],
    [33.448931, 55.932773],
  ],
  "ab-105825": [
    [24.346793, 53.109244],
    [24.346793, 47.058824],
    [24.465558, 45.714286],
    [24.940618, 44.537815],
    [25.653207, 43.865546],
    [26.484561, 43.361345],
    [28.028504, 43.361345],
    [28.028504, 43.02521],
    [28.741093, 43.193277],
    [28.622328, 46.890756],
    [28.028504, 46.722689],
    [28.028504, 45.714286],
    [26.484561, 45.714286],
    [25.653207, 46.218487],
    [25.059382, 47.226891],
    [25.059382, 53.109244],
  ],
  "ab-105831": [
    [25.05, 58.3],
    [25.05, 52.0],
    [25.1, 51.1],
    [25.4, 50.3],
    [26.0, 49.7],
    [26.7, 49.35],
    [29.0, 48.4],
    [29.05, 47.6],
    [29.7, 47.65],
    [29.55, 51.2],
    [28.95, 51.1],
    [29.0, 50.6],
    [26.9, 49.9],
    [26.2, 50.1],
    [25.7, 50.5],
    [25.45, 51.0],
    [25.35, 51.7],
    [25.35, 58.3],
  ],
};

const RIGHT_LEG_COOKTOP_SLUGS = new Set([
  "ab-105743",
  "ab-105758",
  "ab-105822",
  "ab-105825",
  "ab-105828",
  "ab-105831",
  "ab-109874",
]);

const LEFT_LEG_COOKTOP_POINTS_RELATIVE_TO_OVEN = [
  [-1, -0.04],
  [0, -0.08],
  [1, 0],
  [0, 0.05],
];

// Dedicated cooktop polygons measured from the four outside strokes in each
// source plan render. Keeping the values relative to the oven hotspot
// preserves their alignment when the claim picker applies its display crop.
const COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG = {
  "ab-105779": AB_105779_COOKTOP_POINTS.map(([x, y]) => [(x - 33.76247) / 11.059382, (y - 57.566387) / 31.260504]),
  "ab-105762": [[-0.693421063,-0.052666216],[0.296052645,-0.103357487],[1.022368395,-0.05200789],[0,0.002633303]],
  "ab-105775": [[0.033873343,-0.098082596],[1.615611193,-0.044247788],[1.04712813,0.007374631],[0.033873343,-0.044247788]],
  "ab-110140": [[1.118461627, -0.096485619], [2.112307687, -0.038977633], [1.023076953, 0.012140566], [0.029230786, -0.049201273]],
  "burger-103898": [[-0.236714976, -0.090786819], [0.869565217, -0.045729657], [0, 0.00672495], [-0.834138486, -0.025554808]],
  // Four outside cooktop strokes measured from the replacement AB 105743 vector PDF.
  "ab-105743": [
    [0.003378393, -0.049122804],
    [1.065878347, -0.094035085],
    [2.025337765, -0.03719298],
    [0.998310782, 0.007017546],
  ],
  // Outside cooktop strokes measured from the AB 105748 vector PDF.
  "ab-105748": [
    [-0.670782, -0.0625],
    [0.293553, -0.114011],
    [1.02332, -0.061126],
    [0.074074, -0.006868],
  ],
  "ab-105758": [
    [0, -0.049592],
    [1.061934, -0.09479],
    [1.52568, -0.067169],
    [0.993958, 0.011927],
  ],
  // Four outside cooktop strokes from the AB 104968 vector PDF.
  "ab-104968": [
    [-0.667973662, -0.049348617],
    [0.29873725, -0.109551803],
    [1.029665013, -0.056546824],
    [0.011867752, -0.000269933],
  ],
  "ab-105805": [
    [-0.692275, -0.051067],
    [0.1879, -0.103753],
    [1.000594, -0.049604],
    [0.014799, 0.007473],
  ],
  "ab-105809": [
    [-0.692275, -0.051067],
    [0.1879, -0.103753],
    [1.000594, -0.049604],
    [0.014799, 0.007473],
  ],
  "ab-105813": [
    [-0.692275, -0.051067],
    [0.1879, -0.103753],
    [1.000594, -0.049604],
    [0.014799, 0.007473],
  ],
  "ab-105817": [
    [-0.692275, -0.051067],
    [0.1879, -0.103753],
    [1.000594, -0.049604],
    [0.014799, 0.007473],
  ],
  "ab-105822": [
    [-0.023249, -0.059484],
    [1.091867, -0.113637],
    [2.037511, -0.046988],
    [0.993574, 0.001611],
  ],
  "ab-105825": [
    [-0.023249, -0.059484],
    [1.091867, -0.113637],
    [2.037511, -0.046988],
    [0.993574, 0.001611],
  ],
  "ab-105828": [
    [-0.023249, -0.059484],
    [1.091867, -0.113637],
    [2.037511, -0.046988],
    [0.993574, 0.001611],
  ],
  "ab-105831": [
    [-0.001501, -0.041667],
    [1.065425, -0.090225],
    [2.054045, -0.030875],
    [1.00017, 0.023079],
  ],
  "ab-105837": [
    [-0.768612, -0.055883],
    [0.245432, -0.109993],
    [1.083709, -0.051824],
    [0.161605, 0.002286],
  ],
  // Six outer vertices preserve the kinked perspective outline of AB 105846's
  // cooktop instead of flattening it into an axis-aligned quadrilateral.
  "ab-105846": [
    [0.017759563, -0.041500853],
    [1.047814208, -0.085275725],
    [1.525956284, -0.059124503],
    [1.525956284, -0.005685048],
    [1.039617486, 0.014781126],
    [0.046448087, -0.040932348],
  ],
  "ab-109874": [
    [0, -0.050401766],
    [1.033391937, -0.094229376],
    [2.00175762, -0.037983912],
    [2.00175762, -0.030679334],
    [1.022847206, 0.010956903],
    [0.073696586, -0.046018983],
  ],
  "ab-105840": [
    [-0.768612, -0.055883],
    [0.245432, -0.109993],
    [1.083709, -0.051824],
    [0.161605, 0.002286],
  ],
  "ab-105843": [
    [-0.768612, -0.055883],
    [0.245432, -0.109993],
    [1.083709, -0.051824],
    [0.161605, 0.002286],
  ],
  "ab-105834": [
    [-0.855, -0.0529],
    [0.2163, -0.1017],
    [1.0665, -0.0423],
    [-0.0972, 0.0148],
  ],
  "ab-105747": [
    [-0.671433, -0.062431],
    [0.29387, -0.113779],
    [1.023722, -0.060042],
    [0.007871, -0.003956],
  ],
  "ab-105750": [
    [-0.671433, -0.062431],
    [0.29387, -0.113779],
    [1.023722, -0.060042],
    [0.007871, -0.003956],
  ],
  "ab-105753": [
    [-0.671433, -0.062431],
    [0.29387, -0.113779],
    [1.023722, -0.060042],
    [0.007871, -0.003956],
  ],
  "ab-105756": [
    [-0.671433, -0.062431],
    [0.29387, -0.113779],
    [1.023722, -0.060042],
    [0.007871, -0.003956],
  ],
};

const COOKTOP_SOURCE_POINTS_BY_SLUG = {
  "ab-105804": AB_105804_COOKTOP_POINTS,
  "ab-105803": AB_105803_COOKTOP_POINTS,
  "ab-105793": AB_105793_COOKTOP_POINTS,
  "ab-105796": AB_105796_COOKTOP_POINTS,
  "ab-105799": AB_105799_COOKTOP_POINTS,
  "ab-105802": AB_105802_COOKTOP_POINTS,
  "ab-105792": AB_105792_COOKTOP_POINTS,
  "ab-105795": AB_105795_COOKTOP_POINTS,
  "ab-105798": AB_105798_COOKTOP_POINTS,
  "ab-105801": AB_105801_COOKTOP_POINTS,
  "ab-105791": AB_105791_COOKTOP_POINTS,
  "ab-105794": AB_105794_COOKTOP_POINTS,
  "ab-105797": AB_105797_COOKTOP_POINTS,
  "ab-105800": AB_105800_COOKTOP_POINTS,
  "ab-105789": AB_105789_COOKTOP_POINTS,
  "ab-105790": AB_105790_COOKTOP_POINTS,
  // Exact outside cooktop strokes from the AB 105775 vector plan. The
  // dedicated source polygon keeps the ASC mask on the glass perimeter
  // instead of re-projecting it from the taller oven cabinet.
  "ab-105775": [
    [42.470309, 59.018487],
    [49.980998, 60.107563],
    [49.980998, 60.773109],
    [44.47981, 61.902521],
    [34.674584, 60.490756],
  ],
  "ab-111539": [
    [53.543943, 56.477311],
    [65.159145, 54.803361],
    [75.448931, 56.840336],
    [64.16152, 58.655462],
  ],
  // The straight elevation exposes the complete 600 mm cooktop/worktop segment
  // directly above the oven source cabinet.
  "ab-109955": [
    [41.273159, 60.047059],
    [53.75772, 60.047059],
    [53.75772, 61.236975],
    [41.273159, 61.236975],
  ],
  "ab-110510": [
    [30.356295, 55.54958],
    [41.030879, 53.996639],
    [49.054632, 55.589916],
    [37.752969, 57.304202],
  ],
  "ab-110140": [
    [67.268409, 56.678992],
    [76.475059, 58.494118],
    [66.384798, 60.107563],
    [57.178147, 58.171429],
  ],
  // AB 105825's cooktop is on the right worktop leg. These four vertices are
  // traced directly from the 842 x 595 source image (448,327)-(530,318)-
  // (600,329)-(523,338); projecting them from the oven bounds moved the mask
  // several pixels above the appliance linework.
  "ab-105825": [
    [53.206651, 54.957983],
    [62.945368, 53.445378],
    [71.258907, 55.294118],
    [62.114014, 56.806723],
  ],
  "ab-105758": [
    [46.218527, 53.189916],
    [56.237530, 51.737815],
    [60.612827, 52.625210],
    [60.612827, 54.258824],
    [55.596200, 54.984874],
  ],
  "ab-105831": [
    [53.2363409, 60.25207295],
    [62.9453675, 58.73949125],
    [71.9418095, 60.58824375],
    [62.351547, 62.26891085],
  ],
  "ab-109874": [
    [57.990499, 57.828571],
    [66.370546, 56.618487],
    [74.223278, 58.171429],
    [74.223278, 58.373109],
    [66.285036, 59.522689],
    [58.588124, 57.94958],
  ],
  "ab-110401": [
    [42.826603, 54.601681],
    [53.472684, 52.988235],
    [61.553444, 54.662185],
    [50.32304, 56.416807],
  ],
};

const RIGHT_LEG_COOKTOP_POINTS_RELATIVE_TO_OVEN = [
  [0, -0.08],
  [1, -0.12],
  [2, 0],
  [1, 0.05],
];

const ELEVATION_COOKTOP_POINTS_RELATIVE_TO_OVEN = [
  [0.04, -0.04],
  [0.96, -0.04],
  [0.96, 0.02],
  [0.04, 0.02],
];

// The oven cabinetry uses the same appliance/drawer/plinth construction in the
// elevation and perspective plans. These two seams were measured from the
// full-resolution PDF linework across all six unique L-plan families and the
// front-elevation family. The drawer starts at 66% and owns the full lower
// section, including the panel/plinth beneath the drawer front.
const OVEN_DRAWER_TOP_RATIO = 0.66;
const CLAIM_BLENDE_DEFAULT_WIDTH = 0.44;
const CLAIM_BLENDE_MIN_WIDTH = 0.35;
const CLAIM_BLENDE_MAX_WIDTH = 3;
const CLAIM_BLENDE_CALIBRATION_BY_SLUG = {
  "ab-105804": AB_105804_BLENDE_CALIBRATION,
  "ab-105803": AB_105803_BLENDE_CALIBRATION,
  "ab-105779": { "wall-cabinet-3": { wholeFacesOnly: true, wholeBlendeFaces: AB_105779_BLENDE_FACES } },
  "ab-105789": AB_105789_BLENDE_CALIBRATION,
  "ab-105790": AB_105790_BLENDE_CALIBRATION,
  "ab-105793": AB_105793_BLENDE_CALIBRATION,
  "ab-105796": AB_105796_BLENDE_CALIBRATION,
  "ab-105799": AB_105799_BLENDE_CALIBRATION,
  "ab-105802": AB_105802_BLENDE_CALIBRATION,
  "ab-105792": AB_105792_BLENDE_CALIBRATION,
  "ab-105795": AB_105795_BLENDE_CALIBRATION,
  "ab-105798": AB_105798_BLENDE_CALIBRATION,
  "ab-105801": AB_105801_BLENDE_CALIBRATION,
  "ab-105791": AB_105791_BLENDE_CALIBRATION,
  "ab-105794": AB_105794_BLENDE_CALIBRATION,
  "ab-105797": AB_105797_BLENDE_CALIBRATION,
  "ab-105800": AB_105800_BLENDE_CALIBRATION,
  "ab-105777": {
  "dishwasher-base": { side: "right", inner: 98.707838, outer: 99.035629 },
  "base-module-3": {
    "side": "right",
    "inner": 52.95962,
    "outer": 54.171021
  },
  "drawer-module": {
    "side": "left",
    "inner": 64.090261,
    "outer": 62.365796
  },
  "wall-cabinet-4": {
    "side": "right",
    "inner": 52.95962,
    "outer": 54.171021
  },
  "wall-cabinet-5": {
    "side": "left",
    "inner": 64.090261,
    "outer": 62.365796
  },
  "wall-cabinet-7": {
    "side": "right",
    "inner": 98.707838,
    "outer": 99.035629
  }
},
  "ab-104332": {
    "wall-cabinet-4": { side: "right", wholeFacesOnly: true, wholeBlendeFaces: [
      { left: 66.584323, right: 67.866983, top: 13.357983, bottom: 37.963025 },
      { left: 66.270784, right: 67.866983, top: 13.297479, bottom: 13.559664 },
    ] },
  },
  "ab-104296": {
    "wall-cabinet-1": {
      side: "left",
      wholeFacesOnly: true,
      wholeBlendeFaces: [
        { left: 34.845606, right: 36.156770, top: 12.873950, bottom: 37.559664 },
        { left: 34.845606, right: 36.527316, top: 12.813445, bottom: 13.136134 },
      ],
    },
  },
  // AB 101246 has the same 71.52-81.96 PDF-unit left strip beside both cabinets.
  "ab-101246": {
    "wall-cabinet-1": { side: "left", outer: 8.4323, inner: 9.73397 },
    "base-module-1": { side: "left", outer: 8.4323, inner: 9.73397 },
  },
  // AB 105775 draws most supplied Blenden as independent perspective faces.
  // Assign those complete faces to the filler products and leave the adjacent
  // cabinet fronts/sides selectable as their own articles. The two remaining
  // UPK/HPK strips end at the measured PDF edge of their source cabinet.
  "ab-105775": {
    "base-module-1": {
      side: "right",
      wholeFacesOnly: true,
      wholeBlendeFaces: [
        { left: 28.033254, right: 29.515439, top: 60.994958, bottom: 86.971429 },
      ],
    },
    "base-module-3": {
      side: "right",
      // The cabinet/filler divider is the transformed x=3485 CAD stroke.
      // Starting at 49.540998 left one visible vertical face unselected.
      inner: 49.290471,
      outer: 49.980998,
    },
    "dishwasher-base": {
      side: "right",
      wholeFacesOnly: true,
      wholeBlendeFaces: [
        { left: 86.736342, right: 87.691211, top: 69.284034, bottom: 95.381513 },
      ],
    },
    "wall-cabinet-1": {
      side: "left",
      wholeFacesOnly: true,
      wholeBlendeFaces: [
        { left: 22.56057, right: 23.35867, top: 21.868908, bottom: 43.368067 },
      ],
    },
    "wall-cabinet-4": {
      // HPK2002 exists commercially, but the perspective view does not draw
      // it as an independent face. Keep it form-selectable without cutting
      // the visible H3002 cabinet hotspot.
      cabinetOwnsWholeHotspot: true,
    },
    "wall-cabinet-7": {
      side: "right",
      wholeFacesOnly: true,
      wholeBlendeFaces: [
        { left: 90.256532, right: 91.225653, top: 31.085714, bottom: 52.584874 },
        { left: 91.225653, right: 91.496437, top: 31.166387, bottom: 52.584874 },
      ],
    },
  },
  // AB 109873 stores each 90 cm cabinet as one commercial item but draws it
  // with two door hotspots. Its filler is the complete outer end face after
  // x=92.764846, not the internal door seam at x=80.764846.
  "ab-109873": {
    "base-module-2": {
      hotspotSourceKey: "base-module-3",
      side: "right",
      inner: 92.764846,
      outer: 95.159145,
    },
    "wall-cabinet-5": {
      hotspotSourceKey: "wall-cabinet-6",
      side: "right",
      inner: 92.764846,
      outer: 95.159145,
    },
  },
  // AB 109955 combines each left 600 mm cabinet with its filler in the FRG
  // hotspots. Split both pairs on the shared exact x=267 PDF divider so the
  // upper and lower ASC highlights stop on the same visible line.
  "ab-109955": {
    "sink-base": { side: "left", outer: 0.39905, inner: 3.805226 },
    "wall-cabinet-1": { side: "left", outer: 0.39905, inner: 3.805226 },
  },
  // AB 110401 draws the far-right US60 with its front, a narrow UPK20 strip,
  // and the exposed cabinet side. Split only the middle strip as the Blende;
  // both surrounding faces continue to belong to the US60 cabinet.
  "ab-110401": {
    "base-module-1": {
      side: "left",
      outer: 14.508314,
      inner: 14.950119,
      preserveOuterCabinetFace: true,
    },
    "base-module-3": {
      side: "left",
      outer: 61.92399,
      inner: 63.619952,
      bands: [[61.92399, 62.850356], [62.850356, 63.619952]],
    },
    "base-module-4": {
      side: "right",
      inner: 80.622328,
      outer: 83.102138,
      preserveOuterCabinetFace: true,
    },
  },
  // The straight AB 110402 plan includes one UPK20 inside each outer lower
  // cabinet hotspot. Split the exact PDF bands from U30 and US40 in ASC.
  "ab-110402": {
    "base-module-1": { side: "left", outer: 12.541568, inner: 13.909739 },
    "base-module-3": { side: "right", inner: 85.866983, outer: 86.907363 },
  },
  // Burger 103898: the US60 front ends at the first corner divider. UPE65
  // consists of both narrow perspective faces up to the sink-base seam.
  "burger-103898": {
    "base-module-2": { side: "right", inner: 53.387173, outer: 54.997625 },
  },
  // AB 105762 draws its attached cabinet Blenden as complete, separate
  // perspective faces. Keep each cabinet face intact and assign only the
  // corresponding exposed upper or lower face to its Blende.
  "ab-105762": {
    "wall-cabinet-4": {
      side: "right",
      wholeFacesOnly: true,
      wholeBlendeFaces: [
        {
          left: 62.750594,
          right: 63.648456,
          top: 14.386555,
          bottom: 38.447059,
        },
      ],
    },
    "base-module-2": {
      side: "right",
      wholeFacesOnly: true,
      wholeBlendeFaces: [
        {
          left: 55.852732,
          right: 57.52019,
          top: 58.211765,
          bottom: 87.294118,
        },
      ],
    },
    "drawer-module": {
      side: "right",
      wholeFacesOnly: true,
      wholeBlendeFaces: [
        {
          left: 80.23753,
          right: 81.961995,
          top: 62.890756,
          bottom: 92.194958,
        },
      ],
    },
  },
  // Exact perspective divider strokes from the replacement 842 x 595 AB 105743 PDF.
  "ab-105743": {
    "base-module-1": {
      side: "left",
      outer: 16.118765,
      inner: 16.788599,
      preserveOuterCabinetFace: true,
    },
    "base-module-3": {
      side: "right",
      inner: 48.669834,
      outer: 50.209026,
      bands: [[48.669834, 49.496437], [49.496437, 50.209026]],
    },
    "wall-cabinet-1": { side: "left", outer: 45.420428, inner: 46.190024 },
  },
  // Exact UPEF65, UPK20, and HPK2002 divider strokes from AB 105748.
  "ab-105748": {
    "sink-base": { side: "left", outer: 50.251781, inner: 51.933492 },
    "drawer-module": { side: "right", inner: 71.543943, outer: 72.342043 },
    "wall-cabinet-3": { side: "right", inner: 56.579572, outer: 57.448931 },
  },
  // The sink UPK20 and dishwasher UPEF65 are distinct vector-PDF faces.
  "ab-105758": {
    "sink-base": {
      side: "left",
      outer: 20.038005,
      inner: 21.733967,
      includeOuterFace: true,
    },
    "base-module-3": {
      side: "right",
      inner: 44.223278,
      outer: 46.218527,
      bands: [[44.223278, 45.349169], [45.349169, 46.218527]],
    },
    "wall-cabinet-1": { side: "left", outer: 40.859857, inner: 41.643705 },
  },
  // AB 104968 uses complete perspective end faces. The US40 includes two
  // commercially supplied UPK20 pieces on the same narrow corner face.
  "ab-104968": {
    // HPK2002 sits between the exposed H5002 side and its front.
    "wall-cabinet-1": {
      side: "left",
      outer: 10.945368,
      inner: 11.84323,
      preserveOuterCabinetFace: true,
    },
    // The UPK20 is only the thin strip between the exposed cabinet side and
    // its front. Keep both cabinet faces selectable as US50 around this band.
    "base-module-1": {
      side: "left",
      outer: 14.72209,
      inner: 15.805226,
      preserveOuterCabinetFace: true,
    },
    "base-module-2": {
      side: "right",
      inner: 43.054632,
      outer: 44.72209,
      bands: [[43.054632, 43.966746], [43.966746, 44.72209]],
    },
    "wall-cabinet-4": { side: "right", inner: 49.995249, outer: 50.893112 },
  },
  "ab-105807": {
    "drawer-module": { side: "left", outer: 4.502707, inner: 5.272157 },
    "wall-cabinet-1": { side: "left", outer: 4.502707, inner: 5.272157 },
  },
  "ab-105811": {
    "base-module-1": { side: "left", outer: 2.878313, inner: 3.676261 },
    "wall-cabinet-1": { side: "left", outer: 2.878313, inner: 3.676261 },
  },
  "ab-105812": {
    "drawer-module": { side: "right", inner: 95.497293, outer: 96.46623 },
    "wall-cabinet-6": { side: "right", inner: 95.497293, outer: 96.46623 },
  },
  "ab-105815": {
    "base-module-1": { side: "left", outer: 2.878313, inner: 3.676261 },
    "wall-cabinet-1": { side: "left", outer: 2.878313, inner: 3.676261 },
  },
  // The US50 perspective polygon contains the cabinet front followed by two
  // separately supplied UPK20 strips. Values follow the PDF source linework.
  "ab-105805": {
    "base-module-2": {
      side: "right",
      inner: 54.003333,
      outer: 55.52,
      bands: [[54.003333, 54.761667], [54.761667, 55.52]],
    },
    "wall-cabinet-4": { side: "right", inner: 60.15959, outer: 61.014534 },
  },
  "ab-105809": {
    "base-module-2": {
      side: "right",
      inner: 54.003333,
      outer: 55.52,
      bands: [[54.003333, 54.761667], [54.761667, 55.52]],
    },
    "wall-cabinet-4": { side: "right", inner: 60.15959, outer: 61.014534 },
  },
  "ab-105813": {
    "base-module-2": {
      side: "right",
      inner: 54.003333,
      outer: 55.52,
      bands: [[54.003333, 54.761667], [54.761667, 55.52]],
    },
    "wall-cabinet-4": { side: "right", inner: 60.15959, outer: 61.014534 },
  },
  "ab-105817": {
    "base-module-2": {
      side: "right",
      inner: 54.003333,
      outer: 55.52,
      bands: [[54.003333, 54.761667], [54.761667, 55.52]],
    },
    "wall-cabinet-4": { side: "right", inner: 60.15959, outer: 61.014534 },
  },
  // AB 105825 perspective family: both UPK20 strips sit together at the
  // left corner seam. The wall-cabinet HPK2002 is its narrow left face.
  "ab-105825": {
    "base-module-2": {
      side: "left",
      inner: 44.286121,
      outer: 42.661727,
      bands: [[42.661727, 43.54517], [43.54517, 44.286121]],
      includeAdjacentFace: true,
      top: 54.78,
      bottom: 83.36,
    },
    "wall-cabinet-1": { side: "left", outer: 48.161869, inner: 48.902821 },
  },
  // AB 105831's right-hand return face is supplied as the base-module-1
  // UPK20. The inside-corner UPK20 already has its own source hotspot. The
  // US60 begins at the x=44.05 PDF divider, leaving its attached UPEF65 as a
  // separate narrow face between that divider and the corner-blende boundary.
  "ab-105831": {
    "base-module-1": { side: "right", inner: 14.55, outer: 20.45 },
    "base-module-2": { side: "left", outer: 43.288686, inner: 44.05 },
    "wall-cabinet-1": { side: "left", outer: 47.990881, inner: 48.760331 },
  },
  // AB 105834: the two base-module-2 strips share the left corner. The
  // dishwasher and upper cabinet Blenden are their separately drawn end faces.
  "ab-105834": {
    "base-module-2": {
      side: "left",
      inner: 53.918495,
      outer: 51.809632,
      bands: [[51.809632, 52.807068], [52.807068, 53.918495]],
    },
    "base-module-3": { side: "right", inner: 82.67, outer: 94.54 },
    "wall-cabinet-3": { side: "right", inner: 59.447136, outer: 60.444571 },
  },
  // AB 105837 and its aliases share this exact two-strip corner seam.
  "ab-105837": {
    "base-module-2": {
      side: "left",
      inner: 53.975492,
      outer: 52.037618,
      bands: [[52.037618, 52.949558], [52.949558, 53.975492]],
    },
    "wall-cabinet-3": { side: "right", inner: 58.991166, outer: 59.931604 },
  },
  // PDF line coordinates from the 3509 x 2480 source render.
  "ab-105806": {
    "drawer-module": { side: "right", inner: 97.834141, outer: 98.575093 },
    "wall-cabinet-6": { side: "right", inner: 97.948133, outer: 98.575093 },
  },
  "ab-105808": {
    "drawer-module": { side: "right", inner: 95.354802, outer: 96.295241 },
    "wall-cabinet-6": { side: "right", inner: 95.354802, outer: 96.295241 },
  },
  "ab-105810": {
    "drawer-module": { side: "right", inner: 94.015389, outer: 94.727843 },
    "wall-cabinet-6": { side: "right", inner: 94.015389, outer: 94.727843 },
  },
  "ab-105814": {
    "drawer-module": { side: "right", inner: 94.015389, outer: 94.727843 },
    "wall-cabinet-6": { side: "right", inner: 94.015389, outer: 94.727843 },
  },
  "ab-105816": {
    "drawer-module": { side: "right", inner: 95.497293, outer: 96.46623 },
    "wall-cabinet-6": { side: "right", inner: 95.497293, outer: 96.46623 },
  },
  "ab-105818": {
    "drawer-module": { side: "right", inner: 94.015389, outer: 94.727843 },
    "wall-cabinet-6": { side: "right", inner: 94.015389, outer: 94.727843 },
  },
  "ab-105819": {
    "base-module-1": { side: "left", outer: 2.878313, inner: 3.676261 },
    "wall-cabinet-1": { side: "left", outer: 2.878313, inner: 3.676261 },
  },
  "ab-105820": {
    "drawer-module": { side: "right", inner: 95.497293, outer: 96.46623 },
    "wall-cabinet-6": { side: "right", inner: 95.497293, outer: 96.46623 },
  },
  "ab-105821": {
    "base-module-1": { side: "left", outer: 6.269592, inner: 8.079225 },
    "wall-cabinet-1": { side: "left", outer: 6.269592, inner: 8.079225 },
  },
  "ab-105827": {
    "base-module-1": { side: "left", outer: 12.111713, inner: 13.22314 },
    "wall-cabinet-1": { side: "left", outer: 12.111713, inner: 13.22314 },
  },
  "ab-105830": {
    "base-module-1": { side: "left", outer: 12.111713, inner: 13.22314 },
    "wall-cabinet-1": { side: "left", outer: 12.111713, inner: 13.22314 },
  },
  "ab-105824": {
    "base-module-1": { side: "left", outer: 6.269592, inner: 8.079225 },
    "wall-cabinet-1": { side: "left", outer: 6.269592, inner: 8.079225 },
  },
  "ab-105823": {
    "sink-base": { side: "right", inner: 92.077515, outer: 93.986891 },
    "wall-cabinet-5": { side: "right", inner: 92.077515, outer: 93.986891 },
  },
  "ab-105826": {
    "base-module-1": { side: "left", outer: 20.404674, inner: 20.789399 },
    "sink-base": { side: "right", inner: 91.165574, outer: 92.818467 },
    "wall-cabinet-5": { side: "right", inner: 91.165574, outer: 92.818467 },
  },
  "ab-105829": {
    "sink-base": { side: "right", inner: 92.077515, outer: 93.986891 },
    "wall-cabinet-5": { side: "right", inner: 92.077515, outer: 93.986891 },
  },
  "ab-105832": {
    "sink-base": { side: "right", inner: 92.077515, outer: 93.986891 },
    "wall-cabinet-5": { side: "right", inner: 92.077515, outer: 93.986891 },
  },
  "ab-105833": {
    "base-module-2": { side: "right", inner: 47.990881, outer: 48.902821 },
    "base-module-3": { side: "left", outer: 64.206327, inner: 65.559989 },
    "drawer-module": { side: "right", inner: 96.437732, outer: 97.036193 },
    "wall-cabinet-3": { side: "right", inner: 47.990881, outer: 48.902821 },
    "wall-cabinet-4": { side: "left", outer: 64.206327, inner: 65.559989 },
    "wall-cabinet-6": { side: "right", inner: 96.437732, outer: 97.036193 },
  },
  "ab-105835": {
    "base-module-1": { side: "left", outer: 0.883443, inner: 1.99487 },
    "wall-cabinet-1": { side: "left", outer: 0.883443, inner: 1.99487 },
  },
  "ab-105836": {
    "base-module-2": { side: "right", inner: 46.822457, outer: 49.615275 },
    "wall-cabinet-3": { side: "right", inner: 46.822457, outer: 49.615275 },
    "base-module-3": { side: "left", outer: 63.721858, inner: 65.004275 },
    "wall-cabinet-4": { side: "left", outer: 63.721858, inner: 65.004275 },
    "drawer-module": { side: "right", inner: 96.323739, outer: 97.007694 },
    "wall-cabinet-6": { side: "right", inner: 96.323739, outer: 97.007694 },
  },
  "ab-105838": {
    "base-module-1": { side: "left", outer: 0.883443, inner: 1.5389 },
    "wall-cabinet-1": { side: "left", outer: 0.883443, inner: 1.5389 },
  },
  "ab-105841": {
    "base-module-1": { side: "left", outer: 0.883443, inner: 1.5389 },
    "wall-cabinet-1": { side: "left", outer: 0.883443, inner: 1.5389 },
  },
  "ab-105844": {
    "base-module-1": { side: "left", outer: 0.883443, inner: 1.5389 },
    "wall-cabinet-1": { side: "left", outer: 0.883443, inner: 1.5389 },
  },
  // Exact vertical divider strokes from the 842 x 595 vector PDFs. These
  // older plans place the Blende on different source cabinets, so inference
  // from the outside whitespace would choose the wrong edge.
  "ab-105732": {
    "sink-base": { side: "right", inner: 86.394299, outer: 87.691211 },
    "wall-cabinet-4": { side: "right", inner: 86.394299, outer: 87.691211 },
  },
  "ab-105733": {
    "base-module-1": { side: "left", outer: 4.831354, inner: 6.142518 },
    "wall-cabinet-1": { side: "left", outer: 4.831354, inner: 6.213777 },
  },
  "ab-105744": {
    "base-module-1": { side: "left", outer: 0.855107, inner: 1.325416 },
    "wall-cabinet-1": { side: "left", outer: 0.855107, inner: 1.325416 },
  },
  "ab-105746": {
    "sink-base": { side: "right", inner: 89.515439, outer: 90.826603 },
    "wall-cabinet-4": { side: "right", inner: 89.501188, outer: 90.826603 },
  },
  // AB 105747 draws two adjacent UPK20 strips at the inside corner, one
  // lower-return Blende, and one upper end Blende. Keep all visible faces
  // independent from their source cabinets in claims.
  "ab-105747": {
    "base-module-2": {
      side: "right",
      inner: 56.935867,
      outer: 58.389549,
      bands: [[56.935867, 57.76247], [57.76247, 58.389549]],
    },
    "drawer-module": { side: "right", inner: 75.420428, outer: 76.232779 },
    "wall-cabinet-3": { side: "right", inner: 53.401425, outer: 54.15677 },
  },
  // The UPK20 is the narrow strip on the US30's right side. The thinner
  // strip beyond x=99.7175 is the wall edge and must remain unselectable.
  "ab-105845": {
    "drawer-module": { side: "right", inner: 99.129375, outer: 99.7175 },
  },
  // AB 105846's US50 front ends at the x=3517 vector stroke. UPEF65 then
  // occupies the two narrow right-hand corner faces up to the oven boundary.
  // Its first upper cabinet also has a separately drawn left filler face.
  "ab-105846": {
    "base-module-1": { side: "right", inner: 50.123515, outer: 52.033254 },
    "wall-cabinet-1": { side: "left", outer: 46.118765, inner: 46.988124 },
  },
  // The narrow inside-corner face is attached to base-module-2. Treat that
  // complete source polygon as the Blende and leave the wider right polygon
  // as the cabinet so either click can open the same affected-part choice.
  "ab-110140": {
    "base-module-2": {
      side: "left",
      outer: 47.629454,
      inner: 45.933492,
      includeOuterFace: true,
    },
  },
  "ab-110510": {
    "base-module-2": { side: "right", inner: 57.035629, outer: 58.731591 },
    "base-module-3": {
      side: "right",
      inner: 74.166271,
      outer: 75.961995,
      preserveOuterCabinetFace: true,
    },
    "wall-cabinet-4": {
      side: "right",
      wholeFacesOnly: true,
      wholeBlendeFaces: [
        { left: 58.817102, right: 64.988124, top: 9.203361, bottom: 10.292437 },
        { left: 64.061758, right: 64.988124, top: 10.151261, bottom: 34.67563 },
      ],
    },
  },
  // The two slim inside-corner faces form the supplied UPEF65. The wider
  // drawer/door polygon remains the independently claimable US40 cabinet.
  "ab-111539": {
    // The ordinary UPK20 sits between the exposed sink-run side and SP50.
    // Preserve both surrounding cabinet faces and split only the slim panel.
    "sink-base": {
      side: "left",
      outer: 20.921615,
      inner: 23.686461,
      preserveOuterCabinetFace: true,
    },
    "base-module-1": {
      side: "left",
      wholeFacesOnly: true,
      wholeBlendeFaces: [
        { left: 43.268409, right: 45.477435, top: 56.336134, bottom: 89.835294 },
        { left: 45.477435, right: 46.603325, top: 56.336134, bottom: 89.754622 },
      ],
    },
    // U30 owns the narrow UPK20 between its front and exposed return side.
    // It is an ordinary filler, not the inside-corner UPEF65 beside US40.
    "base-module-2": {
      side: "left",
      outer: 69.092637,
      inner: 70.817102,
      preserveOuterCabinetFace: true,
    },
  },
  // Each filler boundary is taken from the AB 109874 CAD strokes. UPEF65 is a
  // separate locked component; the first base/upper units retain their own
  // separately visible outer cabinet faces.
  "ab-109874": {
    "base-module-1": {
      side: "left",
      outer: 10.845606,
      inner: 11.871734,
      preserveOuterCabinetFace: true,
    },
    "wall-cabinet-1": {
      side: "left",
      outer: 39.733967,
      inner: 40.546318,
      preserveOuterCabinetFace: true,
    },
  },
  "ab-110401": {
    "base-module-1": {
      side: "left",
      outer: 14.508314,
      inner: 14.950119,
      preserveOuterCabinetFace: true,
    },
    "base-module-3": {
      side: "left",
      outer: 61.92399,
      inner: 63.619952,
      bands: [[61.92399, 62.850356], [62.850356, 63.619952]],
    },
    "base-module-4": {
      side: "right",
      inner: 80.622328,
      outer: 83.102138,
      preserveOuterCabinetFace: true,
    },
    "wall-cabinet-6": {
      side: "right",
      inner: 68.964371,
      outer: 69.890736,
    },
  },
};
for (const alias of ["ab-105822", "ab-105828"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105825"];
}
for (const alias of ["ab-105840", "ab-105843"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105837"];
}
for (const alias of ["ab-105735", "ab-105738", "ab-105741"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105732"];
}
for (const alias of ["ab-105736", "ab-105739", "ab-105742"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105733"];
}
for (const alias of ["ab-105749", "ab-105752", "ab-105755"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105746"];
}
for (const alias of ["ab-105750", "ab-105753", "ab-105756"]) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105747"];
}
for (const alias of AB_105845_LAYOUT_ALIAS_SLUGS) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105845"];
}
for (const alias of AB_105846_LAYOUT_ALIAS_SLUGS) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105846"];
}
const OVEN_DRAWER_TOP_RATIO_BY_SLUG = {
  "ab-105779": (468.76 - 352.12) / (528.52 - 352.12),
  "ab-105777": 0.6613545816733069,
  "ab-105778": (515.92 - 386.68) / (582.16 - 386.68),
  "ab-105781": (515.92 - 386.68) / (582.16 - 386.68),
  "ab-105784": (515.92 - 386.68) / (582.16 - 386.68),
  "ab-105787": (515.92 - 386.68) / (582.16 - 386.68),
  // PDF-measured seam between the oven and the drawer below it. The oven ends
  // on this line and the independently selectable drawer starts on the same line.
  "ab-105743": 0.661358,
  "ab-105748": 0.66065,
  // AB 105759: base body y=1554..2160; the UHK drawer starts on y=2040.
  "ab-105759": (2040 - 1554) / (2160 - 1554),
  // The seam at y=80.295798% / 78.722689% separates the oven from UHK.
  // The lower line at y=85.015126% / 83.442017% is the drawer/plinth seam;
  // the UHK selection continues through the plinth to the module baseline.
  "ab-105762": 0.6614,
  "ab-105775": 0.627581121,
  "ab-105763": (2040 - 1554) / (2160 - 1554),
  "ab-105767": (2040 - 1554) / (2160 - 1554),
  "ab-105771": (2040 - 1554) / (2160 - 1554),
  // Extend through the complete oven unit to its lower horizontal end line.
  "ab-105757": 0.8019469404861692,
  // Exact seam joining the oven quad to the drawer quad in the vector PDF.
  "ab-105758": 0.8229792919171677,
  "ab-105808": 0.681,
  "ab-105816": 0.6813,
  "ab-105820": 0.6806,
  "ab-105821": 0.6808,
  "ab-105824": 0.6808,
  // These three share the AB 105822 drawing; the PDF seam is y=79.495968%.
  "ab-105823": 0.82765,
  "ab-105829": 0.82765,
  "ab-105832": 0.82765,
  "ab-105826": 0.828,
  "ab-105827": 0.8289,
  "ab-105830": 0.8289,
  "ab-105833": 0.6818,
  "ab-105835": 0.8274,
  "ab-105836": 0.6805,
  "ab-105838": 0.6797,
  "ab-105841": 0.6797,
  "ab-105844": 0.6797,
  "ab-105839": 0.6812,
  "ab-105842": 0.6812,
};

const OVEN_PART_SOURCE_POINTS_BY_SLUG = {
  "ab-105804": AB_105804_OVEN_PART_POINTS,
  "ab-105803": AB_105803_OVEN_PART_POINTS,
  "ab-105793": AB_105793_OVEN_PART_POINTS,
  "ab-105796": AB_105796_OVEN_PART_POINTS,
  "ab-105799": AB_105799_OVEN_PART_POINTS,
  "ab-105802": AB_105802_OVEN_PART_POINTS,
  "ab-105792": AB_105792_OVEN_PART_POINTS,
  "ab-105795": AB_105795_OVEN_PART_POINTS,
  "ab-105798": AB_105798_OVEN_PART_POINTS,
  "ab-105801": AB_105801_OVEN_PART_POINTS,
  "ab-105791": AB_105791_OVEN_PART_POINTS,
  "ab-105794": AB_105794_OVEN_PART_POINTS,
  "ab-105797": AB_105797_OVEN_PART_POINTS,
  "ab-105800": AB_105800_OVEN_PART_POINTS,
  "ab-105779": AB_105779_OVEN_PART_POINTS,
  "ab-105789": AB_105789_OVEN_PART_POINTS,
  "ab-105790": AB_105790_OVEN_PART_POINTS,
  "ab-105762": {
    oven: [[36,61.07563],[46.831354,59.502521],[46.831354,78.722689],[36,80.295798]],
    "oven-drawer": [[36,80.295798],[46.831354,78.722689],[46.831354,88.584874],[36,90.137815]],
  },
  "ab-105775": {
    oven: [[34.346793,61.70084],[44.023753,63.092437],[44.023753,80.255462],[34.346793,78.863866]],
    "oven-drawer": [[34.346793,78.863866],[44.023753,80.255462],[44.023753,89.048739],[34.346793,87.657143]],
  },
  "ab-111539": {
    oven: [
      [53.515439, 57.989916],
      [63.904988, 60.127731],
      [63.904988, 82.05042],
      [53.515439, 79.932773],
    ],
    "oven-drawer": [
      [53.515439, 79.932773],
      [63.904988, 82.05042],
      [63.904988, 93.304202],
      [53.515439, 91.166387],
    ],
  },
  "ab-109955": {
    oven: [
      [41.273159, 61.236975],
      [53.75772, 61.236975],
      [53.75772, 78.339496],
      [41.273159, 78.339496],
    ],
    "oven-drawer": [
      [41.273159, 78.339496],
      [53.75772, 78.339496],
      [53.75772, 87.092437],
      [41.273159, 87.092437],
    ],
  },
  "ab-110401": {
    oven: [
      [50.87886, 57.929412],
      [61.92399, 56.336134],
      [61.92399, 75.939496],
      [50.87886, 77.532773],
    ],
    "oven-drawer": [
      [50.87886, 77.532773],
      [61.92399, 75.939496],
      [61.92399, 85.983193],
      [50.87886, 87.576471],
    ],
  },
  "ab-105831": {
    oven: [
      [53.25, 61.55],
      [62.35, 63.55],
      [62.35, 82.789],
      [53.25, 81.119],
    ],
    "oven-drawer": [
      [53.25, 81.119],
      [62.35, 82.789],
      [62.35, 92.94],
      [53.25, 91.05],
    ],
  },
  "ab-105758": {
    oven: [
      [46.218527, 54.783193],
      [55.653207, 56.739496],
      [55.653207, 76.685714],
      [46.218527, 74.749580],
    ],
    "oven-drawer": [
      [46.218527, 74.749580],
      [55.653207, 76.685714],
      [55.653207, 86.910924],
      [46.218527, 84.974790],
    ],
  },
};

function pointsRelativeToBounds(points, bounds) {
  return points.map(([x, y]) => [
    (x - bounds.left) / bounds.width,
    (y - bounds.top) / bounds.height,
  ]);
}

function splitWorktopDefinition(bounds, leftPoints, rightPoints, remainingPartKeys = []) {
  return {
    splitFirst: {
      "worktop-left": pointsRelativeToBounds(leftPoints, bounds),
      "worktop-right": pointsRelativeToBounds(rightPoints, bounds),
    },
    indexPartKeys: [null, ...remainingPartKeys],
  };
}

// The claim overlay uses the existing PDF-matched worktop polygons. Some plan
// families already have one polygon per leg; the three combined outlines are
// divided at their actual corner seam below.
const AB_105762_WORKTOP_SPLIT = splitWorktopDefinition(
  { left: 28.489311, top: 53.310924, width: 30.014252, height: 7.522689 },
  [
    [28.489311, 57.647059], [47.672209, 54.884034],
    [56.764846, 56.739496], [28.489311, 60.833613],
  ],
  [
    [47.672209, 54.884034], [58.503563, 53.310924],
    [56.764846, 56.739496],
  ],
  ["worktop-left", "worktop-right", "worktop-right", "worktop-right", "worktop-left"],
);

const SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG = {
  "ab-105804": { indexPartKeys: AB_105804_WORKTOP_PART_KEYS },
  "ab-105803": { indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"] },
  "ab-105779": { indexPartKeys: AB_105779_WORKTOP_PART_KEYS },
  "ab-105789": { indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right", "worktop-end-panel", "worktop-left", "worktop-right", "worktop-right"] },
  "ab-105791": { indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"] },
  "ab-105794": { indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"] },
  "ab-105797": { indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"] },
  "ab-105800": { indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"] },
  "ab-105777": { indexPartKeys: ["worktop-left", "worktop-right", null] },
  "ab-104332": { indexPartKeys: ["worktop-left", "worktop-right"] },
  "ab-104296": { indexPartKeys: ["worktop-left", "worktop-right"] },
  "ab-105762": AB_105762_WORKTOP_SPLIT,
  "ab-105775": {
    indexPartKeys: ["worktop-left", "worktop-left", "worktop-left", "worktop-left", "worktop-right"],
  },
  "ab-111539": {
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"],
  },
  // Burger already has one exact PDF-matched polygon for each worktop run.
  // Map them directly; treating its first polygon as a legacy combined L-shape
  // scales the whole-kitchen coordinates into that polygon's small bounds.
  "burger-103898": {
    indexPartKeys: ["worktop-left", "worktop-right"],
  },
  // Four source polygons: top surface and fascia for each L-shaped leg. The
  // first surface also contains the narrow return beyond the PDF depth seam
  // (267.72, 313.24 -> 339.72, 323.68); assign that wedge to the right leg so
  // selecting the left worktop stops exactly on the drawn joint.
  "ab-109874": splitWorktopDefinition(
    { left: 2.72209, top: 52.201681, width: 37.624703, height: 6.473949 },
    [
      [2.72209, 57.001681], [31.795724466, 52.645378151],
      [40.346793, 54.4], [10.845606, 58.67563],
    ],
    [
      [31.795724466, 52.645378151], [34.80285, 52.201681],
      [37.382423, 52.72605], [40.346793, 54.4],
    ],
    ["worktop-right", "worktop-left", "worktop-right"],
  ),
  "ab-110401": {
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"],
  },
  "ab-105805": splitWorktopDefinition(
    { left: 28.4, top: 50.4, width: 58.77, height: 8.87 },
    [
      [28.44, 54.44], [35.45, 53.44], [45.57, 51.94],
      [54.9, 53.59], [54.9, 54.82], [45.57, 56.13], [35.45, 57.8], [28.4, 58.55],
    ],
    [
      [45.57, 51.94], [55.57, 50.4], [64.05, 51.89], [72.55, 53.68], [76.8, 54.5],
      [87.17, 56.68], [87.17, 57.75], [76.8, 59.27], [72.55, 58.4],
      [64.05, 56.65], [54.9, 54.82], [54.9, 53.59],
    ],
  ),
  "ab-105834": splitWorktopDefinition(
    { left: 29.55, top: 52.08, width: 65.27, height: 11.39 },
    [
      [29.55, 55.73], [42.41, 53.83], [52.61, 55.89],
      [53.81, 57.42], [31.81, 60.36], [29.55, 60.67],
    ],
    [
      [42.41, 53.83], [46.4, 53.29], [54.81, 52.08], [67.92, 54.79], [94.73, 60.3], [94.82, 61.69],
      [82.83, 63.47], [67.92, 60.45], [53.81, 57.42], [52.61, 55.89],
    ],
  ),
  "ab-105846": splitWorktopDefinition(
    { left: 6.783848, top: 51.979832, width: 61.168646, height: 10.366387 },
    // The top-surface joint follows the worktop depth in perspective, from the
    // back edge to the inner L corner. The thin fascia then drops vertically.
    [
      [6.783848, 58.695798], [42.41, 53.536499], [51.163895, 55.912605],
      [51.163895, 57.42521], [17.2019, 62.346218], [6.783848, 60.208403],
    ],
    [
      [42.41, 53.536499], [53.159145, 51.979832],
      [67.952494, 55.005042], [67.952494, 60.894118],
      [51.163895, 57.42521], [51.163895, 55.912605],
    ],
  ),
  "ab-110140": splitWorktopDefinition(
    { left: 29.35867, top: 52.685714, width: 55.596199, height: 10.527731 },
    // The supplier drawing continues the left (sink) worktop through the
    // corner to 57.904988 / 54.581513. Split from there to the inner corner;
    // using 48.627078 as the seam incorrectly gives that corner wedge to the
    // right worktop.
    [
      [29.35867, 55.468908], [48.627078, 52.685714],
      [57.904988, 54.581513], [46.859857, 56.194958],
      [46.859857, 57.667227],
      [29.35867, 60.067227],
    ],
    [
      [57.904988, 54.581513], [84.954869, 60.147899],
      [84.954869, 61.620168],
      [73.909739, 63.213445], [46.859857, 57.667227],
      [46.859857, 56.194958],
    ],
  ),
  "ab-110510": {
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"],
  },
  "ab-104968": splitWorktopDefinition(
    { left: 5.57, top: 50.91, width: 66.77, height: 10.64 },
    // Each polygon includes the horizontal surface and its thin front fascia.
    // The shared corner ends at the PDF seam x=43.966746, so selecting one
    // worktop leg cannot spill into the fascia belonging to the other leg.
    [
      [5.572447, 56.820168], [34.817102, 52.584874],
      [43.966746, 54.460504], [43.966746, 55.791597],
      [14.72209, 60.026891], [5.572447, 58.151261],
    ],
    [
      [34.817102, 52.584874], [45.719715, 51.011765],
      [72.39905, 56.477311], [72.39905, 61.640336],
      [43.966746, 55.791597], [43.966746, 54.460504],
    ],
  ),
  "ab-105825": {
    // The two source polygons already meet on the exact inside-corner seam.
    indexPartKeys: ["worktop-left", "worktop-right"],
  },
  "ab-105758": {
    // Left/right top surfaces, left/right fascias, then the floor-height end panel.
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right", "worktop-end-panel"],
  },
  "ab-105831": {
    // FRG supplies the two top surfaces followed by their two front fascias.
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right"],
  },
  "ab-105743": {
    // Top surfaces, front fascias, then the floor-height end panel.
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right", "worktop-end-panel"],
  },
  "ab-105748": {
    // Left leg, right leg, then the WU16 floor-height end panel.
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-end-panel"],
  },
  "ab-105837": {
    // Left/right surfaces, left/right fascias, then the WU16 cabinet side panel.
    indexPartKeys: ["worktop-left", "worktop-right", "worktop-left", "worktop-right", "worktop-end-panel"],
  },
  "ab-105833": {
    indexPartKeys: ["worktop-left", "worktop-right"],
  },
  "ab-105836": {
    indexPartKeys: ["worktop-left", "worktop-right"],
  },
  "ab-105842": {
    indexPartKeys: ["worktop-left", "worktop-right"],
  },
  "ab-105845": {
    indexPartKeys: ["worktop-left", "worktop-right"],
  },
  "ab-105847": {
    indexPartKeys: ["worktop-left", "worktop-right"],
  },
  "ab-105747": splitWorktopDefinition(
    { left: 29.615, top: 55.55, width: 55.34, height: 6.716 },
    [
      [29.615, 58.514], [50.181, 55.55], [57.762, 57.103],
      [57.762, 58.212], [29.615, 62.266],
    ],
    [
      [50.181, 55.55], [57.762, 57.103], [66.784, 55.792], [84.955, 59.523],
      [84.955, 60.632], [75.933, 61.943], [57.762, 58.212],
    ],
  ),
};

// These are independent kitchens with the exact AB 105762 drawing. Reuse every
// measured ASC polygon so sink, faucet, oven, drawer, cooktop, and both worktop
// legs remain pixel-identical while selections stay isolated by kitchen slug.
AB_105762_LAYOUT_ALIAS_SLUGS.forEach((slug) => {
  L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG[slug] =
    L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG["ab-105762"];
  L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG[slug] =
    L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG["ab-105762"];
  COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG[slug] =
    COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG["ab-105762"];
  OVEN_DRAWER_TOP_RATIO_BY_SLUG[slug] = OVEN_DRAWER_TOP_RATIO_BY_SLUG["ab-105762"];
  OVEN_PART_SOURCE_POINTS_BY_SLUG[slug] = OVEN_PART_SOURCE_POINTS_BY_SLUG["ab-105762"];
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[slug] =
    SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105762"];
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[slug] =
    CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105762"];
});

// The AB 105807 PDF draws a narrow floor-height return at the right end of the
// horizontal worktop. Coordinates are measured from the 3509 x 2480 render.
// They are converted relative to the cropped horizontal hotspot below so the
// claims overlay stays aligned with the responsive plan crop.
const WORKTOP_END_PANEL_DEFINITIONS_BY_SLUG = {
  "ab-105807": {
    source: { left: 4.49, top: 62.14, width: 63.92, height: 1.49 },
    panel: { left: 67.99658, top: 62.14, right: 68.395554, bottom: 96.13 },
  },
};

for (const alias of ["ab-105809", "ab-105813", "ab-105817"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105805"];
}
for (const alias of ["ab-105822", "ab-105828"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105825"];
  COOKTOP_SOURCE_POINTS_BY_SLUG[alias] = COOKTOP_SOURCE_POINTS_BY_SLUG["ab-105825"];
}
for (const alias of ["ab-105840", "ab-105843"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105837"];
}
for (const alias of ["ab-105734", "ab-105737", "ab-105740"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-104968"];
  COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG[alias] = COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG["ab-104968"];
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-104968"];
}
for (const alias of ["ab-105750", "ab-105753", "ab-105756"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105747"];
}
for (const alias of ["ab-105751", "ab-105754", "ab-105745"]) {
  L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG[alias] = L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG["ab-105748"];
  COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG[alias] = COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG["ab-105748"];
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[alias] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105748"];
  OVEN_DRAWER_TOP_RATIO_BY_SLUG[alias] = OVEN_DRAWER_TOP_RATIO_BY_SLUG["ab-105748"];
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105748"];
}
for (const alias of AB_105846_LAYOUT_ALIAS_SLUGS) {
  L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG[alias] =
    L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG["ab-105846"];
  L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG[alias] =
    L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG["ab-105846"];
  COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG[alias] =
    COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG["ab-105846"];
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] =
    SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105846"];
}
SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105839"] =
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105842"];
for (const alias of ["ab-105848", "ab-105851", "ab-105854", "ab-105857", "ab-105860"]) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] =
    SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105845"];
}
for (const alias of AB_105847_LAYOUT_ALIAS_SLUGS) {
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[alias] =
    SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105847"];
}

for (const slug of AB_105777_LAYOUT_ALIAS_SLUGS) {
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[slug] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105777"];
  OVEN_DRAWER_TOP_RATIO_BY_SLUG[slug] = OVEN_DRAWER_TOP_RATIO_BY_SLUG["ab-105777"];
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[slug] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105777"];
}

for (const slug of AB_105779_LAYOUT_ALIAS_SLUGS) {
  L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG[slug] = L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG["ab-105779"];
  L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG[slug] = L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG["ab-105779"];
  COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG[slug] = COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG["ab-105779"];
  CLAIM_BLENDE_CALIBRATION_BY_SLUG[slug] = CLAIM_BLENDE_CALIBRATION_BY_SLUG["ab-105779"];
  OVEN_DRAWER_TOP_RATIO_BY_SLUG[slug] = OVEN_DRAWER_TOP_RATIO_BY_SLUG["ab-105779"];
  OVEN_PART_SOURCE_POINTS_BY_SLUG[slug] = OVEN_PART_SOURCE_POINTS_BY_SLUG["ab-105779"];
  SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[slug] = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG["ab-105779"];
}

function normalizeClaimPart(part) {
  const partKey = String(part?.partKey || "").trim();
  const componentId = getServiceClaimPartComponentId(part);
  const sourceComponentKey = String(part?.sourceComponentKey || "").trim();
  return componentId && sourceComponentKey
    ? { ...part, partKey, componentId, sourceComponentKey }
    : null;
}

function splitSinkFixtureHotspot(hotspot, part) {
  const height = Number(hotspot.height || 0);
  const top = Number(hotspot.top || 0);
  const faucetRatio = 0.45;
  const isFaucet = part.partKey === "faucet";
  const nextTop = isFaucet ? top : top + height * faucetRatio;
  const nextHeight = isFaucet ? height * faucetRatio : height * (1 - faucetRatio);

  const separated = {
    ...hotspot,
    componentId: part.componentId,
    componentKey: `claim-${part.partKey}`,
    claimPartKey: part.partKey,
    top: nextTop,
    height: nextHeight,
  };
  delete separated.points;
  delete separated.clipPath;
  return separated;
}

function elevationSinkHotspot(hotspots, part, sinkCabinetSourceKey = "sink-base", kitchenSlug = "") {
  const sinkBase = hotspots.find(
    (hotspot) => hotspot?.componentKey === sinkCabinetSourceKey,
  );
  if (!sinkBase) return null;

  // This elevation has a measured worktop band: follow both drawn edges while
  // keeping the sink selection confined to the sink cabinet's width.
  const measuredWorktop = (AB_105778_LAYOUT_SLUGS.has(kitchenSlug) || ["ab-105793", "ab-105796", "ab-105799", "ab-105802", "ab-105792", "ab-105795", "ab-105798", "ab-105801"].includes(kitchenSlug))
    ? hotspots.find((hotspot) => (
      hotspot?.componentKey === (["ab-105793", "ab-105796", "ab-105799", "ab-105802"].includes(kitchenSlug) ? "worktop-secondary" : "worktop")
      && !isFloorHeightWorktopEndPanel(hotspot)
    ))
    : null;
  const stripHeight = measuredWorktop ? Number(measuredWorktop.height) : 1.2;
  return {
    componentId: part.componentId,
    componentKey: `claim-${part.partKey}`,
    claimPartKey: part.partKey,
    left: Number(sinkBase.left || 0),
    top: measuredWorktop ? Number(measuredWorktop.top) : Number(sinkBase.top || 0) - stripHeight,
    width: Number(sinkBase.width || 0),
    height: stripHeight,
    preserveManualSize: true,
  };
}

function hotspotFromDisplayPoints(hotspot, part, points) {
  const xs = points.map(([x]) => Number(x)).filter(Number.isFinite);
  const ys = points.map(([, y]) => Number(y)).filter(Number.isFinite);
  if (!xs.length || !ys.length) {
    return splitSinkFixtureHotspot(hotspot, part);
  }

  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  const width = right - left;
  const height = bottom - top;
  const clipPath = points
    .map(([x, y]) => `${((x - left) / width) * 100}% ${((y - top) / height) * 100}%`)
    .join(", ");

  const calibrated = {
    ...hotspot,
    componentId: part.componentId,
    componentKey: `claim-${part.partKey}`,
    claimPartKey: part.partKey,
    left,
    top,
    width,
    height,
    clipPath: `polygon(${clipPath})`,
  };
  delete calibrated.points;
  return calibrated;
}

function interpolatePoint(start, end, ratio) {
  return [
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
  ];
}

function ovenModuleDisplayCorners(hotspot) {
  const sourcePoints = Array.isArray(hotspot?.points)
    ? hotspot.points
      .map((point) => [Number(point?.[0]), Number(point?.[1])])
      .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    : [];

  if (sourcePoints.length >= 4) {
    const xs = sourcePoints.map(([x]) => x);
    const ys = sourcePoints.map(([, y]) => y);
    const sourceLeft = Math.min(...xs);
    const sourceTop = Math.min(...ys);
    const sourceWidth = Math.max(Math.max(...xs) - sourceLeft, 0.0001);
    const sourceHeight = Math.max(Math.max(...ys) - sourceTop, 0.0001);
    const displayPoint = ([x, y]) => [
      Number(hotspot.left || 0) + ((x - sourceLeft) / sourceWidth) * Number(hotspot.width || 0),
      Number(hotspot.top || 0) + ((y - sourceTop) / sourceHeight) * Number(hotspot.height || 0),
    ];

    // Oven-module polygons are stored clockwise: top-left, top-right,
    // bottom-right, bottom-left. A fifth point, where present, closes the path.
    return sourcePoints.slice(0, 4).map(displayPoint);
  }

  const left = Number(hotspot.left || 0);
  const top = Number(hotspot.top || 0);
  const right = left + Number(hotspot.width || 0);
  const bottom = top + Number(hotspot.height || 0);
  return [[left, top], [right, top], [right, bottom], [left, bottom]];
}

function ovenPartHotspots(hotspot, part, kitchenSlug) {
  const exactSourcePoints = OVEN_PART_SOURCE_POINTS_BY_SLUG[kitchenSlug]?.[part.partKey];
  const exactDisplayPoints = exactSourcePoints
    ? sourcePlanPointsToDisplay(hotspot, exactSourcePoints)
    : null;
  if (exactDisplayPoints) {
    return [hotspotFromDisplayPoints(hotspot, part, exactDisplayPoints)];
  }

  const [topLeft, topRight, bottomRight, bottomLeft] = ovenModuleDisplayCorners(hotspot);
  const isDrawer = part.partKey === "oven-drawer";
  const measuredBodyRatio = OVEN_DRAWER_TOP_RATIO_BY_SLUG[kitchenSlug] || OVEN_DRAWER_TOP_RATIO;
  const originalBodyHeightRatio = Math.max(
    0,
    Math.min(1, Number(hotspot.claimOriginalBodyHeightRatio || 1)),
  );
  const drawerTopRatio = measuredBodyRatio * originalBodyHeightRatio;
  const slice = (startRatio, endRatio) => hotspotFromDisplayPoints(hotspot, part, [
    interpolatePoint(topLeft, bottomLeft, startRatio),
    interpolatePoint(topRight, bottomRight, startRatio),
    interpolatePoint(topRight, bottomRight, endRatio),
    interpolatePoint(topLeft, bottomLeft, endRatio),
  ]);

  if (isDrawer) {
    return [slice(drawerTopRatio, 1)];
  }

  return [slice(0, drawerTopRatio)];
}

function hotspotBounds(hotspot = {}) {
  const points = Array.isArray(hotspot.points) ? hotspot.points : [];
  if (points.length) {
    const xs = points.map(([x]) => Number(x)).filter(Number.isFinite);
    const ys = points.map(([, y]) => Number(y)).filter(Number.isFinite);
    if (xs.length && ys.length) {
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
      return { left, right, top, bottom, width: right - left, height: bottom - top };
    }
  }

  const left = Number(hotspot.left || 0);
  const top = Number(hotspot.top || 0);
  const width = Number(hotspot.width || 0);
  const height = Number(hotspot.height || 0);
  return { left, right: left + width, top, bottom: top + height, width, height };
}

function combinedHotspotBounds(hotspots = []) {
  const bounds = hotspots.map(hotspotBounds);
  if (!bounds.length) return null;
  const left = Math.min(...bounds.map((entry) => entry.left));
  const right = Math.max(...bounds.map((entry) => entry.right));
  const top = Math.min(...bounds.map((entry) => entry.top));
  const bottom = Math.max(...bounds.map((entry) => entry.bottom));
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function clipPolygonAtX(points, boundary, keepLeft) {
  const source = Array.isArray(points) ? points : [];
  if (source.length < 3) return [];
  const output = [];
  const isInside = ([x]) => keepLeft ? Number(x) <= boundary : Number(x) >= boundary;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const previous = source[(index + source.length - 1) % source.length];
    const currentInside = isInside(current);
    const previousInside = isInside(previous);
    if (currentInside !== previousInside) {
      const dx = Number(current[0]) - Number(previous[0]);
      const ratio = Math.abs(dx) < 0.000001 ? 0 : (boundary - Number(previous[0])) / dx;
      output.push([boundary, Number(previous[1]) + (Number(current[1]) - Number(previous[1])) * ratio]);
    }
    if (currentInside) output.push(current);
  }
  return output;
}

function clipHotspotToXRange(hotspot, minX, maxX) {
  const bounds = hotspotBounds(hotspot);
  const left = Math.max(bounds.left, minX);
  const right = Math.min(bounds.right, maxX);
  if (right - left < 0.01) return null;

  if (Array.isArray(hotspot.points) && hotspot.points.length) {
    let points = clipPolygonAtX(hotspot.points, left, false);
    points = clipPolygonAtX(points, right, true);
    if (points.length < 3) return null;
    const nextBounds = hotspotBounds({ points });
    return { ...hotspot, points, left: nextBounds.left, top: nextBounds.top, width: nextBounds.width, height: nextBounds.height };
  }
  return { ...hotspot, left, width: right - left };
}

function fitClaimHotspotToXRange(hotspot, minX, maxX, useExactRange = false) {
  if (useExactRange && !Array.isArray(hotspot?.points)) {
    if (maxX - minX < 0.01) return null;
    return { ...hotspot, left: minX, width: maxX - minX };
  }
  return clipHotspotToXRange(hotspot, minX, maxX);
}

function fitClaimHotspotToExactRect(hotspot, minX, maxX, minY, maxY) {
  if (maxX - minX < 0.01) return null;
  const bounds = hotspotBounds(hotspot);
  const top = Number.isFinite(minY) ? minY : bounds.top;
  const bottom = Number.isFinite(maxY) ? maxY : bounds.bottom;
  if (bottom - top < 0.01) return null;
  const rectHotspot = { ...hotspot };
  delete rectHotspot.points;
  delete rectHotspot.clipPath;
  return {
    ...rectHotspot,
    left: minX,
    top,
    width: maxX - minX,
    height: bottom - top,
  };
}

function isSameCabinetBand(sourceKey, candidateKey) {
  const isWall = String(sourceKey || "").startsWith("wall-cabinet-");
  const candidateIsWall = String(candidateKey || "").startsWith("wall-cabinet-");
  if (isWall || candidateIsWall) return isWall && candidateIsWall;
  const baseKeyPattern = /^(base-module-|drawer-module$|oven-module$|oven-base$|sink-base$|corner-base$)/;
  return baseKeyPattern.test(String(sourceKey || "")) && baseKeyPattern.test(String(candidateKey || ""));
}

function resolveClaimBlendeSides(sourceKey, sourceBounds, boundsByKey, quantity) {
  if (quantity > 1) return ["left", "right"];
  const candidates = [...boundsByKey.entries()]
    .filter(([key]) => key !== sourceKey && isSameCabinetBand(sourceKey, key))
    .map(([, bounds]) => bounds)
    .filter((bounds) => bounds.bottom >= sourceBounds.top && bounds.top <= sourceBounds.bottom);
  const leftNeighbors = candidates.filter((bounds) => bounds.right <= sourceBounds.left + 0.5);
  const rightNeighbors = candidates.filter((bounds) => bounds.left >= sourceBounds.right - 0.5);
  const leftBoundary = leftNeighbors.length ? Math.max(...leftNeighbors.map((bounds) => bounds.right)) : 0;
  const rightBoundary = rightNeighbors.length ? Math.min(...rightNeighbors.map((bounds) => bounds.left)) : 100;
  const leftSpace = Math.max(0, sourceBounds.left - leftBoundary);
  const rightSpace = Math.max(0, rightBoundary - sourceBounds.right);
  return [leftSpace >= rightSpace ? "left" : "right"];
}

function median(values = []) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function resolveClaimBlendeWidth(sourceKey, sourceBounds, blende, boundsByKey, claimBlenden, components) {
  const sourceWidthMm = Number(blende.sourceWidthMm || 0);
  if (sourceWidthMm <= 0) return CLAIM_BLENDE_DEFAULT_WIDTH;

  const blendeSourceKeys = new Set((claimBlenden || []).map((entry) => entry.sourceComponentKey));
  const componentByKey = new Map(
    (components || []).map((component) => [String(component?.componentKey || "").trim(), component]),
  );
  const scaleCandidates = [...boundsByKey.entries()]
    .filter(([key]) =>
      key !== sourceKey
      && !blendeSourceKeys.has(key)
      && !componentByKey.get(key)?.blendeCode
      && isSameCabinetBand(sourceKey, key),
    )
    .map(([key, bounds]) => {
      const widthMm = Number(componentByKey.get(key)?.widthMm || 0);
      return widthMm > 0 ? bounds.width / widthMm : null;
    })
    .filter((value) => Number.isFinite(value) && value > 0);
  const scale = median(scaleCandidates);
  if (!scale) return CLAIM_BLENDE_DEFAULT_WIDTH;

  const measuredExtra = (sourceBounds.width - sourceWidthMm * scale) / Math.max(1, Number(blende.blendeQuantity || 1));
  if (measuredExtra < CLAIM_BLENDE_MIN_WIDTH) return CLAIM_BLENDE_DEFAULT_WIDTH;
  return Math.min(CLAIM_BLENDE_MAX_WIDTH, measuredExtra);
}

/** Split commercially attached cabinet Blenden into claims-only selectable areas. */
export function buildServiceClaimBlendeHotspots(hotspots = [], claimBlenden = [], components = [], kitchenSlug = "") {
  const blenden = (claimBlenden || []).filter((entry) =>
    entry?.claimPartKey === "blende"
      && (!entry.isCompanionOption || entry.isPlanSelectableCompanion)
      && entry.sourceComponentKey
      && entry.componentId,
  );
  if (!blenden.length) return hotspots;

  const hotspotsByKey = new Map();
  (hotspots || []).forEach((hotspot) => {
    const key = String(hotspot?.componentKey || "").trim();
    if (!key) return;
    hotspotsByKey.set(key, [...(hotspotsByKey.get(key) || []), hotspot]);
  });
  const boundsByKey = new Map(
    [...hotspotsByKey.entries()].map(([key, entries]) => [key, combinedHotspotBounds(entries)]),
  );
  const blendenBySourceKey = new Map();
  blenden.forEach((entry) => {
    const entryCalibration = CLAIM_BLENDE_CALIBRATION_BY_SLUG[
      String(kitchenSlug || "").toLowerCase()
    ]?.[entry.sourceComponentKey];
    const hotspotSourceKey = entryCalibration?.hotspotSourceKey || entry.sourceComponentKey;
    const current = blendenBySourceKey.get(hotspotSourceKey) || [];
    current.push(entry);
    blendenBySourceKey.set(hotspotSourceKey, current);
  });

  return (hotspots || []).flatMap((hotspot) => {
    const sourceKey = String(hotspot?.componentKey || "").trim();
    const sourceBlenden = blendenBySourceKey.get(sourceKey) || [];
    const blende = sourceBlenden[0];
    const sourceBounds = boundsByKey.get(sourceKey);
    if (!blende || !sourceBounds || sourceBounds.width <= 0) return [hotspot];

    const calibrationBySourceKey = CLAIM_BLENDE_CALIBRATION_BY_SLUG[
      String(kitchenSlug || "").toLowerCase()
    ];
    const calibration = calibrationBySourceKey?.[blende.sourceComponentKey]
      || calibrationBySourceKey?.[sourceKey];
    if (calibration?.cabinetOwnsWholeHotspot) {
      return [hotspot];
    }
    const wholeBlendeFaces = Array.isArray(calibration?.wholeBlendeFaces)
      ? calibration.wholeBlendeFaces
      : [];
    if (wholeBlendeFaces.length) {
      const bounds = hotspotBounds(hotspot);
      const matchesWholeFace = wholeBlendeFaces.some((face) => (
        Math.abs(bounds.left - Number(face.left)) <= 0.002
        && Math.abs(bounds.right - Number(face.right)) <= 0.002
        && Math.abs(bounds.top - Number(face.top)) <= 0.002
        && Math.abs(bounds.bottom - Number(face.bottom)) <= 0.002
      ));
      if (matchesWholeFace) {
        return [{
          ...hotspot,
          componentId: blende.componentId,
          componentKey: blende.componentKey || `claim-blende-${sourceKey}`,
          claimPartKey: "blende",
          claimBlendeSplit: true,
          sourceComponentKey: blende.sourceComponentKey || sourceKey,
          blendeSide: calibration.side,
          claimBlendeOuterFace: true,
        }];
      }
      if (calibration.wholeFacesOnly) return [hotspot];
    }
    if (calibration?.includeOuterFace) {
      const bounds = hotspotBounds(hotspot);
      const outer = Number(calibration.outer);
      const isExposedOuterFace = calibration.side === "left"
        ? bounds.right <= outer + 0.001
        : bounds.left >= outer - 0.001;
      if (isExposedOuterFace) {
        return [{
          ...hotspot,
          componentId: blende.componentId,
          componentKey: blende.componentKey || `claim-blende-${sourceKey}`,
          claimPartKey: "blende",
          claimBlendeSplit: true,
          sourceComponentKey: blende.sourceComponentKey || sourceKey,
          blendeSide: calibration.side,
          claimBlendeOuterFace: true,
        }];
      }
    }
    const calibratedBands = Array.isArray(calibration?.bands) ? calibration.bands : null;
    if (calibration?.includeAdjacentFace && calibratedBands?.length && sourceBlenden.length === 1) {
      const bandValues = calibratedBands.flat().map(Number).filter(Number.isFinite);
      const cabinetMinX = calibration.side === "left" ? Math.max(...bandValues) : sourceBounds.left;
      const cabinetMaxX = calibration.side === "right" ? Math.min(...bandValues) : sourceBounds.right;
      const cabinetHotspot = fitClaimHotspotToXRange(hotspot, cabinetMinX, cabinetMaxX, true);
      const result = cabinetHotspot ? [{ ...cabinetHotspot, claimBlendeSplit: true }] : [];

      calibratedBands.forEach((band, index) => {
        const minX = Math.min(...band.map(Number));
        const maxX = Math.max(...band.map(Number));
        const blendeHotspot = fitClaimHotspotToExactRect(
          hotspot,
          minX,
          maxX,
          Number(calibration.top),
          Number(calibration.bottom),
        );
        if (!blendeHotspot) return;
        result.push({
          ...blendeHotspot,
          componentId: blende.componentId,
          componentKey: blende.componentKey || `claim-blende-${sourceKey}`,
          claimPartKey: "blende",
          claimBlendeSplit: true,
          sourceComponentKey: blende.sourceComponentKey || sourceKey,
          blendeSide: calibration.side,
          blendeIndex: index + 1,
          claimBlendeAdjacentFace: index === 0,
        });
      });
      return result;
    }
    if (calibratedBands?.length && sourceBlenden.length > 1) {
      const bandSide = calibration?.side === "left" ? "left" : "right";
      const bandValues = calibratedBands.flat().map(Number).filter(Number.isFinite);
      const cabinetMinX = bandSide === "left" ? Math.max(...bandValues) : sourceBounds.left;
      const cabinetMaxX = bandSide === "right" ? Math.min(...bandValues) : sourceBounds.right;
      const result = [];
      const cabinetHotspot = fitClaimHotspotToXRange(
        hotspot,
        cabinetMinX,
        cabinetMaxX,
        true,
      );
      if (cabinetHotspot) result.push({ ...cabinetHotspot, claimBlendeSplit: true });

      sourceBlenden.forEach((sourceBlende, index) => {
        const band = calibratedBands[index];
        if (!band) return;
        const blendeHotspot = fitClaimHotspotToXRange(
          hotspot,
          Math.min(...band),
          Math.max(...band),
          true,
        );
        if (!blendeHotspot) return;
        result.push({
          ...blendeHotspot,
          componentId: sourceBlende.componentId,
          componentKey: sourceBlende.componentKey,
          claimPartKey: "blende",
          claimBlendeSplit: true,
          sourceComponentKey: sourceBlende.sourceComponentKey || sourceKey,
          blendeSide: bandSide,
          blendeIndex: index + 1,
        });
      });
      return result;
    }
    const inferredWidth = resolveClaimBlendeWidth(
      sourceKey,
      sourceBounds,
      blende,
      boundsByKey,
      blenden,
      components,
    );
    const sides = calibration
      ? [calibration.side]
      : resolveClaimBlendeSides(sourceKey, sourceBounds, boundsByKey, Number(blende.blendeQuantity || 1));
    const leftInner = calibration?.side === "left" ? Number(calibration.inner) : sourceBounds.left + inferredWidth;
    const rightInner = calibration?.side === "right" ? Number(calibration.inner) : sourceBounds.right - inferredWidth;
    const cabinetMinX = sides.includes("left") ? leftInner : sourceBounds.left;
    const cabinetMaxX = sides.includes("right") ? rightInner : sourceBounds.right;
    const result = [];
    const cabinetHotspot = fitClaimHotspotToXRange(
      hotspot,
      cabinetMinX,
      cabinetMaxX,
      Boolean(calibration),
    );
    if (cabinetHotspot) result.push({ ...cabinetHotspot, claimBlendeSplit: true });
    if (calibration?.preserveOuterCabinetFace) {
      const outerCabinetMinX = calibration.side === "left"
        ? sourceBounds.left
        : Math.max(Number(calibration.inner), Number(calibration.outer));
      const outerCabinetMaxX = calibration.side === "left"
        ? Math.min(Number(calibration.inner), Number(calibration.outer))
        : sourceBounds.right;
      const outerCabinetHotspot = fitClaimHotspotToXRange(
        hotspot,
        outerCabinetMinX,
        outerCabinetMaxX,
        true,
      );
      if (outerCabinetHotspot) {
        result.push({ ...outerCabinetHotspot, claimBlendeSplit: true });
      }
    }

    sides.forEach((side) => {
      const minX = calibration
        ? Math.min(Number(calibration.inner), Number(calibration.outer))
        : side === "left" ? sourceBounds.left : sourceBounds.right - inferredWidth;
      const maxX = calibration
        ? Math.max(Number(calibration.inner), Number(calibration.outer))
        : side === "left" ? sourceBounds.left + inferredWidth : sourceBounds.right;
      const blendeHotspot = fitClaimHotspotToXRange(hotspot, minX, maxX, Boolean(calibration));
      if (!blendeHotspot) return;
      result.push({
        ...blendeHotspot,
        componentId: blende.componentId,
        componentKey: blende.componentKey || `claim-blende-${sourceKey}`,
        claimPartKey: "blende",
        claimBlendeSplit: true,
        sourceComponentKey: blende.sourceComponentKey || sourceKey,
        blendeSide: side,
      });
    });
    return result;
  });
}

function sourcePlanPointsToDisplay(hotspot, sourcePlanPoints) {
  const sourcePoints = Array.isArray(hotspot?.points) ? hotspot.points : [];
  const sourceXs = sourcePoints.map(([x]) => Number(x)).filter(Number.isFinite);
  const sourceYs = sourcePoints.map(([, y]) => Number(y)).filter(Number.isFinite);
  if (!sourceXs.length || !sourceYs.length) return null;

  const sourceLeft = Math.min(...sourceXs);
  const sourceTop = Math.min(...sourceYs);
  const sourceWidth = Math.max(Math.max(...sourceXs) - sourceLeft, 0.000001);
  const sourceHeight = Math.max(Math.max(...sourceYs) - sourceTop, 0.000001);
  const displayLeft = Number(hotspot.left || 0);
  const displayTop = Number(hotspot.top || 0);
  const displayWidth = Number(hotspot.width || 0);
  const displayHeight = Number(hotspot.height || 0);

  return sourcePlanPoints.map(([x, y]) => [
    displayLeft + ((Number(x) - sourceLeft) / sourceWidth) * displayWidth,
    displayTop + ((Number(y) - sourceTop) / sourceHeight) * displayHeight,
  ]);
}

function lShapedSinkHotspot(hotspot, part, kitchenSlug) {
  const sourcePlanPoints = L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG[kitchenSlug];
  const exactDisplayPoints = sourcePlanPoints
    ? sourcePlanPointsToDisplay(hotspot, sourcePlanPoints)
    : null;
  if (exactDisplayPoints) {
    return hotspotFromDisplayPoints(hotspot, part, exactDisplayPoints);
  }

  const left = Number(hotspot.left || 0);
  const top = Number(hotspot.top || 0);
  const width = Number(hotspot.width || 0);
  const height = Number(hotspot.height || 0);
  const relativePoints = L_SHAPED_SINK_POINTS_RELATIVE_TO_FAUCET_BY_SLUG[kitchenSlug];
  const points = relativePoints.map(([x, y]) => [
    left + x * width,
    top + y * height,
  ]);
  return hotspotFromDisplayPoints(hotspot, part, points);
}

function faucetHotspot(hotspot, part, kitchenSlug) {
  const sourcePlanPoints = FAUCET_SOURCE_POINTS_BY_SLUG[kitchenSlug];
  const exactDisplayPoints = sourcePlanPoints
    ? sourcePlanPointsToDisplay(hotspot, sourcePlanPoints)
    : null;
  return exactDisplayPoints
    ? hotspotFromDisplayPoints(hotspot, part, exactDisplayPoints)
    : existingClaimPartHotspot(hotspot, part);
}

function cooktopHotspot(hotspot, part, kitchenSlug) {
  const sourcePlanPoints = COOKTOP_SOURCE_POINTS_BY_SLUG[kitchenSlug];
  const exactDisplayPoints = sourcePlanPoints
    ? sourcePlanPointsToDisplay(hotspot, sourcePlanPoints)
    : null;
  if (exactDisplayPoints) {
    return hotspotFromDisplayPoints(hotspot, part, exactDisplayPoints);
  }

  const left = Number(hotspot.left || 0);
  const top = Number(hotspot.top || 0);
  const width = Number(hotspot.width || 0);
  const height = Number(hotspot.height || 0);
  const relativePoints = COOKTOP_POINTS_RELATIVE_TO_OVEN_BY_SLUG[kitchenSlug]
    || (isLShapedClaimKitchen(kitchenSlug)
      ? RIGHT_LEG_COOKTOP_SLUGS.has(kitchenSlug)
        ? RIGHT_LEG_COOKTOP_POINTS_RELATIVE_TO_OVEN
        : LEFT_LEG_COOKTOP_POINTS_RELATIVE_TO_OVEN
      : ELEVATION_COOKTOP_POINTS_RELATIVE_TO_OVEN);
  const points = relativePoints.map(([x, y]) => [
    left + x * width,
    top + y * height,
  ]);
  return hotspotFromDisplayPoints(hotspot, part, points);
}

function existingClaimPartHotspot(hotspot, part) {
  return {
    ...hotspot,
    componentId: part.componentId,
    componentKey: `claim-${part.partKey}`,
    claimPartKey: part.partKey,
  };
}

function isFloorHeightWorktopEndPanel(hotspot) {
  if (hotspot?.separateLockedSidePanel) return false;
  const width = Number(hotspot?.width || 0);
  const height = Number(hotspot?.height || 0);
  return height >= 10 && height > width * 3;
}

function projectedWorktopEndPanelBounds(hotspot, definition) {
  const source = definition.source;
  const panel = definition.panel;
  const scaleX = Number(hotspot.width || 0) / source.width;
  const scaleY = Number(hotspot.height || 0) / source.height;
  const left = Number(hotspot.left || 0) + (panel.left - source.left) * scaleX;
  const top = Number(hotspot.top || 0) + (panel.top - source.top) * scaleY;
  return {
    left,
    top,
    width: (panel.right - panel.left) * scaleX,
    height: (panel.bottom - panel.top) * scaleY,
  };
}

function trimCabinetAtWorktopEndPanel(hotspot, panels) {
  if (
    String(hotspot?.componentKey || "").trim() === "worktop"
    || hotspot?.clipPath
  ) {
    return hotspot;
  }

  return panels.reduce((current, panel) => {
    const left = Number(current.left || 0);
    const top = Number(current.top || 0);
    const width = Number(current.width || 0);
    const height = Number(current.height || 0);
    const right = left + width;
    const bottom = top + height;
    const panelRight = panel.left + panel.width;
    const panelBottom = panel.top + panel.height;
    const overlapY = Math.min(bottom, panelBottom) - Math.max(top, panel.top);

    if (
      width <= panel.width * 2
      || overlapY < Math.min(height, panel.height) * 0.5
      || right <= panel.left
      || left >= panelRight
    ) {
      return current;
    }

    const hotspotCenter = left + width / 2;
    const panelCenter = panel.left + panel.width / 2;
    if (hotspotCenter < panelCenter) {
      return {
        ...current,
        width: Math.max(0, panel.left - left),
        claimWorktopEndPanelAdjacentTrim: true,
      };
    }
    return {
      ...current,
      left: panelRight,
      width: Math.max(0, right - panelRight),
      claimWorktopEndPanelAdjacentTrim: true,
    };
  }, hotspot);
}

function splitFirstWorktopHotspots(hotspot, partsByPartKey, definition) {
  return Object.entries(definition.splitFirst || []).map(([partKey, relativePoints]) => {
    const part = partsByPartKey.get(partKey);
    if (!part) return null;
    const points = relativePoints.map(([x, y]) => [
      Number(hotspot.left || 0) + x * Number(hotspot.width || 0),
      Number(hotspot.top || 0) + y * Number(hotspot.height || 0),
    ]);
    return hotspotFromDisplayPoints(hotspot, part, points);
  }).filter(Boolean);
}

function splitWorktopEndPanelHotspots(hotspot, part, definition) {
  const panelBounds = projectedWorktopEndPanelBounds(hotspot, definition);
  const panelLeft = panelBounds.left;
  const panelTop = panelBounds.top;
  const panelWidth = panelBounds.width;
  const panelHeight = panelBounds.height;
  const mainWidth = Math.max(0, panelLeft - Number(hotspot.left || 0));

  const mainWorktop = {
    ...hotspot,
    width: mainWidth,
  };
  const endPanel = {
    ...hotspot,
    componentId: part.componentId,
    componentKey: `claim-${part.partKey}`,
    claimPartKey: part.partKey,
    left: panelLeft,
    top: panelTop,
    width: panelWidth,
    height: panelHeight,
    claimWorktopEndPanelSplit: true,
  };
  delete endPanel.clipPath;
  delete endPanel.points;
  return [mainWorktop, endPanel];
}

export function buildServiceClaimPartHotspots(hotspots = [], claimParts = [], kitchenSlug = "") {
  if (hotspots.some((hotspot) => hotspot.claimExcludeFromSelection)) {
    hotspots = hotspots.filter((hotspot) => !hotspot.claimExcludeFromSelection);
  }
  // Parts without a meaningful independent drawing are manual options below
  // the plan. They must not take over their source component's visible hotspot.
  const normalizedParts = (claimParts || [])
    .map(normalizeClaimPart)
    .filter((part) => part && part.partKey !== "filter");
  if (!normalizedParts.length) {
    return hotspots;
  }

  const partsBySourceKey = new Map();
  normalizedParts.forEach((part) => {
    const current = partsBySourceKey.get(part.sourceComponentKey) || [];
    current.push(part);
    partsBySourceKey.set(part.sourceComponentKey, current);
  });

  const normalizedSlug = String(kitchenSlug || "").trim().toLowerCase();
  const dishwasherDefinition = getServiceClaimDishwasherMask(normalizedSlug);
  const linkedSinkCabinetFaceKeys = {
    "ab-109873": new Set(["base-module-1"]),
    "ab-110401": new Set(["base-module-2"]),
    "ab-110402": new Set(["base-module-2"]),
  }[normalizedSlug] || new Set();
  const linkedSinkCabinetPart = linkedSinkCabinetFaceKeys.size
    ? normalizedParts.find((part) => part.partKey === "sink-cabinet")
    : null;
  const hasVisibleSink = isLShapedClaimKitchen(normalizedSlug);
  const elevationSinkCabinetSourceKey = normalizedParts.find(
    (part) => part.partKey === "sink-cabinet",
  )?.sourceComponentKey || "sink-base";
  const worktopDefinition = SEPARATED_WORKTOP_DEFINITIONS_BY_SLUG[normalizedSlug];
  const worktopEndPanelDefinition = WORKTOP_END_PANEL_DEFINITIONS_BY_SLUG[normalizedSlug];
  const worktopParts = new Map(
    (partsBySourceKey.get("worktop") || []).map((part) => [part.partKey, part]),
  );
  const worktopEndPanelPart = worktopParts.get("worktop-end-panel");
  const hasSplitWorktopParts = worktopParts.has("worktop-left") && worktopParts.has("worktop-right");
  const worktopEndPanels = worktopEndPanelPart
    ? (hotspots || [])
      .filter((hotspot) => (
        String(hotspot?.componentKey || "").trim() === "worktop"
        && isFloorHeightWorktopEndPanel(hotspot)
      ))
      .map((hotspot) => ({
        left: Number(hotspot.left || 0),
        top: Number(hotspot.top || 0),
        width: Number(hotspot.width || 0),
        height: Number(hotspot.height || 0),
      }))
    : [];
  if (worktopEndPanelPart && worktopEndPanelDefinition && !worktopEndPanels.length) {
    const horizontalWorktop = (hotspots || []).find((hotspot) => (
      String(hotspot?.componentKey || "").trim() === "worktop"
      && !isFloorHeightWorktopEndPanel(hotspot)
    ));
    if (horizontalWorktop) {
      worktopEndPanels.push(
        projectedWorktopEndPanelBounds(horizontalWorktop, worktopEndPanelDefinition),
      );
    }
  }
  let worktopIndex = -1;
  const sinkFixtureHotspotCount = (hotspots || []).filter(
    (hotspot) => String(hotspot?.componentKey || "").trim() === "sink-faucet",
  ).length;
  const hasDedicatedSinkAndFaucetHotspots =
    DEDICATED_SINK_AND_FAUCET_HOTSPOT_SLUGS.has(normalizedSlug)
    && sinkFixtureHotspotCount > 1;
  const primarySinkFixtureIndex = (hotspots || []).findIndex(
    (hotspot) => String(hotspot?.componentKey || "").trim() === "sink-faucet",
  );

  return (hotspots || []).flatMap((sourceHotspot, hotspotIndex) => {
    const hotspot = trimCabinetAtWorktopEndPanel(sourceHotspot, worktopEndPanels);
    const drawnComponentKey = String(hotspot?.componentKey || "").trim();
    const sourceComponentKey = dishwasherDefinition?.hotspotSourceKey === drawnComponentKey
      ? dishwasherDefinition.sourceComponentKey : drawnComponentKey;
    // Wide sink cabinets can be drawn as two adjacent fronts. Give every front
    // the same ASC claim identity while keeping sink and faucet independent.
    if (linkedSinkCabinetFaceKeys.has(sourceComponentKey) && linkedSinkCabinetPart) {
      return [existingClaimPartHotspot(hotspot, linkedSinkCabinetPart)];
    }
    const sourceParts = (partsBySourceKey.get(sourceComponentKey) || []).filter((part) => (
      !dishwasherDefinition || dishwasherDefinition.hotspotSourceKey === dishwasherDefinition.sourceComponentKey
      || drawnComponentKey !== dishwasherDefinition.sourceComponentKey
      || !["dishwasher", "furniture-front"].includes(part.partKey)
    ));
    if (sourceComponentKey === "worktop" && sourceHotspot.claimExcludeFromWorktop) return [];
    if (!sourceParts.length) {
      return [hotspot];
    }
    if ((normalizedSlug === "ab-105790" || sourceComponentKey === "worktop") && hotspot.claimFurniturePartKey) {
      const part = sourceParts.find((entry) => entry.partKey === hotspot.claimFurniturePartKey);
      return part ? [existingClaimPartHotspot(hotspot, part)] : [];
    }
    if (
      sourceComponentKey === "worktop"
      && worktopEndPanelPart
      && isFloorHeightWorktopEndPanel(hotspot)
    ) {
      return [{
        ...existingClaimPartHotspot(hotspot, worktopEndPanelPart),
        claimWorktopEndPanelSplit: true,
      }];
    }
    if (sourceComponentKey === "worktop" && worktopDefinition && hasSplitWorktopParts) {
      worktopIndex += 1;
      if (worktopIndex === 0 && worktopDefinition.splitFirst) {
        return splitFirstWorktopHotspots(hotspot, worktopParts, worktopDefinition);
      }
      const partKey = worktopDefinition.indexPartKeys?.[worktopIndex];
      const part = worktopParts.get(partKey);
      return part ? [existingClaimPartHotspot(hotspot, part)] : [];
    }
    if (sourceComponentKey === "worktop" && worktopEndPanelDefinition) {
      if (worktopEndPanelPart) {
        return splitWorktopEndPanelHotspots(hotspot, worktopEndPanelPart, worktopEndPanelDefinition);
      }
    }
    // Existing horizontal worktops remain the original selectable item. The
    // end panel is additive and is represented either by its own tall source
    // hotspot above or by a PDF-derived definition such as AB 105807.
    if (sourceComponentKey === "worktop" && worktopEndPanelPart) {
      return [hotspot];
    }
    if (sourceParts.some((part) => ["dishwasher", "furniture-front"].includes(part.partKey))) {
      const definition = getServiceClaimDishwasherMask(normalizedSlug);
      const sourceBounds = hotspot.claimSourceBounds || hotspotBounds(hotspot);
      const basketBounds = definition ? hotspotBounds({ points: definition.basketPoints }) : null;
      const ownsBasket = !basketBounds || (
        (basketBounds.left + basketBounds.right) / 2 >= sourceBounds.left
        && (basketBounds.left + basketBounds.right) / 2 <= sourceBounds.left + sourceBounds.width
        && (basketBounds.top + basketBounds.bottom) / 2 >= sourceBounds.top
        && (basketBounds.top + basketBounds.bottom) / 2 <= sourceBounds.top + sourceBounds.height
      );
      if (!ownsBasket) return [];
      return sourceParts.flatMap((part) => {
        if (part.partKey === "furniture-front") return [existingClaimPartHotspot(hotspot, part)];
        if (part.partKey !== "dishwasher" || !ownsBasket) return [];
        const polygons = definition
          ? [definition.basketPoints, definition.gsPoints]
          : [
            [[.06,.38],[.94,.38],[.94,.44],[.90,.44],[.84,.66],[.82,.68],[.18,.68],[.16,.66],[.10,.44],[.06,.44]],
            [[.42,.77],[.58,.77],[.58,.89],[.42,.89]],
          ].map((points) => points.map(([x,y]) => [sourceBounds.left+x*sourceBounds.width,sourceBounds.top+y*sourceBounds.height]));
        return polygons.filter((points) => points.length).map((points, index) => {
          const displayPoints = points.map(([x,y]) => [
            hotspot.left + (x-sourceBounds.left)/sourceBounds.width*hotspot.width,
            hotspot.top + (y-sourceBounds.top)/sourceBounds.height*hotspot.height,
          ]);
          return { ...hotspotFromDisplayPoints(hotspot, part, displayPoints), claimDishwasherDetailKey: index === 0 ? "dishwasher-basket" : "dishwasher-gs-mark" };
        });
      });
    }
    const visibleSourceParts = sourceParts;

    return visibleSourceParts.flatMap((part) => {
      if (hotspot.claimFurniturePartKey) {
        return part.partKey === hotspot.claimFurniturePartKey
          ? [existingClaimPartHotspot(hotspot, part)]
          : [];
      }
      // Some supplier sets have one appliance identity across oven and hob.
      // Use both measured source faces without creating a second claim choice.
      if (hotspot.claimAppliancePartKey) {
        return part.partKey === hotspot.claimAppliancePartKey
          ? [existingClaimPartHotspot(hotspot, part)]
          : [];
      }
      if (hotspot.claimApplianceSurface === "cooktop") {
        return part.partKey === "cooktop"
          ? [existingClaimPartHotspot(hotspot, part)]
          : [];
      }
      if (hotspot.claimApplianceSurface === "oven" && part.partKey === "cooktop") {
        return [];
      }
      if (
        hotspot.claimFixturePartKey
        && sourceComponentKey === "sink-faucet"
      ) {
        return part.partKey === hotspot.claimFixturePartKey
          ? [existingClaimPartHotspot(hotspot, part)]
          : [];
      }
      if (
        sourceComponentKey === "sink-faucet"
        && hasDedicatedSinkAndFaucetHotspots
      ) {
        if (part.partKey === "sink" && hotspotIndex === primarySinkFixtureIndex) {
          return [];
        }
        if (part.partKey === "faucet" && hotspotIndex === primarySinkFixtureIndex) {
          return [];
        }
      }
      if (!hasVisibleSink && part.partKey === "sink") {
        return hotspotIndex === primarySinkFixtureIndex
          ? elevationSinkHotspot(hotspots, part, elevationSinkCabinetSourceKey, normalizedSlug) || []
          : [];
      }
      if (part.partKey === "faucet") {
        return faucetHotspot(hotspot, part, normalizedSlug);
      }
      if (hasVisibleSink && part.partKey === "sink") {
        // AB 105758 traces the faucet as three independently clickable
        // silhouettes. Emit its separately traced sink bowl only once.
        if (
          L_SHAPED_SINK_SOURCE_POINTS_BY_SLUG[normalizedSlug]
          && hotspotIndex !== primarySinkFixtureIndex
          && !hasDedicatedSinkAndFaucetHotspots
        ) {
          return [];
        }
        return lShapedSinkHotspot(hotspot, part, normalizedSlug);
      }
      if (part.partKey === "oven" || part.partKey === "oven-drawer") {
        return ovenPartHotspots(hotspot, part, normalizedSlug);
      }
      if (part.partKey === "cooktop") {
        return cooktopHotspot(hotspot, part, normalizedSlug);
      }
      if (part.partKey === "sink" || part.partKey === "faucet") {
        return splitSinkFixtureHotspot(hotspot, part);
      }

      return existingClaimPartHotspot(hotspot, part);
    });
  });
}
