import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import reportTexts from "../assets/data/report_texts.json" with { type: "json" };
import catalog from "../documentation/governance/REPORT-TEXT-LINKAGE-CATALOG-V1-2026-10-07.json" with { type: "json" };

const app = fs.readFileSync("assets/js/app.js", "utf8");
const reportJson = JSON.stringify(reportTexts);

test("report text catalog covers semantic report sources", () => {
  assert.equal(catalog.governingContract, "FINAL-IMPLEMENTATION-CONTRACT-2026-10-07");
  assert.ok(catalog.semanticEntries.length >= 20);
  assert.ok(catalog.semanticEntries.some((e) => e.path === "ui.simulator.report_priority"));
});

test("report text no longer contains prohibited Leakage/Trap/monthly semantics", () => {
  for (const term of [
    "Leakage",
    "leakage",
    "Trap",
    "trap",
    "فخاخ",
    "شهري",
    "Revenue Gap",
    "الفرص الضائعة",
    "تحسين 20%",
    "تحسين 50%",
    "الفاقد التشغيلي",
  ]) {
    assert.equal(reportJson.includes(term), false, `forbidden semantic term remains: ${term}`);
  }
});

test("economic copy uses annual visits and referral scenarios", () => {
  assert.match(reportTexts.ui.simulator.how_it_works_steps.join(" "), /سنوي/);
  assert.match(reportTexts.ui.simulator.fields.visits_label, /سنوي/);
  assert.equal(reportTexts.ui.simulator.report_priority.includes("أدنى محور مقاس"), true);
  assert.equal(reportTexts.ui.simulator.report_current_ev.includes("/سنة"), false);
});

test("browser renderer consumes validated report projection and does not rescore", () => {
  assert.match(app, /const report = res?.report/);
  assert.match(app, /const structured = res?.structuredResult/);
  assert.match(app, /this.renderVisualBenchmark(report, structured.scores?.axes || [])/);
  for (const forbidden of [
    "100 - res.overallScore",
    "leakage-index",
    "res.overallScore - this.previousSessionData.overallScore",
    "renderAxisComparison(res.axisScores)",
    "score >= 75 ? 'q4'",
    "score >= 50 ? 'q3'",
    "score >= 25 ? 'q2'",
  ]) {
    assert.equal(app.includes(forbidden), false, `obsolete renderer logic remains: ${forbidden}`);
  }
});

console.log("WP-07 report text/model linkage: semantic audit invariants verified.");
