import assert from "node:assert/strict";
import test from "node:test";
import {
  applyP3ConsistencyScoreEffects,
  evaluateP3Consistency,
} from "../supabase/functions/assessment-access/consistency-engine.mts";
import catalog from "../documentation/architecture/P3-CONSISTENCY-RULE-REGISTRY-V2.json" with { type: "json" };

const base = {
  assessmentSlug: "clinic-performance",
  assessmentVersion: "1",
  componentCode: "C10",
  answered: true,
  scoreEligible: true,
  scoreMode: "DIRECT_ANCHOR",
  anchorMax: 100,
};
const ruleCatalog = catalog.rules;

function contradictionFinding({ validatorScore = 100, targetScore = 0, cap = 70 } = {}) {
  return evaluateP3Consistency(ruleCatalog, {
    assessmentSlug: "clinic-performance",
    assessmentVersion: "1",
    relationshipType: "HIGH_PRACTICE_CLAIM_VS_DIRECT_CONTRADICTION",
    validator: {
      ...base,
      questionCode: "Q1",
      anchorScore: validatorScore,
    },
    target: {
      ...base,
      questionCode: "Q2",
      anchorScore: targetScore,
    },
    scoreEffectOverride: {
      mode: "CAP_VALIDATOR_ANCHOR",
      maxEffectiveAnchorScore: cap,
    },
  });
}

test("legacy V1 rules remain signal-only", () =>
  assert.ok(ruleCatalog.filter((r) => r.ruleId !== "CR-009").every((r) => r.scoreEffect === "NONE")));

test("strong claim + evidence gap remains a finding, not a penalty", () => {
  const finding = evaluateP3Consistency(ruleCatalog, {
    assessmentSlug: "clinic-performance",
    assessmentVersion: "1",
    relationshipType: "PRACTICE_CLAIM_VS_EVIDENCE_LIMITATION",
    validator: {
      ...base,
      questionCode: "Q1",
      anchorScore: 100,
      evidenceRole: "PRACTICE_CLAIM",
    },
    target: {
      ...base,
      questionCode: "Q5",
      anchorScore: null,
      scoreEligible: false,
      evidenceRole: "EVIDENCE_GAP",
    },
  });
  assert.equal(finding?.findingCode, "UNVERIFIED_CLAIM");
  assert.equal(finding?.scoreEffect, "NONE");
  assert.equal(finding?.scoreAdjustment, undefined);
  assert.equal(finding?.reviewRequired, true);
});

test("explicit contradiction caps validator 100 to the declared mature anchor", () => {
  const finding = contradictionFinding();
  assert.equal(finding?.findingCode, "REALITY_CHECK_CONTRADICTION");
  assert.deepEqual(finding?.scoreEffect, {
    mode: "CAP_VALIDATOR_ANCHOR",
    maxEffectiveAnchorScore: 70,
  });
  assert.deepEqual(finding?.scoreAdjustment, {
    questionCode: "Q1",
    originalAnchorScore: 100,
    effectiveAnchorScore: 70,
  });

  const original = [
    { ...base, questionCode: "Q1", anchorScore: 100 },
    { ...base, questionCode: "Q2", anchorScore: 0 },
  ];
  const effective = applyP3ConsistencyScoreEffects(original, finding ? [finding] : []);
  assert.equal(original[0].anchorScore, 100);
  assert.equal(effective[0].anchorScore, 70);
  assert.equal(effective[1].anchorScore, 0);
});

test("no direct contradiction leaves a high validator unchanged", () => {
  const finding = contradictionFinding({ targetScore: 70, cap: 70 });
  assert.equal(finding, null);
});

