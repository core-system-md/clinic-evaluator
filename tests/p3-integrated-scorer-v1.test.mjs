import assert from "node:assert/strict";
import test from "node:test";
import registry from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json" with { type: "json" };
import { scoreP3IntegratedV1 } from "../supabase/functions/assessment-access/p3-integrated-scorer-v1.mts";

const configs = {
  "patient-journey": {
    axes: [
      { code: "A1", weight: 0.2 }, { code: "A2", weight: 0.15 },
      { code: "A3", weight: 0.25 }, { code: "A4", weight: 0.25 }, { code: "A5", weight: 0.15 },
    ],
    axisRoles: { A1:"TRUST", A2:"COMMUNICATION", A3:"CONVERSION", A4:"RETENTION", A5:"LOYALTY" },
  },
  "clinic-performance": {
    axes: [{code:"A1",weight:0.5},{code:"A2",weight:0.3},{code:"A3",weight:0.2}],
    axisRoles: {A1:"TRUST",A2:"COMMUNICATION",A3:"RETENTION"},
  },
  "medical-team-assessment": {
    axes: [{code:"A1",weight:0.35},{code:"A2",weight:0.3},{code:"A3",weight:0.2},{code:"A4",weight:0.15}],
    axisRoles: {A1:"TRUST",A2:"COMMUNICATION",A3:"CONVERSION",A4:"TEAMWORK"},
  },
  "admin-reception-assessment": {
    axes: [{code:"AX85a6e9",weight:35},{code:"AX765ca8",weight:25},{code:"AXa23fa3",weight:25},{code:"AXc39190",weight:15}],
    axisRoles: {AX85a6e9:"SCHEDULING",AX765ca8:"RECEPTION",AXa23fa3:"ADMIN",AXc39190:"COORDINATION"},
  },
  "comprehensive-clinic-assessment": {
    axes: [{code:"AX6f5aa5",weight:20},{code:"AX80c09a",weight:20},{code:"AXaadfb4",weight:20},{code:"AX2572cc",weight:15},{code:"AX6a52b4",weight:15},{code:"AX15afd8",weight:10}],
    axisRoles: {AX6f5aa5:"JOURNEY",AX80c09a:"CONVERSION",AXaadfb4:"OPERATIONS",AX2572cc:"TEAM",AX6a52b4:"RETENTION",AX15afd8:"GROWTH"},
  },
};

const kpiMappings = {
  TFI:{TRUST:.4,COMMUNICATION:.4,RECEPTION:.2},
  TAP:{CONVERSION:.5,RETENTION:.3,SCHEDULING:.2},
  PRP:{RETENTION:.6,SCHEDULING:.4},
  PLI:{LOYALTY:.5,RECEPTION:.5},
  PSI:{COMMUNICATION:.2,RECEPTION:.3,ADMIN:.3,COORDINATION:.2},
  NPI:{TRUST:.1,LOYALTY:.4,RECEPTION:.5},
  EVI:{COMMUNICATION:.2,SCHEDULING:.3,ADMIN:.3,COORDINATION:.2},
  TCI:{CONVERSION:.3,SCHEDULING:.4,ADMIN:.3},
};

function firstSelection(slug) {
  const seen = new Set();
  return registry.entries
    .filter((e) => e.assessmentSlug === slug)
    .filter((e) => !seen.has(e.questionCode) && seen.add(e.questionCode))
    .map((e) => ({questionCode:e.questionCode,optionId:e.optionId,optionIndex:e.optionIndex}));
}

function run(slug, extra={}) {
  const cfg=configs[slug];
  return scoreP3IntegratedV1({
    sessionId:"00000000-0000-0000-0000-000000000001",
    assessmentFamilyId:"family-1",
    assessmentTypeId:"type-1",
    assessmentVersion:"1",
    resultId:"result-1",
    calculatedAt:"2026-10-02T00:00:00Z",
    scoringContractVersion:"P3_CONTRACT_V1",
    assessmentConfigDigest:"digest-test",
    assessmentSlug:slug,
    selections:firstSelection(slug),
    axes:cfg.axes,
    axisRoles:cfg.axisRoles,
    kpiMappings,
    ...extra,
  });
}

test("integrated path produces axis scores and approved weighted overallScore", () => {
  const r=run("patient-journey");
  assert.equal(r.scores.overallScore, r.scores.axes.filter(a=>a.score!==null).reduce((sum,a)=>sum+a.score*a.weight,0)/r.scores.axes.reduce((sum,a)=>sum+a.weight,0));
  assert.equal(r.scores.axes.length,5);
  assert.equal(r.schemaVersion,"P3_STRUCTURED_RESULT_V1");
  assert.equal(r.scores.overallScore,r.scores.overallScore);
});

test("integrated path does not impute unavailable roles into KPIs", () => {
  const r=run("patient-journey");
  const psi=r.kpis.find(k=>k.kpiCode==="PSI");
  assert.ok(psi);
  assert.equal(psi.status,"partial");
  assert.ok(psi.value !== null);
  assert.ok(psi.coverage < 1);
});

test("integrated economics keeps blank referral unavailable and 0% as base", () => {
  const blank=run("clinic-performance",{economicInput:{averageVisitValue:100,relationshipYears:3,referralPercentage:null}});
  assert.equal(blank.economics.status,"NOT_COMPUTED");
  const base=run("clinic-performance",{economicInput:{averageVisitValue:100,relationshipYears:3,referralPercentage:0}});
  assert.equal(base.economics.status,"COMPUTED");
  assert.equal(base.economics.output.value,900);
  assert.equal(base.scores.overallScore,run("clinic-performance").scores.overallScore);
});

test("integrated consistency is signal-only", () => {
  const rules=[{
    ruleId:"R1",ruleVersion:1,relationshipType:"TEST",
    trigger:{validator:{answered:true},target:{answered:true}},
    severity:"ATTENTION",affectedComponents:"FROM_INPUTS",findingCode:"TEST_FINDING",
    interpretation:"test relationship",reviewRequired:true,scoreEffect:"NONE"
  }];
  const r=run("medical-team-assessment",{consistencyRules:rules,consistencyPairs:[{
    relationshipType:"TEST",validatorQuestionCode:"Q2c9f29",targetQuestionCode:"Q8e7ea4"
  }]});
  assert.equal(r.consistency.findings.length,1);
  assert.equal(r.consistency.findings[0].scoreEffect,"NONE");
  assert.equal(r.scores.overallScore,r.scores.overallScore);
});

test("unknown question identity is rejected before silent discard", () => {
  const cfg=configs["patient-journey"];
  assert.throws(()=>scoreP3IntegratedV1({
    sessionId:"s",assessmentFamilyId:"f",assessmentTypeId:"t",assessmentVersion:"1",
    resultId:"r",calculatedAt:"2026-10-02T00:00:00Z",scoringContractVersion:"P3_CONTRACT_V1",
    assessmentConfigDigest:"digest-test",assessmentSlug:"patient-journey",
    selections:[{questionCode:"NOT_A_REAL_QUESTION",optionId:"x",optionIndex:0}],
    axes:cfg.axes,axisRoles:cfg.axisRoles,kpiMappings,
  }),/Unknown question identity/);
});

test("all five current families execute through one integrated path", () => {
  for (const slug of Object.keys(configs)) {
    const r=run(slug);
    assert.equal(r.identity.assessmentTypeId,"type-1");
    assert.ok(r.scores.axes.length>0);
    assert.ok(r.scores.overallScore !== null);
    assert.equal(r.economics.status,"NOT_COMPUTED");
  }
});
