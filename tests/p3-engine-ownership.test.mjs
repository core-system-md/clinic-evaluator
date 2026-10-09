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
