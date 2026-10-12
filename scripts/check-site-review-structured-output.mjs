// Isolated structured-output checks; no model or external network request required.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const runner = path.join(root, "scripts/site-review-agent.mjs");
const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "site-review-structured-"));
let queuedResponses = [];
let completionRequests = [];

const validResult = JSON.stringify({ summary: "fixture summary", findings: [] });
const invalidSchemaResult = JSON.stringify({ summary: "missing findings" });
const invalidJsonResult = '{"summary":"unfinished","findings":[';

const server = http.createServer(async (request, response) => {
  if (request.url === "/v1/chat/completions") {
    let body = "";
    for await (const chunk of request) body += chunk;
    completionRequests.push(JSON.parse(body));
    const fixture = queuedResponses.shift();
    assert.ok(fixture, "Unexpected extra completion request");
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      choices: [{
        message: { content: fixture.content },
        finish_reason: fixture.finishReason ?? "stop",
      }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }));
    return;
  }

  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end("<html><head><title>Fixture</title></head><body>Fixture page</body></html>");
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const origin = `http://127.0.0.1:${address.port}`;

async function invoke(name, responses) {
  const directory = path.join(temporaryDirectory, name);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  queuedResponses = [...responses];
  completionRequests = [];
  const args = [
    "--experimental-strip-types",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    runner,
    "--compact",
    `--site-url=${origin}`,
    `--output=${path.join(directory, "report.md")}`,
    `--json-output=${path.join(directory, "result.json")}`,
    `--prompt-output=${path.join(directory, "prompt.txt")}`,
    `--attempts-output=${path.join(directory, "generator-attempts.json")}`,
  ];
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      LANG: process.env.LANG,
      SITE_REVIEW_LLM_BASE_URL: `${origin}/v1`,
      SITE_REVIEW_LLM_MODEL: "fixture-model",
      SITE_REVIEW_LLM_REASONING_EFFORT: "none",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const status = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  return { directory, status, stdout, stderr, requests: [...completionRequests] };
}

try {
  const firstSuccess = await invoke("first-success", [{ content: validResult }]);
  assert.equal(firstSuccess.status, 0, firstSuccess.stderr);
  assert.equal(firstSuccess.requests.length, 1);
  assert.equal(firstSuccess.requests[0].response_format.type, "json_schema");
  assert.deepEqual(
    firstSuccess.requests[0].response_format.json_schema.schema.required,
    ["summary", "findings"],
  );
  const firstSummary = JSON.parse(
    await fs.readFile(path.join(firstSuccess.directory, "generator-attempts.json"), "utf8"),
  );
  assert.equal(firstSummary.attemptCount, 1);
  assert.equal(firstSummary.initialAttemptSucceeded, true);
  assert.equal(firstSummary.retryCount, 0);
  assert.equal(firstSummary.finalStatus, "success");
  const firstAttempt = JSON.parse(
    await fs.readFile(path.join(firstSuccess.directory, "generator-attempt-1.json"), "utf8"),
  );
  assert.equal(firstAttempt.rawResponse, validResult);
  assert.equal(firstAttempt.finishReason, "stop");
  assert.equal(firstAttempt.usage.total_tokens, 15);

  const parseRetry = await invoke("parse-retry", [
    { content: invalidJsonResult },
    { content: validResult },
  ]);
  assert.equal(parseRetry.status, 0, parseRetry.stderr);
  const parseSummary = JSON.parse(
    await fs.readFile(path.join(parseRetry.directory, "generator-attempts.json"), "utf8"),
  );
  assert.equal(parseSummary.attemptCount, 2);
  assert.equal(parseSummary.initialAttemptSucceeded, false);
  assert.equal(parseSummary.retryCount, 1);
  assert.equal(parseSummary.finalStatus, "success");
  assert.equal(parseSummary.attempts[0].error.kind, "parse_error");

  const schemaRetry = await invoke("schema-retry", [
    { content: invalidSchemaResult },
    { content: validResult },
  ]);
  assert.equal(schemaRetry.status, 0, schemaRetry.stderr);
  const schemaSummary = JSON.parse(
    await fs.readFile(path.join(schemaRetry.directory, "generator-attempts.json"), "utf8"),
  );
  assert.equal(schemaSummary.attempts[0].error.kind, "schema_error");
  assert.equal(schemaSummary.finalStatus, "success");

  const finalFailure = await invoke("final-failure", [
    { content: invalidJsonResult },
    { content: invalidJsonResult },
  ]);
  assert.notEqual(finalFailure.status, 0);
  assert.match(finalFailure.stderr, /failed after 2 attempts/);
  const failureSummary = JSON.parse(
    await fs.readFile(path.join(finalFailure.directory, "generator-attempts.json"), "utf8"),
  );
  assert.equal(failureSummary.attemptCount, 2);
  assert.equal(failureSummary.retryCount, 1);
  assert.equal(failureSummary.finalStatus, "failed");
  assert.equal(failureSummary.attempts[1].error.kind, "parse_error");
  await fs.access(path.join(finalFailure.directory, "generator-attempt-1.json"));
  await fs.access(path.join(finalFailure.directory, "generator-attempt-2.json"));

  console.log("Site review structured-output checks passed: schema request, first success, parse retry, schema retry, final failure diagnostics.");
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
}
