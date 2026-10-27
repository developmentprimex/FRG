import { Prisma } from "@prisma/client";
import { workDayStart } from "./work-processing-rules.js";
import { normalizeContractTypeFilter } from "./contract-type-filter.js";
import { getAdminPagination } from "./admin-pagination.js";

const OPTIONAL_SERVICE_CLAIM_COLUMNS = [
  "attachmentsJson",
  "problemAreasJson",
  "landlordCompanyPhone",
  "landlordCompanyEmail",
];

const REQUIRED_CLAIM_COLUMNS = `
      sc."id",
      sc."ticketNumber",
      sc."claimSequence",
      sc."contractNumber",
      sc."fullName",
      sc."phone",
      sc."email",
      sc."clientAddress",
      sc."clientCountry",
      sc."clientCity",
      sc."clientPostalCode",
      sc."landlordName",
      sc."landlordPhone",
      sc."landlordEmail",
      sc."hausmeisterName",
      sc."hausmeisterPhone",
      sc."hausmeisterEmail",
      sc."landlordContact",
      sc."problemDescription",
      sc."serialNumber",
      sc."requestType",
`;

let serviceClaimQueryColumnSupportPromise = null;

export function resetServiceClaimQueryColumnSupportCache() {
  serviceClaimQueryColumnSupportPromise = null;
}

export function isMissingAttachmentsJsonColumnError(error) {
  return isMissingServiceClaimColumnError(error, "attachmentsJson");
}

export function isMissingProblemAreasJsonColumnError(error) {
  return isMissingServiceClaimColumnError(error, "problemAreasJson");
}

function isMissingServiceClaimColumnError(error, columnName) {
  const message = String(error?.message ?? "");
  const metaMessage = typeof error?.meta?.message === "string" ? error.meta.message : "";
  const combined = `${message} ${metaMessage}`;
  return (
    combined.includes(columnName)
    && (combined.includes("does not exist") || combined.includes("42703"))
  );
}

function getMissingOptionalServiceClaimColumns(error) {
  return OPTIONAL_SERVICE_CLAIM_COLUMNS.filter((columnName) =>
    isMissingServiceClaimColumnError(error, columnName)
  );
}

function isColumnEnabled(options, columnName) {
  if (columnName === "attachmentsJson") {
    return options.includeAttachmentsJson;
  }
  if (columnName === "problemAreasJson") {
    return options.includeProblemAreasJson;
  }
  if (columnName === "landlordCompanyPhone") {
    return options.includeLandlordCompanyPhone;
  }
  if (columnName === "landlordCompanyEmail") {
    return options.includeLandlordCompanyEmail;
  }
  return false;
}

function disableColumn(options, columnName) {
  if (columnName === "attachmentsJson") {
    options.includeAttachmentsJson = false;
  }
  if (columnName === "problemAreasJson") {
    options.includeProblemAreasJson = false;
  }
  if (columnName === "landlordCompanyPhone") {
    options.includeLandlordCompanyPhone = false;
  }
  if (columnName === "landlordCompanyEmail") {
    options.includeLandlordCompanyEmail = false;
  }
}

async function getServiceClaimQueryColumnSupport(prisma) {
  if (!serviceClaimQueryColumnSupportPromise) {
    serviceClaimQueryColumnSupportPromise = prisma.$queryRaw`
      SELECT "column_name"
      FROM "information_schema"."columns"
      WHERE "table_schema" = 'public'
        AND "table_name" = 'ServiceClaim'
    `
      .then((rows) => {
        const availableColumns = new Set(
          Array.isArray(rows)
            ? rows
                .map((row) => String(row?.column_name || "").trim())
                .filter(Boolean)
            : [],
        );

        return {
          includeAttachmentsJson: availableColumns.has("attachmentsJson"),
          includeProblemAreasJson: availableColumns.has("problemAreasJson"),
          includeLandlordCompanyPhone: availableColumns.has("landlordCompanyPhone"),
          includeLandlordCompanyEmail: availableColumns.has("landlordCompanyEmail"),
        };
      })
      .catch(() => ({
        includeAttachmentsJson: true,
        includeProblemAreasJson: true,
        includeLandlordCompanyPhone: true,
        includeLandlordCompanyEmail: true,
      }));
  }

  return serviceClaimQueryColumnSupportPromise;
}

