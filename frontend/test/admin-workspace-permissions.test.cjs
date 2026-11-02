const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const policySource = fs.readFileSync(path.join(root, 'lib/admin-permissions.js'), 'utf8');
const policy = new Function(policySource.replaceAll('export ', '') + '; return { hasPermission, canAccess, parsePermissions, resolveWorkspace, routePermission };')();

function sessionFixture(admin, permissions = []) {
  const secret = 'workspace-test-secret-only';
  const payload = Buffer.from(JSON.stringify({ adminId: 'u1', exp: Math.floor(Date.now()/1000)+60 })).toString('base64url');
  const token = payload + '.' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const context = { Buffer, Response, crypto, process: { env: { ADMIN_SESSION_SECRET: secret } }, cache: fn => fn, cookies: async () => ({ get: () => ({ value: token }) }), prisma: { adminUser: { findUnique: async () => admin }, appSetting: { findUnique: async () => ({ value: JSON.stringify(permissions) }) } }, canAccess: policy.canAccess, redirect: url => { throw new Error('redirect:' + url); } };
  const auth = fs.readFileSync(path.join(root, 'lib/auth.js'), 'utf8').replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
  vm.runInNewContext(auth + ';globalThis.guards = { requireAdminApi, requireAdminPage, withAdminPermission };', context);
  return context.guards;
}

test('permission matrix: FRG, ASC, both, neither, and superadmin', () => {
  for (const permissions of [[], ['FRG_VIEW'], ['ASC_VIEW'], ['FRG_VIEW','ASC_VIEW']]) {
    const user = { role: 'ADMIN', permissions };
    for (const permission of ['FRG_VIEW','ASC_VIEW','FRG_MANAGE','ASC_MANAGE']) assert.equal(policy.hasPermission(user, permission), permissions.includes(permission.replace('_MANAGE', '_VIEW')));
    assert.equal(policy.canAccess(user, 'SUPERADMIN'), false);
  }
  assert.equal(policy.hasPermission({ role:'USER', permissions:['ASC_MANAGE'] }, 'ASC_VIEW'), true);
  assert.equal(policy.hasPermission({ role:'USER', permissions:['ASC_MANAGE'] }, 'FRG_VIEW'), false);
  for (const permission of ['FRG_VIEW','ASC_MANAGE','SUPERADMIN']) assert.equal(policy.hasPermission({ role:'SUPERADMIN' }, permission), true);
  assert.equal(policy.resolveWorkspace({permissions:['ASC_VIEW']},'FRG'),'ASC');
  assert.equal(policy.resolveWorkspace({permissions:[]},'ASC'),null);
  assert.throws(() => policy.parsePermissions(['SUPERADMIN']));
  assert.deepEqual(policy.parsePermissions(['FRG_VIEW','FRG_MANAGE','ASC']), ['FRG','ASC']);
  assert.deepEqual(policy.parsePermissions([]), []);
  for (const scope of ['FRG','ASC']) {
    const user = { role: 'USER', permissions: [scope] };
    assert.equal(policy.hasPermission(user, `${scope}_VIEW`), true);
    assert.equal(policy.hasPermission(user, `${scope}_MANAGE`), true);
    assert.equal(policy.hasPermission(user, scope === 'FRG' ? 'ASC_MANAGE' : 'FRG_MANAGE'), false);
  }
});

test('server rejects forbidden direct APIs and mutations before executing handlers', async () => {
  const guards = sessionFixture({ id:'u1', role:'ADMIN' }, ['FRG_VIEW']);
  let calls = 0;
  const handler = async () => { calls++; return Response.json({ ok:true }); };
  for (const required of ['ASC_VIEW','ASC_MANAGE','SUPERADMIN']) {
    assert.equal((await guards.withAdminPermission(required, handler)()).status,403);
  }
  assert.equal(calls,0);
  assert.equal((await guards.withAdminPermission('FRG_VIEW',handler)()).status,200);
  assert.equal(calls,1);
  assert.equal((await guards.withAdminPermission('FRG_MANAGE',handler)()).status,200);
  assert.equal(calls,2);
  await assert.rejects(guards.requireAdminPage('ASC_VIEW'), /redirect:\/admin\/access-denied/);
});

