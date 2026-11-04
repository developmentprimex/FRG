const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const swc = require('next/dist/build/swc');

test('pending create-user submission keeps all fields enabled and blocks a second submit', async () => {
  const file = path.join(__dirname, '../components/admin-create-user-form.js');
  const { code } = await swc.transform(fs.readFileSync(file, 'utf8'), {
    filename: file, jsc: { parser: { syntax: 'ecmascript', jsx: true }, target: 'es2022', transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' },
  });
  let stateIndex = 0;
  const exports = {};
  const context = { exports, require(name) {
    if (name === 'react') return { useState: () => [stateIndex++ === 0 ? '' : true, () => {}] };
    if (name === 'react/jsx-runtime') return require(name);
    if (name.includes('admin-i18n')) return { AdminText: 'span', useAdminI18n: () => ({ translate: (_, fallback) => fallback }) };
    if (name.includes('admin-roles')) return { ADMIN_ROLES: ['ADMIN'], formatAdminRoleLabel: value => value };
    if (name.includes('admin-ui')) return { FormField: 'label', actionRowStyle: {}, formGridStyle: {}, inputStyle: {}, primaryButtonStyle: {} };
    if (name.includes('admin-permission-fields')) return { AdminPermissionFields: 'permission-fields' };
    if (name.includes('admin-select')) return { default: 'role-select', __esModule: true };
    throw new Error(name);
  } };
  vm.runInNewContext(code, context);
  const form = exports.default();
  const elements = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    elements.push(node);
    walk(node.props?.children);
  }
  walk(form);
  for (const name of ['email', 'password', 'confirmPassword', 'role']) {
    const input = elements.find(node => node.props?.name === name);
    assert.ok(input, name);
    assert.notEqual(input.props.disabled, true, name + ' must be submitted');
  }
  assert.notEqual(elements.find(node => node.type === 'permission-fields').props.disabled, true);
  assert.equal(elements.find(node => node.props?.type === 'submit').props.disabled, true);
  let prevented = false;
  form.props.onSubmit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});
