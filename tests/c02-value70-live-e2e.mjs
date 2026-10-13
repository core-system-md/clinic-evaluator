import crypto from "node:crypto";
import { writeFileSync } from "node:fs";

const EDGE_URL = process.env.EDGE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SLUG = "comprehensive-clinic-assessment";
const PROJECT = "oaqpzaarppccbnepffxx";
const RUN_ID = "c02-value70-" + Date.now() + "-" + crypto.randomBytes(6).toString("hex");
const evidence = { run_id: RUN_ID, started_at: new Date().toISOString(), assessment_slug: SLUG, checks: [], created: { tokenHashes: [], leadIds: [], sessionIds: [], email: null }, cleanup: { attempted: false, verified: false } };

function assert(ok, message) { if (!ok) throw new Error(message); }
function record(name, details = {}) { evidence.checks.push({ name, passed: true, ...details }); console.log("[PASS] " + name); }
async function edge(action, data = {}) {
  const response = await fetch(EDGE_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, data }) });
  const raw = await response.text(); let body;
  try { body = JSON.parse(raw); } catch { body = { raw }; }
  return { status: response.status, body };
}
function headers(extra = {}) { return { apikey: SERVICE_ROLE_KEY, authorization: "Bearer " + SERVICE_ROLE_KEY, "content-type": "application/json", ...extra }; }
async function rest(table, query, init = {}) {
  const url = SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/" + table + "?" + query;
  const h = headers({ ...(init.headers || {}), ...(init.method === "DELETE" ? { Prefer: "return=representation" } : {}) });
  const response = await fetch(url, { ...init, headers: h });
  const raw = await response.text(); let body;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = { raw }; }
  if (!response.ok) throw new Error("REST " + (init.method || "GET") + " " + table + " failed (" + response.status + "): " + raw.slice(0, 400));
  return body;
}
function inFilter(values) { return "in.(" + values.map((v) => '"' + String(v).replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"').join(",") + ")"; }

async function cleanup() {
  evidence.cleanup.attempted = true;
  const hashes = [...new Set(evidence.created.tokenHashes)];
  const sessionIds = [...new Set(evidence.created.sessionIds)];
  const leadIds = [...new Set(evidence.created.leadIds)];
  for (const hash of hashes) await rest("assessment_session_access", "token_hash=eq." + encodeURIComponent(hash), { method: "DELETE" });
  if (evidence.created.email) {
    const rows = await rest("leads", "select=id,email&email=eq." + encodeURIComponent(evidence.created.email));
    for (const row of rows || []) if (row.id) leadIds.push(row.id);
  }
  for (const id of [...new Set(leadIds)]) await rest("leads", "id=eq." + encodeURIComponent(id), { method: "DELETE" });
  for (const id of sessionIds) {
    await rest("assessment_results", "session_id=eq." + encodeURIComponent(id), { method: "DELETE" });
    await rest("scores", "session_id=eq." + encodeURIComponent(id), { method: "DELETE" });
    await rest("answers", "session_id=eq." + encodeURIComponent(id), { method: "DELETE" });
    await rest("sessions", "id=eq." + encodeURIComponent(id), { method: "DELETE" });
  }
  const rem = {};
  rem.access_rows = (await Promise.all(hashes.map((h) => rest("assessment_session_access", "select=id&token_hash=eq." + encodeURIComponent(h))))).flat().length;
  rem.tagged_leads = evidence.created.email ? (await rest("leads", "select=id&email=eq." + encodeURIComponent(evidence.created.email))).length : 0;
  rem.sessions = sessionIds.length ? (await rest("sessions", "select=id&id=" + inFilter(sessionIds))).length : 0;
  rem.answers = sessionIds.length ? (await rest("answers", "select=id&session_id=" + inFilter(sessionIds))).length : 0;
  rem.assessment_results = sessionIds.length ? (await rest("assessment_results", "select=id&session_id=" + inFilter(sessionIds))).length : 0;
  rem.scores = sessionIds.length ? (await rest("scores", "select=id&session_id=" + inFilter(sessionIds))).length : 0;
  evidence.cleanup.remaining = rem;
  evidence.cleanup.verified = Object.values(rem).every((n) => n === 0);
  assert(evidence.cleanup.verified, "Cleanup residue: " + JSON.stringify(rem));
  record("run-scoped cleanup verified", rem);
}

async function main() {
  assert(EDGE_URL && SUPABASE_URL && SERVICE_ROLE_KEY, "EDGE_URL, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  assert(process.env.ALLOW_LIVE_E2E === "true", "Live Production writes require ALLOW_LIVE_E2E=true");
  assert(EDGE_URL.includes(PROJECT) && SUPABASE_URL.includes(PROJECT), "Refusing unexpected Supabase project");
  const contentResponse = await edge("get_content", { assessment_key: SLUG });
  assert(contentResponse.status === 200 && contentResponse.body?.success, "get_content failed: " + contentResponse.status);
  const content = contentResponse.body.data;
  assert(content.slug === SLUG && Array.isArray(content.questions) && content.questions.length > 0, "Published content unavailable");
  assert(content.requires_login === false, "Assessment requires login; refusing public path");
  const accessResponse = await edge("issue_public_access", { assessment_key: SLUG });
  assert(accessResponse.status === 200 && accessResponse.body?.success, "issue_public_access failed");
  const token = accessResponse.body.data.token;
  const assessmentTypeId = accessResponse.body.data.assessment_type_id;
  assert(typeof token === "string" && token.length >= 20 && typeof assessmentTypeId === "string", "Invalid public access response");
  evidence.created.tokenHashes.push(crypto.createHash("sha256").update(token).digest("hex"));
  record("published final V1 and access acquired", { version: content.version, questions: content.questions.length });

  const dbQuestions = await rest("questions", "select=id,code,assessment_type_id&assessment_type_id=eq." + encodeURIComponent(assessmentTypeId));
  const questionByCode = new Map((dbQuestions || []).map((q) => [q.code, q]));
  assert(questionByCode.size === content.questions.length, "Published question set does not match DB question set");
  const questionIds = [...questionByCode.values()].map((q) => q.id);
  const dbOptions = await rest("options", "select=id,question_id,option_index,option_value&question_id=" + inFilter(questionIds));
  const byQuestion = new Map();
  for (const o of dbOptions || []) { const list = byQuestion.get(o.question_id) || []; list.push(o); byQuestion.set(o.question_id, list); }
  const selected = content.questions.map((q, i) => {
    const dbq = questionByCode.get(q.id);
    assert(dbq, "Missing DB question for code " + q.id);
    const candidates = (byQuestion.get(dbq.id) || []).filter((o) => Number(o.option_value) === 70);
    assert(candidates.length === 1, "Expected one value-70 option for " + q.id + ", found " + candidates.length);
    assert((q.options || []).some((o) => Number(o.index) === Number(candidates[0].option_index)), "Value-70 index absent from published content: " + q.id);
    return { code: q.id, optionIndex: Number(candidates[0].option_index), currentQuestion: i + 1 };
  });
  record("published value-70 option map verified", { value_70_questions: selected.length });

  const suffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
  const email = RUN_ID + "-" + suffix + "@example.invalid";
  evidence.created.email = email;
  const start = await edge("start_session", { token, attempt_key: RUN_ID + "-" + suffix, lead: { full_name: "C02 value70 E2E " + suffix, email, source: RUN_ID } });
  assert(start.status === 200 && start.body?.success, "start_session failed: " + start.status + " " + JSON.stringify(start.body));
  const sessionId = start.body.data.session_id;
  if (typeof start.body.data.lead_id === "string") evidence.created.leadIds.push(start.body.data.lead_id);
  assert(typeof sessionId === "string" && sessionId.length > 10, "Missing session ID");
  evidence.created.sessionIds.push(sessionId);
  record("tagged synthetic session created", { session_id: sessionId });

  for (const item of selected) {
    const saved = await edge("save_answer", { token, question_id: item.code, option_index: item.optionIndex, current_question: item.currentQuestion });
    assert(saved.status === 200 && saved.body?.success, "save_answer failed for " + item.code + ": " + saved.status + " " + JSON.stringify(saved.body));
  }
  record("Production answer-save path accepted all value-70 answers", { answers: selected.length });

  const completed = await edge("complete", { token, economic_input: { averageVisitValue: 250, relationshipYears: 5, referralPercentage: 20 } });
  assert(completed.status === 200 && completed.body?.success, "complete failed: " + completed.status + " " + JSON.stringify(completed.body));
  assert(completed.body.data.session_id === sessionId, "Completion session mismatch");
  assert(Number(completed.body.data.provenance?.interpretationVersion) === 2, "Completion did not use interpretation V2");
  assert(Number.isFinite(Number(completed.body.data.overallScore)), "Completion overall score is not numeric");

  const answers = await rest("answers", "select=id,session_id,question_id,option_index,option_value&session_id=eq." + encodeURIComponent(sessionId));
  assert(answers.length === selected.length && answers.every((a) => Number(a.option_value) === 70), "Persisted answers do not all contain value 70");
  const rows = await rest("assessment_results", "select=id,session_id,result,assessment_version,interpretation_version,scoring_engine_version&session_id=eq." + encodeURIComponent(sessionId));
  assert(rows.length === 1, "Expected one persisted Structured Result, found " + rows.length);
  const row = rows[0], result = row.result;
  assert(Number(row.interpretation_version) === 2 && Number(result?.provenance?.interpretationVersion) === 2, "Persisted result is not interpretation V2");
  assert(result?.schemaVersion === "P3_STRUCTURED_RESULT_V1" && result?.status === "PRODUCTION", "Persisted result is not production Structured Result");
  assert(Array.isArray(result?.inputs?.responses), "Missing persisted response lineage");
  const responses70 = result.inputs.responses.filter((x) => Number(x.sourceOptionValue) === 70 && Number(x.anchorScore) === 70 && x.scoreEligible === true);
  assert(responses70.length === selected.length, "Expected " + selected.length + " interpreted 70 anchors, got " + responses70.length);
  assert(Array.isArray(result?.scores?.axes) && result.scores.axes.length > 0, "No persisted axis scores");
  assert(result.scores.axes.some((x) => Number(x.percentage ?? x.score) === 70), "No axis score equals the value-70 anchor");
  assert(Number.isFinite(Number(result?.scores?.overallScore)), "Persisted overall score is not numeric");
  record("persisted value-70 anchors and Structured Result verified", { answers: answers.length, interpreted_70_anchors: responses70.length, axes: result.scores.axes.map((x) => ({ axisCode: x.axisCode, score: x.percentage ?? x.score })), overall_score: result.scores.overallScore, result_id: row.id });
}

try {
  await main();
} catch (error) {
  evidence.success = false;
  evidence.error = error instanceof Error ? error.message : String(error);
  console.error(evidence.error);
} finally {
  try { await cleanup(); }
  catch (error) { evidence.cleanup.error = error instanceof Error ? error.message : String(error); evidence.cleanup.verified = false; console.error("CLEANUP FAILURE: " + evidence.cleanup.error); }
  evidence.finished_at = new Date().toISOString();
  evidence.success = evidence.success !== false && evidence.cleanup.verified === true;
  writeFileSync("c02-value70-live-e2e-result.json", JSON.stringify(evidence, null, 2));
}
if (!evidence.success) process.exit(1);
console.log("C-02 Production value-70 E2E passed; cleanup verified.");
