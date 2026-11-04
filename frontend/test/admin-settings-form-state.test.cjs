const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../lib/admin-settings-form-state.js'), 'utf8');
const hasSettingsChanges = new Function(source.replaceAll('export ', '') + '; return hasSettingsChanges;')();

test('settings save activates for edits and deactivates when original values are restored', () => {
  const checkbox = { name: 'enabled', type: 'checkbox', checked: true, defaultChecked: true };
  const amount = { name: 'amount', type: 'number', value: '1000', defaultValue: '1000' };
  const fields = [checkbox, amount];
  assert.equal(hasSettingsChanges(fields), false);
  checkbox.checked = false;
  assert.equal(hasSettingsChanges(fields), true);
  checkbox.checked = true;
  assert.equal(hasSettingsChanges(fields), false);
  amount.value = '1200';
  assert.equal(hasSettingsChanges(fields), true);
  amount.value = '';
  assert.equal(hasSettingsChanges(fields), true);
  amount.value = '1000';
  assert.equal(hasSettingsChanges(fields), false);
});