test("ambiguous/contextual or missing target does not trigger a numeric contradiction", () => {
  const contextual = evaluateP3Consistency(ruleCatalog, {
    assessmentSlug: "clinic-performance",
    assessmentVersion: "1",
    relationshipType: "HIGH_PRACTICE_CLAIM_VS_DIRECT_CONTRADICTION",
    validator: { ...base, questionCode: "Q1", anchorScore: 100 },
    target: { ...base, questionCode: "Q2", anchorScore: null, contextRequired: true },
    scoreEffectOverride: {
      mode: "CAP_VALIDATOR_ANCHOR",
      maxEffectiveAnchorScore: 70,
    },
  });
  assert.equal(contextual, null);

  const missing = evaluateP3Consistency(ruleCatalog, {
    assessmentSlug: "clinic-performance",
    assessmentVersion: "1",
    relationshipType: "HIGH_PRACTICE_CLAIM_VS_DIRECT_CONTRADICTION",
    validator: { ...base, questionCode: "Q1", anchorScore: 100 },
    target: { ...base, questionCode: "Q2", anchorScore: null, answered: false },
    scoreEffectOverride: {
      mode: "CAP_VALIDATOR_ANCHOR",
      maxEffectiveAnchorScore: 70,
    },
  });
  assert.equal(missing, null);
});

test("non-direct-anchor validator cannot receive numeric consistency effect", () => {
  const finding = evaluateP3Consistency(ruleCatalog, {
    assessmentSlug: "clinic-performance",
    assessmentVersion: "1",
    relationshipType: "HIGH_PRACTICE_CLAIM_VS_DIRECT_CONTRADICTION",
    validator: {
      ...base,
      questionCode: "Q1",
      anchorScore: 100,
      scoreMode: "SEMANTIC_ONLY",
    },
    target: { ...base, questionCode: "Q2", anchorScore: 0 },
    scoreEffectOverride: {
      mode: "CAP_VALIDATOR_ANCHOR",
      maxEffectiveAnchorScore: 70,
    },
  });
  assert.equal(finding, null);
});

test("multiple matched caps are applied once using the strictest declared cap", () => {
  const findings = [
    contradictionFinding({ cap: 70 }),
    contradictionFinding({ cap: 40 }),
  ];
  const effective = applyP3ConsistencyScoreEffects(
    [{ ...base, questionCode: "Q1", anchorScore: 100 }],
    findings.filter(Boolean),
  );
  assert.equal(effective[0].anchorScore, 40);
});

test("signal-only contextual variability remains non-numeric", () => {
  const finding = evaluateP3Consistency(ruleCatalog, {
    assessmentSlug: "medical-team-assessment",
    assessmentVersion: "1",
    relationshipType: "STANDARDIZATION_VS_PROVIDER_CASE_VARIABILITY",
    validator: { ...base, assessmentSlug: "medical-team-assessment", questionCode: "Q1", anchorScore: 100 },
    target: { ...base, assessmentSlug: "medical-team-assessment", questionCode: "Q2", anchorScore: null, contextRequired: true },
  });
  assert.equal(finding?.findingCode, "VARIABILITY_SIGNAL");
  assert.equal(finding?.scoreEffect, "NONE");
});

test("cross-assessment relationship is rejected", () => {
  const finding = evaluateP3Consistency(ruleCatalog, {
    assessmentSlug: "medical-team-assessment",
    assessmentVersion: "1",
    relationshipType: "RESILIENCE_CLAIM_VS_OPERATIONAL_DISRUPTION",
    validator: { ...base, assessmentSlug: "medical-team-assessment", questionCode: "Q1", anchorScore: 100 },
    target: { ...base, assessmentSlug: "patient-journey", questionCode: "Q2", anchorScore: 0 },
  });
  assert.equal(finding, null);
});

test("invalid cap configuration fails closed", () => {
  assert.throws(() =>
    evaluateP3Consistency(ruleCatalog, {
      assessmentSlug: "clinic-performance",
      assessmentVersion: "1",
      relationshipType: "HIGH_PRACTICE_CLAIM_VS_DIRECT_CONTRADICTION",
      validator: { ...base, questionCode: "Q1", anchorScore: 100 },
      target: { ...base, questionCode: "Q2", anchorScore: 0 },
    }),
  );
});

console.log("P3 consistency reality-check layer: explicit caps, non-stacking, same-scope and signal-only preservation passed.");
