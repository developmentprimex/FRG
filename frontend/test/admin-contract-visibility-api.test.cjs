const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function fixture(role, appliances = false) {
  let deleted = false;
  let inventoryRead = false;
  const contract = { id: 'test-contract', contractNumber: '111123456', kitchenId: 'kitchen' };
  const context = {
    URL, Response,
    NextResponse: { json: (...args) => Response.json(...args) },
    withAdminPermission: (_, handler) => handler,
    requireAdminApi: async () => ({ role, permissions: ['FRG'] }),
    canViewTestContracts: admin => ['SUPERADMIN', 'PX_ADMIN'].includes(admin.role),
    isTestContractNumber: number => number.replace(/\s/g, '').startsWith('111'),
    readContractClaimPlanUploads: async () => ({}),
    redirectWithFlash: () => new Response(null, { status: 303 }),
    mapAdminMutationError: error => { throw error; },
    loadContractApplianceInventory: async () => { inventoryRead = true; return []; },
    prisma: {
      kitchenContract: {
        findUnique: async () => contract,
        delete: async () => { deleted = true; },
      },
      $queryRaw: async () => [],
    },
  };
  const file = appliances ? 'app/api/admin/contracts/appliances/route.js' : 'app/api/admin/contracts/[id]/route.js';
  const source = fs.readFileSync(path.join(root, file), 'utf8')
    .replace(/^import[\s\S]*?from ["'][^"']+["'];\r?\n/gm, '').replaceAll('export ', '');
  vm.runInNewContext(source + `;globalThis.handlers = { GET${appliances ? '' : ', POST'} };`, context);
  return { ...context.handlers, deleted: () => deleted, inventoryRead: () => inventoryRead };
}

test('workspace admins cannot read or delete 111 contracts through a direct API URL', async () => {
  for (const role of ['ADMIN', 'USER']) {
    const api = fixture(role);
    const params = { params: Promise.resolve({ id: 'test-contract' }) };
    assert.equal((await api.GET(null, params)).status, 403);
    assert.equal((await api.POST({ formData: async () => new URLSearchParams({ _intent: 'delete' }) }, params)).status, 403);
    assert.equal(api.deleted(), false);
    const inventory = fixture(role, true);
    assert.equal((await inventory.GET({ url: 'http://localhost/api/admin/contracts/appliances?contractId=test-contract' })).status, 403);
    assert.equal(inventory.inventoryRead(), false);
  }
});

test('superadmin and PX admin retain direct access to test contracts', async () => {
  for (const role of ['SUPERADMIN', 'PX_ADMIN']) {
    const api = fixture(role);
    const params = { params: Promise.resolve({ id: 'test-contract' }) };
    assert.equal((await api.GET(null, params)).status, 200);
    assert.equal((await api.POST({ formData: async () => new URLSearchParams({ _intent: 'delete' }) }, params)).status, 303);
    assert.equal(api.deleted(), true);
  }
});
