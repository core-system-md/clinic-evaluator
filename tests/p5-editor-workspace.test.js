const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('admin/admin.html', 'utf8');
const js = fs.readFileSync('admin/assessment-editor-workspace.js', 'utf8');

test('P5 editor workspace assets are wired correctly', () => {
  assert.equal((html.match(/id="assessment-modal"/g) || []).length, 1);
  assert.ok(html.includes('class="assessment-workspace hidden" id="assessment-modal"'));
  assert.ok(!html.includes('class="modal-overlay hidden" id="assessment-modal"'));
  assert.ok(html.includes('/admin/assessment-lifecycle.js?v=20261004-1'));
  assert.ok(html.includes('/admin/assessment-editor-workspace.js?v=20261004-1'));
});

test('P5 editor workspace JavaScript parses', () => {
  assert.doesNotThrow(() => new Function(js));
});

test('workspace preserves the canonical editor field hooks', () => {
  for (const token of [
    'ast-id','ast-title-ar','ast-title-en','ast-description','ast-status',
    'ast-has-traps','ast-has-simulator','modal-tab-content',
    'updateDraftAxis','updateDraftQuestion','updateDraftOption',
    'saveCalculationConfig','validate_assessment_version_secure'
  ]) {
    assert.ok(js.includes(token), token + ' hook missing');
  }
});
