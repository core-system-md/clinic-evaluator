import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import canonicalRegistry from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json" with { type: "json" };
import packagedRegistry from "../supabase/functions/assessment-access/p3-response-interpretation-registry-v1.json" with { type: "json" };
import config from "./fixtures/p3-current-published-config-v1.json" with { type: "json" };
import { scoreP3IntegratedV1 } from "../supabase/functions/assessment-access/p3-integrated-scorer-v1.mts";

function firstSelection(slug) {
  const seen = new Set();
  return canonicalRegistry.entries
    .filter((entry) => entry.assessmentSlug === slug)
    .filter((entry) => !seen.has(entry.questionCode) && seen.add(entry.questionCode))
    .map((entry) => ({
      questionCode: entry.questionCode,
      optionId: entry.optionId,
      optionIndex: entry.optionIndex,
    }));
}

test("production function registry is byte-equivalent to canonical registry artifact", () => {
  assert.deepEqual(packagedRegistry, canonicalRegistry);
});

test("integrated scorer emits a production-valid structured result without changing score construction", () => {
  const family = config.families["patient-journey"];
  const result = scoreP3IntegratedV1({
    sessionId: "00000000-0000-0000-0000-000000000001",
    assessmentFamilyId: "family-1",
    assessmentTypeId: "type-patient-journey",
    assessmentVersion: String(family.version),
    interpretationVersion: 1,
    resultId: "00000000-0000-0000-0000-000000000002",
    calculatedAt: "2026-10-02T00:00:00Z",
    scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
    assessmentConfigDigest: "fixture-digest",
    assessmentSlug: "patient-journey",
    selections: firstSelection("patient-journey"),
    axes: family.axes.map(([code, weight]) => ({ code, weight })),
    axisRoles: family.axisRoles,
    kpiMappings: config.kpiMappings,
    resultStatus: "PRODUCTION",
    engineIdentity: "MD_CODE_ASSESSMENT_ENGINE",
  });

  assert.equal(result.status, "PRODUCTION");
  assert.equal(result.schemaVersion, "P3_STRUCTURED_RESULT_V1");
  assert.equal(result.provenance.engineIdentity, "MD_CODE_ASSESSMENT_ENGINE");
  assert.equal(result.provenance.scoringEngineVersion, "MD_CODE_ASSESSMENT_ENGINE");
  assert.equal(result.provenance.scoringContractVersion, "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07");
  assert.equal(result.classification.bandDefinitionVersion, "P3_BANDS_V1");
  assert.ok(result.scores.overallScore !== null);
  assert.equal(result.economics.status, "NOT_COMPUTED");
});

test("production structured result does not persist internal scorer-only fields", () => {
  const family = config.families["clinic-performance"];
  const result = scoreP3IntegratedV1({
    sessionId: "00000000-0000-0000-0000-000000000001",
    assessmentFamilyId: "family-1",
    assessmentTypeId: "type-clinic-performance",
    assessmentVersion: String(family.version),
    interpretationVersion: 1,
    resultId: "00000000-0000-0000-0000-000000000002",
    calculatedAt: "2026-10-02T00:00:00Z",
    scoringContractVersion: "P3_AGGREGATION_V1",
    assessmentConfigDigest: "fixture-digest",
    assessmentSlug: "clinic-performance",
    selections: firstSelection("clinic-performance"),
    axes: family.axes.map(([code, weight]) => ({ code, weight })),
    axisRoles: family.axisRoles,
    kpiMappings: config.kpiMappings,
    resultStatus: "PRODUCTION",
    engineIdentity: "MD_CODE_ASSESSMENT_ENGINE",
  });

  assert.ok(Array.isArray(result.resolvedSelections));
  assert.ok(Array.isArray(result.axisPersistenceRows));
  const { resolvedSelections, axisPersistenceRows, ...persisted } = result;
  assert.equal(resolvedSelections.length > 0, true);
  assert.equal(axisPersistenceRows.length > 0, true);
  assert.equal(Object.hasOwn(persisted, "resolvedSelections"), false);
  assert.equal(Object.hasOwn(persisted, "axisPersistenceRows"), false);
  assert.equal(persisted.status, "PRODUCTION");
});


test("production engine is explicitly on consistency scoring contract v2", () => {
  const engine = fs.readFileSync(
    "supabase/functions/assessment-access/engine.ts",
    "utf8",
  );
  assert.match(engine, /p3-consistency-rule-registry-v2\.json/);
  assert.match(engine, /p3-consistency-pair-registry-v1\.json/);
  assert.match(engine, /scoringContractVersion: SCORING_CONTRACT_ID/);
  assert.doesNotMatch(engine, /P3_AGGREGATION_V[12]/);

  const canonicalRules = JSON.parse(
    fs.readFileSync(
      "documentation/architecture/P3-CONSISTENCY-RULE-REGISTRY-V2.json",
      "utf8",
    ),
  );
  const packagedRules = JSON.parse(
    fs.readFileSync(
      "supabase/functions/assessment-access/p3-consistency-rule-registry-v2.json",
      "utf8",
    ),
  );
  assert.deepEqual(packagedRules, canonicalRules);

  const canonicalPairs = JSON.parse(
    fs.readFileSync(
      "documentation/architecture/P3-CONSISTENCY-PAIR-REGISTRY-V1.json",
      "utf8",
    ),
  );
  const packagedPairs = JSON.parse(
    fs.readFileSync(
      "supabase/functions/assessment-access/p3-consistency-pair-registry-v1.json",
      "utf8",
    ),
  );
  assert.deepEqual(packagedPairs, canonicalPairs);
  assert.equal(packagedPairs.pairs.length, 52);
  assert.ok(packagedPairs.pairs.every((pair) => pair.assessmentSlug === "comprehensive-clinic-assessment" && pair.assessmentVersion === "2"));
});
