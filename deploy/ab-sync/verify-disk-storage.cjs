const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const requireApp = createRequire(path.resolve('package.json'));
requireApp('@next/env').loadEnvConfig(process.cwd());
const { PrismaClient } = requireApp('@prisma/client');
const client = new PrismaClient();
const base = process.env.AB_VERIFY_BASE || 'https://fragmento.de';

(async () => {
  const documents = await client.$queryRaw`SELECT "id", "sha256", "kitchenSlug", "metadata", "status", "importedAt", "reviewedAt", "reviewedBy"
    FROM "KitchenAbDocument" ORDER BY "id"`;
  const publications = await client.$queryRaw`SELECT * FROM "KitchenAbPublication" ORDER BY "kitchenSlug"`;
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ documents, publications })).digest('hex');
  if (process.argv.includes('--snapshot')) {
    console.log(JSON.stringify({ documents: documents.length, publications: publications.length, fingerprint }));
    return;
  }
  const expectedIndex = process.argv.indexOf('--compare');
  if (expectedIndex >= 0) assert.equal(fingerprint, JSON.parse(fs.readFileSync(process.argv[expectedIndex + 1], 'utf8')).fingerprint, 'Document metadata, review history and publications must remain unchanged');
  const { readKitchenAbPdfFile, kitchenAbPdfDirectory } = await import(pathToFileURL(path.resolve('lib/kitchen-ab-pdf-files.js')).href);
  const copies = await client.$queryRaw`SELECT "id", "pdfStorageKey", ("pdfBytes" IS NOT NULL) AS "databaseCopy" FROM "KitchenAbDocument" ORDER BY "id"`;
  const byId = new Map(copies.map(row => [row.id, row]));
  const databaseCopies = copies.filter(row => row.databaseCopy).length;
  if (process.argv.includes('--expect-disk-only')) assert.equal(databaseCopies, 0);
  const admin = await client.adminUser.findFirst({ where: { isActive: true, role: 'SUPERADMIN' }, select: { id: true } });
  assert.ok(admin);
  const payload = Buffer.from(JSON.stringify({ adminId: admin.id, exp: Math.floor(Date.now()/1000)+600 })).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(payload).digest('hex');
  const headers = { Cookie: `fragmento_admin_session=${payload}.${signature}; adminLanguage=en` };
  let bytes = 0;
  // Verify every retained version, not just the packaged baseline or active PDF.
  for (let offset = 0; offset < documents.length; offset += 6) {
    await Promise.all(documents.slice(offset, offset + 6).map(async (document) => {
      const record = byId.get(document.id);
      assert.ok(record.pdfStorageKey);
      const file = await readKitchenAbPdfFile(record.pdfStorageKey, document.sha256);
      bytes += file.length;
      const filePath = path.join(kitchenAbPdfDirectory(), record.pdfStorageKey);
      if (process.platform !== 'win32') assert.equal(fs.statSync(filePath).mode & 0o777, 0o600);
      const response = await fetch(`${base}/api/admin/kitchen-specifications/${document.kitchenSlug}/pdf?documentId=${document.id}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(45000) });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      const digest = crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
      assert.equal(digest, document.sha256);
    }));
  }
  for (const publication of publications.slice(0, 5)) {
    const response = await fetch(`${base}/api/admin/kitchen-specifications/${publication.kitchenSlug}/pdf`, { headers, signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), documents.find(doc => doc.id === publication.documentId).sha256);
  }
  const unauthenticated = await fetch(`${base}/api/admin/kitchen-specifications/${documents[0].kitchenSlug}/pdf`, { signal: AbortSignal.timeout(30000) });
  assert.equal(unauthenticated.status, 401);
  const imports = await fetch(`${base}/admin/ab-imports`, { headers, signal: AbortSignal.timeout(30000) });
  assert.equal(imports.status, 200);
  const html = await imports.text();
  assert.ok(html.includes('12:00') && html.includes('15:30'));
  console.log(JSON.stringify({ documents: documents.length, publications: publications.length, bytes, databaseCopies, directory: kitchenAbPdfDirectory(), fingerprint, allFileHashes: 'OK', allVersionDownloads: 'OK', activeDownloads: 'OK', authorization: 'OK' }));
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => client.$disconnect());
