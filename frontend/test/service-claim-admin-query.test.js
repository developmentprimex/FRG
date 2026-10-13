import assert from "node:assert/strict";
import test from "node:test";
import {
  resetServiceClaimQueryColumnSupportCache,
  queryServiceClaimById,
  queryServiceClaimsList,
} from "../lib/service-claim-admin-query.js";

function renderSqlTemplate(strings, values) {
  let output = "";
  for (let index = 0; index < strings.length; index += 1) {
    output += strings[index];
    if (index < values.length) {
      output += renderSqlValue(values[index]);
    }
  }
  return output;
}

function renderSqlValue(value) {
  if (value && Array.isArray(value.strings) && Array.isArray(value.values)) {
    return renderSqlTemplate(value.strings, value.values);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function missingColumnError(columnName) {
  const message = `Raw query failed. Code: \`42703\`. Message: \`column "${columnName}" does not exist\``;
  return {
    message,
    meta: { message },
  };
}

test("queryServiceClaimsList retries without missing optional contact columns", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);

      if (sql.includes(`FROM "information_schema"."columns"`)) {
        return [
          { column_name: "attachmentsJson" },
          { column_name: "problemAreasJson" },
        ];
      }

      if (sql.includes(`"landlordCompanyPhone"`)) {
        throw missingColumnError("landlordCompanyPhone");
      }
      if (sql.includes(`"landlordCompanyEmail"`)) {
        throw missingColumnError("landlordCompanyEmail");
      }

      return [{ id: "claim_1" }];
    },
  };

  const result = await queryServiceClaimsList(prisma, { q: "berlin" });

  assert.deepEqual(result, [{ id: "claim_1" }]);
  assert.equal(queries.length, 2);
  assert.match(queries[0], /FROM "information_schema"\."columns"/);
  assert.doesNotMatch(queries[1], /"landlordCompanyPhone"/);
  assert.doesNotMatch(queries[1], /"landlordCompanyEmail"/);
  assert.match(queries[1], /"attachmentsJson"/);
});

test("queryServiceClaimById still retries when attachmentsJson is missing", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);

      if (sql.includes(`FROM "information_schema"."columns"`)) {
        return [
          { column_name: "problemAreasJson" },
        ];
      }

      if (sql.includes(`"attachmentsJson"`)) {
        throw missingColumnError("attachmentsJson");
      }

      return [{ id: "claim_2" }];
    },
  };

  const result = await queryServiceClaimById(prisma, "claim_2");

  assert.deepEqual(result, [{ id: "claim_2" }]);
  assert.equal(queries.length, 2);
  assert.match(queries[0], /FROM "information_schema"\."columns"/);
  assert.doesNotMatch(queries[1], /"attachmentsJson"/);
});

test("queryServiceClaimsList retries when problemAreasJson is missing", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);

      if (sql.includes(`FROM "information_schema"."columns"`)) {
        return [
          { column_name: "attachmentsJson" },
        ];
      }

      if (sql.includes(`"problemAreasJson"`)) {
        throw missingColumnError("problemAreasJson");
      }

      return [{ id: "claim_3" }];
    },
  };

  const result = await queryServiceClaimsList(prisma, { q: "dishwasher" });

  assert.deepEqual(result, [{ id: "claim_3" }]);
  assert.equal(queries.length, 2);
  assert.match(queries[0], /FROM "information_schema"\."columns"/);
  assert.doesNotMatch(queries[1], /"problemAreasJson"/);
  assert.match(queries[1], /LEFT JOIN "KitchenContract"/);
  assert.match(queries[1], /LEFT JOIN "Kitchen" k/);
});

test("queryServiceClaimById selects the kitchen slug for claim previews", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);

      if (sql.includes(`FROM "information_schema"."columns"`)) {
        return [];
      }

      return [{ id: "claim_4" }];
    },
  };

  const result = await queryServiceClaimById(prisma, "claim_4");

  assert.deepEqual(result, [{ id: "claim_4" }]);
  assert.equal(queries.length, 2);
  assert.match(queries[1], /k\."slug" AS "kitchenSlug"/);
  assert.match(queries[1], /k\."name" AS "kitchenName"/);
});

test("queryServiceClaimsList filters PX claims by normalized 111 contract prefix", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);
      if (sql.includes(`FROM "information_schema"."columns"`)) return [];
      return [];
    },
  };

  await queryServiceClaimsList(prisma, { claimType: "px" });

  assert.equal(queries.length, 2);
  assert.match(queries[1], /REGEXP_REPLACE\(COALESCE\(sc\."contractNumber", ''\), '\[\[:space:\]\]\+', '', 'g'\) LIKE '111%'/);
});

test("queryServiceClaimsList excludes PX claims from the live claims page", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);
      if (sql.includes(`FROM "information_schema"."columns"`)) return [];
      return [];
    },
  };

  await queryServiceClaimsList(prisma, { claimType: "live" });

  assert.match(queries[1], /REGEXP_REPLACE\(COALESCE\(sc\."contractNumber", ''\), '\[\[:space:\]\]\+', '', 'g'\) NOT LIKE '111%'/);
});

test("queryServiceClaimsList keeps kitchen and Berlin calendar dates from overview links", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);
      if (sql.includes(`FROM "information_schema"."columns"`)) return [];
      return [];
    },
  };

  await queryServiceClaimsList(prisma, {
    claimType: "live", kitchenId: "kitchen-1", dateFrom: "2026-10-24", dateTo: "2026-10-25",
  });

  assert.match(queries[1], /kc\."kitchenId" = kitchen-1/);
  assert.match(queries[1], /sc\."createdAt" >= 2026-10-23T22:00:00\.000Z/);
  assert.match(queries[1], /sc\."createdAt" < 2026-10-25T23:00:00\.000Z/);
});

test("overview drilldowns filter exact contracts and normalized contacts", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const prisma = {
    async $queryRaw(strings, ...values) {
      const sql = renderSqlTemplate(strings, values);
      queries.push(sql);
      if (sql.includes(`FROM "information_schema"."columns"`)) return [];
      return [];
    },
  };

  await queryServiceClaimsList(prisma, { contractNumber: "670123", contactKey: "email:alex@example.com" });
  await queryServiceClaimsList(prisma, { contactKey: "phone:49123456" });

  assert.match(queries[1], /BTRIM\(sc\."contractNumber"\) = 670123/);
  assert.match(queries[1], /LOWER\(REGEXP_REPLACE\(BTRIM\(COALESCE\(sc\."email", ''\)\), '\[\[:space:\]\]\+', ' ', 'g'\)\) = alex@example\.com/);
  assert.match(queries[2], /NULLIF\(BTRIM\(COALESCE\(sc\."email", ''\)\), ''\) IS NULL/);
  assert.match(queries[2], /REGEXP_REPLACE\(REGEXP_REPLACE\(COALESCE\(sc\."phone", ''\), '\[\^0-9\]', '', 'g'\), '\^00', ''\) = 49123456/);
});
