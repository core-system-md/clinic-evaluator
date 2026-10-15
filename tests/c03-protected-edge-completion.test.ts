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

function rowFor(table: string, filters: Array<[string, unknown]>) {
  if (table === "assessment_session_access") return accessRow;
  if (table === "sessions") {
    if (filters.some(([key, value]) => key === "lead_id" && value === leadRow.id)) return null;
    return sessionRow;
  }
  if (table === "leads") {
    if (filters.some(([key, value]) => key === "completed" && value === true)) return [];
    return leadRow;
  }
  if (table === "assessment_results") return resultRow;
  if (table === "assessment_families") return { id: familyId, slug: "clinic-performance" };
  return [];
}

function fakeClient() {
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
        maybeSingle() { return Promise.resolve({ data: rowFor(table, filters), error: null }); },
        single() { return Promise.resolve({ data: rowFor(table, filters), error: null }); },
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve({ data: rowFor(table, filters), error: null }).then(resolve, reject);
        },
      };
      return query;
    },
    async rpc() {
      throw new Error("A completed protected retry must not recalculate or call a completion RPC.");
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
