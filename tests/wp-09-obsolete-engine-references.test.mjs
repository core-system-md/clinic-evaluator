import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HTML_PAGES = [
  "patient-journey.html",
  "clinic-performance.html",
  "medical-team-assessment.html",
  "admin-reception-assessment.html",
  "comprehensive-clinic-assessment.html",
];

test("WP-09: all assessment pages are detached from the removed browser engine path", () => {
  for (const page of HTML_PAGES) {
    const source = fs.readFileSync(path.join(ROOT, page), "utf8");
    assert.doesNotMatch(
      source,
      /(?:src\s*=\s*["'])\/?engine\/engine\.js["']/i,
      page,
    );
    assert.doesNotMatch(source, /\bAssessmentEngine\b/, page);
  }
});

test("WP-09: the removed browser engine file is not present", () => {
  assert.equal(fs.existsSync(path.join(ROOT, "engine", "engine.js")), false);
});

test("WP-09: assessment-access imports only the canonical engine entrypoint", () => {
  const entrypointPath = path.join(
    ROOT,
    "supabase/functions/assessment-access/index.ts",
  );
  const entrypoint = fs.readFileSync(entrypointPath, "utf8");
  assert.match(entrypoint, /from ["']\.\/engine\.ts["']/);
  assert.doesNotMatch(
    entrypoint,
    /from ["']\.\/score-engine(?:-legacy)?\.ts["']/,
  );
});

test("WP-09: no active runtime source imports the obsolete server engine", () => {
  const runtimeRoots = [
    path.join(ROOT, "assets/js"),
    path.join(ROOT, "admin"),
    path.join(ROOT, "supabase/functions"),
  ];
  const allowedReferenceFile = path.join(
    ROOT,
    "tests/reference/score-engine-legacy.mts",
  );

  function visit(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...visit(full));
      else if (/\.(?:js|mjs|mts|ts)$/.test(entry.name)) files.push(full);
    }
    return files;
  }

  const runtimeFiles = runtimeRoots.flatMap(visit);
  for (const file of runtimeFiles) {
    if (path.resolve(file) === path.resolve(allowedReferenceFile)) continue;
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /(?:from|import\s*\()\s*["'][^"']*score-engine(?:-legacy)?\.ts["']/,
      path.relative(ROOT, file),
    );
    assert.doesNotMatch(
      source,
      /\/?engine\/engine\.js/,
      path.relative(ROOT, file),
    );
  }
});

test("WP-09: the preserved legacy scorer is explicitly non-runtime reference material", () => {
  const legacyPath = path.join(
    ROOT,
    "tests/reference/score-engine-legacy.mts",
  );
  const runtimeLegacyPath = path.join(
    ROOT,
    "supabase/functions/assessment-access/score-engine-legacy.ts",
  );
  assert.equal(fs.existsSync(legacyPath), true);
  assert.equal(fs.existsSync(runtimeLegacyPath), false);
  const legacy = fs.readFileSync(legacyPath, "utf8");
  assert.match(
    legacy,
    /Legacy scoring implementation — compatibility\/reference only/,
  );
  assert.match(
    legacy,
    /It is NOT the authoritative production scoring engine/,
  );
});
