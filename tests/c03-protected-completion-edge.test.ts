Deno.env.set("SUPABASE_URL", "http://127.0.0.1:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "c03-test-only");

const edge = await import("../supabase/functions/assessment-access/index.ts");

const sessionId = "60000000-0000-4000-8000-000000000001";
const userId = "70000000-0000-4000-8000-000000000001";
const assessmentTypeId = "20000000-0000-4000-8000-000000000001";
const releaseId = "80000000-0000-4000-8000-000000000001";
const releaseDigest = "a".repeat(64);

function mockSupabase(options: { releaseError?: any } = {}) {
  const calls: Array<{ kind: string; name: string; args?: any }> = [];
  const access = {
    id: "90000000-0000-4000-8000-000000000001",
    session_id: sessionId,
    assessment_user_id: userId,
    assessment_type_id: assessmentTypeId,
    expires_at: "2099-01-01T00:00:00.000Z",
    revoked_at: null,
  };
  const session = {
    id: sessionId,
    lead_id: "a0000000-0000-4000-8000-000000000001",
    assessment_type_id: assessmentTypeId,
    assessment_user_id: userId,
    assessment_version: 1,
    status: "in_progress",
  };

  class Query {
    table: string;
    constructor(table: string) { this.table = table; }
    select(_columns: string) { return this; }
    eq(_column: string, _value: unknown) { return this; }
    is(_column: string, _value: unknown) { return this; }
    gt(_column: string, _value: unknown) { return this; }
    maybeSingle() {
      if (this.table === "assessment_session_access") return Promise.resolve({ data: access, error: null });
      if (this.table === "sessions") return Promise.resolve({ data: session, error: null });
      if (this.table === "leads") return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    }
  }

  return {
    calls,
    client: {
      from(table: string) { return new Query(table); },
      async rpc(name: string, args: any) {
        calls.push({ kind: "rpc", name, args });
        if (name === "c03_assert_session_configuration_release") {
          if (options.releaseError) return { data: null, error: options.releaseError };
          return { data: { release_id: releaseId, config_digest: releaseDigest, state: "PUBLISHED" }, error: null };
        }
        if (name === "prepare_assessment_submission") {
          return {
            data: {
              already_completed: false,
              submission_snapshot: [{ question_id: "Q1", option_index: 0, option_value: 70 }],
              submission_fingerprint: "frozen-fingerprint",
              submission_economic_input: {},
            },
            error: null,
          };
        }
        if (name === "complete_p4_assessment_from_result") {
          return { data: { result: args.p_result, already_completed: false }, error: null };
        }
        throw new Error("Unexpected RPC: " + name);
      },
    },
  };
}

function structuredResult() {
  return {
    schemaVersion: "P3_STRUCTURED_RESULT_V1",
    status: "PRODUCTION",
    identity: {
      sessionId,
      assessmentTypeId,
      assessmentVersion: "1",
      resultId: "b0000000-0000-4000-8000-000000000001",
    },
    provenance: {
      assessmentSlug: "fixture-assessment",
      interpretationVersion: 2,
      scoringEngineVersion: "engine-v1",
      scoringContractVersion: "contract-v1",
      assessmentConfigDigest: "c".repeat(64),
    },
    scores: { overallScore: 70, axes: [] },
    classification: { bandCode: "Q3" },
    kpis: [],
    economics: { status: "NOT_COMPUTED", output: null },
  };
}

function configureHarness(client: any, calls: any[]) {
  edge.__configureAssessmentAccessForTest({
    supabaseClient: client,
    calculateAssessmentFn: async () => ({
      result: structuredResult(),
      provenance: {
        assessmentSlug: "fixture-assessment",
        assessmentVersion: 1,
        interpretationVersion: 2,
        scoringEngineVersion: "engine-v1",
        scoringContractVersion: "contract-v1",
        assessmentConfigDigest: "c".repeat(64),
      },
    }),
    projectCompletionResponseFn: (result: any) => ({
      userReport: {
        audience: "user",
        assessment: { familyId: result.identity?.assessmentTypeId || assessmentTypeId },
        axes: result.scores?.axes || [],
      },
    }),
  });
}

Deno.test("actual Edge handler completes protected session through pinned release and protected RPC", async () => {
  const harness = mockSupabase();
  configureHarness(harness.client, harness.calls);

  const response = await edge.handler(new Request("http://localhost/assessment-access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "complete", data: { token: "protected-test-token" } }),
  }));
  const body = await response.json();

  if (response.status !== 200) throw new Error("Expected 200, got " + response.status + ": " + JSON.stringify(body));
  if (body.success !== true) throw new Error("Expected successful completion response");
  const releaseCheck = harness.calls.find((call) => call.name === "c03_assert_session_configuration_release");
  const prepare = harness.calls.find((call) => call.name === "prepare_assessment_submission");
  const complete = harness.calls.find((call) => call.name === "complete_p4_assessment_from_result");
  if (!releaseCheck || !prepare || !complete) throw new Error("Expected release assertion, frozen preparation and protected completion RPC");
  if (harness.calls.some((call) => call.name === "complete_p4_public_assessment_from_result")) {
    throw new Error("Protected session must not call the public completion RPC");
  }
  if (complete.args.p_assessment_user_id !== userId) throw new Error("Protected identity was not passed to completion RPC");
  if (complete.args.p_result.provenance.configurationReleaseId !== releaseId) throw new Error("Release ID was not pinned into Structured Result");
  if (complete.args.p_result.provenance.configurationReleaseDigest !== releaseDigest) throw new Error("Release digest was not pinned into Structured Result");
});

Deno.test("actual Edge handler returns a typed 409 and does not prepare/persist on pinned-release failure", async () => {
  const harness = mockSupabase({ releaseError: { code: "40906", message: "Pinned configuration drift detected" } });
  configureHarness(harness.client, harness.calls);

  const response = await edge.handler(new Request("http://localhost/assessment-access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "complete", data: { token: "protected-test-token" } }),
  }));
  const body = await response.json();

  if (response.status !== 409) throw new Error("Expected 409, got " + response.status + ": " + JSON.stringify(body));
  if (harness.calls.some((call) => call.name === "prepare_assessment_submission" || call.name === "complete_p4_assessment_from_result")) {
    throw new Error("A failed release assertion must stop before preparation and persistence");
  }
});
