import { verifyC03GithubReleaseToken } from "../../supabase/functions/_shared/c03-github-oidc.ts";

const requestUrl = Deno.env.get("ACTIONS_ID_TOKEN_REQUEST_URL") || "";
const requestToken = Deno.env.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN") || "";
if (!requestUrl || !requestToken) throw new Error("GitHub Actions OIDC endpoint is unavailable.");

const url = new URL(requestUrl);
url.searchParams.set("audience", "clinic-evaluator-c03-release");
const response = await fetch(url, {
  headers: { Authorization: "Bearer " + requestToken, Accept: "application/json" },
});
const payload = await response.json().catch(() => ({}));
if (!response.ok || typeof payload?.value !== "string" || !payload.value) {
  throw new Error("GitHub OIDC token request failed with HTTP " + response.status + ".");
}

const identity = await verifyC03GithubReleaseToken(payload.value);
console.log(JSON.stringify({
  success: true,
  repository: identity.repository,
  repositoryOwner: identity.repositoryOwner,
  actor: identity.actor,
  actorId: identity.actorId,
  workflowRef: identity.workflowRef,
  environment: identity.environment,
  sha: identity.sha,
  runId: identity.runId,
  runAttempt: identity.runAttempt,
}));
