import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import canonicalRegistry from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json" with { type: "json" };
import packagedRegistry from "../supabase/functions/assessment-access/response-interpretation-registry-v1.json" with { type: "json" };
import canonicalRegistryV2 from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V2.json" with { type: "json" };
import packagedRegistryV2 from "../supabase/functions/assessment-access/response-interpretation-registry-v2.json" with { type: "json" };
import canonicalPatientJourneyRegistryV2 from "../documentation/architecture/P3-PATIENT-JOURNEY-INTERPRETATION-REGISTRY-V2.json" with { type: "json" };
import packagedPatientJourneyRegistryV2 from "../supabase/functions/assessment-access/patient-journey-interpretation-registry-v2.json" with { type: "json" };
import config from "./fixtures/p3-current-published-config-v1.json" with { type: "json" };
import { scoreP3IntegratedV1 } from "../supabase/functions/assessment-access/assessment-calculation-pipeline.mts";

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

test("Comprehensive interpretation registry v2 is canonical and family-scoped", () => {
  assert.deepEqual(packagedRegistryV2, canonicalRegistryV2);
  assert.equal(packagedRegistryV2.entries.length, 152);
  assert.equal(new Set(packagedRegistryV2.entries.map((entry) => entry.optionId)).size, 152);
  assert.ok(packagedRegistryV2.entries.every((entry) => entry.assessmentSlug === "comprehensive-clinic-assessment"));
  assert.ok(packagedRegistryV2.entries.every((entry) => String(entry.assessmentVersion) === "1"));
  assert.ok(packagedRegistryV2.entries.every((entry) => Number(entry.interpretationVersion) === 2));
});

test("Patient Journey interpretation registry v2 is canonical and family-scoped", () => {
  assert.deepEqual(packagedPatientJourneyRegistryV2, canonicalPatientJourneyRegistryV2);
  assert.equal(packagedPatientJourneyRegistryV2.entries.length, 96);
  assert.equal(new Set(packagedPatientJourneyRegistryV2.entries.map((entry) => entry.optionId)).size, 96);
  assert.ok(packagedPatientJourneyRegistryV2.entries.every((entry) => entry.assessmentSlug === "patient-journey"));
  assert.ok(packagedPatientJourneyRegistryV2.entries.every((entry) => String(entry.assessmentVersion) === "1"));
  assert.ok(packagedPatientJourneyRegistryV2.entries.every((entry) => Number(entry.interpretationVersion) === 2));
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
  assert.match(engine, /consistency-rule-registry-v2\.json/);
  assert.match(engine, /consistency-pair-registry-v1\.json/);
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
      "supabase/functions/assessment-access/consistency-rule-registry-v2.json",
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
      "supabase/functions/assessment-access/consistency-pair-registry-v1.json",
      "utf8",
    ),
  );
  assert.deepEqual(packagedPairs, canonicalPairs);
  assert.equal(packagedPairs.pairs.length, 108);

  const v2Pairs = packagedPairs.pairs.filter(
    (pair) => pair.assessmentSlug === "comprehensive-clinic-assessment" && pair.assessmentVersion === "2",
  );
  const comprehensiveV1Pairs = packagedPairs.pairs.filter(
    (pair) => pair.assessmentSlug === "comprehensive-clinic-assessment" && pair.assessmentVersion === "1",
  );
  const patientV1Pairs = packagedPairs.pairs.filter(
    (pair) => pair.assessmentSlug === "patient-journey" && pair.assessmentVersion === "1",
  );

  assert.equal(v2Pairs.length, 52);
  assert.equal(comprehensiveV1Pairs.length, 52);
  assert.equal(patientV1Pairs.length, 4);
  assert.ok(v2Pairs.every((pair) => pair.assessmentSlug === "comprehensive-clinic-assessment" && pair.assessmentVersion === "2"));
  assert.ok(comprehensiveV1Pairs.every((pair) => pair.assessmentSlug === "comprehensive-clinic-assessment" && pair.assessmentVersion === "1"));
  assert.ok(patientV1Pairs.every((pair) => pair.assessmentSlug === "patient-journey" && pair.assessmentVersion === "1"));
});


test("scorer-side axis rows retain numeric precision before canonical persistence projection", () => {
  const pipeline = fs.readFileSync(
    "supabase/functions/assessment-access/assessment-calculation-pipeline.mts",
    "utf8",
  );
  assert.match(pipeline, /raw_score: axis\.rawScore/);
  assert.match(pipeline, /max_possible: axis\.maxPossible/);
  assert.doesNotMatch(pipeline, /raw_score: Math\.round\(axis\.rawScore\)/);
  assert.doesNotMatch(pipeline, /max_possible: Math\.round\(axis\.maxPossible\)/);
});


test("WP-10 D-12 admin report prefers official Structured Result and does not read answer-level trap fields", () => {
  const admin = fs.readFileSync("admin/assessment-manager.js", "utf8");
  assert.ok(admin.includes("request('rpc/get_admin_assessment_result_secure'"));
  assert.ok(admin.includes("officialResult?.scores?.axes"));
  assert.ok(admin.includes("officialResult?.kpis"));
  assert.ok(admin.includes("status: 'historical'"));
  assert.ok(!admin.includes("this.supabase.select('answers'"));
  assert.doesNotMatch(admin, /\\.trap_triggered\\b|\\.is_trap\\b|Leakage|الفخاخ السلوكية|المنفذ الرئيسي المسبب للفاقد المالي/);
});
