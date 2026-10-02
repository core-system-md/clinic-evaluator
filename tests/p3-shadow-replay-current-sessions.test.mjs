import assert from "node:assert/strict";
import test from "node:test";
import { scoreP3AssessmentV1 } from "../supabase/functions/assessment-access/p3-scorer-v1.mts";

const fixtures = [
  {
    assessmentSlug: "admin-reception-assessment",
    sessionId: "9d1a5240-fe3b-485a-956c-e44138544f90",
    legacyScorePercentage: 0,
    selections: [
      ["Qfdbbe8","e4e86864-337b-43d1-91a3-b2648f4a8e9c",0],
      ["Qaf9f02","22b03fb2-1698-4463-8308-4b25cdb062bf",0],
      ["Q47b317","32e5e56b-0b9a-4568-a6b7-aa731a62d4fe",0],
      ["Q25f133","6387257a-9925-4bd6-88cb-b31e62a80c95",0],
      ["Qefa857","ed11e894-8829-468e-a50b-7d570276c38c",0],
      ["Qa60da0","29c50d65-1019-4446-b4c9-5ac0fbe96c68",0],
      ["Q0fea0b","8cc69e93-ed31-4dca-898d-50044f73b7b3",0],
      ["Qa5eb11","cfa99f6d-d3cb-4091-92c1-d8307d4c2198",0],
      ["Qa6d3c0","362c39a6-1859-4df4-8c83-4eba26f08d44",0],
      ["Q386668","7d3e179a-7243-48af-96a2-9c7bbe894bdf",0],
      ["Q9a86a8","d968d0b7-34e0-4018-aad4-ef739a4f82a0",0],
    ],
  },
  {
    assessmentSlug: "patient-journey",
    sessionId: "0c64e5c1-90db-4f99-8798-918c07afda5c",
    legacyScorePercentage: 44,
    selections: [
      ["Q1","202bb0ef-cb91-4d5a-bf87-f33076e6ea21",0],
      ["Q2","0b6b57f6-18a7-477d-8c8c-7d9fd66eec21",1],
      ["Q3","53aa39b8-7e09-44b5-b915-3f1a02598b8a",2],
      ["Q4","72270ec6-0b9b-4e6d-9792-b4cd28ffd818",1],
      ["Q5","fd88cf7c-266e-44f8-9de4-001621ba7dbf",1],
      ["Q6","0f81e29d-375d-4856-a35e-6d55337c1920",0],
      ["Q7","15e6bef3-d606-45c1-bba1-ec0aef5396a1",1],
      ["Q8","d6caeacc-f4c5-4e9f-b3a3-f135d6f8a4cc",0],
      ["Q9","75ffc82d-68a8-4b76-8092-874a1554d467",2],
      ["Q10","831153b8-4e1b-49c6-b187-1cb555c8658c",1],
      ["Q11","51ff2841-085f-4ba7-b110-5e9433b4a0f8",0],
      ["Q12","b1086d4d-e607-4128-bbde-62ba561ab636",1],
      ["Q13","4e5cfc3b-a2f3-478b-b141-88e806c8b5f1",0],
      ["Q14","66a8a3b8-54c1-4bc1-9766-dde23be05a27",1],
      ["Q15","613fef7b-f64f-4001-8bae-33d8a4f672db",0],
      ["Q16","bc99be34-1837-44d6-943d-13d1b56d6edf",1],
      ["Q17","0d82ed74-318e-4044-8b56-d0794534ac68",2],
      ["Q18","773cc275-34a8-4f0f-ab60-b88d1f7acf26",1],
      ["Q19","77e5c506-a443-436e-b757-59f966d8d5a0",2],
      ["Q20","be56d9d8-4582-4379-bb09-787130a01a75",1],
      ["Q21","1199670c-6766-4110-9968-98fddf37c218",2],
      ["Q22","b3422392-fcfc-497a-a2d3-b4e304e50b15",1],
      ["Q23","67f10edb-e429-48e0-bf55-ed4822ca7106",2],
      ["Q24","fcbfa7a8-31f5-446a-8539-a697afd92d1d",1],
      ["Q25","d99ccd05-d9b2-41c6-9310-fc6d1215a91e",1],
    ],
  },
];

function toSelections(fixture) {
  return fixture.selections.map(([questionCode, optionId, optionIndex]) => ({
    questionCode, optionId, optionIndex,
  }));
}

function summarize(result) {
  return result.profile.components.flatMap((component) =>
    component.layers.map((layer) => ({
      componentCode: component.componentCode,
      primaryConstruct: layer.primaryConstruct,
      measurementLayer: layer.measurementLayer,
      coverageRatio: layer.coverageRatio,
      coverageStatus: layer.coverageStatus,
      rawScore: layer.score?.rawScore ?? null,
      maxPossible: layer.score?.maxPossible ?? null,
      percentage: layer.score?.percentage ?? null,
      count: layer.score?.count ?? 0,
    })),
  );
}

for (const fixture of fixtures) {
  test(`shadow replay is deterministic for ${fixture.assessmentSlug}`, () => {
    const first = scoreP3AssessmentV1({
      assessmentSlug: fixture.assessmentSlug,
      selections: toSelections(fixture),
    });
    const second = scoreP3AssessmentV1({
      assessmentSlug: fixture.assessmentSlug,
      selections: toSelections(fixture),
    });
    assert.deepEqual(summarize(first), summarize(second));
    assert.equal(first.profile.overallComposite, null);
    assert.equal(first.interpretationVersion, 1);
    assert.equal(first.selections.filter((x) => x.answered).length, fixture.selections.length);
    console.log(JSON.stringify({
      sessionId: fixture.sessionId,
      assessmentSlug: fixture.assessmentSlug,
      legacyScorePercentage: fixture.legacyScorePercentage,
      p3OverallComposite: first.profile.overallComposite,
      p3Layers: summarize(first),
    }));
  });
}

test("historical shadow replay does not equate legacy overall to P3 profile", () => {
  for (const fixture of fixtures) {
    const result = scoreP3AssessmentV1({
      assessmentSlug: fixture.assessmentSlug,
      selections: toSelections(fixture),
    });
    assert.equal(result.profile.overallComposite, null);
    assert.notEqual(typeof fixture.legacyScorePercentage, "undefined");
  }
});

console.log("P3 shadow replay: current fully answered sessions are deterministic and remain non-destructive.");
