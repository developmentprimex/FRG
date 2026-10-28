// Read-only CTE fixtures: no records are created or changed.
import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { normalizeAscKitchenFilters, buildAscKitchenSql, assembleAscKitchenReport } from "../lib/asc-kitchen-report.js";

const fixture = Prisma.raw(`WITH
 "Kitchen" (id, "createdAt") AS (VALUES
  ('old',timestamp '2026-09-01'),
  ('new',timestamp '2026-09-30 22:00'),
  ('future',timestamp '2026-10-31 23:00'),
  ('shell',timestamp '2026-08-01'),
  ('px',timestamp '2026-10-01')),
 "KitchenContract" (id, "kitchenId", "contractType", "contractNumber", "createdAt") AS (VALUES
  ('f-old','old','FRG','670000001',timestamp '2026-09-01'),
  ('f-duplicate','old','FRG','222000001',timestamp '2026-10-10'),
  ('f-new','new','FRG','670000002',timestamp '2026-09-30 22:00'),
  ('f-future','future','FRG','670000003',timestamp '2026-10-31 23:00'),
  ('f-test','px','FRG',' 111 000004',timestamp '2026-10-10'),
  ('a-old','shell','ARC','670100001',timestamp '2026-09-10'),
  ('a-first','shell','ARC','670100002',timestamp '2026-09-30 22:00'),
  ('a-last','shell','ARC','670100003',timestamp '2026-10-31 22:59:59'),
  ('a-future','shell','ARC','670100004',timestamp '2026-10-31 23:00'),
  ('a-test','shell','ARC','111100002',timestamp '2026-09-30 22:00')), `);

test("ASC counts Fragmento kitchens once and each uploaded kitchen separately across shared shells and month boundaries", { skip: !process.env.DATABASE_URL }, async () => {
  try {
    async function load(input, now = new Date("2026-11-02T10:00Z")) {
      const filters = normalizeAscKitchenFilters(input, now);
      const query = buildAscKitchenSql(filters);
      const tail = Prisma.sql([query.strings[0].replace(/^\s*WITH\s+/, ""), ...query.strings.slice(1)], ...query.values);
      return assembleAscKitchenReport(await prisma.$queryRaw(Prisma.sql`${fixture}${tail}`), filters);
    }
    const report = await load({ month: "2026-10" });
    assert.deepEqual(report.previous, { fromFragmento: 1, otherKitchens: 1 });
    assert.deepEqual(report.current, { fromFragmento: 1, otherKitchens: 2 });
    assert.deepEqual(report.total, { fromFragmento: 2, otherKitchens: 3 });
    assert.deepEqual(report.combined, { previous: 2, current: 3, total: 5 });
    const frg = await load({ month: "2026-10", contractType: "FRG" });
    assert.deepEqual(frg.total, { fromFragmento: 2, otherKitchens: 0 });
    const arc = await load({ month: "2026-10", contractType: "ARC" });
    assert.deepEqual(arc.total, { fromFragmento: 0, otherKitchens: 3 });
    const day = await load({ dateFrom: "2026-10-01", dateTo: "2026-10-01" });
    assert.deepEqual(day.previous, { fromFragmento: 1, otherKitchens: 1 });
    assert.deepEqual(day.current, { fromFragmento: 1, otherKitchens: 1 });
    const partial = await load({ month: "2026-10" }, new Date("2026-10-15T10:00Z"));
    assert.deepEqual(partial.total, { fromFragmento: 2, otherKitchens: 2 });
    const all = await load({ period: "ALL" });
    assert.deepEqual(all.previous, { fromFragmento: 0, otherKitchens: 0 });
    assert.deepEqual(all.total, { fromFragmento: 3, otherKitchens: 4 });
  } finally { await prisma.$disconnect(); }
});
