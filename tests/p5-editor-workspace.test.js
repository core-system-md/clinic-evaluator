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
  assert.ok(js.includes("new-option-label-'+q.id+'"), 'question-scoped inline option creation missing');
  assert.ok(js.includes('new-kpi-code'), 'inline KPI creation missing');
  assert.ok(js.includes('new-ev-code'), 'inline EV creation missing');
  assert.ok(js.includes('option-card'), 'responsive option editor missing');
});

test('draft deletion is single-entry, server-authoritative and migration fixes cascade-trigger failure', () => {
  assert.equal((manager.match(/🗑 حذف المسودة<\/button>/g) || []).length, 1);
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


test('archived versions are viewable but have no mutation controls', () => {
  const ws = js;
  assert.ok(ws.includes("status === 'archived'"), 'archived status branch missing');
  assert.ok(ws.includes("archived?'أرشيف — قراءة فقط'"), 'archived calculation read-only label missing');
  assert.ok(ws.includes("archived?'أرشيف / تاريخي'"), 'archived workspace status label missing');
  assert.ok(ws.includes("restorePublicAssessment"), 'archived restore action missing');
  assert.ok(ws.includes("(pub||archived)?'':"), 'archived mutation controls are not globally suppressed');
  assert.ok(!ws.includes("if (status === 'archived') throw"), 'archived versions are still blocked from opening');
});


test('lifecycle actions are status-specific and archive is separated from active work', () => {
  assert.ok(manager.includes("['draft','published'].includes"), 'active list must contain only Draft/Published');
  assert.ok(manager.includes("status === 'draft'"), 'Draft action branch missing');
  assert.ok(manager.includes("status === 'published'"), 'Published action branch missing');
  assert.ok(manager.includes("status === 'archived'"), 'Archive action branch missing');
  assert.ok(manager.includes('إيقاف الظهور العام'), 'Published stop-public action missing');
  assert.ok(manager.includes('الأرشيف'), 'Dedicated archive section missing');
  assert.ok(manager.includes('غير مطبق على المسودة'), 'Paid access must not be presented as a Draft lifecycle action');
  assert.ok(manager.includes('restorePublicAssessment'), 'Archived restore action missing');
});

test('question workspace renders every question and scopes option creation per question', () => {
  assert.ok(js.includes('d.questions.filter(q=>q.axis_id===axis.id)'), 'all questions for selected axis must be loaded');
  assert.ok(js.includes('d.options.filter(o=>o.question_id===q.id)'), 'options must be rendered per question');
  assert.ok(js.includes("new-option-label-'+q.id+'"), 'option creation input must be unique per question');
  assert.ok(lifecycle.includes("select('options',{filter:{question_id:questionId}})"), 'option creation must query only the target question');
});

test('editor controller has no duplicate lifecycle prototypes', () => {
  for (const name of ['editAssessment','createNewAssessment','saveAssessment']) {
    const matches = lifecycle.match(new RegExp('AssessmentManager\\.prototype\\.'+name+'\\s*=','g')) || [];
    assert.equal(matches.length, 0, name + ' legacy duplicate must be removed from lifecycle module');
  }
});
