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
const incompleteSearchConsoleResult = JSON.stringify({
  summary: "fixture incomplete citation",
  findings: [{
    title: "Search Consoleの低CTRクエリを改善する",
    priority: "medium",
    category: "seo",
    observation: "Search Consoleでは beast in black 来日 2026 の表示回数が152、CTRが0.0%だった。",
    hypothesis: "fixture",
    suggestedIssueBody: "fixture",
    evidence: ["Search Console"],
  }],
});
const ambiguousSearchConsoleResult = JSON.stringify({
  summary: "fixture ambiguous reference",
  findings: [{
    title: "Search Consoleの複数クエリをまとめて改善する",
    priority: "medium",
    category: "seo",
    observation: "Search Consoleの beast in black 来日 2026 と a perfect circle 来日 を比較する。",
    hypothesis: "fixture",
    suggestedIssueBody: "fixture",
    evidence: ["Search Console"],
  }],
});
const unknownSearchConsoleResult = JSON.stringify({
  summary: "fixture unknown reference",
  findings: [{
    title: "Search Consoleの未知クエリを改善する",
    priority: "medium",
    category: "seo",
    observation: "Search Consoleの inputにないクエリ を調査する。",
    hypothesis: "fixture",
    suggestedIssueBody: "fixture",
    evidence: ["Search Console"],
  }],
});
const exactSearchConsoleResult = JSON.stringify({
  summary: "fixture exact citation",
  findings: [{
    title: "Search Consoleの低CTRクエリを調査する",
    priority: "medium",
    category: "seo",
    observation: "Search Consoleの beast in black 来日 2026 は clicks 0、impressions 152、ctr 0.0%、position 8.4。",
    hypothesis: "検索結果上の訴求を確認する余地がある。",
    suggestedIssueBody: "検索結果と対象ページを調査する。",
    evidence: ["beast in black 来日 2026 / 0 / 152 / 0.0% / 8.4"],
  }],
});
const nonSearchConsoleResult = JSON.stringify({
  summary: "fixture non Search Console",
  findings: [{
    title: "候補確認画面の説明を改善する",
    priority: "low",
    category: "ux",
    observation: "候補確認画面の冒頭説明が短い。",
    hypothesis: "初回利用時に判断基準が伝わりにくい。",
    suggestedIssueBody: "説明文を調査する。",
    evidence: ["画面の抜粋"],
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

async function invoke(name, responses, history = null, envOverrides = {}) {
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
      ...envOverrides,
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
  const firstPrompt = firstSuccess.requests[0].messages.at(-1).content;
  assert.match(firstPrompt, /lowCtrQueries と lowCtrPages を優先/);
  assert.match(firstPrompt, /clicks、impressions、ctr、positionを原文どおり/);
  const promptContext = JSON.parse(firstPrompt.slice(firstPrompt.indexOf("Context:\n") + "Context:\n".length));
  const searchConsoleContext = promptContext.docs.latestSearchConsole.content;
  assert.equal(searchConsoleContext.summary.Period, "2026-09-12 - 2026-10-09");
  assert.deepEqual(searchConsoleContext.topQueries[3], {
    query: "draconian 来日", clicks: "12", impressions: "36", ctr: "33.3%", position: "2.2",
  });
  assert.deepEqual(searchConsoleContext.lowCtrQueries[0], {
    query: "beast in black 来日 2026", clicks: "0", impressions: "152", ctr: "0.0%", position: "8.4",
  });
  assert.equal(searchConsoleContext.topPages[0].page, "https://metalscalendar.com/international");
  assert.equal(searchConsoleContext.lowCtrPages[0].ctr, "0.4%");
  assert.ok(JSON.stringify(searchConsoleContext).length <= 3000);
  assert.doesNotMatch(JSON.stringify(searchConsoleContext), /Daily Trend|Improvement Notes/);
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

  const incompleteCitation = await invoke("incomplete-search-console", [
    { content: incompleteSearchConsoleResult },
  ]);
  assert.equal(incompleteCitation.status, 0, incompleteCitation.stderr);
  const incompleteCitationResult = JSON.parse(
    await fs.readFile(path.join(incompleteCitation.directory, "result.json"), "utf8"),
  );
  assert.equal(incompleteCitationResult.findings.length, 0);
  assert.equal(incompleteCitationResult.shouldCreateIssue, false);
  assert.equal(incompleteCitationResult.suppressedDuplicates.length, 1);
  assert.equal(
    incompleteCitationResult.suppressedDuplicates[0].reason,
    "search_console_citation_incomplete_or_mismatched",
  );

  const referencedCitation = await invoke("referenced-search-console", [
    { content: incompleteSearchConsoleResult },
  ], null, { SITE_REVIEW_SEARCH_CONSOLE_GROUNDING: "reference" });
  assert.equal(referencedCitation.status, 0, referencedCitation.stderr);
  const referencedCitationResult = JSON.parse(
    await fs.readFile(path.join(referencedCitation.directory, "result.json"), "utf8"),
  );
  assert.equal(referencedCitationResult.searchConsoleGroundingMode, "reference");
  assert.equal(referencedCitationResult.findings.length, 1);
  assert.match(referencedCitationResult.findings[0].observation, /clicks 0, impressions 152, ctr 0\.0%, position 8\.4/);
  assert.doesNotMatch(JSON.stringify(referencedCitationResult.findings[0]), /存在しない/);
  assert.equal(referencedCitationResult.findings[0].category, "analytics");
  assert.equal(referencedCitationResult.findings[0].priority, "medium");

  const ambiguousReference = await invoke("ambiguous-search-console", [
    { content: ambiguousSearchConsoleResult },
  ], null, { SITE_REVIEW_SEARCH_CONSOLE_GROUNDING: "reference" });
  assert.equal(ambiguousReference.status, 0, ambiguousReference.stderr);
  const ambiguousReferenceResult = JSON.parse(
    await fs.readFile(path.join(ambiguousReference.directory, "result.json"), "utf8"),
  );
  assert.equal(ambiguousReferenceResult.findings.length, 0);
  assert.equal(ambiguousReferenceResult.suppressedDuplicates[0].reason, "search_console_reference_not_unique");
  assert.equal(ambiguousReferenceResult.suppressedDuplicates[0].matchedRecordCount, 2);

  const unknownReference = await invoke("unknown-search-console", [
    { content: unknownSearchConsoleResult },
  ], null, { SITE_REVIEW_SEARCH_CONSOLE_GROUNDING: "reference" });
  assert.equal(unknownReference.status, 0, unknownReference.stderr);
  const unknownReferenceResult = JSON.parse(
    await fs.readFile(path.join(unknownReference.directory, "result.json"), "utf8"),
  );
  assert.equal(unknownReferenceResult.findings.length, 0);
  assert.equal(unknownReferenceResult.suppressedDuplicates[0].reason, "search_console_reference_not_unique");
  assert.equal(unknownReferenceResult.suppressedDuplicates[0].matchedRecordCount, 0);

  const exactCitation = await invoke("exact-search-console", [
    { content: exactSearchConsoleResult },
  ]);
  assert.equal(exactCitation.status, 0, exactCitation.stderr);
  const exactCitationResult = JSON.parse(
    await fs.readFile(path.join(exactCitation.directory, "result.json"), "utf8"),
  );
  assert.equal(exactCitationResult.findings.length, 1);
  assert.equal(exactCitationResult.shouldCreateIssue, true);
  assert.equal(exactCitationResult.suppressedDuplicates.length, 0);

  const nonSearchConsole = await invoke("non-search-console", [
    { content: nonSearchConsoleResult },
  ], null, { SITE_REVIEW_SEARCH_CONSOLE_GROUNDING: "reference" });
  assert.equal(nonSearchConsole.status, 0, nonSearchConsole.stderr);
  const nonSearchConsoleOutput = JSON.parse(
    await fs.readFile(path.join(nonSearchConsole.directory, "result.json"), "utf8"),
  );
  assert.equal(nonSearchConsoleOutput.findings.length, 1);
  assert.equal(nonSearchConsoleOutput.shouldCreateIssue, true);

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
