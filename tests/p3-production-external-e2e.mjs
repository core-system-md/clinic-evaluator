import crypto from "node:crypto";
import { writeFileSync } from "node:fs";

const EDGE_URL = process.env.EDGE_URL;
const ASSESSMENT_SLUG = process.env.ASSESSMENT_SLUG;
const result = {
  started_at: new Date().toISOString(),
  endpoint: EDGE_URL,
  assessment_slug: ASSESSMENT_SLUG,
  checks: [],
};

function record(name, ok, details = {}) {
  if (!ok) throw new Error(name);
  result.checks.push({ name, ok, ...details });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}`);
}

async function call(action, data = {}) {
  const response = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: response.status, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(EDGE_URL, "EDGE_URL is missing");
  assert(ASSESSMENT_SLUG, "ASSESSMENT_SLUG is missing");

  const contentResponse = await call("get_content", {
    assessment_key: ASSESSMENT_SLUG,
  });
  assert(
    contentResponse.status === 200 && contentResponse.body?.success === true,
    `get_content failed: HTTP ${contentResponse.status}`,
  );
  const assessment = contentResponse.body.data;
  assert(assessment.slug === ASSESSMENT_SLUG, "Family slug mismatch");
  assert(Array.isArray(assessment.questions) && assessment.questions.length > 0, "No questions");
  assert(Array.isArray(assessment.axes) && assessment.axes.length > 0, "No axes");
  record("live published content", true, {
    question_count: assessment.questions.length,
    axis_count: assessment.axes.length,
    version: assessment.version,
  });

  const accessResponse = await call("issue_public_access", {
    assessment_key: ASSESSMENT_SLUG,
  });
  assert(
    accessResponse.status === 200 && accessResponse.body?.success === true,
    `issue_public_access failed: HTTP ${accessResponse.status}`,
  );
  const token = accessResponse.body?.data?.token;
  const assessmentTypeId = accessResponse.body?.data?.assessment_type_id;
  assert(typeof token === "string" && token.length >= 20, "Invalid access token");
  assert(typeof assessmentTypeId === "string" && assessmentTypeId.length > 10, "Invalid assessment type id");
  record("public access issuance", true, { assessment_type_id: assessmentTypeId });

  const suffix = crypto.randomBytes(8).toString("hex");
  const startResponse = await call("start_session", {
    token,
    lead: {
      full_name: `P3 Gate 3 E2E ${ASSESSMENT_SLUG} ${suffix}`,
      email: `p3-gate3-${ASSESSMENT_SLUG}-${suffix}@example.invalid`,
      source: "p3-gate3-e2e",
    },
  });
  assert(
    startResponse.status === 200 && startResponse.body?.success === true,
    `start_session failed: HTTP ${startResponse.status}`,
  );
  const sessionId = startResponse.body?.data?.session_id;
  assert(typeof sessionId === "string" && sessionId.length > 10, "No session id");
  record("start_session", true, { session_id: sessionId });

  for (let i = 0; i < assessment.questions.length; i += 1) {
    const question = assessment.questions[i];
    assert(Array.isArray(question.options) && question.options.length > 0, `Question ${question.id} has no options`);
    const option = question.options[0];
    const answer = await call("save_answer", {
      token,
      question_id: question.id,
      option_index: Number(option.index),
      current_question: i + 1,
    });
    assert(
      answer.status === 200 && answer.body?.success === true,
      `save_answer failed for ${question.id}: HTTP ${answer.status}`,
    );
  }
  record("all required answers saved", true, { answered_questions: assessment.questions.length });

  const completion = await call("complete", { token });
  assert(
    completion.status === 200 && completion.body?.success === true,
    `complete failed: HTTP ${completion.status} ${JSON.stringify(completion.body)}`,
  );
  const data = completion.body.data;
  assert(data?.already_completed === false, "First completion was not marked fresh");
  assert(data?.structuredResult?.schemaVersion === "P3_STRUCTURED_RESULT_V1", "Missing Structured Result");
  assert(data?.structuredResult?.status === "PRODUCTION", "Structured Result is not production");
  assert(data?.structuredResult?.provenance?.engineIdentity === "P3_INTEGRATED_SCORER_V1", "Wrong P3 engine identity");
  assert(data?.structuredResult?.provenance?.scoringEngineVersion === "P3_SCORER_V1", "Wrong scoring engine version");
  assert(data?.structuredResult?.provenance?.interpretationVersion === "1", "Wrong interpretation version");
  assert(typeof data?.structuredResult?.provenance?.assessmentConfigDigest === "string" && data.structuredResult.provenance.assessmentConfigDigest.length === 64, "Missing config digest");
  assert(Array.isArray(data?.structuredResult?.inputs?.responses), "Missing response lineage");
  assert(data.structuredResult.inputs.responses.length > 0, "No interpreted responses persisted");
  record("production completion + Structured Result", true, {
    overall_score: data.overallScore,
    interpretation_version: data.structuredResult.provenance.interpretationVersion,
    result_id: data.structuredResult.identity.resultId,
    response_count: data.structuredResult.inputs.responses.length,
  });

  const retry = await call("complete", { token });
  assert(
    retry.status === 200 && retry.body?.success === true,
    `idempotent complete retry failed: HTTP ${retry.status}`,
  );
  assert(retry.body?.data?.already_completed === true, "Retry was not idempotent");
  assert(
    retry.body?.data?.structuredResult?.identity?.resultId === data.structuredResult.identity.resultId,
    "Retry returned a different result identity",
  );
  record("idempotent completion retry", true, {
    same_result_id: true,
  });

  const bad = await call("get_session", { token: "invalid-p3-gate3-token" });
  assert(bad.status === 401, `Invalid token returned HTTP ${bad.status}`);
  record("invalid token rejected", true, { http_status: bad.status });

  result.finished_at = new Date().toISOString();
  result.success = true;
}

main()
  .catch((error) => {
    result.finished_at = new Date().toISOString();
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
  })
  .finally(() => {
    writeFileSync("p3-production-e2e-result.json", JSON.stringify(result, null, 2));
  });
