import { prisma } from "./prisma.js";
import {
  PUBLIC_VISIT_EVENT_TYPES,
  SERVICE_PAGE_PATH,
} from "./public-visit-tracking.js";
import { ORDER_KIND_TEST } from "./order-kind.js";
import {
  isJunkServiceClaimVisitEvent,
  SERVICE_CLAIM_JUNK_CONTRACT_LAST4,
} from "./service-claim-lookup.js";

const CONTRACT_ACCESS_EVENT_TYPES = [
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED,
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_TEST_ACCEPTED,
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED,
];

const SERVICE_VISIT_OUTCOME_EVENT_TYPES = [
  PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_FOUND,
  PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND,
  PUBLIC_VISIT_EVENT_TYPES.SERVICE_CLAIM_SUBMITTED,
];

/** Rows shown in Claim activity — successful lookups and submitted claims only. */
const SERVICE_VISIT_TABLE_EVENT_TYPES = [
  PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_FOUND,
  PUBLIC_VISIT_EVENT_TYPES.SERVICE_CLAIM_SUBMITTED,
];

const SERVICE_VISIT_FUNNEL_EVENT_TYPES = [
  PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_LOOKUP,
  ...SERVICE_VISIT_OUTCOME_EVENT_TYPES,
];

const kitchenContractInclude = {
  kitchenContract: {
    select: {
      id: true,
      contractNumber: true,
      kitchen: { select: { id: true, name: true, slug: true } },
      project: {
        select: {
          id: true,
          name: true,
          housingCompany: { select: { id: true, name: true } },
        },
      },
    },
  },
};

