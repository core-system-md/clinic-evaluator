import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import config from "./fixtures/p3-current-published-config-v1.json" with { type: "json" };
import registryV1 from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json" with { type: "json" };
import registryV2 from "../supabase/functions/assessment-access/p3-response-interpretation-registry-v2.json" with { type: "json" };
import rules from "../documentation/architecture/P3-CONSISTENCY-RULE-REGISTRY-V2.json" with { type: "json" };
import pairs from "../documentation/architecture/P3-CONSISTENCY-PAIR-REGISTRY-V1.json" with { type: "json" };

const EXPECTED = {
  "admin-reception-assessment": [35,25,25,15],
  "clinic-performance": [50,30,20],
  "comprehensive-clinic-assessment": [20,20,20,15,15,10],
  "medical-team-assessment": [35,30,20,15],
  "patient-journey": [20,15,25,25,15],
};

test("WP-03 configuration contract: canonical axis weights are percentage points and total 100", () => {
  for (const [slug, family] of Object.entries(config.families)) {
    const weights = family.axes.map(([, weight]) => Number(weight));
    assert.deepEqual(weights, EXPECTED[slug]);
    assert.equal(weights.reduce((a,b)=>a+b,0), 100);
    assert.ok(weights.every((weight) => weight > 0 && weight <= 100));
  }
});

test("WP-03 configuration contract: interpretation anchors are explicit and source option values are not universal scoring semantics", () => {
  const check = (registry, slug, expectedQuestions, allowedSourceValues) => {
    const entries = registry.entries.filter((entry) => entry.assessmentSlug === slug);
    assert.equal(new Set(entries.map((e) => e.questionCode)).size, expectedQuestions);
    for (const entry of entries) {
      assert.ok(["DIRECT_ANCHOR","SEMANTIC_ONLY","EVIDENCE_ONLY","SIGNAL_ONLY"].includes(entry.scoreMode));
      assert.ok(allowedSourceValues.includes(entry.sourceOptionValue));
      if (entry.scoreEligible) {
        assert.equal(entry.anchorMax, 100);
        assert.ok([0,40,70,100].includes(entry.anchorScore));
      }
    }
  };

  check(registryV1, "admin-reception-assessment", 11, [0,40,100]);
  check(registryV1, "clinic-performance", 9, [0,40,100]);
  check(registryV1, "comprehensive-clinic-assessment", 36, [0,40,100]);
  check(registryV1, "medical-team-assessment", 12, [0,40,100]);
  check(registryV1, "patient-journey", 25, [0,40,100]);
  check(registryV2, "comprehensive-clinic-assessment", 36, [0,40,70,100]);
});

test("WP-03 configuration contract: current question semantics are explicit and non-ambiguous", () => {
  const v1Layers = new Set(registryV1.entries.map((e) => e.measurementLayer));
  for (const layer of ["E","E/M","M","M/E","M/X","P","P/E","P/K","P/M"]) {
    assert.ok(v1Layers.has(layer), "missing measurement layer " + layer);
  }
  assert.deepEqual([...new Set(registryV1.entries.map((e) => e.scoreMode))].sort(), ["DIRECT_ANCHOR","EVIDENCE_ONLY","SEMANTIC_ONLY","SIGNAL_ONLY"]);
  assert.deepEqual([...new Set(registryV2.entries.map((e) => e.scoreMode))], ["DIRECT_ANCHOR"]);
  assert.ok(registryV1.entries.every((e) => e.interpretationVersion === 1));
  assert.ok(registryV2.entries.every((e) => e.interpretationVersion === 2));
});

test("WP-03 configuration contract: role mappings cover every configured axis", () => {
  for (const [slug, family] of Object.entries(config.families)) {
    const axisCodes = family.axes.map(([code]) => code);
    assert.deepEqual(Object.keys(family.axisRoles).sort(), [...axisCodes].sort());
    assert.ok(Object.values(family.axisRoles).every((role) => typeof role === "string" && role.length > 0));
  }
});

test("WP-03 configuration contract: KPI mapping weights are normalized coefficients and scoped RRI is explicit", () => {
  for (const [kpi, mapping] of Object.entries(config.kpiMappings)) {
    const values = Object.values(mapping);
    assert.ok(values.length > 0, kpi);
    assert.ok(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1), kpi);
    assert.ok(Math.abs(values.reduce((a,b)=>a+b,0) - 1) < 1e-12, kpi);
  }
  assert.deepEqual(config.kpiScope.RRI, ["admin-reception-assessment"]);
});

test("WP-03 configuration contract: EV capability is separate from EV input basis", () => {
  const source = fs.readFileSync("supabase/functions/assessment-access/index.ts", "utf8");
  assert.match(source, /visitsPerYear: 3/);
  assert.match(source, /const visits = .*3/);
  assert.doesNotMatch(source, /visitsPerMonth/);
  assert.doesNotMatch(source, /monthly visits/i);
});

test("WP-03 configuration contract: explicit consistency pairs are version-scoped and linked to registered relationship types", () => {
  const ruleTypes = new Set(rules.rules.map((rule) => rule.relationshipType));
  assert.equal(pairs.pairs.length, 108);

  const v2Pairs = pairs.pairs.filter(
    (pair) => pair.assessmentSlug === "comprehensive-clinic-assessment" && pair.assessmentVersion === "2",
  );
  const comprehensiveV1Pairs = pairs.pairs.filter(
    (pair) => pair.assessmentSlug === "comprehensive-clinic-assessment" && pair.assessmentVersion === "1",
  );
  const patientV1Pairs = pairs.pairs.filter(
    (pair) => pair.assessmentSlug === "patient-journey" && pair.assessmentVersion === "1",
  );

  assert.equal(v2Pairs.length, 52);
  assert.equal(comprehensiveV1Pairs.length, 52);
  assert.equal(patientV1Pairs.length, 4);
  assert.ok(v2Pairs.every((pair) => pair.assessmentVersion === "2"));
  assert.ok(comprehensiveV1Pairs.every((pair) => pair.assessmentVersion === "1"));
  assert.ok(patientV1Pairs.every((pair) => pair.assessmentVersion === "1"));
  assert.ok(pairs.pairs.every((pair) => ruleTypes.has(pair.relationshipType)));
  assert.ok(pairs.pairs.every((pair) => pair.scoreEffectOverride?.mode === "CAP_VALIDATOR_ANCHOR"));
});

test("WP-03 migration source uses guarded fraction-to-percentage conversion", () => {
  const sql = fs.readFileSync("supabase/migrations/20261008090000_canonical_axis_weights.sql", "utf8");
  assert.match(sql, /weight \* 100/);
  assert.match(sql, /weight_sum between 0\.999999 and 1\.000001/);
  assert.match(sql, /expected 12 normalized axis rows/);
  assert.match(sql, /commit;/);
});
