const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function route() {
  const saved = [];
  const context = {
    Response,
    cookies: async () => ({ set: (...args) => saved.push(args) }),
    requireAdminApi: async () => ({ role: 'ADMIN' }),
    withAdminPermission: (_, handler) => handler,
    hasPermission: (_, permission) => ['FRG_VIEW', 'ASC_VIEW'].includes(permission),
    process: { env: { NODE_ENV: 'production' } },
  };
  const source = fs.readFileSync(path.join(__dirname, '../app/api/admin/workspace/route.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export const POST', 'const POST');
  vm.runInNewContext(source + ';globalThis.handler = POST;', context);
  return { handler: context.handler, saved };
}

test('FRG and ASC switches stay on the public domain behind a localhost proxy', async () => {
  for (const scope of ['FRG', 'ASC']) {
    const { handler, saved } = route();
    const response = await handler(new Request('http://localhost:5300/api/admin/workspace', {
      method: 'POST', body: new URLSearchParams({ scope }),
      headers: { 'x-forwarded-host': 'admin.example.com', 'x-forwarded-proto': 'https' },
    }));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), '/admin');
    assert.equal(new URL(response.headers.get('location'), 'https://admin.example.com/api/admin/workspace').href, 'https://admin.example.com/admin');
    assert.equal(saved[0][1], scope);
    assert.equal(saved[0][2].secure, true);
  }
});

test('background selection returns no redirect and invalid scopes do not set cookies', async () => {
  const { handler, saved } = route();
  const response = await handler(new Request('http://localhost:5300/api/admin/workspace', { method: 'POST', headers: { accept: 'application/json' }, body: new URLSearchParams({ scope: 'ASC' }) }));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('location'), null);
  const invalid = await handler(new Request('http://localhost:5300/api/admin/workspace', { method: 'POST', body: new URLSearchParams({ scope: 'OTHER' }) }));
  assert.equal(invalid.status, 403);
  assert.equal(saved.length, 1);
});
