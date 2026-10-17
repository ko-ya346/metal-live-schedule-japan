// Lightweight integration assertions: real git + local bare remote, no GitHub writes.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { command, withReviewWrite, reviewInfo, saveReview, recoverReview, reviewFiles, reviewRepo } from "../src/server/candidateReview.ts";

const originalCwd = process.cwd();
const originalPath = process.env.PATH;
const originalMode = process.env.NODE_ENV;
const originalSync = process.env.CANDIDATE_REVIEW_SYNC;
const temp = await mkdtemp(path.join(tmpdir(), "candidate-review-check-"));
const root = path.join(temp, "checkout");
const remote = path.join(temp, "remote.git");
const bin = path.join(temp, "bin");
const git = (...args) => command("git", args, root);
let assertions = 0;
function check(actual, expected, message) { assert.equal(actual, expected, message); assertions++; }
try {
  await mkdir(root); await mkdir(bin); await mkdir(path.join(root, "src/data"), { recursive: true }); await mkdir(path.join(root, "scripts"));
  await command("git", ["init", "--bare", remote]);
  await git("init", "-b", "review-pr-84");
  await git("config", "user.name", "Review check"); await git("config", "user.email", "review@example.test");
  await git("remote", "add", "origin", remote);
  for (const file of reviewFiles) await writeFile(path.join(root, file), "original\n");
  await writeFile(path.join(root, "scripts/read-review-data.mjs"), 'console.log(JSON.stringify({candidateEvents:[],eventUpdateCandidates:[],publishedEvents:[]}));');
  await writeFile(path.join(root, "scripts/validate.mjs"), 'import {readFileSync} from "node:fs"; if(readFileSync("src/data/events.ts","utf8").includes("invalid"))process.exit(1);');
  await writeFile(path.join(root, "package.json"), JSON.stringify({ scripts: { "data:validate": "node scripts/validate.mjs" } }));
  await git("add", "."); await git("commit", "-m", "Fixture"); await git("push", "origin", "HEAD:refs/heads/automated-candidates-test");
  const gitDir = await git("rev-parse", "--absolute-git-dir");
  const config = { root, branch: "automated-candidates-test", localBranch: "review-pr-84", pr: 84, url: `https://github.com/${reviewRepo}/pull/84`, origin: remote };
  const pr = { state: "OPEN", headRefName: config.branch, baseRefName: "main", isCrossRepository: false, url: config.url };
  const mock = path.join(temp, "pr.json");
  await writeFile(mock, JSON.stringify(pr));
  await writeFile(path.join(bin, "gh"), '#!/usr/bin/env node\nprocess.stdout.write(require("node:fs").readFileSync(process.env.REVIEW_CHECK_PR));\n', { mode: 0o755 });
  process.env.PATH = `${bin}${path.delimiter}${originalPath}`; process.env.REVIEW_CHECK_PR = mock;
  process.env.CANDIDATE_REVIEW_SYNC = "1"; process.env.NODE_ENV = "development"; process.chdir(root);
  await writeFile(path.join(gitDir, "candidate-review.json"), JSON.stringify(config));
  const request = async (revision, origin = "http://127.0.0.1:3001") => new Request("http://127.0.0.1:3001/api/admin/candidates", { method: "POST", headers: { origin, "x-review-revision": revision ?? (await reviewInfo()).revision } });
  const remoteHead = async () => (await git("ls-remote", "origin", `refs/heads/${config.branch}`)).split(/\s/)[0];
  const base = await git("rev-parse", "HEAD");
  const writeBoth = async () => { await writeFile(reviewFiles[0], "reviewed\n"); await writeFile(reviewFiles[2], "published\n"); return Response.json({ candidate: { id: "test" } }); };

  // Next.js can normalize the URL host but preserve the browser's Host header.
  const normalized = new Request("http://localhost:3001/api/admin/candidates", { method: "POST", headers: {
    host: "127.0.0.1:3001", origin: "http://127.0.0.1:3001", "x-review-revision": (await reviewInfo()).revision,
  } });
  let response = await withReviewWrite(normalized, writeBoth);
  check(response.status, 200, "publish succeeds locally");
  check(await git("rev-parse", "HEAD"), base, "candidate action does not commit");
  check(await remoteHead(), base, "candidate action does not push");
  check((await reviewInfo()).unsentChanges, 1, "candidate action increments unsent count");
  check((await reviewInfo()).pending, false, "local save clears transaction journal");

  response = await withReviewWrite(await request(), async () => { await writeFile(reviewFiles[1], "updated\n"); return Response.json({}); });
  check(response.status, 200, "second action succeeds locally");
  check((await reviewInfo()).unsentChanges, 2, "multiple actions accumulate in one batch");
  check(await git("rev-parse", "HEAD"), base, "second action still does not commit");
  response = await withReviewWrite(await request(), async () => Response.json({}));
  check(response.status, 200, "no-op action succeeds");
  check((await reviewInfo()).unsentChanges, 2, "no-op action does not inflate unsent count");

  let invoked = false;
  const forbidden = async () => { invoked = true; return Response.json({}); };
  check((await withReviewWrite(await request("stale"), forbidden)).status, 409, "stale screen blocked");
  check((await withReviewWrite(await request(undefined, "https://evil.test"), forbidden)).status, 409, "cross-origin blocked");
  check(invoked, false, "rejected before writing");
  await writeFile("unrelated.txt", "do not commit"); await git("add", "unrelated.txt");
  check((await withReviewWrite(await request(), forbidden)).status, 409, "unrelated staged file blocked");
  await git("reset", "--", "unrelated.txt"); await rm("unrelated.txt");

  const beforeFailure = await Promise.all(reviewFiles.map((file) => readFile(file, "utf8")));
  response = await withReviewWrite(await request(), async () => { await writeFile(reviewFiles[2], "invalid\n"); return Response.json({}); });
  check(response.status, 409, "validation failure reported");
  check(JSON.stringify(await Promise.all(reviewFiles.map((file) => readFile(file, "utf8")))), JSON.stringify(beforeFailure), "validation failure preserves earlier batch");
  check((await reviewInfo()).unsentChanges, 2, "failed action does not increment count");
  response = await withReviewWrite(await request(), async () => { await writeFile(reviewFiles[0], "partial\n"); return Response.json({ error: "write failed" }, { status: 400 }); });
  check(response.status, 409, "partial write failed");
  check(await readFile(reviewFiles[0], "utf8"), beforeFailure[0], "partial write rolled back");

  // PR validity is checked once at final save, while local actions stay fast.
  for (const patch of [{ state: "MERGED" }, { isCrossRepository: true }, { headRefName: "main" }]) {
    await writeFile(mock, JSON.stringify({ ...pr, ...patch }));
    await assert.rejects(async () => saveReview(await request()), /対象PR/); assertions++;
    check(await git("rev-parse", "HEAD"), base, "invalid PR leaves local batch uncommitted");
  }
  await writeFile(mock, JSON.stringify(pr));
  await saveReview(await request());
  const firstSaved = await git("rev-parse", "HEAD");
  check(await remoteHead(), firstSaved, "final save reaches remote");
  check(await git("log", "-1", "--pretty=%s"), "Apply human candidate review", "batch uses one clear commit message");
  check((await git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD")).split("\n").sort().join(), reviewFiles.slice().sort().join(), "all reviewed files share one commit");
  check((await reviewInfo()).unsentChanges, 0, "successful save clears batch");

  // Push failure keeps the single local commit and retries it without duplication.
  response = await withReviewWrite(await request(), async () => { await writeFile(reviewFiles[2], "retry-value\n"); return Response.json({}); });
  check(response.status, 200, "new batch starts after save");
  const hook = path.join(remote, "hooks/pre-receive");
  await writeFile(hook, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  await assert.rejects(async () => saveReview(await request()), /送信に失敗/); assertions++;
  const retryCommit = await git("rev-parse", "HEAD");
  check((await reviewInfo()).pending, true, "unsent commit persists");
  check(await readFile(reviewFiles[2], "utf8"), "retry-value\n", "failed push preserves review");
  check((await withReviewWrite(await request(), forbidden)).status, 409, "no new mutation while commit is pending");
  await rm(hook);
  await saveReview(await request());
  check(await remoteHead(), retryCommit, "retry pushes same commit");
  await saveReview(await request());
  check(await git("rev-parse", "HEAD"), retryCommit, "repeat save does not duplicate commit");

  // Remote changed after local review: never overwrite the other writer.
  response = await withReviewWrite(await request(), async () => { await writeFile(reviewFiles[0], "conflict-value\n"); return Response.json({}); });
  check(response.status, 200, "conflict fixture saved locally");
  const competing = await git("commit-tree", "HEAD^{tree}", "-p", "HEAD", "-m", "Another writer");
  await git("push", "origin", `${competing}:refs/heads/${config.branch}`);
  await assert.rejects(async () => saveReview(await request()), /別の場所で更新/); assertions++;
  check(await git("rev-parse", "HEAD"), retryCommit, "remote conflict leaves local head untouched");
  check((await reviewInfo()).unsentChanges, 1, "remote conflict preserves local batch");
  await git("push", "--force", "origin", `${retryCommit}:refs/heads/${config.branch}`);
  await saveReview(await request());

  // A crash leaves a journal; explicit recovery restores only the interrupted action.
  const recoveryBase = await git("rev-parse", "HEAD");
  response = await withReviewWrite(await request(), async () => { await writeFile(reviewFiles[1], "kept-batch\n"); return Response.json({}); });
  check(response.status, 200, "recovery fixture batch created");
  const originals = await Promise.all(reviewFiles.map((file) => readFile(file, "utf8")));
  const previousBatch = { base: recoveryBase, actions: 1 };
  await writeFile(path.join(gitDir, "candidate-review-batch.json"), JSON.stringify({ base: recoveryBase, actions: 2 }));
  await writeFile(path.join(gitDir, "candidate-review-pending.json"), JSON.stringify({ base: recoveryBase, originals, previousBatch }));
  await writeFile(reviewFiles[0], "interrupted\n");
  await recoverReview();
  check(await readFile(reviewFiles[0], "utf8"), originals[0], "crash recovery restores pre-operation files");
  check((await reviewInfo()).pending, false, "recovery clears pending marker");
  check((await reviewInfo()).unsentChanges, 1, "recovery restores earlier batch count");

  await mkdir(path.join(gitDir, "candidate-review.lock"));
  check((await withReviewWrite(await request(), forbidden)).status, 409, "parallel writer locked out");
  await rm(path.join(gitDir, "candidate-review.lock"), { recursive: true });
  await git("reset", "--hard", "HEAD"); await rm(path.join(gitDir, "candidate-review-batch.json"));
  await git("switch", "-c", "main");
  await assert.rejects(reviewInfo, /ブランチ/); assertions++;
  process.env.NODE_ENV = "production";
  check(await reviewInfo(), null, "production mode disabled even with flag");
  await assert.rejects(() => saveReview(new Request("http://127.0.0.1:3001", { method: "POST" })), /専用モード/); assertions++;
  console.log(`Candidate review checks passed (${assertions} assertions).`);
} finally {
  process.chdir(originalCwd); process.env.PATH = originalPath;
  if (originalMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalMode;
  if (originalSync === undefined) delete process.env.CANDIDATE_REVIEW_SYNC; else process.env.CANDIDATE_REVIEW_SYNC = originalSync;
  delete process.env.REVIEW_CHECK_PR;
  await rm(temp, { recursive: true, force: true });
}
