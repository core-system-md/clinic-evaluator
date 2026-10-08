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
