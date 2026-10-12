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
const duplicateResult = JSON.stringify({
  summary: "fixture duplicate",
  findings: [{
    title: "タイトルだけを言い換えた提案",
    priority: "medium",
    category: "seo",
    observation: "同じ 観察。",
    hypothesis: "fixture",
    suggestedIssueBody: "fixture",
    evidence: ["同じ根拠"],
  }],
});
const invalidSchemaResult = JSON.stringify({ summary: "missing findings" });
const extraFieldResult = JSON.stringify({ summary: "extra field", findings: [], extra: true });
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

async function invoke(name, responses, history = null) {
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
  if (history) {
    const historyPath = path.join(directory, "generator-history.json");
    await fs.writeFile(historyPath, JSON.stringify(history));
    args.push(`--history-input=${historyPath}`);
  }
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
  assert.equal(
    (await fs.stat(path.join(firstSuccess.directory, "generator-attempt-1.json"))).mode & 0o777,
    0o600,
  );

  const withHistory = await invoke("with-history", [{ content: duplicateResult }], {
    schemaVersion: 1,
    sourceRuns: [{
      runId: "seed",
      finishedAt: "2026-10-13T00:00:00.000Z",
      findings: [{
        title: "THE CROWNの同じ提案",
        category: "seo",
        observation: "同じ観察",
        evidence: ["同じ根拠"],
      }],
    }],
    findingCount: 1,
  });
  assert.equal(withHistory.status, 0, withHistory.stderr);
  const historyPrompt = withHistory.requests[0].messages.at(-1).content;
  assert.match(historyPrompt, /previousProposals/);
  assert.match(historyPrompt, /THE CROWNの同じ提案/);
  assert.match(historyPrompt, /新しい価値のある提案がなければ findings は空配列/);
  const deduplicatedResult = JSON.parse(
    await fs.readFile(path.join(withHistory.directory, "result.json"), "utf8"),
  );
  assert.equal(deduplicatedResult.findings.length, 0);
  assert.equal(deduplicatedResult.suppressedDuplicates.length, 1);
  assert.equal(deduplicatedResult.suppressedDuplicates[0].matchedRunId, "seed");
  assert.equal(deduplicatedResult.shouldCreateIssue, false);

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

  const extraFieldRetry = await invoke("extra-field-retry", [
    { content: extraFieldResult },
    { content: validResult },
  ]);
  assert.equal(extraFieldRetry.status, 0, extraFieldRetry.stderr);
  const extraFieldSummary = JSON.parse(
    await fs.readFile(path.join(extraFieldRetry.directory, "generator-attempts.json"), "utf8"),
  );
  assert.equal(extraFieldSummary.attempts[0].error.kind, "schema_error");
  assert.equal(extraFieldSummary.finalStatus, "success");

  const lengthRetry = await invoke("length-retry", [
    { content: invalidJsonResult, finishReason: "length" },
    { content: validResult },
  ]);
  assert.equal(lengthRetry.status, 0, lengthRetry.stderr);
  const lengthSummary = JSON.parse(
    await fs.readFile(path.join(lengthRetry.directory, "generator-attempts.json"), "utf8"),
  );
  assert.equal(lengthSummary.attempts[0].error.kind, "output_length");
  assert.equal(lengthSummary.finalStatus, "success");

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

  console.log("Site review structured-output checks passed: schema request, first success, parse retry, schema retry, extra-field rejection, length retry, final failure diagnostics.");
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
}
