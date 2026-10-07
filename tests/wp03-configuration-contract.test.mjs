import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const fixture = JSON.parse(
  fs.readFileSync("tests/fixtures/p3-current-published-config-v1.json", "utf8"),
);
const engine = fs.readFileSync(
  "supabase/functions/assessment-access/engine.ts",
  "utf8",
);
const migration = fs.readFileSync(
  "supabase/migrations/20261007120000_wp03_normalize_axis_weights_to_percentage.sql",
  "utf8",
);

test("WP-03 canonical fixture represents axis weights as percentage points", () => {
  for (const [slug, family] of Object.entries(fixture.families)) {
    const weights = family.axes.map(([, weight]) => Number(weight));
    assert.ok(
      weights.every((weight) => Number.isFinite(weight) && weight > 0 && weight <= 100),
      `invalid percentage weight in ${slug}`,
    );
    assert.ok(
      Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 100) < 1e-9,
      `weights do not total 100 for ${slug}`,
    );
  }
});

test("WP-03 canonical fixture KPI mappings total 1 and RRI is scoped", () => {
  for (const [kpi, mapping] of Object.entries(fixture.kpiMappings)) {
    const total = Object.values(mapping).reduce((sum, value) => sum + Number(value), 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `${kpi} mapping does not total 1`);
  }

  assert.deepEqual(fixture.kpiScope.RRI, ["admin-reception-assessment"]);
});

test("WP-03 engine enforces configuration invariants", () => {
  assert.match(engine, /canonicalAxisConfigurations\(/);
  assert.match(engine, /Assessment axis weights must total 100 percentage points/);
  assert.match(engine, /validateInterpretationCoverage\(/);
  assert.match(engine, /validateRoleKpiEconomicConfiguration\(/);
  assert.match(engine, /validateConsistencyDependencies\(/);
  assert.match(engine, /Unknown KPI mapping/);
  assert.match(engine, /RRI is only supported for Admin & Reception/);
});

test("WP-03 weight migration refuses mixed or invalid representations", () => {
  assert.match(migration, /mixed axis-weight representations/);
  assert.match(migration, /weight = round\(weight \* 100, 2\)/);
  assert.match(migration, /do not total 100 percentage points/);
});
