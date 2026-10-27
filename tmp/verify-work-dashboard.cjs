const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const dotenv = require("../frontend/node_modules/dotenv");
const { PrismaClient } = require("../frontend/node_modules/@prisma/client");

async function main() {
  const values = dotenv.parse(fs.readFileSync(path.join(__dirname, "../frontend/.env")));
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(values.DATABASE_URL).hostname), "Local verification only");
  const db = new PrismaClient({ datasourceUrl: values.DATABASE_URL });
  const marker = `work-dashboard-verify-${Date.now()}`;
  const claimId = `${marker}-claim`, orderId = `${marker}-order`;
  const baseUrl = "http://localhost:3000";
  try {
    const admin = await db.adminUser.findFirst({ where: { isActive: true }, select: { id: true, email: true } });
    const kitchen = await db.kitchen.findFirst({ select: { id: true } });
    assert.ok(admin && kitchen);
    const base = Buffer.from(JSON.stringify({ adminId: admin.id, exp: Math.floor(Date.now()/1000)+600 })).toString("base64url");
    const token = `${base}.${crypto.createHmac("sha256", values.ADMIN_SESSION_SECRET).update(base).digest("hex")}`;
    const headers = { cookie: `fragmento_admin_session=${token}` };
    await db.serviceClaim.create({ data: { id: claimId, contractNumber: `111${marker}`, claimSequence: 1, fullName: "Synthetic Verification", landlordContact: "Verification fixture", problemDescription: marker, serialNumber: "VERIFY", createdAt: new Date(Date.now()-26*86400000) } });
    await db.testOrder.create({ data: { id: orderId, orderNumber: marker, kitchenId: kitchen.id, status: "CONFIRMED", contractNumber: `111${marker}`, firstName: "Synthetic", lastName: "Verification", email: "fixture@example.invalid", phone: "000", address1: "Verification", postalCode: "00000", city: "Verification", totalPrice: 0, createdAt: new Date(Date.now()-26*86400000) } });
    const existingOrder = await db.order.findFirst({ select: { id: true } });
    const detailRoutes = existingOrder ? [`/admin/orders/${existingOrder.id}`] : [];
    for (const route of ["/admin", ...detailRoutes, "/admin/orders", "/admin/claims", `/admin/px-claims?q=${marker}`, `/admin/px-orders?q=${marker}`, `/admin/claims/${claimId}`, `/admin/px-orders/${orderId}`, "/admin/work-reminders"]) {
      const response = await fetch(baseUrl+route, { headers, signal: AbortSignal.timeout(60000) });
      const body = await response.text();
      assert.equal(response.status, 200, `${route}: ${response.status}`);
      assert.ok(/workProcessing|Bearbeitung|Processing|Erinnerungsverlauf|Reminder history/.test(body), `Processing UI missing on ${route}`);
      assert.ok(!body.includes("Only plain objects can be passed"), `Non-serializable props on ${route}`);
      if (route.startsWith("/admin/orders/") || route.startsWith("/admin/px-orders/")) {
        assert.ok(body.includes("order-information-row"), "Structured detail rows missing");
        assert.ok(!body.includes("Assigned to"), "Removed assignment controls reappeared");
      }
      console.log(`PASS: ${route.split("?")[0].replace(marker, "fixture")}`);
    }
    const mutate = async (payload, extraHeaders = {}) => {
      const response = await fetch(baseUrl+"/api/admin/work-processing", { method: "POST", headers: { ...headers, "Content-Type": "application/json", ...extraHeaders }, body: JSON.stringify(payload) });
      return { status: response.status, result: await response.json() };
    };
    for (const [workType, workId] of [["CLAIM", claimId], ["TEST_ORDER", orderId]]) {
      const args = { workType, workId, expectedVersion: 0 };
      const removed = await mutate({ ...args, status: "IN_PROGRESS" }); assert.equal(removed.status, 400);

      const done = await mutate({ ...args, expectedVersion: 0, status: "DONE" }); assert.equal(done.status, 200);
      assert.equal(done.result.processing.completedBy, admin.email); assert.ok(done.result.processing.completedAt);
      const listPath = workType === "CLAIM" ? "/admin/px-claims" : "/admin/px-orders";
      for (const filter of ["DONE", "OPEN", "OVERDUE"]) {
        const response = await fetch(`${baseUrl}${listPath}?q=${marker}&processing=${filter}`, { headers });
        assert.equal(response.status, 200);
        const html = await response.text();
        const rows = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1] || "";
        assert.equal(rows.includes(workId), filter === "DONE", `${workType} ${filter} filter did not match completion status`);
      }
      const stale = await mutate({ ...args, status: "OPEN" }); assert.equal(stale.status, 409);
      const reopened = await mutate({ ...args, expectedVersion: 1, status: "OPEN" }); assert.equal(reopened.status, 200);
      assert.equal(reopened.result.processing.completedAt, null);
      for (const filter of ["OPEN", "OVERDUE"]) {
        const response = await fetch(`${baseUrl}${listPath}?q=${marker}&processing=${filter}`, { headers });
        const html = await response.text();
        const rows = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1] || "";
        assert.ok(rows.includes(workId), `${workType} ${filter} filter missed reopened work`);
      }
      assert.equal(await db.workProcessingEvent.count({ where: { workType, workId } }), 2);
    }
    assert.equal((await mutate({ workType: "CLAIM", workId: claimId, status: "DONE", expectedVersion: 3 }, { origin: "https://other.example" })).status, 403);
    const unauthenticated = await fetch(baseUrl+"/api/admin/work-processing", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(unauthenticated.status, 401);
    console.log("PASS: authenticated Done/Reopen API, completion identity, audit, stale-update conflict, cross-origin protection and anonymous 401");
  } finally {
    await db.workProcessingEvent.deleteMany({ where: { workId: { in: [claimId, orderId] } } });
    await db.workProcessing.deleteMany({ where: { workId: { in: [claimId, orderId] } } });
    await db.serviceClaim.deleteMany({ where: { id: claimId } });
    await db.testOrder.deleteMany({ where: { id: orderId } });
    await db.$disconnect();
  }
  console.log("Synthetic fixtures removed; no email was sent.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
