import test from "node:test";
import assert from "node:assert/strict";
import { getC03GithubOidcToken, C03_GITHUB_OIDC_AUDIENCE } from "../.github/scripts/c03-github-oidc-token.mjs";

test("C-03 OIDC token request uses the dedicated audience and never prints the token", async () => {
  let requested;
  const token = await getC03GithubOidcToken({
    env: {
      ACTIONS_ID_TOKEN_REQUEST_URL: "https://actions.example/oidc",
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
    },
    fetchImpl: async (url, options) => {
      requested = { url: String(url), options };
      return { ok: true, status: 200, json: async () => ({ value: "short-lived-token" }) };
    },
  });
  assert.equal(token, "short-lived-token");
  assert.match(requested.url, new RegExp("audience=" + encodeURIComponent(C03_GITHUB_OIDC_AUDIENCE)));
  assert.equal(requested.options.headers.Authorization, "Bearer request-token");
});

test("C-03 OIDC token request fails closed outside GitHub Actions", async () => {
  await assert.rejects(getC03GithubOidcToken({ env: {}, fetchImpl: async () => { throw new Error("must not fetch"); } }), /OIDC token endpoint is unavailable/);
});

test("C-03 OIDC token request rejects an empty or failed response", async () => {
  await assert.rejects(getC03GithubOidcToken({
    env: { ACTIONS_ID_TOKEN_REQUEST_URL: "https://actions.example/oidc", ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token" },
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) }),
  }), /request failed with HTTP 403/);
});
