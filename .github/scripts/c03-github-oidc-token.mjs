export const C03_GITHUB_OIDC_AUDIENCE = "clinic-evaluator-c03-release";

/** Obtain a fresh, short-lived GitHub Actions OIDC token without logging or persisting it. */
export async function getC03GithubOidcToken({
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const requestUrl = String(env.ACTIONS_ID_TOKEN_REQUEST_URL || "").trim();
  const requestToken = String(env.ACTIONS_ID_TOKEN_REQUEST_TOKEN || "").trim();
  if (!requestUrl || !requestToken) {
    throw new Error("GitHub Actions OIDC token endpoint is unavailable; run only inside the guarded Actions job.");
  }
  const url = new URL(requestUrl);
  url.searchParams.set("audience", C03_GITHUB_OIDC_AUDIENCE);
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + requestToken, Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.value !== "string" || !payload.value.trim()) {
    throw new Error("GitHub Actions OIDC token request failed with HTTP " + response.status + ".");
  }
  return payload.value;
}
