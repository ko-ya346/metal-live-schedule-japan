import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const reviewer = path.resolve("scripts/review-site-artifact.mjs");
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "evidence-review-check-"));

try {
  const context = "Context with a documented feature.";
  const artifact = "# AI site review\n\n## Issue candidate\n\nThe feature does not exist.";
  await fs.writeFile(path.join(dir, "context.txt"), context);
  await fs.writeFile(path.join(dir, "artifact.md"), artifact);
  await fs.writeFile(path.join(dir, "mock.mjs"), `
globalThis.fetch = async () => Response.json({
 choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
  verdict: process.env.MOCK_INVALID ? 'UNKNOWN' : 'REQUEST_CHANGES',
  summary: 'The artifact contradicts its context.',
  candidateReviews: [{
   candidateIndex: 1, title: 'Issue candidate', verdict: 'REQUEST_CHANGES',
   summary: 'Correct the premise.',
   claims: [{ claim: 'The feature does not exist.', classification: 'mismatch', source: 'Context', reason: 'The context documents it.' }]
  }]
 }) } }]
});
`);

  function invoke(extraEnv = {}) {
    return spawnSync(process.execPath, [
      "--import", path.join(dir, "mock.mjs"), reviewer,
      `--context=${path.join(dir, "context.txt")}`,
      `--artifact=${path.join(dir, "artifact.md")}`,
      `--output=${path.join(dir, "review.md")}`,
      `--json-output=${path.join(dir, "review.json")}`,
    ], {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        SITE_REVIEW_LLM_BASE_URL: "http://127.0.0.1:11434/v1",
        SITE_REVIEW_LLM_MODEL: "fixture-model",
        ...extraEnv,
      },
    });
  }

  const valid = invoke();
  assert.equal(valid.status, 0, valid.stderr);
  const result = JSON.parse(await fs.readFile(path.join(dir, "review.json"), "utf8"));
  assert.equal(result.verdict, "REQUEST_CHANGES");
  assert.equal(result.artifactDigest, createHash("sha256").update(artifact).digest("hex"));
  assert.equal(result.contextDigest, createHash("sha256").update(context).digest("hex"));
  assert.match(await fs.readFile(path.join(dir, "review.md"), "utf8"), /open-weight Evidence Reviewer/);
  assert.match(await fs.readFile(path.join(dir, "review.md"), "utf8"), /mismatch/);

  const invalid = invoke({ MOCK_INVALID: "1" });
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /invalid schema/);
  console.log("Evidence Reviewer checks passed: schema, claim classification, digests, report, invalid response rejection.");
} finally {
  await fs.rm(dir, { recursive: true, force: true });
}
