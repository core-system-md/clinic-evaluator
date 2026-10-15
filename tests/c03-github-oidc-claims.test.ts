import { validateC03GithubReleaseClaims } from "../supabase/functions/_shared/c03-github-oidc.ts";

const valid = {
  sub: "repo:core-system-md/clinic-evaluator:environment:production-e2e",
  repository: "core-system-md/clinic-evaluator",
  repository_owner: "core-system-md",
  ref: "refs/heads/main",
  workflow_ref: "core-system-md/clinic-evaluator/.github/workflows/c03-production-release.yml@refs/heads/main",
  environment: "production-e2e",
  event_name: "workflow_dispatch",
  sha: "a".repeat(40),
  run_id: "12345",
  run_attempt: "1",
  iss: "https://token.actions.githubusercontent.com",
  aud: "clinic-evaluator-c03-release",
  exp: 9999999999,
} as any;

Deno.test("C-03 OIDC claim validation accepts only the designated repository workflow context", () => {
  const identity = validateC03GithubReleaseClaims(valid);
  if (identity.sha !== valid.sha || identity.runId !== "12345") throw new Error("Valid workflow identity was not retained.");
});
for (const [claim, value] of [
  ["sub", "repo:core-system-md/clinic-evaluator:ref:refs/heads/main"],
  ["repository", "someone/else"],
  ["repository_owner", "someone"],
  ["ref", "refs/heads/feature"],
  ["workflow_ref", "core-system-md/clinic-evaluator/.github/workflows/other.yml@refs/heads/main"],
  ["environment", "development"],
  ["event_name", "push"],
  ["sha", "short"],
  ["run_id", "not-a-number"],
  ["run_attempt", "0.5"],
] as Array<[string, string]>) {
  Deno.test("C-03 OIDC rejects invalid claim: " + claim, () => {
    let rejected = false;
    try { validateC03GithubReleaseClaims({ ...valid, [claim]: value }); } catch { rejected = true; }
    if (!rejected) throw new Error("Invalid OIDC claim was accepted: " + claim);
  });
}