test('ASC-only users cannot open FRG orders; missing grants deny all workspace data', async () => {
  for (const permissions of [[], ['ASC_VIEW']]) {
    const guards = sessionFixture({ id:'u1',role:'USER' }, permissions);
    assert.equal((await guards.withAdminPermission('FRG_VIEW',async () => Response.json({ private:true }))()).status,403);
  }
  const guards = sessionFixture(null);
  assert.equal((await guards.withAdminPermission('ASC_VIEW',async () => Response.json({}))()).status,401);
});

test('dynamic export checks return 403, including inside the report handler', async () => {
  const guards = sessionFixture({id:'u1',role:'ADMIN'}, ['FRG_VIEW']);
  const response = await guards.withAdminPermission(['FRG_VIEW','ASC_VIEW'], async () => {
    await guards.requireAdminApi('ASC_VIEW');
    throw new Error('must not reach export');
  })();
  assert.equal(response.status,403);
});

test('all admin API handlers carry the policy for their route and method', () => {
  const files = fs.readdirSync(path.join(root,'app/api/admin'), { recursive:true }).filter(name => name.endsWith('route.js'));
  let checked=0;
  for (const name of files) {
    const source=fs.readFileSync(path.join(root,'app/api/admin',name),'utf8');
    const route='/api/admin/'+path.dirname(name).split(path.sep).join('/');
    const methods=[...source.matchAll(/(?:export async function|export const) (GET|POST|PUT|PATCH|DELETE|HEAD)\b/g)].map(match => match[1]);
    for (const method of methods) {
      const required=policy.routePermission(route,method);
      if (!required) continue;
      const match=source.match(new RegExp('export const '+method+' = withAdminPermission\\((.*), handle'+method+'\\);'));
      assert.ok(match,route+' '+method+' has no guard');
      assert.deepEqual(JSON.parse(match[1]),required,route+' '+method);
      checked++;
    }
  }
  assert.ok(checked > 60);
});


test('PX orders and claims require a privileged role and the corresponding workspace', async () => {
  for (const role of ['ADMIN', 'USER', 'PX_ADMIN', 'SUPERADMIN']) {
    for (const permissions of [[], ['FRG'], ['ASC'], ['FRG', 'ASC']]) {
      const admin = { id: 'u1', role, permissions };
      const guards = sessionFixture(admin, permissions);
      for (const [route, scope] of [['px-orders', 'FRG'], ['px-claims', 'ASC']]) {
        const allowed = role === 'SUPERADMIN' || (role === 'PX_ADMIN' && permissions.includes(scope));
        for (const method of ['GET', 'POST']) {
          const required = policy.routePermission('/api/admin/' + route, method);
          assert.equal(policy.canAccess(admin, required), allowed);
          let called = false;
          const response = await guards.withAdminPermission(required, async () => { called = true; return Response.json({ ok: true }); })();
          assert.equal(response.status, allowed ? 200 : 403);
          assert.equal(called, allowed);
        }
      }
      assert.equal(policy.canAccess(admin, 'ASC_VIEW'), role === 'SUPERADMIN' || permissions.includes('ASC'));
    }
  }
});


test('workspace admins can manage settings while login verification stays superadmin-only', async () => {
  for (const role of ['ADMIN', 'PX_ADMIN', 'USER', 'SUPERADMIN']) {
    for (const permissions of [[], ['FRG'], ['ASC'], ['FRG', 'ASC']]) {
      const guards = sessionFixture({ id: 'u1', role }, permissions);
      const allowed = role === 'SUPERADMIN' || (['ADMIN', 'PX_ADMIN'].includes(role) && permissions.length > 0);
      for (const name of ['order-confirmation', 'delivery-min-order', 'delivery-lead-time']) {
        const required = policy.routePermission('/api/admin/settings/' + name, 'POST');
        let called = false;
        const response = await guards.withAdminPermission(required, async () => { called = true; return Response.json({ ok: true }); })();
        assert.equal(response.status, allowed ? 200 : 403);
        assert.equal(called, allowed);
      }
      const required = policy.routePermission('/api/admin/settings/login-verification', 'POST');
      const response = await guards.withAdminPermission(required, async () => Response.json({ ok: true }))();
      assert.equal(response.status, role === 'SUPERADMIN' ? 200 : 403);
      if (allowed) await guards.requireAdminPage('SETTINGS_MANAGE');
      else await assert.rejects(guards.requireAdminPage('SETTINGS_MANAGE'), /access-denied/);
    }
  }
});
