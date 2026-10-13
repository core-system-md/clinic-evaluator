import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const EDGE_URL = process.env.EDGE_URL;
const PROJECT = "oaqpzaarppccbnepffxx";
const SLUGS = ["comprehensive-clinic-assessment", "patient-journey"];
const REGISTRY = JSON.parse(readFileSync("supabase/functions/assessment-access/response-interpretation-registry-v2.json", "utf8"));
const RUN_ID = "c02-value70-" + Date.now() + "-" + crypto.randomBytes(6).toString("hex");
const evidence = {
  run_id: RUN_ID,
  started_at: new Date().toISOString(),
  project: PROJECT,
  e2e_success: false,
  cases: [],
  created: { tokenHashes: [], leadIds: [], sessionIds: [], emails: [] },
  cleanup: { status: "PENDING_AGENT_SQL_CLEANUP", verified: false, note: "Cleanup is performed and verified by the connected Supabase SQL operator after evidence review; no service-role key is required in GitHub Actions." }
};

function assert(ok, message) { if (!ok) throw new Error(message); }
function record(testCase, name, details = {}) {
  testCase.checks.push({ name, passed: true, ...details });
  console.log("[PASS] " + testCase.slug + ": " + name);
}
async function edge(action, data = {}) {
  const response = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, data })
  });
  const raw = await response.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = { raw }; }
  return { status: response.status, body };
}

async function runAssessment(slug) {
  const testCase = { slug, checks: [], created: { tokenHash: null, leadId: null, sessionId: null, email: null } };
  evidence.cases.push(testCase);

  const contentResponse = await edge("get_content", { assessment_key: slug });
  assert(contentResponse.status === 200 && contentResponse.body?.success, "get_content failed: " + contentResponse.status + " " + JSON.stringify(contentResponse.body));
  const content = contentResponse.body.data;
  assert(content.slug === slug && Number(content.version) === 1 && Array.isArray(content.questions) && content.questions.length > 0, "Published final V1 content unavailable for " + slug);
  assert(content.requires_login === false, "Assessment requires login; refusing public path");

  const candidates = REGISTRY.entries.filter((entry) =>
    entry.assessmentSlug === slug &&
    Number(entry.interpretationVersion) === 2 &&
    Number(entry.sourceOptionValue) === 70 &&
    Number(entry.anchorScore) === 70 &&
    entry.scoreEligible === true
  );
  const byCode = new Map();
  for (const entry of candidates) {
    const items = byCode.get(entry.questionCode) || [];
    items.push(entry);
    byCode.set(entry.questionCode, items);
  }
  const selected = content.questions.map((question, i) => {
    const entries = byCode.get(question.id) || [];
    assert(entries.length === 1, "Expected one eligible V2 value-70 registry entry for " + slug + "/" + question.id + "; found " + entries.length);
    const entry = entries[0];
    assert((question.options || []).some((option) => Number(option.index) === Number(entry.optionIndex)), "Registry value-70 option index absent from published content: " + question.id);
    return { code: question.id, optionIndex: Number(entry.optionIndex), currentQuestion: i + 1, semanticStateKey: entry.semanticStateKey };
  });
  assert(selected.length === content.questions.length, "Published question set is incomplete");
  record(testCase, "published V1 content matches V2 registry value-70 anchors", { version: content.version, questions: selected.length });

  const suffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
  const email = RUN_ID + "-" + slug + "-" + suffix + "@example.invalid";
  testCase.created.email = email;
  evidence.created.emails.push(email);

  const access = await edge("issue_public_access", { assessment_key: slug });
  assert(access.status === 200 && access.body?.success, "issue_public_access failed: " + access.status + " " + JSON.stringify(access.body));
  const token = access.body.data.token;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  testCase.created.tokenHash = tokenHash;
  evidence.created.tokenHashes.push(tokenHash);
  assert(typeof token === "string" && token.length >= 20 && typeof access.body.data.assessment_type_id === "string", "Invalid public access response");

  const start = await edge("start_session", {
    token,
    attempt_key: RUN_ID + "-" + slug + "-" + suffix,
    lead: { full_name: "C02 value70 E2E " + slug + " " + suffix, email, source: RUN_ID }
  });
  assert(start.status === 200 && start.body?.success, "start_session failed: " + start.status + " " + JSON.stringify(start.body));
  const sessionId = start.body.data.session_id;
  const leadId = start.body.data.lead_id || null;
  testCase.created.sessionId = sessionId;
  testCase.created.leadId = leadId;
  evidence.created.sessionIds.push(sessionId);
  if (leadId) evidence.created.leadIds.push(leadId);
  assert(typeof sessionId === "string" && sessionId.length > 10, "Missing session ID");
  record(testCase, "synthetic session created", { session_id: sessionId, lead_id: leadId });

  for (const item of selected) {
    const saved = await edge("save_answer", { token, question_id: item.code, option_index: item.optionIndex, current_question: item.currentQuestion });
    assert(saved.status === 200 && saved.body?.success, "save_answer failed for " + item.code + ": " + saved.status + " " + JSON.stringify(saved.body));
  }
  record(testCase, "Production answer-save path accepted every value-70 answer", { answers: selected.length });

  const completed = await edge("complete", { token, economic_input: { averageVisitValue: 250, relationshipYears: 5, referralPercentage: 20 } });
  assert(completed.status === 200 && completed.body?.success, "complete failed: " + completed.status + " " + JSON.stringify(completed.body));
  assert(completed.body.data.session_id === sessionId, "Completion session mismatch");
  assert(Number(completed.body.data.provenance?.interpretationVersion) === 2, "Completion did not use interpretation V2");
  assert(Number.isFinite(Number(completed.body.data.overallScore)), "Completion overall score is not numeric");
  record(testCase, "Production completion returned interpretation V2 and numeric overall score", {
    interpretation_version: completed.body.data.provenance.interpretationVersion,
    overall_score: completed.body.data.overallScore
  });
  testCase.expected = { answerCount: selected.length, responses: selected };
  testCase.e2e_success = true;
  return testCase;
}

try {
  assert(EDGE_URL && EDGE_URL.includes(PROJECT), "Refusing missing or unexpected Production Edge URL");
  assert(process.env.ALLOW_LIVE_E2E === "true", "Live Production writes require ALLOW_LIVE_E2E=true");
  assert(REGISTRY.schemaVersion === "P3_RESPONSE_INTERPRETATION_REGISTRY_V2", "Unexpected registry schema");
  for (const slug of SLUGS) await runAssessment(slug);
  evidence.e2e_success = evidence.cases.length === SLUGS.length && evidence.cases.every((item) => item.e2e_success === true);
} catch (error) {
  evidence.e2e_success = false;
  evidence.error = error instanceof Error ? error.message : String(error);
  console.error("C-02 LIVE E2E ERROR: " + evidence.error);
} finally {
  evidence.finished_at = new Date().toISOString();
  evidence.success = evidence.e2e_success;
  writeFileSync("c02-value70-live-e2e-result.json", JSON.stringify(evidence, null, 2));
  console.log("C02_EVIDENCE_JSON=" + JSON.stringify(evidence));
}
if (!evidence.e2e_success) process.exit(1);
console.log("C-02 live value-70 E2E completed for both published final V1 families. Run-scoped SQL verification and cleanup remain pending agent action.");
