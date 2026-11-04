const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../components/admin-shell-client.js'), 'utf8');
const handler = source.slice(source.indexOf('  function changeWorkspace('), source.indexOf('  const routeScope ='));

async function switchFrom(pathname, scope, fail = false) {
  const navigation = [];
  const transitions = [];
  let savedScope;
  const context = {
    pathname,
    switchAdminWorkspace: async form => {
      if (fail) throw new Error('Forbidden');
      savedScope = form.get('scope');
      return savedScope;
    },
    startWorkspaceTransition: callback => transitions.push(Promise.resolve().then(callback)),
    router: { replace: (href, options) => {
      assert.equal(savedScope, scope, 'save the workspace before navigating');
      assert.equal(options.scroll, false);
      navigation.push(href);
    } },
  };
  vm.runInNewContext(handler + ';globalThis.change = changeWorkspace;', context);
  context.change(new URLSearchParams({ scope }));
  while (transitions.length) await transitions.shift();
  return navigation;
}

test('visitor workspace switches open the corresponding visitor report in both directions', async () => {
  assert.deepEqual(await switchFrom('/admin/claim-activity', 'FRG'), ['/admin/contract-access']);
  assert.deepEqual(await switchFrom('/admin/contract-access', 'ASC'), ['/admin/claim-activity']);
});

test('selecting the current visitor workspace keeps the current report', async () => {
  assert.deepEqual(await switchFrom('/admin/claim-activity', 'ASC'), []);
  assert.deepEqual(await switchFrom('/admin/contract-access', 'FRG'), []);
});

test('other pages keep their existing dashboard switching behavior', async () => {
  assert.deepEqual(await switchFrom('/admin/orders', 'ASC'), ['/admin']);
  assert.deepEqual(await switchFrom('/admin/claims', 'FRG'), ['/admin']);
  assert.deepEqual(await switchFrom('/admin', 'ASC'), []);
});

test('a rejected workspace switch cannot navigate to another report', async () => {
  await assert.rejects(switchFrom('/admin/claim-activity', 'FRG', true), /Forbidden/);
});
