const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { execFileSync } = require("node:child_process");

const runner = fs.readFileSync(".github/scripts/c02-value70-live-e2e.mjs", "utf8");
const workflow = fs.readFileSync(".github/workflows/c02-value70-live-e2e.yml", "utf8");
const engine = fs.readFileSync("supabase/functions/assessment-access/engine.ts", "utf8");
const edgeIndex = fs.readFileSync("supabase/functions/assessment-access/index.ts", "utf8");

test("C-02 runner is restricted to the intended Production project and explicit live-write gate", () => {
  assert.match(runner, /ALLOW_LIVE_E2E === "true"/);
  assert.match(runner, /EDGE_URL\.includes\(PROJECT\)/);
  assert.match(runner, /oaqpzaarppccbnepffxx/);
  assert.match(runner, /comprehensive-clinic-assessment/);
  assert.match(runner, /patient-journey/);
});

test("C-02 runner covers both published final V1 families using only eligible V2 value-70 anchors", () => {
  assert.match(runner, /P3_RESPONSE_INTERPRETATION_REGISTRY_V2/);
  assert.match(runner, /Number\(entry\.sourceOptionValue\) === 70/);
  assert.match(runner, /Number\(entry\.anchorScore\) === 70/);
  assert.match(runner, /entry\.scoreEligible === true/);
  assert.match(runner, /save_answer/);
  assert.match(runner, /interpretationVersion/);
  assert.match(runner, /C02_EVIDENCE_JSON=/);
});

test("runner emits run-scoped cleanup identifiers without embedding a privileged credential", () => {
  assert.match(runner, /tokenHashes/);
  assert.match(runner, /sessionIds/);
  assert.match(runner, /leadIds/);
  assert.match(runner, /PENDING_AGENT_SQL_CLEANUP/);
  assert.doesNotMatch(runner, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(workflow, /Upload C-02 evidence/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("workflow automatic trigger remains limited to the workflow file and preserves explicit manual confirmation", () => {
  assert.match(workflow, /push:/);
  assert.match(workflow, /paths:/);
  assert.match(workflow, /\.github\/workflows\/c02-value70-live-e2e\.yml/);
  assert.match(workflow, /confirm_production_write/);
  assert.match(workflow, /RUN-C02-VALUE70/);
  assert.match(workflow, /ALLOW_LIVE_E2E: "true"/);
});

test("live runner parses without executing Production writes", () => {
  execFileSync(process.execPath, ["--check", ".github/scripts/c02-value70-live-e2e.mjs"]);
});

test("completion projection receives the pinned assessment family slug instead of failing with unknown", () => {
  assert.match(engine, /assessmentSlug: runtime\.family\.slug/);
  assert.match(edgeIndex, /assessmentSlug: computed\.provenance\.assessmentSlug/);
  assert.match(edgeIndex, /projectCompletionResponse\(\{/);
});
