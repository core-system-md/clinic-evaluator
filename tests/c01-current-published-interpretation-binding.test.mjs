import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import registryV2 from "../supabase/functions/assessment-access/response-interpretation-registry-v2.json" with { type: "json" };
import patientJourneyRegistryV2 from "../supabase/functions/assessment-access/patient-journey-interpretation-registry-v2.json" with { type: "json" };
import { resolveP3Selections } from "../supabase/functions/assessment-access/response-scorer.mts";

const EXPECTED = {
  "comprehensive-clinic-assessment": { questions: 36, options: 152 },
  "patient-journey": { questions: 25, options: 96 },
};
const REGISTRIES = {
  "comprehensive-clinic-assessment": registryV2,
  "patient-journey": patientJourneyRegistryV2,
};

test("C-01 current published Comprehensive and Patient Journey versions have complete V2 interpretation coverage", () => {
  const ids = new Set();

  for (const [slug, expected] of Object.entries(EXPECTED)) {
    const entries = REGISTRIES[slug].entries.filter(
      (entry) => entry.assessmentSlug === slug && String(entry.assessmentVersion) === "1" && Number(entry.interpretationVersion) === 2,
    );
    const byQuestion = new Map();
    for (const entry of entries) {
      const group = byQuestion.get(entry.questionCode) || [];
      group.push(entry);
      byQuestion.set(entry.questionCode, group);
      assert.ok(entry.optionId, slug + " has empty option identity");
      assert.ok(!ids.has(entry.optionId), "duplicate option identity: " + entry.optionId);
      ids.add(entry.optionId);
    }

    assert.equal(byQuestion.size, expected.questions, slug + " question coverage");
    assert.equal(entries.length, expected.options, slug + " option coverage");

    for (const [questionCode, options] of byQuestion) {
      options.sort((a, b) => a.optionIndex - b.optionIndex);
      assert.deepEqual(
        options.map((entry) => entry.optionIndex),
        Array.from({ length: options.length }, (_, index) => index),
        slug + " " + questionCode + " option indexes",
      );
      assert.ok(
        options.every((entry) => [0, 40, 70, 100].includes(Number(entry.sourceOptionValue))),
        slug + " " + questionCode + " source values",
      );
    }
  }

  assert.equal(ids.size, 248);
});

test("C-01 every current published option identity resolves through the production scorer", () => {
  for (const slug of Object.keys(EXPECTED)) {
    const entries = REGISTRIES[slug].entries.filter(
      (entry) => entry.assessmentSlug === slug && String(entry.assessmentVersion) === "1" && Number(entry.interpretationVersion) === 2,
    );

    for (const entry of entries) {
      const resolved = resolveP3Selections(
        slug,
        [{ questionCode: entry.questionCode, optionId: entry.optionId, optionIndex: entry.optionIndex }],
        2,
      ).find((item) => item.questionCode === entry.questionCode);

      assert.ok(resolved, slug + " " + entry.questionCode + "[" + entry.optionIndex + "] missing resolution");
      assert.equal(resolved.answered, true, slug + " " + entry.questionCode + "[" + entry.optionIndex + "] not answered");
      assert.equal(resolved.optionId, entry.optionId);
      assert.equal(resolved.optionIndex, entry.optionIndex);
      assert.equal(resolved.anchorScore, entry.anchorScore);
      assert.equal(resolved.sourceOptionValue, entry.sourceOptionValue);
    }
  }
});

test("C-01 engine explicitly binds current product V1 to interpretation V2 and fails closed for an unregistered product V2", () => {
  const engine = fs.readFileSync("supabase/functions/assessment-access/engine.ts", "utf8");
  assert.match(engine, /"comprehensive-clinic-assessment:1": \{\s*registry: registryV2,\s*interpretationVersion: 2,/);
  assert.match(engine, /"patient-journey:1": \{\s*registry: patientJourneyRegistryV2,\s*interpretationVersion: 2,/);
  assert.doesNotMatch(engine, /"comprehensive-clinic-assessment:2":/);
  assert.match(engine, /Number\(entry\.interpretationVersion\) === interpretationBinding\.interpretationVersion/);
});
