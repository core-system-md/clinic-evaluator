import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import canonicalRegistryV2 from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V2.json" with { type: "json" };
import registryV2 from "../supabase/functions/assessment-access/response-interpretation-registry-v2.json" with { type: "json" };
import { scoreP3AssessmentV1 } from "../supabase/functions/assessment-access/response-scorer.mts";
import { scoreP3IntegratedV1 } from "../supabase/functions/assessment-access/assessment-calculation-pipeline.mts";

function resolve(slug, questionCode, optionIndex, sourceOptionValue) {
  return scoreP3AssessmentV1({
    assessmentSlug: slug,
    interpretationVersion: 2,
    selections: [{ questionCode, optionId: "runtime-generated-option-id", optionIndex, sourceOptionValue }],
  });
}

test("canonical and packaged V2 interpretation registries are identical and contain the corrected final V1 mappings", () => {
  assert.deepEqual(registryV2, canonicalRegistryV2);
  assert.equal(registryV2.entries.length, 248);
  assert.equal(new Set(registryV2.entries.map((x) => x.assessmentSlug)).size, 2);
  assert.equal(registryV2.entries.filter((x) => x.assessmentSlug === "patient-journey").length, 96);
  assert.equal(registryV2.entries.filter((x) => x.assessmentSlug === "patient-journey" && x.sourceOptionValue === 70 && x.anchorScore === 70 && x.scoreEligible).length, 21);
});

test("Comprehensive Clinic final V1 resolves the 70 option to numeric anchor 70", () => {
  const result = resolve("comprehensive-clinic-assessment", "CCV2Q01", 2, 70);
  const item = result.selections.find((x) => x.questionCode === "CCV2Q01");
  assert.equal(item?.anchorScore, 70);
  assert.equal(item?.scoreEligible, true);
  assert.equal(item?.scoreMode, "DIRECT_ANCHOR");
  const layer = result.profile.components.find((x) => x.componentCode === "COMPREHENSIVE_CLINIC_V2")?.layers[0];
  assert.equal(layer?.score?.percentage, 70);
});

test("Patient Journey final V1 includes its 70 option in numeric aggregation despite environment-generated option IDs", () => {
  const result = resolve("patient-journey", "Q1", 2, 70);
  const item = result.selections.find((x) => x.questionCode === "Q1");
  assert.equal(item?.anchorScore, 70);
  assert.equal(item?.scoreEligible, true);
  assert.equal(item?.sourceOptionValue, 70);
  const layer = result.profile.components.find((x) => x.componentCode === item?.componentCode)?.layers.find((x) => x.measurementLayer === item?.measurementLayer);
  assert.equal(layer?.score?.percentage, 70);
  assert.equal(layer?.score?.count, 1);
});

test("Integrated published-V1 path carries 70 into axis and overall score", () => {
  const entry = registryV2.entries.find((x) => x.assessmentSlug === "patient-journey" && x.questionCode === "Q1" && x.optionIndex === 2);
  assert.ok(entry);
  const result = scoreP3IntegratedV1({
    sessionId: "session-70", assessmentFamilyId: "family-pj", assessmentTypeId: "type-pj-final-v1",
    assessmentVersion: "1", interpretationVersion: 2, resultId: "result-70", calculatedAt: "2026-10-13T00:00:00Z",
    scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07", assessmentConfigDigest: "fixture-70",
    assessmentSlug: "patient-journey", selections: [{ questionCode: "Q1", optionId: "runtime-generated-option-id", optionIndex: 2, sourceOptionValue: 70 }],
    axes: [{ code: entry.axisCode, weight: 1 }], axisRoles: {}, kpiMappings: {},
    resultStatus: "PRODUCTION", engineIdentity: "MD_CODE_ASSESSMENT_ENGINE",
  });
  assert.equal(result.scores.axes[0].percentage, 70);
  assert.equal(result.scores.overallScore, 70);
});

test("canonical engine pins corrected final V1 assessments to interpretation V2 and supplies stored option value", () => {
  const engine = fs.readFileSync("supabase/functions/assessment-access/engine.ts", "utf8");
  assert.match(engine, /"comprehensive-clinic-assessment:1": \{\s*\/\/ Final corrected content is published as product V1; its scoring semantics use interpretation registry V2\.\s*registry: registryV2,\s*interpretationVersion: 2/s);
  assert.match(engine, /"patient-journey:1": \{\s*\/\/ Final corrected content is published as product V1; its scoring semantics use interpretation registry V2\.\s*registry: registryV2,\s*interpretationVersion: 2/s);
  assert.match(engine, /sourceOptionValue: Number\(option\.option_value\)/);
});

console.log("P3 70-score activation: registry, option resolution, axis aggregation and overall-score tests passed.");
