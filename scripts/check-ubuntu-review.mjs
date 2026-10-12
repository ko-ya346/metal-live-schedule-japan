// Lightweight isolated checks; no model, GitHub request, or test dependency required.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const runner = path.resolve("scripts/ubuntu-review.ts");
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "metal-review-check-"));
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
try {
  await fs.mkdir(path.join(dir, "scripts"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["-c", "user.name=Check", "-c", "user.email=check@example.invalid", "commit", "--allow-empty", "-qm", "fixture"], { cwd: dir });
  await fs.writeFile(path.join(dir, "scripts/site-review-agent.mjs"), `
import fs from 'node:fs/promises';
if (process.env.GH_TOKEN) throw new Error('Credential leaked into reviewer');
const args = process.argv.slice(2);
const output = args.find(a => a.startsWith('--output=')).slice(9);
const json = args.find(a => a.startsWith('--json-output=')).slice(14);
const prompt = args.find(a => a.startsWith('--prompt-output='))?.slice(16);
await fs.writeFile(output, args.includes('--prompt-only') ? 'prompt' : 'fixture report');
await fs.writeFile(json, JSON.stringify({ findings: [{ title: 'fixture' }] }));
if (prompt) await fs.writeFile(prompt, 'fixture context');
await fs.appendFile('calls', 'review\\n');
`);
  await fs.writeFile(path.join(dir, "scripts/review-site-artifact.mjs"), `
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
if (process.env.GH_TOKEN) throw new Error('Credential leaked into evidence reviewer');
const args = process.argv.slice(2);
const get = name => args.find(a => a.startsWith(name + '=')).slice(name.length + 1);
if (await fs.access('fail-evidence-review').then(() => true, () => false)) process.exit(1);
const context = await fs.readFile(get('--context'), 'utf8');
const artifact = await fs.readFile(get('--artifact'), 'utf8');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const result = {
 verdict: 'REQUEST_CHANGES', summary: 'fixture review', promptVersion: 1, durationMs: 5,
 artifactDigest: digest(artifact), contextDigest: digest(context),
 candidateReviews: [{ candidateIndex: 1, title: 'fixture', verdict: 'REQUEST_CHANGES', summary: 'check evidence', claims: [] }],
};
await fs.writeFile(get('--json-output'), JSON.stringify(result));
await fs.writeFile(get('--output'), '## B. open-weight Evidence Reviewer\\n\\nfixture');
await fs.appendFile('calls', 'evidence\\n');
`);
  const mock = path.join(dir, "mock.mjs");
  await fs.writeFile(mock, `
import fs from 'node:fs/promises';
globalThis.fetch = async (url, options = {}) => {
 if (url === 'http://127.0.0.1:11434/api/tags') return Response.json({ models: [{ name: 'metals-review:8b', digest: 'fixture-digest' }] });
 if (!String(url).startsWith('https://api.github.com/repos/ko-ya346/metal-live-schedule-japan/issues/78/comments')) throw new Error('Unexpected URL');
 const comments = JSON.parse(await fs.readFile('comments.json', 'utf8').catch(() => '[]'));
 if (options.method === 'POST') {
   comments.push(JSON.parse(options.body));
   await fs.writeFile('comments.json', JSON.stringify(comments));
   return Response.json({}, { status: 201 });
 }
 return Response.json(comments);
};
`);
  function invoke(mode, state = "state", token = "", extraEnv = {}) {
    return spawnSync(process.execPath, ["--import", mock, "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", runner, mode], {
      cwd: dir, encoding: "utf8", env: {
        PATH: process.env.PATH, HOME: dir, GH_TOKEN: token,
        UBUNTU_REVIEW_STATE_DIR: path.join(dir, state),
        ...extraEnv,
      },
    });
  }
  const run = invoke("review");
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Notification pending/);
  const initial = JSON.parse(await fs.readFile(path.join(dir, "state", day, "finished.json")));
  assert.equal(initial.modelDigest, "fixture-digest");
  assert.equal(initial.status, "success");
  assert.equal(initial.evidenceReview.status, "completed");
  assert.equal(initial.evidenceReview.experimentRun, 1);
  assert.equal(initial.artifactDigest, initial.evidenceReview.artifactDigest);
  assert.equal(initial.contextDigest, initial.evidenceReview.contextDigest);
  assert.equal(invoke("review").status, 0);
  assert.equal(await fs.readFile(path.join(dir, "calls"), "utf8"), "review\nevidence\n");
  assert.equal(invoke("prompt-only").status, 0);
  assert.equal(await fs.readFile(path.join(dir, "state", day, "report.md"), "utf8"), "fixture report");
  assert.equal(invoke("notify", "state", "fake-test-token").status, 0);
  assert.equal(invoke("notify", "state", "fake-test-token").status, 0);
  const comments = JSON.parse(await fs.readFile(path.join(dir, "comments.json")));
  assert.equal(comments.length, 1);
  assert.match(comments[0].body, /A\. open-weight Generator/);
  assert.match(comments[0].body, /B\. open-weight Evidence Reviewer/);
  assert.match(comments[0].body, /C\. Human decision/);
  assert.equal(invoke("review", "credential-test", "fake-test-token").status, 0);
  const credentialRun = JSON.parse(await fs.readFile(path.join(dir, "credential-test", day, "finished.json")));
  assert.equal(credentialRun.evidenceReview.status, "completed");
  await fs.writeFile(path.join(dir, "fail-evidence-review"), "1");
  assert.equal(invoke("review", "reviewer-failure").status, 0);
  const reviewerFailure = JSON.parse(await fs.readFile(path.join(dir, "reviewer-failure", day, "finished.json")));
  assert.equal(reviewerFailure.status, "success");
  assert.equal(reviewerFailure.evidenceReview.status, "failed");
  await fs.rm(path.join(dir, "fail-evidence-review"));
  const cappedState = path.join(dir, "capped");
  for (const name of ["run-a", "run-b", "run-c"]) {
    await fs.mkdir(path.join(cappedState, name), { recursive: true });
    await fs.writeFile(path.join(cappedState, name, "finished.json"), JSON.stringify({ evidenceReview: { status: "completed" } }));
  }
  assert.equal(invoke("review", "capped").status, 0);
  const capped = JSON.parse(await fs.readFile(path.join(cappedState, day, "finished.json")));
  assert.equal(capped.evidenceReview.status, "skipped");
  assert.equal(capped.evidenceReview.reason, "experiment_limit_reached");
  await fs.mkdir(path.join(dir, "state", "review.lock"));
  assert.notEqual(invoke("review").status, 0);
  await fs.rm(path.join(dir, "state", "review.lock"), { recursive: true });
  await fs.writeFile(path.join(dir, ".env.local"), "FAKE_SECRET=fixture\n");
  assert.equal(invoke("review", "failure").status, 1);
  assert.equal(invoke("review", "failure").status, 1);
  const failed = JSON.parse(await fs.readFile(path.join(dir, "failure", day, "finished.json")));
  assert.equal(failed.status, "failed");
  assert.notEqual(invoke("implement").status, 0);
  assert.notEqual(invoke("notify", "state", "", { UBUNTU_REVIEW_DATE: "../../bad" }).status, 0);
  assert.notEqual(invoke("notify", "state", "", { UBUNTU_REVIEW_DATE: "2026-02-30" }).status, 0);
  assert.notEqual(invoke("review", "state", "", { UBUNTU_REVIEW_DATE: day }).status, 0);
  console.log("Ubuntu review checks passed: evidence shadow, hashes, three-run cap, pending notification, rerun, prompt isolation, deduplication, credentials, lock, failures, invalid mode.");
} finally {
  await fs.rm(dir, { recursive: true, force: true });
}
