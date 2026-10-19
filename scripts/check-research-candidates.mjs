import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const temp = await mkdtemp(path.join(tmpdir(), "research-candidates-check-"));
let receivedRequest = null;
let timedOutConnectionClosed = false;

const server = createServer(async (request, response) => {
  if (request.url === "/official-event") {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end("<title>TEST METAL JAPAN TOUR 2099</title><p>2099-01-02 東京 TEST HALL</p>");
    return;
  }

  if (request.url === "/v1/chat/completions" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    receivedRequest = { headers: request.headers, body: JSON.parse(body) };
    if (receivedRequest.body.model === "timeout-model") {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.flushHeaders();
      response.on("close", () => {
        timedOutConnectionClosed = true;
      });
      return;
    }

    const sourceUrl = `http://127.0.0.1:${server.address().port}/official-event`;
    const content = JSON.stringify({ candidates: [{
      id: "test-metal-2099-tokyo",
      artists: ["TEST METAL"],
      tourName: "JAPAN TOUR 2099",
      date: "2099-01-02",
      prefecture: "東京都",
      venue: "TEST HALL",
      genres: ["Heavy Metal"],
      isInternational: true,
      sourceUrl,
      sourceType: "promoter",
      sourceName: "Official promoter",
      confidence: "high",
      reviewNotes: "公式ページで全日程確認済み。",
    }] });
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
    response.end("data: [DONE]\n\n");
    return;
  }

  response.writeHead(404).end();
});

try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const input = path.join(temp, "research-links.md");
  const report = path.join(temp, "candidate-report.md");
  const stopScript = path.join(temp, "ollama-fixture");
  const stopLog = path.join(temp, "ollama-stop.log");
  const candidateFile = new URL("../src/data/candidate_events.ts", import.meta.url);
  const candidatesBeforeTimeout = await readFile(candidateFile, "utf8");
  await writeFile(input, `#### Official promoter\n\n- TEST METAL JAPAN TOUR 2099 live\nhttp://127.0.0.1:${port}/official-event\n`);
  await writeFile(stopScript, '#!/bin/sh\nprintf "%s\\n" "$@" > "$OLLAMA_STOP_LOG"\n');
  await chmod(stopScript, 0o755);

  await run(
    process.execPath,
    ["--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/research-candidates.mjs", `--input=${input}`, `--report=${report}`],
    {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        OPENAI_API_KEY: "",
        CANDIDATE_LLM_API_KEY: "",
        CANDIDATE_LLM_BASE_URL: `http://127.0.0.1:${port}/v1`,
        CANDIDATE_LLM_MODEL: "fixture-model",
      },
    },
  );

  assert.ok(receivedRequest, "local candidate LLM was called");
  assert.equal(receivedRequest.headers.authorization, undefined, "localhost does not require an API key");
  assert.equal(receivedRequest.body.model, "fixture-model");
  assert.equal(receivedRequest.body.stream, true);
  assert.deepEqual(receivedRequest.body.response_format, { type: "json_object" });
  const reportText = await readFile(report, "utf8");
  assert.match(reportText, /生成モデル: fixture-model/);
  assert.match(reportText, /test-metal-2099-tokyo/);

  receivedRequest = null;
  await assert.rejects(
    run(
      process.execPath,
      ["--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/research-candidates.mjs", `--input=${input}`],
      {
        cwd: new URL("..", import.meta.url),
        env: {
          ...process.env,
          OPENAI_API_KEY: "",
          CANDIDATE_LLM_API_KEY: "",
          CANDIDATE_LLM_BASE_URL: `http://127.0.0.1:${port}/v1`,
          CANDIDATE_LLM_MODEL: "timeout-model",
          CANDIDATE_LLM_TIMEOUT_MS: "100",
          OLLAMA_CLI_PATH: stopScript,
          OLLAMA_STOP_LOG: stopLog,
        },
      },
    ),
    (error) => {
      assert.match(error.stderr, /stage=llm status=failed model=timeout-model .*reason=timeout/);
      assert.match(error.stderr, /Candidate LLM request timed out after 100ms/);
      return true;
    },
  );
  assert.ok(timedOutConnectionClosed, "the timed-out streaming request was cancelled");
  assert.equal(await readFile(stopLog, "utf8"), "stop\ntimeout-model\n", "a timed-out local model is stopped");
  assert.equal(
    await readFile(candidateFile, "utf8"),
    candidatesBeforeTimeout,
    "a timed-out run does not write partial candidates",
  );
  console.log("Research candidate local LLM check passed.");
} finally {
  await new Promise((resolve) => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
