import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "https://esm.sh/jose@5.9.6";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "clinic-evaluator-c03-release";
const EXPECTED_REPOSITORY = "core-system-md/clinic-evaluator";
const EXPECTED_WORKFLOW_REF = "core-system-md/clinic-evaluator/.github/workflows/c03-production-release.yml@refs/heads/main";
const EXPECTED_ENVIRONMENT = "production-e2e";
const jwks = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));

export type C03GithubReleaseIdentity = {
  repository: string;
  repositoryOwner: string;
  sha: string;
  runId: string;
  runAttempt: string;
  workflowRef: string;
  environment: string;
};

function requiredClaim(payload: JWTPayload, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("GitHub OIDC token is missing required claim: " + key);
  }
  return value;
}

/** Validate the signed GitHub workload token and bind it to the one guarded C-03 release workflow. */
export function validateC03GithubReleaseClaims(payload: JWTPayload): C03GithubReleaseIdentity {
  const subject = requiredClaim(payload, "sub");
  const repository = requiredClaim(payload, "repository");
  const repositoryOwner = requiredClaim(payload, "repository_owner");
  const ref = requiredClaim(payload, "ref");
  const workflowRef = requiredClaim(payload, "workflow_ref");
  const environment = requiredClaim(payload, "environment");
  const eventName = requiredClaim(payload, "event_name");
  const sha = requiredClaim(payload, "sha");
  const runId = requiredClaim(payload, "run_id");
  const runAttempt = requiredClaim(payload, "run_attempt");

  if (subject !== "repo:core-system-md/clinic-evaluator:environment:production-e2e") {
    throw new Error("GitHub OIDC subject is not bound to the protected C-03 environment.");
  }
  if (repository !== EXPECTED_REPOSITORY || repositoryOwner !== "core-system-md") {
    throw new Error("GitHub OIDC repository identity is not authorized for C-03 release.");
  }
  if (ref !== "refs/heads/main" || workflowRef !== EXPECTED_WORKFLOW_REF) {
    throw new Error("GitHub OIDC ref/workflow identity is not authorized for C-03 release.");
  }
  if (environment !== EXPECTED_ENVIRONMENT || eventName !== "workflow_dispatch") {
    throw new Error("C-03 release requires the protected environment and explicit workflow_dispatch event.");
  }
  if (!/^[0-9a-f]{40}$/.test(sha) || !/^\d+$/.test(runId) || !/^\d+$/.test(runAttempt) || Number(runId) < 1 || Number(runAttempt) < 1) {
    throw new Error("GitHub OIDC commit or run identity is malformed.");
  }
  return { repository, repositoryOwner, sha, runId, runAttempt, workflowRef, environment };
}

/** Validate the signed GitHub workload token and bind it to the one guarded C-03 release workflow. */
export async function verifyC03GithubReleaseToken(token: string): Promise<C03GithubReleaseIdentity> {
  const supplied = String(token || "").trim();
  if (!supplied) throw new Error("GitHub OIDC workload token is required.");
  const { payload } = await jwtVerify(supplied, jwks, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ["RS256"],
    clockTolerance: 5,
  });
  return validateC03GithubReleaseClaims(payload);
}
