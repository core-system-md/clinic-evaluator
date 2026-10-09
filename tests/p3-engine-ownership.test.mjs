import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const enginePath = "supabase/functions/assessment-access/engine.ts";
const legacyPath = "tests/reference/score-engine-legacy.ts";
const runtimeLegacyPath = "supabase/functions/assessment-access/score-engine-legacy.ts";
const removedPath = "supabase/functions/assessment-access/p3-production-adapter.mts";
const entrypointPath = "supabase/functions/assessment-access/index.ts";

test("canonical assessment engine has one authoritative entrypoint", () => {
  assert.equal(fs.existsSync(enginePath), true);
  assert.equal(fs.existsSync(legacyPath), true);
  assert.equal(fs.existsSync(runtimeLegacyPath), false);
  assert.equal(fs.existsSync(removedPath), false);

  const engine = fs.readFileSync(enginePath, "utf8");
  const legacy = fs.readFileSync(legacyPath, "utf8");
  const entrypoint = fs.readFileSync(entrypointPath, "utf8");

  assert.match(engine, /MD Code central assessment engine — canonical server runtime/);
  assert.match(engine, /export async function calculateAssessment\(/);
  assert.doesNotMatch(engine, /calculateP3Production/);

  assert.match(legacy, /Legacy scoring implementation — compatibility\/reference only/);
  assert.match(legacy, /export function calculateLegacyAssessment\(/);

  assert.match(entrypoint, /from "\.\/engine\.ts"/);
  assert.doesNotMatch(entrypoint, /p3-production-adapter\.mts/);
  assert.doesNotMatch(entrypoint, /calculateP3Production/);
});


test("technical calculation files have functional names and no stage-named duplicate modules", () => {
  const runtimeDir = "supabase/functions/assessment-access";
  const expected = [
    "assessment-calculation-pipeline.mts",
    "component-aggregation-engine.mts",
    "consistency-engine.mts",
    "consistency-pair-registry-v1.json",
    "consistency-rule-registry-v2.json",
    "coverage-criticality-engine.mts",
    "economic-opportunity-model-v1.mts",
    "response-interpretation-registry-v1.json",
    "response-interpretation-registry-v2.json",
    "response-scorer.mts",
    "result-persistence-projection.mts",
    "structured-result.mts",
  ];
  for (const name of expected) assert.equal(fs.existsSync(`${runtimeDir}/${name}`), true, name);
  assert.deepEqual(
    fs.readdirSync(runtimeDir).filter((name) => /^p3-/.test(name)),
    [],
    "stage-named runtime artifacts must not compete with functional owners",
  );
});

test("the three new unapplied migrations use one functional identity per version", () => {
  const migrationsDir = "supabase/migrations";
  const names = fs.readdirSync(migrationsDir).filter((name) => name.endsWith(".sql"));
  const expected = [
    ["20261008090000", "20261008090000_canonical_axis_weights.sql", "20261008090000_wp03_canonical_axis_weights.sql"],
    ["20261008100000", "20261008100000_structured_result_authority.sql", "20261008100000_wp04_structured_result_authority.sql"],
    ["20261008120000", "20261008120000_reconstruct_final_assessment_versions.sql", "20261008120000_wp08_reconstruct_final_v1_assessments.sql"],
  ];
  for (const [version, canonicalName, obsoleteName] of expected) {
    assert.ok(names.includes(canonicalName), canonicalName);
    assert.ok(!names.includes(obsoleteName), obsoleteName);
    assert.equal(names.filter((name) => name.startsWith(version + "_")).length, 1, version + " migration identity");
  }
});