function normalizeDateFilter(value) {
  const normalized = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

export function normalizePublicVisitReportFilters(input = {}) {
  return {
    dateFrom: normalizeDateFilter(input.dateFrom),
    dateTo: normalizeDateFilter(input.dateTo),
  };
}

function getVisitReportWhere(filters = {}) {
  const where = {};

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  return where;
}

function getVisitorIdentity(event) {
  return event.visitorKey || [event.ipHash, event.userAgentHash].filter(Boolean).join(":");
}

function isTestServiceEvent(event) {
  return event?.metadata?.orderKind === ORDER_KIND_TEST;
}

export function calculatePublicVisitSummary(events = []) {
  const summary = {
    uniqueVisitors: 0,
    opened: 0,
    submitted: 0,
    accepted: 0,
    testAccepted: 0,
    rejected: 0,
    successRate: 0,
  };
  const visitorKeys = new Set();

  for (const event of events) {
    const visitorKey = getVisitorIdentity(event);
    if (visitorKey) visitorKeys.add(visitorKey);

    switch (event.eventType) {
      case PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED:
        summary.opened += 1;
        break;
      case PUBLIC_VISIT_EVENT_TYPES.CONTRACT_SUBMITTED:
        summary.submitted += 1;
        break;
      case PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED:
        summary.accepted += 1;
        break;
      case PUBLIC_VISIT_EVENT_TYPES.CONTRACT_TEST_ACCEPTED:
        summary.testAccepted += 1;
        break;
      case PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED:
        summary.rejected += 1;
        break;
      default:
        break;
    }
  }

  summary.successRate = summary.submitted
    ? (summary.accepted / summary.submitted) * 100
    : 0;
  summary.uniqueVisitors = visitorKeys.size;

  return summary;
}

export function calculateServiceVisitSummary(events = []) {
  const summary = {
    uniqueVisitors: 0,
    opened: 0,
    lookups: 0,
    found: 0,
    notFound: 0,
    claimsSubmitted: 0,
    testLookups: 0,
  };
  const visitorKeys = new Set();

  for (const event of events) {
    if (isJunkServiceClaimVisitEvent(event)) continue;

    if (
      event.eventType === PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED
      && event.path === SERVICE_PAGE_PATH
    ) {
      summary.opened += 1;
      const visitorKey = getVisitorIdentity(event);
      if (visitorKey) visitorKeys.add(visitorKey);
    }

    switch (event.eventType) {
      case PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_LOOKUP:
        summary.lookups += 1;
        break;
      case PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_FOUND:
        summary.found += 1;
        if (isTestServiceEvent(event)) summary.testLookups += 1;
        break;
      case PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND:
        summary.notFound += 1;
        break;
      case PUBLIC_VISIT_EVENT_TYPES.SERVICE_CLAIM_SUBMITTED:
        summary.claimsSubmitted += 1;
        break;
      default:
        break;
    }
  }

  summary.uniqueVisitors = visitorKeys.size;
  return summary;
}

function incrementCount(map, key) {
  const normalizedKey = String(key || "").trim() || "unknown";
  map.set(normalizedKey, (map.get(normalizedKey) || 0) + 1);
}

function countRows(map, keyName) {
  return Array.from(map.entries())
    .map(([key, count]) => ({ [keyName]: key, count }))
    .sort((a, b) => b.count - a.count || String(a[keyName]).localeCompare(String(b[keyName])));
}

export function calculatePublicVisitBreakdowns(events = []) {
  const countries = new Map();
  const sources = new Map();
  const devices = new Map();

  for (const event of events) {
    if (event.eventType !== PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED) continue;

    incrementCount(countries, event.countryCode);
    incrementCount(sources, event.source || event.referrerHost || "direct");
    incrementCount(devices, event.deviceType);
  }

  const contractEventTypes = new Set(CONTRACT_ACCESS_EVENT_TYPES);

  return {
    countries: countRows(countries, "countryCode"),
    sources: countRows(sources, "source"),
    devices: countRows(devices, "deviceType"),
    recentContractEvents: events.filter((event) => contractEventTypes.has(event.eventType)).slice(0, 100),
  };
}

export async function loadRecentContractAccessData(filters = {}, page = 1) {
  return prisma.publicVisitEvent.findMany({
    where: {
      ...getVisitReportWhere(filters),
      eventType: { in: CONTRACT_ACCESS_EVENT_TYPES },
    },
    include: kitchenContractInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 100,
    take: 100,
  });
}

export async function loadContractAccessPageData(filters = {}, requestedPage = 1) {
  const total = await prisma.publicVisitEvent.count({
    where: {
      ...getVisitReportWhere(filters),
      eventType: { in: CONTRACT_ACCESS_EVENT_TYPES },
    },
  });
  const totalPages = Math.max(1, Math.ceil(total / 100));
  const parsedPage = Number(requestedPage);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0
    ? Math.min(parsedPage, totalPages)
    : 1;
  const events = await loadRecentContractAccessData(filters, page);
  return { events, page, total, totalPages };
}

async function purgeJunkServiceClaimVisitEvents() {
  const junkLast4 = [...SERVICE_CLAIM_JUNK_CONTRACT_LAST4];
  if (!junkLast4.length) return;

  try {
    await prisma.publicVisitEvent.deleteMany({
      where: {
        kitchenContractId: null,
        contractNumberLast4: { in: junkLast4 },
        eventType: { in: SERVICE_VISIT_FUNNEL_EVENT_TYPES },
      },
    });
  } catch (error) {
    console.warn("Junk claim-activity cleanup failed:", error?.message || error);
  }
}

export async function loadRecentServiceVisitData(filters = {}) {
  await purgeJunkServiceClaimVisitEvents();

  const events = await prisma.publicVisitEvent.findMany({
    where: {
      ...getVisitReportWhere(filters),
      eventType: { in: SERVICE_VISIT_TABLE_EVENT_TYPES },
    },
    include: kitchenContractInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return events.filter((event) => !isJunkServiceClaimVisitEvent(event));
}

export async function loadServiceVisitSummary(filters = {}) {
  await purgeJunkServiceClaimVisitEvents();

  const dateWhere = getVisitReportWhere(filters);
  const events = await prisma.publicVisitEvent.findMany({
    where: {
      ...dateWhere,
      OR: [
        {
          eventType: PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED,
          path: SERVICE_PAGE_PATH,
        },
        {
          eventType: { in: SERVICE_VISIT_FUNNEL_EVENT_TYPES },
        },
      ],
    },
    select: {
      eventType: true,
      path: true,
      visitorKey: true,
      ipHash: true,
      userAgentHash: true,
      metadata: true,
      kitchenContractId: true,
      contractNumberLast4: true,
    },
  });

  return calculateServiceVisitSummary(events);
}

export async function loadPublicVisitReportData(filters = {}) {
  const events = await prisma.publicVisitEvent.findMany({
    where: getVisitReportWhere(filters),
    include: kitchenContractInclude,
    orderBy: { createdAt: "desc" },
  });

  return {
    events,
    summary: calculatePublicVisitSummary(events),
    ...calculatePublicVisitBreakdowns(events),
  };
}
