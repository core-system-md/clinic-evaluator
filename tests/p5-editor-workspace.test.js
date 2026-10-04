const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('admin/admin.html', 'utf8');
const js = fs.readFileSync('admin/assessment-editor-workspace.js', 'utf8');
const manager = fs.readFileSync('admin/assessment-manager.js', 'utf8');
const lifecycle = fs.readFileSync('admin/assessment-lifecycle.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20261004140000_p5_delete_draft_cascade_fix.sql', 'utf8');

test('P5 editor workspace assets are wired correctly', () => {
  assert.equal((html.match(/id="assessment-modal"/g) || []).length, 1);
  assert.ok(html.includes('class="assessment-workspace hidden" id="assessment-modal"'));
  assert.ok(!html.includes('class="modal-overlay hidden" id="assessment-modal"'));
  assert.ok(html.includes('#dashboard-content.editor-mode'));
  assert.ok(html.includes('id="workspace-breadcrumb"'));
  assert.ok(html.includes('id="workspace-delete-draft"'));
  assert.ok(html.includes('assessment-editor-workspace.js?v=20261004-2'));
});

test('P5 editor workspace JavaScript parses', () => {
  assert.doesNotThrow(() => new Function(js));
  assert.doesNotThrow(() => new Function(lifecycle));
  assert.doesNotThrow(() => new Function(manager));
});

test('workspace preserves canonical CRUD and lifecycle hooks', () => {
  for (const token of [
    'ast-id','ast-title-ar','ast-title-en','ast-description','ast-status',
    'ast-has-traps','ast-has-simulator','modal-tab-content',
    'updateDraftAxis','updateDraftQuestion','updateDraftOption',
    'deleteDraftAxis','deleteDraftQuestion','deleteOption',
    'saveCalculationConfig','addKpiMapping','addEvMapping',
    'validate_assessment_version_secure','publishAssessment','duplicateAssessment'
  ]) {
    assert.ok(js.includes(token) || lifecycle.includes(token), token + ' hook missing');
  }
});

test('P5 editor has contextual persistence and error handling', () => {
  for (const token of [
    '_workspaceErrorText','_formatWorkspaceDate','_setWorkspaceStatus',
    'lastSaved','آخر حفظ مؤكد','تم الحفظ وإعادة القراءة من الخادم بنجاح'
  ]) assert.ok(js.includes(token), token + ' persistence hook missing');

  assert.ok(js.includes('this._workspaceState.section=\'questions\''), 'axis-to-question navigation missing');
  assert.ok(js.includes('new-axis-title'), 'inline axis creation missing');
  assert.ok(js.includes('new-question-text'), 'inline question creation missing');
  assert.ok(js.includes('new-option-label'), 'inline option creation missing');
  assert.ok(js.includes('new-kpi-code'), 'inline KPI creation missing');
  assert.ok(js.includes('new-ev-code'), 'inline EV creation missing');
  assert.ok(js.includes('option-card'), 'responsive option editor missing');
});

test('draft deletion is single-entry, server-authoritative and migration fixes cascade-trigger failure', () => {
  assert.equal((manager.match(/حذف المسودة نهائياً/g) || []).length, 1);
  assert.ok(lifecycle.includes("delete_assessment_draft_secure"));
  assert.ok(lifecycle.includes("result.success !== true"));
  for (const token of [
    'delete from public.traps',
    'delete from public.assessment_assets',
    'delete from public.insights_mapping',
    'delete from public.assessment_session_access',
    'delete from public.questions',
    'delete from public.axes',
    "delete from public.assessment_types"
  ]) assert.ok(migration.includes(token), token + ' explicit cleanup missing');
});
