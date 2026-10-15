import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const temp = await mkdtemp(path.join(tmpdir(), "research-candidates-check-"));
let receivedRequest = null;

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
    const sourceUrl = `http://127.0.0.1:${server.address().port}/official-event`;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ candidates: [{
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
    }] }) } }] }));
    return;
  }

  response.writeHead(404).end();
});

try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const input = path.join(temp, "research-links.md");
  const report = path.join(temp, "candidate-report.md");
  await writeFile(input, `#### Official promoter\n\n- TEST METAL JAPAN TOUR 2099 live\nhttp://127.0.0.1:${port}/official-event\n`);

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
  assert.deepEqual(receivedRequest.body.response_format, { type: "json_object" });
  const reportText = await readFile(report, "utf8");
  assert.match(reportText, /生成モデル: fixture-model/);
  assert.match(reportText, /test-metal-2099-tokyo/);
  console.log("Research candidate local LLM check passed.");
} finally {
  await new Promise((resolve) => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
