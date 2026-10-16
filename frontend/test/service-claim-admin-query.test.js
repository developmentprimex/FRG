import assert from "node:assert/strict";
import test from "node:test";
import {
  resetServiceClaimQueryColumnSupportCache,
  queryServiceClaimById,
  queryServiceClaimsList,
  queryServiceClaimsPage,
} from "../lib/service-claim-admin-query.js";

test("claim page clamps out-of-range requests and counts with the same filters", async () => {
  resetServiceClaimQueryColumnSupportCache();
  const queries = [];
  const client = { $queryRaw: async (strings, ...values) => {
    const sql = renderSqlTemplate(strings, values);
    if (sql.includes('information_schema')) return [];
    queries.push(sql);
    return sql.includes('COUNT(*) AS "total"') ? [{ total: 41n }] : [{ id: "last" }];
  } };
  const result = await queryServiceClaimsPage(client, { claimType: "px", city: "Berlin" }, 999);
  assert.equal(result.page, 3);
  assert.equal(result.totalItems, 41);
  assert.equal(result.items[0].id, "last");
  assert.match(queries[1], /LIMIT 20 OFFSET 40/);
  for (const sql of queries) {
    assert.match(sql, /Berlin/);
    assert.match(sql, /LIKE '111%'/);
  }
});

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


test("claim contract type constrains both the count and page query", async () => {
  for (const contractType of ["ARC", "FRG"]) {
    resetServiceClaimQueryColumnSupportCache();
    const queries = [];
    const client = { $queryRaw: async (strings, ...values) => {
      const sql = renderSqlTemplate(strings, values);
      if (sql.includes("information_schema")) return [];
      queries.push(sql);
      return sql.includes('COUNT(*) AS "total"') ? [{ total: 1n }] : [{ id: "claim" }];
    } };
    await queryServiceClaimsPage(client, { contractType, claimType: "live", city: "Berlin" });
    assert.equal(queries.length, 2);
    for (const sql of queries) {
      assert.ok(sql.includes('ct."contractNumber" = sc."contractNumber"'));
      assert.ok(sql.includes('ct."contractType" = ' + contractType));
      assert.ok(sql.includes("NOT LIKE '111%'"));
      assert.ok(sql.includes("Berlin"));
    }
  }
});
