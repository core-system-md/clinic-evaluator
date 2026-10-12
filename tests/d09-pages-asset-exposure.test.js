const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const middlewarePath = path.join(__dirname, "..", "functions", "_middleware.js");
const source = fs.readFileSync(middlewarePath, "utf8")
  .replace("export async function onRequest", "async function onRequest")
  + "\nglobalThis.__onRequest = onRequest;";

const sandbox = {
  URL,
  Request,
  Response,
  Set,
  decodeURIComponent,
  globalThis: {},
};
vm.runInNewContext(source, sandbox, { filename: middlewarePath });
const onRequest = sandbox.globalThis.__onRequest;

async function requestPath(pathname) {
  let nextCalled = false;
  const response = await onRequest({
    request: new Request("https://pages.example" + pathname),
    next: async () => {
      nextCalled = true;
      return new Response("public asset", { status: 200 });
    },
  });
  return { response, nextCalled };
}

test("D-09 blocks legacy assessment JSON snapshots", async () => {
  for (const pathname of [
    "/assets/data/comprehensive_assesstment.json",
    "/assets/data/admin_reception_assesstment.json",
    "/assets/data/medical_team_assesstment.json",
    "/assets/data/COMPREHENSIVE_ASSESSTMENT.JSON",
  ]) {
    const { response, nextCalled } = await requestPath(pathname);
    assert.equal(response.status, 404, pathname);
    assert.equal(nextCalled, false, pathname);
  }
});

test("D-09 blocks internal repository paths", async () => {
  for (const pathname of [
    "/documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V2.json",
    "/supabase/functions/assessment-access/response-interpretation-registry-v2.json",
    "/tests/p3-production-contract.test.mjs",
    "/.github/workflows/p3-kernel-verification.yml",
    "/package.json",
    "/README.md",
  ]) {
    const { response, nextCalled } = await requestPath(pathname);
    assert.equal(response.status, 404, pathname);
    assert.equal(nextCalled, false, pathname);
  }
});

test("D-09 preserves required client routes and public assets", async () => {
  for (const pathname of [
    "/",
    "/index.html",
    "/patient-journey.html",
    "/admin/",
    "/assets/js/app.js",
    "/assets/css/style.css",
    "/assets/data/report_texts.json",
  ]) {
    const { response, nextCalled } = await requestPath(pathname);
    assert.equal(response.status, 200, pathname);
    assert.equal(nextCalled, true, pathname);
  }
});

test("D-09 fails closed on malformed percent-encoding", async () => {
  const { response, nextCalled } = await requestPath("/documentation/%E0%A4%A");
  assert.equal(response.status, 404);
  assert.equal(nextCalled, false);
});
