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
let receivedRequestCount = 0;
let partialTimeoutRequestCount = 0;
let timedOutConnectionClosed = false;
let candidatesBeforeTimeout = null;
let eventsBeforeTests = null;

const server = createServer(async (request, response) => {
  if (request.url.startsWith("/official-event")) {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end("<title>MIZU NO YUME / TEST METAL JAPAN TOUR 2099</title><p>2099-01-02 東京 TEST HALL</p>");
    return;
  }

  if (request.url === "/known-band-event") {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end("<title>SEX MACHINEGUNS 愛知公演</title><h1>SEX MACHINEGUNS</h1><p>2099-01-02 愛知県 TEST HALL</p>");
    return;
  }

  if (request.url === "/non-heavy-event") {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end("<title>wave to earth - the pieces tour</title><p>Korean indie band wave to earth 2026-11-27 東京都 Zepp DiverCity(TOKYO)</p>");
    return;
  }

  if (request.url === "/corrupt-event") {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end("<title>�{�{�_�� live</title><p>�{�{�_�� 2027-01-05 �N���R����z�[��</p>");
    return;
  }

  if (request.url === "/v1/chat/completions" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    receivedRequest = { headers: request.headers, body: JSON.parse(body) };
    receivedRequestCount += 1;
    const shouldTimeout = receivedRequest.body.model === "timeout-model" ||
      (receivedRequest.body.model === "partial-timeout-model" && ++partialTimeoutRequestCount === 2);
    if (shouldTimeout) {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.flushHeaders();
      response.on("close", () => {
        timedOutConnectionClosed = true;
      });
      return;
    }

    const isKnownBandCase = receivedRequest.body.model === "auto-adopt-model" || receivedRequest.body.model === "mismatch-model";
    const sourcePath = isKnownBandCase ? "known-band-event"
      : receivedRequest.body.model === "non-heavy-model" ? "non-heavy-event"
        : receivedRequest.body.model === "corrupt-model" ? "corrupt-event" : "official-event";
    const promptSourceUrl = receivedRequest.body.messages[1].content.match(
      /http:\/\/127\.0\.0\.1:\d+\/(?:official-event(?:-\d+)?|non-heavy-event|corrupt-event)/,
    )?.[0];
    const sourceUrl = `http://127.0.0.1:${server.address().port}/${isKnownBandCase ? sourcePath : "official-event"}`;
    const groundedSourceUrl = isKnownBandCase ? sourceUrl : promptSourceUrl ?? sourceUrl;
    const candidate = receivedRequest.body.model === "scope-model"
      ? {
          id: "test-ambiguous-domestic-2099",
          artists: ["MIZU NO YUME"],
          tourName: "Riverside Live",
          date: "2099-01-02",
          prefecture: "東京都",
          venue: "TEST HALL",
          genres: [],
          isInternational: false,
          sourceUrl: groundedSourceUrl,
          sourceType: "manual",
          sourceName: "Community event listing",
          confidence: "medium",
          reviewNotes: "会場主催イベントで日付・出演者を確認。",
        }
      : receivedRequest.body.model === "non-heavy-model"
      ? {
          id: "wave-to-earth-non-heavy-2099",
          artists: ["wave to earth"],
          tourName: "the pieces tour",
          date: "2099-01-02",
          prefecture: "東京都",
          venue: "TEST HALL",
          genres: ["Heavy Music"],
          isInternational: true,
          sourceUrl: groundedSourceUrl,
          sourceType: "promoter",
          sourceName: "Official promoter",
          confidence: "high",
          reviewNotes: "heavy music",
        }
      : receivedRequest.body.model === "corrupt-model"
      ? {
          id: "corrupt-band-2099",
          artists: ["�{�{�_��"],
          tourName: "�N���R����z�[�� tour",
          date: "2099-01-02",
          prefecture: "愛知県",
          venue: "�N���R����z�[��",
          genres: [],
          isInternational: false,
          sourceUrl: groundedSourceUrl,
          sourceType: "promoter",
          sourceName: "Official promoter",
          confidence: "high",
          reviewNotes: "verify",
        }
      : isKnownBandCase
      ? {
          id: "sex-machineguns-2099-aichi-test",
          artists: ["SEX MACHINEGUNS", "UNVERIFIED BAND"],
          tourName: "HEAVY METAL COMMANDER 2099",
          date: "2099-01-02",
          prefecture: "愛知県",
          venue: receivedRequest.body.model === "mismatch-model" ? "Zepp Nagoya" : "TEST HALL",
          genres: ["Heavy Metal"],
          isInternational: false,
          ticketUrl: "https://unverified.example/ticket",
          ticketLinks: [{ provider: "other", url: "https://unverified.example/ticket" }],
          sourceUrl: groundedSourceUrl,
          sourceType: "ticket",
          sourceName: "Official ticket page",
          confidence: "high",
          reviewNotes: "source verified",
        }
      : {
          id: "test-metal-2099-tokyo",
          artists: ["TEST METAL"],
          tourName: "JAPAN TOUR 2099",
          date: "2099-01-02",
          prefecture: "東京都",
          venue: "TEST HALL",
          genres: ["Heavy Metal"],
          isInternational: true,
          sourceUrl: groundedSourceUrl,
          sourceType: "promoter",
          sourceName: "Official promoter",
          confidence: "high",
          reviewNotes: "公式ページで全日程確認済み。",
        };
    const content = JSON.stringify({ candidates: [candidate] });
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
  candidatesBeforeTimeout = await readFile(candidateFile, "utf8");
  const eventsFile = new URL("../src/data/events.ts", import.meta.url);
  eventsBeforeTests = await readFile(eventsFile, "utf8");
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
  assert.equal(receivedRequest.body.max_tokens, 2048);
  assert.match(receivedRequest.body.messages[0].content, /\/no_think/);
  assert.match(JSON.stringify(receivedRequest.body.messages), /direct ticket purchase\/application URL/, "the model receives ticket-link grounding rules");
  assert.match(JSON.stringify(receivedRequest.body.messages), /explicitly state the current status/, "the model must ground ticket availability in captured pages");
  assert.match(JSON.stringify(receivedRequest.body.messages), /Do not infer it from a venue name/, "the model must not guess a prefecture from the venue name");
  assert.deepEqual(receivedRequest.body.response_format, { type: "json_object" });
  const reportText = await readFile(report, "utf8");
  assert.match(reportText, /生成モデル: fixture-model/);
  assert.match(reportText, /test-metal-2099-tokyo/);

  const batchInput = path.join(temp, "batch-research-links.md");
  await writeFile(
    batchInput,
    Array.from({ length: 16 }, (_, index) =>
      "#### Official promoter " + (index + 1) + "\n\n- TEST METAL JAPAN TOUR 2099\nhttp://127.0.0.1:" +
        port + "/official-event-" + index,
    ).join("\n") + "\n",
  );
  receivedRequest = null;
  receivedRequestCount = 0;
  await run(
    process.execPath,
    [
      "--experimental-strip-types",
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "scripts/research-candidates.mjs",
      "--input=" + batchInput,
      "--report=" + report,
      "--prompt-token-budget=2500",
    ],
    {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        OPENAI_API_KEY: "",
        CANDIDATE_LLM_API_KEY: "",
        CANDIDATE_LLM_BASE_URL: "http://127.0.0.1:" + port + "/v1",
        CANDIDATE_LLM_MODEL: "fixture-model",
      },
    },
  );
  assert.ok(receivedRequestCount > 1, "oversized prompts are split into separate model requests");
  const batchReport = await readFile(report, "utf8");
  assert.match(batchReport, /モデル入力バッチ数: [2-4]/);
  const maxBatchTokens = Number(batchReport.match(/1バッチ最大プロンプト概算: ([0-9,]+) tokens/)?.[1]?.replaceAll(",", ""));
  assert.ok(maxBatchTokens <= 2500, "each prompt stays within the configured token budget");
  assert.match(batchReport, /test-metal-2099-tokyo/);

  receivedRequest = null;
  await run(
    process.execPath,
    ["--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/research-candidates.mjs", "--input=" + input, "--report=" + report, "--write"],
    {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        OPENAI_API_KEY: "",
        CANDIDATE_LLM_API_KEY: "",
        CANDIDATE_LLM_BASE_URL: "http://127.0.0.1:" + port + "/v1",
        CANDIDATE_LLM_MODEL: "scope-model",
      },
    },
  );
  const scopeReport = await readFile(report, "utf8");
  assert.match(scopeReport, /test-ambiguous-domestic-2099/, "an ambiguous domestic event with concrete facts remains reviewable");
  assert.match(scopeReport, /low \/ Community event listing/, "scope uncertainty downgrades confidence");
  assert.match(scopeReport, /対象範囲要確認/, "the report calls out scope review");
  const scopeCandidateFile = await readFile(candidateFile, "utf8");
  const scopeCandidateBlock = scopeCandidateFile.split('id: "test-ambiguous-domestic-2099"')[1]?.split("\n    },")[0] ?? "";
  assert.match(scopeCandidateBlock, /genres: \[\s*"ジャンル未確認"/, "an unknown genre is not fabricated as Heavy Metal");
  await writeFile(candidateFile, candidatesBeforeTimeout);

  const scopeRejectionInput = path.join(temp, "scope-rejection-links.md");
  for (const [fixtureModel, expectedReason] of [
    ["non-heavy-model", /ポップ／インディー等の明示/],
    ["corrupt-model", /文字化けにより出演者・会場を確認できない/],
  ]) {
    await writeFile(scopeRejectionInput, `#### Official promoter\n\n- test page\nhttp://127.0.0.1:${port}/${fixtureModel === "non-heavy-model" ? "non-heavy-event" : "corrupt-event"}\n`);
    await run(
      process.execPath,
      ["--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/research-candidates.mjs", "--input=" + scopeRejectionInput, "--report=" + report],
      {
        cwd: new URL("..", import.meta.url),
        env: {
          ...process.env,
          OPENAI_API_KEY: "",
          CANDIDATE_LLM_API_KEY: "",
          CANDIDATE_LLM_BASE_URL: "http://127.0.0.1:" + port + "/v1",
          CANDIDATE_LLM_MODEL: fixtureModel,
        },
      },
    );
    const rejectionReport = await readFile(report, "utf8");
    assert.match(rejectionReport, /追加候補数: 0/, fixtureModel + " is rejected");
    assert.match(rejectionReport, expectedReason, fixtureModel + " rejection reason is reported");
  }

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

  receivedRequest = null;
  receivedRequestCount = 0;
  partialTimeoutRequestCount = 0;
  const partialReport = path.join(temp, "partial-candidate-report.md");
  await run(
    process.execPath,
    [
      "--experimental-strip-types",
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "scripts/research-candidates.mjs",
      "--input=" + batchInput,
      "--report=" + partialReport,
      "--write",
      "--prompt-token-budget=2500",
    ],
    {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        OPENAI_API_KEY: "",
        CANDIDATE_LLM_API_KEY: "",
        CANDIDATE_LLM_BASE_URL: "http://127.0.0.1:" + port + "/v1",
        CANDIDATE_LLM_MODEL: "partial-timeout-model",
        CANDIDATE_LLM_TIMEOUT_MS: "100",
        OLLAMA_CLI_PATH: stopScript,
        OLLAMA_STOP_LOG: stopLog,
      },
    },
  );
  const candidateFileAfterPartial = await readFile(candidateFile, "utf8");
  const partialReportText = await readFile(partialReport, "utf8");
  assert.notEqual(candidateFileAfterPartial, candidatesBeforeTimeout, "completed batches survive a later timeout");
  assert.match(candidateFileAfterPartial, /test-metal-2099-tokyo/);
  assert.match(partialReportText, /バッチ実行・完了数: 2 \/ 1/);
  assert.match(partialReportText, /失敗バッチ: 2 \/ [2-9][0-9]*/);
  assert.match(partialReportText, /LLM batch 2 failed/);
  await writeFile(candidateFile, candidatesBeforeTimeout);

  const knownInput = path.join(temp, "known-band-links.md");
  await writeFile(knownInput, `#### Official ticket page\n\n- SEX MACHINEGUNS HEAVY METAL COMMANDER 2099\nhttp://127.0.0.1:${port}/known-band-event\n`);
  for (const [fixtureModel, expectedStatus] of [["auto-adopt-model", "published"], ["mismatch-model", "review_needed"]]) {
    await run(
      process.execPath,
      ["--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/research-candidates.mjs", "--input=" + knownInput, "--report=" + report, "--write"],
      {
        cwd: new URL("..", import.meta.url),
        env: {
          ...process.env,
          OPENAI_API_KEY: "",
          CANDIDATE_LLM_API_KEY: "",
          CANDIDATE_LLM_BASE_URL: "http://127.0.0.1:" + port + "/v1",
          CANDIDATE_LLM_MODEL: fixtureModel,
        },
      },
    );
    const writtenCandidates = await readFile(candidateFile, "utf8");
    const candidateBlock = writtenCandidates.split('id: "sex-machineguns-2099-aichi-test"')[1]?.split("\n    },")[0] ?? "";
    assert.match(candidateBlock, new RegExp(`reviewStatus: "${expectedStatus}"`));
    const writtenEvents = await readFile(eventsFile, "utf8");
    if (expectedStatus === "published") {
      assert.match(writtenEvents, /id: "sex-machineguns-2099-aichi-test"/);
      const publishedEventBlock = writtenEvents.split('id: "sex-machineguns-2099-aichi-test"')[1]?.split("\n    },")[0] ?? "";
      assert.doesNotMatch(publishedEventBlock, /UNVERIFIED BAND|unverified\.example/);
      assert.match(publishedEventBlock, new RegExp(`ticketUrl: "http://127\\.0\\.0\\.1:${port}/known-band-event"`));
      assert.match(await readFile(report, "utf8"), /自動採用（既知の国内アーティスト・一次ソースで4項目確認）: 1/);
    } else {
      assert.equal(writtenEvents, eventsBeforeTests, "mismatched primary-source evidence must not enter published events");
      assert.match(await readFile(report, "utf8"), /人間確認待ち: 1/);
    }
    await writeFile(candidateFile, candidatesBeforeTimeout);
    await writeFile(eventsFile, eventsBeforeTests);
  }
  console.log("Research candidate local LLM check passed.");
} finally {
  if (candidatesBeforeTimeout !== null) await writeFile(new URL("../src/data/candidate_events.ts", import.meta.url), candidatesBeforeTimeout);
  if (eventsBeforeTests !== null) await writeFile(new URL("../src/data/events.ts", import.meta.url), eventsBeforeTests);
  await new Promise((resolve) => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
