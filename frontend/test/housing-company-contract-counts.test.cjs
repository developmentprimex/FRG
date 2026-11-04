const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const path = require('node:path');

test('housing company, object and project counts exclude 111 contracts and preserve object totals', {
  skip: process.env.HOUSING_COMPANY_DB_TEST !== '1',
}, async (t) => {
  require('@next/env').loadEnvConfig(path.resolve(__dirname, '..'), true);
  const { prisma } = await import('../lib/prisma.js');
  const { listPropertyOwnersForAdmin, listPropertyObjectsForAdmin, listProjectsForAdmin } = await import('../lib/catalog.js');
  const routeSource = fs.readFileSync(path.resolve(__dirname, '../app/api/admin/property-owners/[id]/route.js'), 'utf8');
  const readOwner = new Function('prisma', 'requireAdminApi', 'NextResponse',
    routeSource.slice(routeSource.indexOf('function normalizeRouteId'), routeSource.indexOf('async function handlePOST')) + ';return handleGET;')(
    prisma, async () => ({ role: 'ADMIN' }), { json: (body, options) => Response.json(body, options) },
  );
  t.after(() => prisma.$disconnect());
  const [owners, objects, projects, contracts, allObjects] = await Promise.all([
    listPropertyOwnersForAdmin(), listPropertyObjectsForAdmin(), listProjectsForAdmin(),
    prisma.kitchenContract.findMany({ select: { contractNumber: true, projectId: true } }),
    prisma.propertyObject.findMany({ select: { id: true, housingCompanyId: true } }),
  ]);
  assert.ok(contracts.some(contract => contract.contractNumber.replace(/\s/g, '').startsWith('111')), 'Database must contain 111 contracts to exercise the exclusion');
  const counted = contracts.filter(contract => !contract.contractNumber.replace(/\s/g, '').startsWith('111'));
  const byProject = new Map();
  for (const contract of counted) byProject.set(contract.projectId, (byProject.get(contract.projectId) || 0) + 1);
  for (const project of projects) assert.equal(project._count.contracts, byProject.get(project.id) || 0, `Project ${project.name}`);
  for (const object of objects) assert.equal(object._count.contracts, byProject.get(object.projectId) || 0, `Object ${object.name}`);
  for (const owner of owners) {
    const projectIds = new Set(projects.filter(project => project.housingCompanyId === owner.id).map(project => project.id));
    assert.equal(owner._count.contracts, counted.filter(contract => projectIds.has(contract.projectId)).length, `Company ${owner.name}`);
    assert.equal(owner._count.propertyObjects, allObjects.filter(object => object.housingCompanyId === owner.id).length, `Object total for ${owner.name}`);
    for (const object of owner.propertyObjects) assert.equal(object._count.contracts, byProject.get(object.projectId) || 0, `Company object ${object.name}`);
    const response = await readOwner(null, { params: Promise.resolve({ id: owner.id }) });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json())._count, owner._count, `Company API totals for ${owner.name}`);
  }
  console.log(JSON.stringify(owners.map(owner => ({ company: owner.name, contracts: owner._count.contracts }))));
});
