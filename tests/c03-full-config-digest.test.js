const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const { digestAssessmentConfig, stableSerialize } = require(
  "../supabase/functions/assessment-access/assessment-config-digest.mjs"
);
const engineSource = fs.readFileSync(
  "supabase/functions/assessment-access/engine.ts",
  "utf8",
);

const baseline = {
  assessment: {
    titleAr: "التقييم",
    hasEvSimulator: true,
    evMappings: { A1: 2 },
  },
  questions: [{ code: "Q1", text: "Question", displayOrder: 1 }],
  options: [{ questionId: "Q1", optionIndex: 0, labelAr: "خيار", isTrap: false }],
  traps: [{ name: "T1", penaltyBase: 2 }],
};

test("C-03 config digest is deterministic across object key ordering", async () => {
  const reordered = {
    traps: [{ penaltyBase: 2, name: "T1" }],
    options: [{ isTrap: false, labelAr: "خيار", optionIndex: 0, questionId: "Q1" }],
    questions: [{ displayOrder: 1, text: "Question", code: "Q1" }],
    assessment: { evMappings: { A1: 2 }, hasEvSimulator: true, titleAr: "التقييم" },
  };
  assert.equal(stableSerialize(baseline), stableSerialize(reordered));
  assert.equal(await digestAssessmentConfig(baseline), await digestAssessmentConfig(reordered));
});

test("C-03 config digest changes when user-visible or scoring-relevant fields change", async () => {
  const baseDigest = await digestAssessmentConfig(baseline);
  const mutations = [
    (x) => { x.assessment.titleAr = "عنوان مختلف"; },
    (x) => { x.assessment.hasEvSimulator = false; },
    (x) => { x.assessment.evMappings.A1 = 3; },
    (x) => { x.questions[0].text = "Changed question"; },
    (x) => { x.questions[0].displayOrder = 2; },
    (x) => { x.options[0].labelAr = "خيار مختلف"; },
    (x) => { x.options[0].isTrap = true; },
    (x) => { x.traps[0].penaltyBase = 4; },
  ];

  for (const mutate of mutations) {
    const changed = structuredClone(baseline);
    mutate(changed);
    assert.notEqual(await digestAssessmentConfig(changed), baseDigest);
  }
});

test("C-03 runtime digest input includes complete persisted configuration fields", () => {
  for (const requiredField of [
    "title_ar, title_en, description",
    "has_traps, has_ev_simulator, axis_roles, kpi_mappings, ev_mappings",
    "question_text, question_text_ar, question_type, display_order",
    "label, label_ar, is_trap, display_order",
    "penalty_base, penalty_max",
    "text: question.question_text",
    "labelAr: option.label_ar",
    "isTrap: Boolean(option.is_trap)",
    "traps: runtime.traps",
    "evMappings: runtime.assessment.ev_mappings",
    "digestAssessmentConfig(versionedConfig)",
  ]) {
    assert.ok(engineSource.includes(requiredField), `missing full-config digest field: ${requiredField}`);
  }
});
