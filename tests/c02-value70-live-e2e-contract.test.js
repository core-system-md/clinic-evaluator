const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const runner = fs.readFileSync("tests/c02-value70-live-e2e.mjs", "utf8");
const workflow = fs.readFileSync(".github/workflows/c02-value70-live-e2e.yml", "utf8");

test("C-02 runner is gated to the intended Production project", () => {
  assert.match(runner, /ALLOW_LIVE_E2E === "true"/);
  assert.match(runner, /EDGE_URL\.includes\(PROJECT\)/);
  assert.match(runner, /SUPABASE_URL\.includes\(PROJECT\)/);
  assert.match(runner, /comprehensive-clinic-assessment/);
});
test("C-02 runner verifies saved value 70, interpretation V2, and persisted Structured Result", () => {
  assert.match(runner, /Number\(o\.option_value\) === 70/);
  assert.match(runner, /Number\(a\.option_value\) === 70/);
  assert.match(runner, /Number(entry.anchorScore) === 70/);
  assert.match(runner, /interpretation_version/);
  assert.match(runner, /P3_STRUCTURED_RESULT_V1/);
});
test("C-02 runner always attempts exact-run cleanup and verifies residue", () => {
  assert.match(runner, /finally\s*\{/);
  assert.match(runner, /assessment_session_access/);
  assert.match(runner, /tokenHashes/);
  assert.match(runner, /cleanup\.verified/);
});
test("workflow is manual-only, confirmation-gated, and requires cleanup credentials", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*(push|pull_request):/m);
  assert.match(workflow, /confirm_production_write/);
  assert.match(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(workflow, /ALLOW_LIVE_E2E: "true"/);
});