export function buildServiceClaimListWhere(filters, {
  includeAttachmentsJsonInSearch = true,
  includeProblemAreasJsonInSearch = true,
  includeLandlordCompanyPhoneInSearch = true,
  includeLandlordCompanyEmailInSearch = true,
  claimAlias = "sc",
  kitchenAlias = "k",
} = {}) {
  const claim = Prisma.raw(claimAlias);
  const kitchen = Prisma.raw(kitchenAlias);
  const conditions = [];
  const contractType = normalizeContractTypeFilter(filters.contractType);
  if (contractType) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "KitchenContract" ct
      WHERE ct."contractNumber" = ${claim}."contractNumber"
        AND ct."contractType" = ${contractType}
    )`);
  }

  if (filters.q) {
    const query = `%${filters.q}%`;
    const parts = [
      Prisma.sql`EXISTS (SELECT 1 FROM "ServiceClaimSubmission" sub WHERE sub."claimId" = ${claim}."id" AND sub."payload"::text ILIKE ${query})`,
      Prisma.sql`${claim}."ticketNumber"::text = ${String(filters.q).trim().replace(/^#/, "")}`,
      Prisma.sql`('#' || ${claim}."ticketNumber"::text || ' ' || ${claim}."contractNumber" || ' KD ' || CASE WHEN ${claim}."claimSequence" < 10 THEN '0' ELSE '' END || ${claim}."claimSequence"::text) ILIKE ${query}`,
      Prisma.sql`${claim}."contractNumber" ILIKE ${query}`,
      Prisma.sql`${claim}."fullName" ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."phone", '') ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."email", '') ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."clientAddress", '') ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."clientCity", '') ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."clientPostalCode", '') ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."clientCountry", '') ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."landlordName", '') ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."landlordPhone", '') ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."landlordEmail", '') ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."hausmeisterName", '') ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."hausmeisterPhone", '') ILIKE ${query}`,
      Prisma.sql`COALESCE(${claim}."hausmeisterEmail", '') ILIKE ${query}`,
      Prisma.sql`${claim}."landlordContact" ILIKE ${query}`,
      Prisma.sql`${claim}."problemDescription" ILIKE ${query}`,
      Prisma.sql`${claim}."serialNumber" ILIKE ${query}`,
      Prisma.sql`COALESCE(${kitchen}."name", '') ILIKE ${query}`,
    ];

    if (includeAttachmentsJsonInSearch) {
      parts.push(Prisma.sql`COALESCE(${claim}."attachmentsJson", '') ILIKE ${query}`);
    }
    if (includeProblemAreasJsonInSearch) {
      parts.push(Prisma.sql`COALESCE(${claim}."problemAreasJson", '') ILIKE ${query}`);
    }
    if (includeLandlordCompanyPhoneInSearch) {
      parts.push(Prisma.sql`COALESCE(${claim}."landlordCompanyPhone", '') ILIKE ${query}`);
    }
    if (includeLandlordCompanyEmailInSearch) {
      parts.push(Prisma.sql`COALESCE(${claim}."landlordCompanyEmail", '') ILIKE ${query}`);
    }

    conditions.push(Prisma.sql`(${Prisma.join(parts, " OR ")})`);
  }

  if (filters.city) {
    conditions.push(Prisma.sql`LOWER(COALESCE(${claim}."clientCity", '')) = LOWER(${filters.city})`);
  }

  if (filters.kitchenId) {
    conditions.push(Prisma.sql`kc."kitchenId" = ${filters.kitchenId}`);
  }

  if (filters.contractNumber) {
    conditions.push(Prisma.sql`BTRIM(${claim}."contractNumber") = ${filters.contractNumber}`);
  }

  if (filters.contactKey) {
    if (filters.contactKey.startsWith("email:")) {
      conditions.push(Prisma.sql`LOWER(REGEXP_REPLACE(BTRIM(COALESCE(${claim}."email", '')), '[[:space:]]+', ' ', 'g')) = ${filters.contactKey.slice(6)}`);
    } else if (filters.contactKey.startsWith("phone:")) {
      conditions.push(Prisma.sql`NULLIF(BTRIM(COALESCE(${claim}."email", '')), '') IS NULL`);
      conditions.push(Prisma.sql`REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(${claim}."phone", ''), '[^0-9]', '', 'g'), '^00', '') = ${filters.contactKey.slice(6)}`);
    } else {
      conditions.push(Prisma.sql`FALSE`);
    }
  }

  if (filters.claimType === "px") {
    conditions.push(Prisma.sql`REGEXP_REPLACE(COALESCE(${claim}."contractNumber", ''), '[[:space:]]+', '', 'g') LIKE '111%'`);
  } else if (filters.claimType === "live") {
    conditions.push(Prisma.sql`REGEXP_REPLACE(COALESCE(${claim}."contractNumber", ''), '[[:space:]]+', '', 'g') NOT LIKE '111%'`);
  }

  if (filters.dateFrom) {
    conditions.push(Prisma.sql`${claim}."createdAt" AT TIME ZONE 'UTC' >= ${workDayStart(filters.dateFrom)}`);
  }

  if (filters.dateTo) {
    const nextDate = new Date(`${filters.dateTo}T12:00:00.000Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    conditions.push(Prisma.sql`${claim}."createdAt" AT TIME ZONE 'UTC' < ${workDayStart(nextDate.toISOString().slice(0, 10))}`);
  }

  if (!conditions.length) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

function buildClaimColumns({
  includeAttachmentsJson = true,
  includeProblemAreasJson = true,
  includeLandlordCompanyPhone = true,
  includeLandlordCompanyEmail = true,
  includeSubmissionCount = true,
} = {}) {
  const optionalColumns = [];
  if (includeSubmissionCount) {
    optionalColumns.push(`      (SELECT COUNT(*)::integer FROM "ServiceClaimSubmission" sub WHERE sub."claimId" = sc."id") AS "submissionCount"`);
  }

  if (includeLandlordCompanyPhone) {
    optionalColumns.push(`      sc."landlordCompanyPhone"`);
  }

  if (includeLandlordCompanyEmail) {
    optionalColumns.push(`      sc."landlordCompanyEmail"`);
  }

  if (includeAttachmentsJson) {
    optionalColumns.push(`      sc."attachmentsJson"`);
  }
  if (includeProblemAreasJson) {
    optionalColumns.push(`      sc."problemAreasJson"`);
  }

  return `${REQUIRED_CLAIM_COLUMNS}${optionalColumns.length ? `${optionalColumns.join(",\n")},\n` : ""}      k."name" AS "kitchenName",
      k."slug" AS "kitchenSlug",
      sc."createdAt"`;
}

async function queryServiceClaims(prisma, queryBuilder) {
  const options = { ...(await getServiceClaimQueryColumnSupport(prisma)) };

  while (true) {
    try {
      return await queryBuilder(options);
    } catch (error) {
      const missingColumns = getMissingOptionalServiceClaimColumns(error)
        .filter((columnName) => isColumnEnabled(options, columnName));

      if (!missingColumns.length) {
        throw error;
      }

      for (const columnName of missingColumns) {
        disableColumn(options, columnName);
      }
    }
  }
}

export async function queryServiceClaimsList(prisma, filters, pagination = null) {
  return queryServiceClaims(prisma, async (options) => {
    const where = buildServiceClaimListWhere(filters, {
      includeAttachmentsJsonInSearch: options.includeAttachmentsJson,
      includeProblemAreasJsonInSearch: options.includeProblemAreasJson,
      includeLandlordCompanyPhoneInSearch: options.includeLandlordCompanyPhone,
      includeLandlordCompanyEmailInSearch: options.includeLandlordCompanyEmail,
    });

    return prisma.$queryRaw`
      SELECT
      ${Prisma.raw(buildClaimColumns({ ...options, includeSubmissionCount: filters.includeSubmissionCount !== false }))}
      FROM "ServiceClaim" sc
      LEFT JOIN "KitchenContract" kc ON kc."contractNumber" = sc."contractNumber"
      LEFT JOIN "Kitchen" k ON k."id" = kc."kitchenId"
      ${where}
      ORDER BY sc."createdAt" DESC, sc."id" DESC
      ${pagination ? Prisma.sql`LIMIT ${pagination.pageSize} OFFSET ${(pagination.page - 1) * pagination.pageSize}` : Prisma.empty}
    `;
  });
}

export async function queryServiceClaimsPage(prisma, filters, requestedPage = 1) {
  return queryServiceClaims(prisma, async (options) => {
    const where = buildServiceClaimListWhere(filters, {
      includeAttachmentsJsonInSearch: options.includeAttachmentsJson,
      includeProblemAreasJsonInSearch: options.includeProblemAreasJson,
      includeLandlordCompanyPhoneInSearch: options.includeLandlordCompanyPhone,
      includeLandlordCompanyEmailInSearch: options.includeLandlordCompanyEmail,
    });
    const [row] = await prisma.$queryRaw`
      SELECT COUNT(*) AS "total"
      FROM "ServiceClaim" sc
      LEFT JOIN "KitchenContract" kc ON kc."contractNumber" = sc."contractNumber"
      LEFT JOIN "Kitchen" k ON k."id" = kc."kitchenId"
      ${where}
    `;
    const pagination = getAdminPagination(Number(row.total), requestedPage);
    const items = await queryServiceClaimsList(prisma, filters, pagination);
    return { ...pagination, items };
  });
}

export async function queryServiceClaimById(prisma, id) {
  return queryServiceClaims(prisma, async (options) => {
    return prisma.$queryRaw`
      SELECT
      ${Prisma.raw(buildClaimColumns(options))}
      FROM "ServiceClaim" sc
      LEFT JOIN "KitchenContract" kc ON kc."contractNumber" = sc."contractNumber"
      LEFT JOIN "Kitchen" k ON k."id" = kc."kitchenId"
      WHERE sc."id" = ${id}
      LIMIT 1
    `;
  });
}
