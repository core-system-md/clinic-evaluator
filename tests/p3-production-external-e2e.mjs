import crypto from "node:crypto";

// P4 live verification: resume, concurrency, retry and post-completion immutability.
import { writeFileSync } from "node:fs";

const EDGE_URL = process.env.EDGE_URL;
const LIVE_PROJECT_MARKER = "oaqpzaarppccbnepffxx";

function assertLiveE2EOptIn() {
  if (String(EDGE_URL || "").includes(LIVE_PROJECT_MARKER) && process.env.ALLOW_LIVE_E2E !== "true") {
    throw new Error("Refusing to write E2E test data to production without ALLOW_LIVE_E2E=true.");
  }
}
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
  assertLiveE2EOptIn();

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
  const attemptKey = `p4-e2e-${ASSESSMENT_SLUG}-${suffix}`;

  const secondAccessResponse = await call("issue_public_access", {
    assessment_key: ASSESSMENT_SLUG,
  });
  assert(secondAccessResponse.status === 200 && secondAccessResponse.body?.success === true, "Second public access issuance failed");
  const secondToken = secondAccessResponse.body?.data?.token;
  assert(typeof secondToken === "string" && secondToken.length >= 20, "Invalid second access token");

  const [startA, startB] = await Promise.all([
    call("start_session", {
      token,
      attempt_key: attemptKey,
      lead: {
        full_name: `P4 Concurrent Start A ${ASSESSMENT_SLUG} ${suffix}`,
        email: `p4-start-a-${ASSESSMENT_SLUG}-${suffix}@example.invalid`,
        source: "p4-concurrent-start-e2e",
      },
    }),
    call("start_session", {
      token: secondToken,
      attempt_key: attemptKey,
      lead: {
        full_name: `P4 Concurrent Start B ${ASSESSMENT_SLUG} ${suffix}`,
        email: `p4-start-b-${ASSESSMENT_SLUG}-${suffix}@example.invalid`,
        source: "p4-concurrent-start-e2e",
      },
    }),
  ]);

  assert(startA.status === 200 && startA.body?.success === true, `concurrent start A failed: HTTP ${startA.status} ${JSON.stringify(startA.body)}`);
  assert(startB.status === 200 && startB.body?.success === true, `concurrent start B failed: HTTP ${startB.status} ${JSON.stringify(startB.body)}`);

  const sessionIdA = startA.body?.data?.session_id;
  const sessionIdB = startB.body?.data?.session_id;
  assert(typeof sessionIdA === "string" && sessionIdA.length > 10, "Concurrent start A missing session id");
  assert(sessionIdA === sessionIdB, "Concurrent starts created two active sessions");
  const sessionId = sessionIdA;
  record("concurrent active-attempt creation collapse", true, { same_session_id: true });

  record("start_session", true, { session_id: sessionId });

  const thirdAccessResponse = await call("issue_public_access", {
    assessment_key: ASSESSMENT_SLUG,
  });
  assert(thirdAccessResponse.status === 200 && thirdAccessResponse.body?.success === true, "Third public access issuance failed");
  const thirdToken = thirdAccessResponse.body?.data?.token;
  assert(typeof thirdToken === "string" && thirdToken.length >= 20, "Invalid third access token");

  const resumeResponse = await call("start_session", {
    token: thirdToken,
    attempt_key: attemptKey,
    lead: {
      full_name: `P4 Resume Probe ${ASSESSMENT_SLUG} ${suffix}`,
      email: `p4-resume-${ASSESSMENT_SLUG}-${suffix}@example.invalid`,
      source: "p4-resume-e2e",
    },
  });
  assert(
    resumeResponse.status === 200 && resumeResponse.body?.success === true,
    `multi-tab resume failed: HTTP ${resumeResponse.status} ${JSON.stringify(resumeResponse.body)}`,
  );
  assert(resumeResponse.body?.data?.session_id === sessionId, "Second tab did not resolve to the same active session");
  record("multi-tab active-attempt resume", true, { same_session_id: true });

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

  const frozenEconomicInput = {
    averageVisitValue: 250,
    relationshipYears: 5,
    referralPercentage: 20,
  };

  const [completionA, completionB] = await Promise.all([
    call("complete", { token, economic_input: frozenEconomicInput }),
    call("complete", { token: secondToken, economic_input: frozenEconomicInput }),
  ]);

  const completedResponses = [completionA, completionB];
  assert(
    completedResponses.every((item) => item.status === 200 && item.body?.success === true),
    `concurrent complete failed: ${completedResponses.map((item) => `HTTP ${item.status} ${JSON.stringify(item.body)}`).join(" | ")}`,
  );

  const fresh = completedResponses.find((item) => item.body?.data?.already_completed === false);
  const replay = completedResponses.find((item) => item.body?.data?.already_completed === true);
  assert(fresh && replay, "Concurrent completion did not collapse to exactly one fresh result");
  const data = fresh.body.data;
  assert(data?.already_completed === false, "Fresh completion was not marked fresh");
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

  const retry = await call("complete", {
    token,
    economic_input: {
      averageVisitValue: 9999,
      relationshipYears: 99,
      referralPercentage: 99,
    },
  });
  assert(
    retry.status === 200 && retry.body?.success === true,
    `idempotent complete retry failed: HTTP ${retry.status}`,
  );
  assert(retry.body?.data?.already_completed === true, "Retry was not idempotent");
  assert(
    retry.body?.data?.structuredResult?.identity?.resultId === data.structuredResult.identity.resultId,
    "Retry returned a different result identity",
  );
  assert(
    JSON.stringify(retry.body?.data?.structuredResult) === JSON.stringify(data.structuredResult),
    "Retry returned a different Structured Result after changing economic input",
  );
  record("idempotent completion retry", true, {
    same_result_id: true,
  });

  const completedSession = await call("get_session", { token });
  assert(completedSession.status === 200 && completedSession.body?.success === true, "Completed session reload failed");
  assert(completedSession.body?.data?.session?.status === "completed", "Completed session state not returned");
  assert(completedSession.body?.data?.result?.result?.schemaVersion === "P3_STRUCTURED_RESULT_V1", "Completed stored result was not returned");
  record("completed result survives session reopen", true, { result_returned: true });

  const lateAnswer = await call("save_answer", {
    token,
    question_id: assessment.questions[0].id,
    option_index: Number(assessment.questions[0].options[0].index),
    current_question: 1,
  });
  assert(lateAnswer.status === 409, `late answer was accepted with HTTP ${lateAnswer.status}`);
  record("completed session rejects late answer", true, { http_status: lateAnswer.status });

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
