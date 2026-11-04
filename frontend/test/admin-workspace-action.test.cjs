const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(allowed) {
  const writes = [];
  const source = fs.readFileSync(path.join(__dirname, '../lib/admin-workspace-action.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export async function', 'async function');
  const context = {
    requireAdminPage: async () => ({ id: 'user' }),
    hasPermission: (_, permission) => allowed.includes(permission),
    cookies: async () => ({ set: (...args) => writes.push(args) }),
    redirect: location => { throw new Error('redirect:' + location); },
    process: { env: { NODE_ENV: 'production' } },
  };
  vm.runInNewContext(source + ';globalThis.action = switchAdminWorkspace;', context);
  return { action: context.action, writes };
}

test('workspace action updates the cookie without redirecting away from the visible dashboard', async () => {
  for (const scope of ['FRG', 'ASC']) {
    const { action, writes } = fixture([`${scope}_VIEW`]);
    assert.equal(await action(new URLSearchParams({ scope })), scope);
    assert.equal(writes.length, 1);
    assert.equal(writes[0][0], 'adminWorkspace');
    assert.equal(writes[0][1], scope);
    assert.equal(writes[0][2].httpOnly, true);
    assert.equal(writes[0][2].secure, true);
  }
});

test('unauthorized or invalid workspace changes cannot change the cookie', async () => {
  for (const scope of ['FRG', 'ASC', 'OTHER']) {
    const { action, writes } = fixture([]);
    await assert.rejects(action(new URLSearchParams({ scope })), /redirect:\/admin\/access-denied$/);
    assert.equal(writes.length, 0);
  }
});
