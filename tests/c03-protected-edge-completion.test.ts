import { createAssessmentAccessHandler } from "../supabase/functions/assessment-access/index.ts";

const sessionId = "session-c03-protected-retry";
const userId = "user-c03-protected";
const typeId = "type-c03-protected";
const familyId = "family-c03-protected";

const persistedResult = {
  schemaVersion: "P3_STRUCTURED_RESULT_V1",
  status: "PRODUCTION",
  identity: {
    sessionId,
    assessmentFamilyId: familyId,
    assessmentTypeId: typeId,
    assessmentVersion: "1",
    resultId: "00000000-0000-4000-8000-000000000001",
  },
  provenance: {
    scoringEngineVersion: "MD_CODE_ASSESSMENT_ENGINE",
    scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
    assessmentConfigDigest: "c03-test-digest",
  },
  scores: {
    overallScore: 70,
    axes: ["A1", "A2", "A3"].map((axisCode, index) => ({
      axisCode,
      axisNameAr: "محور " + (index + 1),
      axisNameEn: "Axis " + (index + 1),
      score: 70,
      percentage: 70,
      status: "measured",
    })),
  },
  classification: { bandCode: "Q3" },
  kpis: [],
  economics: { status: "NOT_COMPUTED", output: null },
};

const accessRow = {
  id: "access-c03-protected",
  session_id: sessionId,
  assessment_user_id: userId,
  assessment_type_id: typeId,
  expires_at: "2999-01-01T00:00:00.000Z",
  revoked_at: null,
};

const sessionRow = {
  id: sessionId,
  lead_id: "lead-c03-protected",
  assessment_type_id: typeId,
  assessment_user_id: userId,
  assessment_version: 1,
  status: "completed",
};

const leadRow = {
  id: sessionRow.lead_id,
  full_name: "Protected Test",
  email: "protected-test@example.invalid",
  phone: null,
};

const resultRow = {
  id: persistedResult.identity.resultId,
  result: persistedResult,
  assessment_version: 1,
  interpretation_version: 1,
  scoring_engine_version: "MD_CODE_ASSESSMENT_ENGINE",
  scoring_contract_version: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
  assessment_config_digest: "c03-test-digest",
  calculated_at: "2026-10-15T00:00:00.000Z",
  result_status: "PRODUCTION",
};

function rowFor(table: string, filters: Array<[string, unknown]>, mode = "completed") {
  if (table === "assessment_session_access") return accessRow;
  if (table === "sessions") {
    if (filters.some(([key, value]) => key === "lead_id" && value === leadRow.id)) return null;
    return { ...sessionRow, status: mode === "first-completion" ? "in_progress" : "completed" };
  }
  if (table === "leads") {
    if (filters.some(([key, value]) => key === "completed" && value === true)) return [];
    return leadRow;
  }
  if (table === "assessment_results") return resultRow;
  if (table === "assessment_families") return { id: familyId, slug: "clinic-performance" };
  return [];
}

function fakeClient(mode = "completed", rpcCalls: Array<{ name: string; payload: any }> = []) {
  return {
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      const query: any = {
        select() { return query; },
        eq(key: string, value: unknown) { filters.push([key, value]); return query; },
        neq(key: string, value: unknown) { filters.push(["neq:" + key, value]); return query; },
        is(key: string, value: unknown) { filters.push(["is:" + key, value]); return query; },
        gt(key: string, value: unknown) { filters.push(["gt:" + key, value]); return query; },
        order() { return query; },
        limit() { return query; },
        maybeSingle() { return Promise.resolve({ data: rowFor(table, filters, mode), error: null }); },
        single() { return Promise.resolve({ data: rowFor(table, filters, mode), error: null }); },
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve({ data: rowFor(table, filters, mode), error: null }).then(resolve, reject);
        },
      };
      return query;
    },
    async rpc(name: string, payload: any) {
      rpcCalls.push({ name, payload });
      if (mode === "completed") {
        throw new Error("A completed protected retry must not recalculate or call a completion RPC.");
      }
      if (name === "prepare_assessment_submission") {
        return {
          data: {
            success: true,
            already_completed: false,
            submission_snapshot: [],
            submission_fingerprint: "fixture-submission-fingerprint",
            submission_economic_input: {},
          },
          error: null,
        };
      }
      if (name === "complete_p4_assessment_from_result") {
        return { data: { success: true, already_completed: false, result: payload.p_result }, error: null };
      }
      throw new Error("Unexpected RPC in protected completion test: " + name);
    },
  };
}

Deno.test("actual protected complete handler recovers family slug for a persisted result missing assessmentSlug", async () => {
  const handler = createAssessmentAccessHandler(fakeClient());
  const response = await handler(new Request("https://local.test/assessment-access", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ action: "complete", data: { token: "protected-token-fixture" } }),
  }));

  const body = await response.json();
  if (response.status !== 200) {
    throw new Error("Expected 200 from protected completed retry; got " + response.status + ": " + JSON.stringify(body));
  }
  if (body?.data?.already_completed !== true) throw new Error("Protected retry was not marked already_completed.");
  if (body?.data?.userReport?.audience !== "user") throw new Error("Persisted report was not projected for the user audience.");
  if (body?.data?.userReport?.assessment?.familyId !== familyId) throw new Error("Persisted report lost the assessment-family identity.");
  if (persistedResult.provenance.assessmentSlug !== undefined) {
    throw new Error("The fixture must remain an unmodified persisted payload without assessmentSlug.");
  }
});


Deno.test("actual protected complete handler uses protected RPC and identity on first completion", async () => {
  const rpcCalls: Array<{ name: string; payload: any }> = [];
  const handler = createAssessmentAccessHandler(fakeClient("first-completion", rpcCalls), {
    calculateAssessmentFn: async () => ({
      result: {
        ...structuredClone(persistedResult),
        resolvedSelections: [{ questionCode: "Q1" }],
        axisPersistenceRows: [{ axisCode: "A1" }],
      },
      provenance: {
        assessmentSlug: "clinic-performance",
        assessmentVersion: 1,
        interpretationVersion: 1,
        scoringEngineVersion: "MD_CODE_ASSESSMENT_ENGINE",
        scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
        assessmentConfigDigest: "c03-test-digest",
      },
    }),
  });

  const response = await handler(new Request("https://local.test/assessment-access", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.2" },
    body: JSON.stringify({ action: "complete", data: { token: "protected-token-first-completion" } }),
  }));
  const body = await response.json();
  if (response.status !== 200) {
    throw new Error("Expected 200 from protected completion; got " + response.status + ": " + JSON.stringify(body));
  }
  if (rpcCalls.map(call => call.name).join(",") !== "prepare_assessment_submission,complete_p4_assessment_from_result") {
    throw new Error("Protected completion RPC order was incorrect: " + rpcCalls.map(call => call.name).join(","));
  }
  const completionPayload = rpcCalls[1].payload;
  if (completionPayload.p_assessment_user_id !== userId) throw new Error("Protected assessment user identity was not forwarded.");
  if (completionPayload.p_access_token_hash == null) throw new Error("Protected access-token hash was not forwarded.");
  if (completionPayload.p_submission_fingerprint !== "fixture-submission-fingerprint") {
    throw new Error("Frozen submission fingerprint was not forwarded.");
  }
  if (completionPayload.p_result.resolvedSelections !== undefined || completionPayload.p_result.axisPersistenceRows !== undefined) {
    throw new Error("Non-persistent calculation internals leaked into the completion RPC payload.");
  }
  if (body?.data?.already_completed !== false || body?.data?.userReport?.audience !== "user") {
    throw new Error("Protected completion response did not project the user report.");
  }
});
