import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const texts = JSON.parse(fs.readFileSync('assets/data/report_texts.json','utf8'));
const catalog = JSON.parse(fs.readFileSync('documentation/governance/REPORT-TEXT-LINKAGE-CATALOG-V1-2026-10-08.json','utf8'));

function flatten(value, path='', out=[]) {
  if (Array.isArray(value)) value.forEach((v,i)=>flatten(v, path+'['+i+']', out));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k,v])=>flatten(v, path ? path+'.'+k : k, out));
  else out.push(path);
  return out;
}

test('WP-07 every live report-text leaf has an explicit linkage entry', () => {
  const live = new Set(flatten(texts));
  const linked = new Set(catalog.entries.map(x=>x.path));
  for (const path of live) assert.ok(linked.has(path), 'missing linkage: '+path);
  assert.equal(catalog.entries.length, live.size);
});

test('WP-07 report text contains no removed Leakage/Trap/monthly semantics', () => {
  const serialized = JSON.stringify(texts).toLowerCase();
  for (const term of ['leakage','trap','revenue gap','visits/month','visits monthly','شهرياً','فاقد تشغيلي']) assert.equal(serialized.includes(term.toLowerCase()), false, term);
});

test('WP-07 economic presentation preserves annual model semantics', () => {
  assert.equal(texts.ui.simulator.fields.visits_label, 'عدد الزيارات سنوياً');
  assert.equal(texts.ui.simulator.fields.visits_placeholder, '3');
  assert.match(texts.ui.simulator.notes_items.join(' '), /3 زيارات سنوياً/);
  assert.match(texts.ui.simulator.report_current_ev, /\/سنة/);
});

test('WP-07 linkage sources are constrained and audited', () => {
  const allowed = new Set(Object.keys(catalog.sources));
  assert.equal(catalog.status, 'AUDITED');
  for (const entry of catalog.entries) assert.ok(allowed.has(entry.source), entry.path);
  assert.ok(catalog.removed.some(x => x.path === 'report.leakage_label'));
  assert.ok(catalog.removed.some(x => x.path === 'badges.layer_trap'));
});

test('WP-07 report interpretation remains the semantic report-model boundary', () => {
  const interpretation = fs.readFileSync('assets/js/report-interpretation.js','utf8');
  assert.match(interpretation, /REPORT_MODELS/);
  assert.match(interpretation, /userKpis/);
  assert.doesNotMatch(interpretation, /report_texts\.json/);
});

test('WP-07 report/presentation strings in active renderers are linked to catalog entries', () => {
 const app = fs.readFileSync('assets/js/app.js', 'utf8');
 const renderStart = app.indexOf('  renderResults(res) {');
 const comparisonStart = app.indexOf('  renderAxisComparison(currentAxisScores) {');
 const benchmarkStart = app.indexOf('  renderVisualBenchmark(report) {');
 const simulatorStart = app.indexOf('  /* ─────────────── EV SIMULATOR ─────────────── */');
 assert.ok(renderStart >= 0 && comparisonStart > renderStart && benchmarkStart > comparisonStart && simulatorStart > benchmarkStart);
 const renderer = app.slice(renderStart, comparisonStart);
 const comparison = app.slice(comparisonStart, benchmarkStart);
 const benchmark = app.slice(benchmarkStart, simulatorStart);
 for (const phrase of ['تغير إيجابي بمقدار', 'الأولوية التشغيلية القصوى', 'أعلى محور مقاس', 'درجتك الكلية للعيادة', 'غير متاح']) assert.equal(renderer.includes(phrase), false, phrase);
 for (const phrase of ['المحور', 'الأساس', 'الحالي', 'التغير']) assert.equal(comparison.includes(phrase), false, phrase);
 assert.equal(benchmark.includes('التحليل البصري الشامل'), false);
 const paths = [
  'report.trend_positive','report.trend_negative','report.trend_stable','report.overall_sentence',
  'report.recommendations_title','report.priority_heading','report.measured_axis_sentence',
  'report.highest_axis_heading','report.axis_comparison_axis','report.axis_comparison_baseline',
  'report.axis_comparison_current','report.axis_comparison_change','report.visual_benchmark_title',
  'report.unavailable_label'
 ];
 for (const path of paths) {
  assert.ok(Object.hasOwn(texts.report, path.split('.')[1]), 'missing live text: '+path);
  assert.ok(catalog.entries.some(entry => entry.path === path), 'missing linkage: '+path);
 }
});
