import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import config from "./fixtures/p3-current-published-config-v1.json" with { type: "json" };
import registry from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json" with { type: "json" };
import { scoreP3IntegratedV1 } from "../supabase/functions/assessment-access/p3-integrated-scorer-v1.mts";

const ROOT = process.cwd();
const ENGINE = path.join(ROOT, "supabase/functions/assessment-access/engine.ts");
const ENTRYPOINT = path.join(ROOT, "supabase/functions/assessment-access/index.ts");
const LEGACY = path.join(ROOT, "supabase/functions/assessment-access/score-engine-legacy.ts");
const OLD = path.join(ROOT, "supabase/functions/assessment-access/score-engine.ts");

function firstSelection(slug) {
  const seen = new Set();
  return registry.entries
    .filter((entry) => entry.assessmentSlug === slug)
    .filter((entry) => !seen.has(entry.questionCode) && seen.add(entry.questionCode))
    .map((entry) => ({
      questionCode: entry.questionCode,
      optionId: entry.optionId,
      optionIndex: entry.optionIndex,
    }));
}

test("WP-02 local contract: canonical engine ownership is unambiguous", () => {
  assert.equal(fs.existsSync(ENGINE), true);
  assert.equal(fs.existsSync(OLD), false);
  assert.equal(fs.existsSync(LEGACY), true);

  const engine = fs.readFileSync(ENGINE, "utf8");
  const entrypoint = fs.readFileSync(ENTRYPOINT, "utf8");
  const legacy = fs.readFileSync(LEGACY, "utf8");

  assert.match(engine, /export async function calculateAssessment\(/);
  assert.match(engine, /MD_CODE_ASSESSMENT_ENGINE/);
  assert.match(engine, /FINAL_IMPLEMENTATION_CONTRACT-2026-10-07/);
  assert.match(engine, /resolveInterpretationBinding/);
  assert.match(engine, /scopedConsistencyConfiguration/);
  assert.match(engine, /scoreP3IntegratedV1/);
  assert.match(engine, /resultStatus: "PRODUCTION"/);

  assert.match(entrypoint, /from "\.\/engine\.ts"/);
  assert.doesNotMatch(entrypoint, /from "\.\/score-engine\.ts"/);
  assert.doesNotMatch(entrypoint, /calculateP3Production/);
  assert.match(legacy, /compatibility\/reference only/);
});

test("WP-02 local contract: every current published fixture family has explicit interpretation coverage", () => {
  const engine = fs.readFileSync(ENGINE, "utf8");
  for (const [slug, family] of Object.entries(config.families)) {
    const binding = '"' + slug + ":" + family.version + '"';
    assert.ok(engine.includes(binding), "missing binding for " + binding);
    const entries = registry.entries.filter(
      (entry) => entry.assessmentSlug === slug && Number(entry.interpretationVersion) === 1,
    );
    assert.ok(entries.length > 0, "missing interpretation entries for " + slug);
  }
});

test("WP-02 local contract: deterministic Structured Result construction is stable", () => {
  const slug = "patient-journey";
  const family = config.families[slug];
  const input = {
    sessionId: "wp02-session",
    assessmentFamilyId: "wp02-family",
    assessmentTypeId: "wp02-type",
    assessmentVersion: String(family.version),
    interpretationVersion: 1,
    resultId: "wp02-result",
    calculatedAt: "2026-10-08T00:00:00.000Z",
    scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
    assessmentConfigDigest: "wp02-fixture-digest",
    assessmentSlug: slug,
    selections: firstSelection(slug),
    axes: family.axes.map(([code, weight]) => ({ code, weight })),
    axisRoles: family.axisRoles,
    kpiMappings: config.kpiMappings,
    resultStatus: "PRODUCTION",
    engineIdentity: "MD_CODE_ASSESSMENT_ENGINE",
  };

  const a = scoreP3IntegratedV1(input);
  const b = scoreP3IntegratedV1(input);
  assert.deepEqual(b, a);
  assert.equal(a.schemaVersion, "P3_STRUCTURED_RESULT_V1");
  assert.equal(a.provenance.engineIdentity, "MD_CODE_ASSESSMENT_ENGINE");
  assert.equal(a.provenance.scoringContractVersion, "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07");
  assert.equal(typeof a.scores.overallScore, "number");
  assert.ok(Array.isArray(a.scores.axes));
});

test("WP-02 local contract: Structured Result is factual authority, without report-only leakage/projection fields", () => {
  const slug = "clinic-performance";
  const family = config.families[slug];
  const result = scoreP3IntegratedV1({
    sessionId: "wp02-session",
    assessmentFamilyId: "wp02-family",
    assessmentTypeId: "wp02-type",
    assessmentVersion: String(family.version),
    interpretationVersion: 1,
    resultId: "wp02-result",
    calculatedAt: "2026-10-08T00:00:00.000Z",
    scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
    assessmentConfigDigest: "wp02-structural-digest",
    assessmentSlug: slug,
    selections: firstSelection(slug),
    axes: family.axes.map(([code, weight]) => ({ code, weight })),
    axisRoles: family.axisRoles,
    kpiMappings: config.kpiMappings,
    resultStatus: "PRODUCTION",
    engineIdentity: "MD_CODE_ASSESSMENT_ENGINE",
  });

  assert.ok(result.identity.assessmentVersion);
  assert.ok(Array.isArray(result.resolvedSelections));
  assert.ok(Array.isArray(result.scores.axes));
  assert.ok(Array.isArray(result.kpis));
  assert.ok(result.provenance);
  assert.equal(Object.hasOwn(result, "leakageIndex"), false);
  assert.equal(Object.hasOwn(result, "legacyProjection"), false);
});

test("WP-02 local contract: browser is not an official scoring authority", () => {
  const browserFiles = [
    path.join(ROOT, "assets/js/app.js"),
    path.join(ROOT, "assets/js/report.js"),
  ].filter((file) => fs.existsSync(file));

  for (const file of browserFiles) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /calculateAssessment\s*\(/);
    assert.doesNotMatch(source, /scoreP3IntegratedV1\s*\(/);
  }
});

test("WP-02 local contract: canonical engine has no Leakage formula or legacy projection", () => {
  const engine = fs.readFileSync(ENGINE, "utf8");
  assert.doesNotMatch(engine, /100\s*-\s*.*overallScore/);
  assert.doesNotMatch(engine, /leakageIndex/);
  assert.doesNotMatch(engine, /legacyProjection/);
});
