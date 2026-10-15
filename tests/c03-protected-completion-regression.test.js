const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const edgeSource = fs.readFileSync(
  'supabase/functions/assessment-access/index.ts',
  'utf8',
);
const engineSource = fs.readFileSync(
  'supabase/functions/assessment-access/engine.ts',
  'utf8',
);
const persistenceHarness = fs.readFileSync(
  'tests/wp-04-structured-result-persistence-harness.sql',
  'utf8',
);

function completeActionSource() {
  const start = edgeSource.indexOf('if (action === "complete")');
  const end = edgeSource.indexOf('if (action === "calculate_ev")', start);
  assert.notEqual(start, -1, 'complete action must exist');
  assert.notEqual(end, -1, 'complete action must have a bounded end');
  return edgeSource.slice(start, end);
}

test('C-03 protected completion uses frozen submission inputs before calculation', () => {
  const source = completeActionSource();
  const prepareAt = source.indexOf('supabase.rpc("prepare_assessment_submission"');
  const snapshotAt = source.indexOf('const answerSnapshot =');
  const computeAt = source.indexOf('await calculateAssessment(supabase');
  const completionAt = source.indexOf('await supabase.rpc(rpcName, rpcPayload)');

  assert.ok(prepareAt >= 0, 'completion must prepare/freeze the submission');
  assert.ok(snapshotAt > prepareAt, 'calculation snapshot must come from preparation');
  assert.ok(computeAt > snapshotAt, 'engine must run after the frozen snapshot is read');
  assert.ok(completionAt > computeAt, 'persistence must run after calculation');
  assert.match(source, /p_economic_input:\s*requestedEconomicInput/);
  assert.match(source, /submission_economic_input/);
  assert.match(source, /p_submission_fingerprint:\s*submissionFingerprint/);
});

test('C-03 protected/admin sessions select the protected Structured Result RPC and identity', () => {
  const source = completeActionSource();

  assert.match(
    source,
    /const rpcName = access\.assessment_user_id\s*\?\s*"complete_p4_assessment_from_result"\s*:\s*"complete_p4_public_assessment_from_result"/,
  );
  assert.match(
    source,
    /p_assessment_user_id:\s*access\.assessment_user_id/,
  );
  assert.match(source, /p_access_token_hash:\s*access\.tokenHash/);
  assert.match(source, /p_result:\s*structuredResult/);
  assert.match(source, /await supabase\.rpc\(rpcName, rpcPayload\)/);
});

test('C-03 calculation validates answer-to-option identity against the loaded assessment', () => {
  assert.match(engineSource, /function buildSelections\(/);
  assert.match(engineSource, /questionMap\.get\(answer\.question_id\)/);
  assert.match(engineSource, /Number\(candidate\.option_index\) === Number\(answer\.option_index\)/);
  assert.match(engineSource, /Number\(answer\.option_value\) !== Number\(option\.option_value\)/);
  assert.match(engineSource, /throw new Error\("Answer integrity check failed"\)/);
});

test('C-03 isolated PostgreSQL harness exercises the actual protected completion RPC', () => {
  assert.match(
    persistenceHarness,
    /\\i supabase\/migrations\/20261009164951_structured_result_authority\.sql/,
  );
  assert.match(persistenceHarness, /public\.complete_p4_assessment_from_result\(/);
  assert.match(persistenceHarness, /'token-protected','33333333-3333-4333-8333-333333333333'::uuid/);
  assert.match(persistenceHarness, /if v_used <> 1 then raise exception/);
  assert.match(persistenceHarness, /if v_results <> 1 then raise exception/);
  assert.match(persistenceHarness, /if v_state <> 'completed' then raise exception/);
});
