import { rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { command, reviewRepo, recoverReview } from "../src/server/candidateReview.ts";

if (process.argv[2] === "--recover") {
  await recoverReview();
  console.log("中断したファイル保存を操作前に戻しました。確認操作をやり直してください。");
  process.exit(0);
}
const number = process.argv[2];
if (!/^\d+$/.test(number ?? "")) throw new Error("Usage: npm run candidates:review -- <PR番号>");
const source = await command("git", ["rev-parse", "--show-toplevel"]);
const git = (...args) => command("git", args, source);
const origin = await git("remote", "get-url", "origin");
const allowedOrigins = [`git@github.com:${reviewRepo}.git`, `https://github.com/${reviewRepo}.git`, `https://github.com/${reviewRepo}`, `ssh://git@github.com/${reviewRepo}.git`];
if (!allowedOrigins.includes(origin)) throw new Error("このリポジトリのoriginからのみ起動できます。");
async function getPR() {
  const pr = JSON.parse(await command("gh", ["pr", "view", number, "--repo", reviewRepo,
    "--json", "state,headRefName,baseRefName,isCrossRepository,url,headRefOid"], source));
  if (pr.state !== "OPEN" || pr.isCrossRepository || pr.baseRefName !== "main" || ["main", "master"].includes(pr.headRefName)) {
    throw new Error("同じリポジトリ内の、mainを対象とする未マージPRを指定してください。");
  }
  return pr;
}
const pr = await getPR();
await git("fetch", "origin", "main", pr.headRefName);
const root = path.join(homedir(), ".local/share/metals-calendar/reviews", `pr-${number}`);
await mkdir(path.dirname(root), { recursive: true });
let exists = false;
try { await readFile(path.join(root, ".git")); exists = true; }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (!exists) {
  // A distinct local branch avoids switching or reusing the developer's checkout.
  await git("worktree", "add", "-b", `review-pr-${number}`, root, `origin/${pr.headRefName}`);
}
const runGit = (...args) => command("git", args, root);
const gitDir = await runGit("rev-parse", "--absolute-git-dir");
const sessionLock = path.join(gitDir, "candidate-review-session.lock");
try {
  const pid = Number(await readFile(path.join(sessionLock, "pid"), "utf8"));
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("起動ロックを確認してください。");
  try { process.kill(pid, 0); throw new Error("このPRのレビュー環境はすでに起動しています。"); }
  catch (error) { if (error.code !== "ESRCH") throw error; }
  rmSync(sessionLock, { recursive: true });
} catch (error) { if (error.code !== "ENOENT") throw error; }
await mkdir(sessionLock);
await writeFile(path.join(sessionLock, "pid"), String(process.pid));
process.on("exit", () => rmSync(sessionLock, { recursive: true, force: true }));
const marker = path.join(gitDir, "candidate-review.json");
// Git uses a dedicated local branch; its name must be stable throughout the session.
const localBranch = await runGit("branch", "--show-current");
if (localBranch !== `review-pr-${number}`) throw new Error("レビュー用のローカルブランチが変わっています。");
let pending = false;
try { await readFile(path.join(gitDir, "candidate-review-pending.json")); pending = true; }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (await runGit("status", "--porcelain")) throw new Error(`未保存の変更があります。${root} の差分を確認してください。`);
if (!pending) {
  await runGit("fetch", "origin", "main", pr.headRefName);
  await runGit("merge", "--ff-only", `origin/${pr.headRefName}`);
  // Existing candidate PRs receive the reviewed implementation after it lands on main.
  await runGit("merge", "--no-edit", "origin/main");
}
await writeFile(marker, JSON.stringify({ root, branch: pr.headRefName, localBranch, pr: Number(number), url: pr.url, origin }), { mode: 0o600 });
console.log(`レビュー環境: ${root}\n対象PR: ${pr.url}`);
async function run(file, args, env = process.env) {
  await new Promise((resolve, reject) => {
    const child = spawn(file, args, { cwd: root, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${file} exited ${code}`)));
  });
}
await run("npm", ["ci", "--no-audit", "--no-fund"]);
if (!pending) {
  for (const check of ["data:validate", "copy:check", "build"]) await run("npm", ["run", check]);
  const current = await getPR();
  if (current.headRefOid !== pr.headRefOid) throw new Error("準備中にPRが更新されました。起動コマンドをやり直してください。");
  await runGit("push", "origin", `HEAD:refs/heads/${pr.headRefName}`);
}
console.log("http://127.0.0.1:3001/admin/candidates を開いてください。終了は Ctrl+C。");
await run("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3001"], {
  ...process.env, CANDIDATE_REVIEW_SYNC: "1",
});
