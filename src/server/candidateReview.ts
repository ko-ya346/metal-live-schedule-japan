import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rm, rename, realpath } from "node:fs/promises";
import path from "node:path";
import type { CandidateEvent } from "../data/candidate_events";
import type { EventUpdateCandidate } from "../data/event_update_candidates";
import type { Event } from "../data/events";

const exec = promisify(execFile);
export const reviewFiles = ["src/data/candidate_events.ts", "src/data/event_update_candidates.ts", "src/data/events.ts"];
export const reviewRepo = "ko-ya346/metal-live-schedule-japan";
export type ReviewInfo = { revision: string; url: string; pending: boolean };
type Config = { root: string; localBranch: string; branch: string; pr: number; url: string; origin: string };
type Journal = { base: string; commit?: string; originals: string[] };
export type ReviewData = { candidateEvents: CandidateEvent[]; eventUpdateCandidates: EventUpdateCandidate[]; publishedEvents: Event[] };

export function reviewEnabled() {
  return process.env.CANDIDATE_REVIEW_SYNC === "1" && process.env.NODE_ENV !== "production";
}

export async function command(file: string, args: string[], cwd = process.cwd()) {
  const result = await exec(file, args, { cwd, timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  return result.stdout.trim();
}
const git = (...args: string[]) => command("git", args);
async function storage() {
  return git("rev-parse", "--absolute-git-dir");
}
async function config(): Promise<Config> {
  const value = JSON.parse(await readFile(path.join(await storage(), "candidate-review.json"), "utf8")) as Config;
  if (await realpath(value.root) !== await realpath(process.cwd()) || !value.branch || !value.localBranch || [value.branch, value.localBranch].some((branch) => ["main", "master"].includes(branch)) ||
      await git("branch", "--show-current") !== value.localBranch || await git("remote", "get-url", "origin") !== value.origin) {
    throw new Error("レビュー専用作業場所・ブランチが変わっています。起動コマンドからやり直してください。");
  }
  return value;
}
async function journal(): Promise<Journal | null> {
  try { return JSON.parse(await readFile(path.join(await storage(), "candidate-review-pending.json"), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
async function saveJournal(value: Journal) {
  const file = path.join(await storage(), "candidate-review-pending.json");
  await writeFile(`${file}.tmp`, JSON.stringify(value), { mode: 0o600 });
  await rename(`${file}.tmp`, file);
}
async function clearJournal() { await rm(path.join(await storage(), "candidate-review-pending.json"), { force: true }); }
async function contents() { return Promise.all(reviewFiles.map((file) => readFile(/* turbopackIgnore: true */ file, "utf8"))); }
async function revision() { return createHash("sha256").update(JSON.stringify([await git("rev-parse", "HEAD"), await contents()])).digest("hex"); }
export async function reviewInfo(): Promise<ReviewInfo | null> {
  if (!reviewEnabled()) return null;
  const settings = await config();
  return { revision: await revision(), url: settings.url, pending: !!await journal() };
}
class ReviewBusyError extends Error {}

async function locked<T>(operation: () => Promise<T>) {
  const lock = path.join(await storage(), "candidate-review.lock");
  try { await mkdir(lock); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    throw new ReviewBusyError("保存処理中です。少し待って再読み込みしてください。停止後も続く場合は運用手順のロック復旧を確認してください。");
  }
  try { return await operation(); } finally { await rm(lock, { recursive: true, force: true }); }
}
export async function readReviewData(): Promise<ReviewData> {
  // A new process avoids the module cache after file writes / Next.js hot reload.
  return JSON.parse(await command(process.execPath, ["--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/read-review-data.mjs"]));
}
export async function reviewPageData() {
  if (!reviewEnabled()) return null;
  // Dev hot reload can request the page while the API is saving data.
  // Wait for its transaction instead of rendering a half-written snapshot.
  for (let attempt = 0; ; attempt++) {
    try { return await locked(async () => ({ data: await readReviewData(), info: await reviewInfo() })); }
    catch (error) {
      if (!(error instanceof ReviewBusyError) || attempt >= 120) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}
export function assertReviewOrigin(request: Request) {
  // Next.js may normalize request.url to localhost even when the browser uses
  // 127.0.0.1. Check the actual Host header, restricted to loopback hosts.
  const requestUrl = new URL(request.url);
  const url = new URL(`${requestUrl.protocol}//${request.headers.get("host") ?? requestUrl.host}`);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || request.headers.get("origin") !== url.origin) {
    throw new Error("レビュー保存は同じローカル画面からのみ実行できます。");
  }
}
async function checkPR(settings: Config) {
  const pr = JSON.parse(await command("gh", ["pr", "view", String(settings.pr), "--repo", reviewRepo,
    "--json", "state,headRefName,baseRefName,isCrossRepository,url"]));
  if (pr.state !== "OPEN" || pr.isCrossRepository || pr.headRefName !== settings.branch || pr.baseRefName !== "main" || pr.url !== settings.url) {
    throw new Error("対象PRが開いていない、またはブランチが変更されています。保存を中止しました。");
  }
}
async function remoteHead(settings: Config) {
  return (await git("ls-remote", "--heads", "origin", `refs/heads/${settings.branch}`)).split(/\s/)[0];
}
async function clean() {
  if (await git("status", "--porcelain")) throw new Error("作業場所に別の変更があります。自動保存を停止しました。変更を確認してください。");
}
async function pushPending(settings: Config, pending: Journal) {
  if (!pending.commit) throw new Error("ファイル保存が中断されています。運用手順の復旧コマンドを実行してください。");
  await clean();
  if (await git("rev-parse", "HEAD") !== pending.commit) throw new Error("保存後にHEADが変わっています。自動再送を停止しました。");
  await checkPR(settings);
  const remote = await remoteHead(settings);
  if (remote !== pending.commit) {
    if (remote !== pending.base) throw new Error("PRが別の場所で更新されています。結果はローカルに保持しました。競合の解消が必要です。");
    try { await git("push", "origin", `${pending.commit}:refs/heads/${settings.branch}`); }
    catch { // The server may have accepted the push before the connection failed.
      if (await remoteHead(settings) !== pending.commit) throw new Error("PRへの送信に失敗しました。確認結果は保持しています。「PRへ再送」を押してください。");
    }
  }
  if (await remoteHead(settings) !== pending.commit) throw new Error("PRの保存確認に失敗しました。再送で状態を確認してください。");
  await checkPR(settings);
  await clearJournal();
}
export async function retryReview(request: Request) {
  if (!reviewEnabled()) throw new Error("レビュー専用モードではありません。");
  assertReviewOrigin(request);
  return locked(async () => {
    const settings = await config();
    const pending = await journal();
    if (pending) await pushPending(settings, pending);
    return reviewInfo();
  });
}

export async function withReviewWrite(request: Request, operation: (data?: ReviewData) => Promise<Response>): Promise<Response> {
  if (!reviewEnabled()) return operation();
  try {
    assertReviewOrigin(request);
    return await locked(async () => {
      const settings = await config();
      if (await journal()) throw new Error("前の確認結果が未送信です。再読み込みして「PRへ再送」を押してください。");
      if (request.headers.get("x-review-revision") !== await revision()) throw new Error("画面を開いた後にデータが変わりました。再読み込みして確認してください。");
      await clean();
      await checkPR(settings);
      const base = await git("rev-parse", "HEAD");
      if (await remoteHead(settings) !== base) throw new Error("PRが更新されています。レビュー環境を再起動してください。");
      const pending: Journal = { base, originals: await contents() };
      await saveJournal(pending);
      let response: Response;
      try {
        response = await operation(await readReviewData());
        if (!response.ok) throw new Error((await response.clone().json()).error ?? "保存に失敗しました。");
        await command("npm", ["run", "data:validate"]);
        // Only the three review data files may be changed or staged.
        const changed = (await git("diff", "--name-only", "HEAD")).split("\n").filter(Boolean);
        if (changed.some((file) => !reviewFiles.includes(file)) || await git("diff", "--cached", "--name-only")) {
          throw new Error("別の変更を検出したため保存を中止しました。");
        }
        if (changed.length) {
          await git("add", "--", ...reviewFiles);
          await git("commit", "--only", "-m", "Save human candidate review", "--", ...reviewFiles);
          pending.commit = await git("rev-parse", "HEAD");
          await saveJournal(pending);
        } else { await clearJournal(); }
      } catch (error) {
        // Never erase a commit if interruption occurred just after git commit.
        if (await git("rev-parse", "HEAD") === base) {
          await Promise.all(reviewFiles.map((file, index) => writeFile(file, pending.originals[index])));
          await git("reset", "--", ...reviewFiles);
          await clearJournal();
        }
        throw error;
      }
      if (pending.commit) await pushPending(settings, pending);
      return response;
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "PRへの保存に失敗しました。" }, { status: 409 });
  }
}

// Explicit recovery is local-only and never pushes or discards an existing commit.
export async function recoverReview() {
  return locked(async () => {
    await config();
    const pending = await journal();
    if (!pending || pending.commit) throw new Error("復旧対象の中断ファイル保存がありません。送信待ちは画面から再送してください。");
    if (await git("rev-parse", "HEAD") !== pending.base) throw new Error("HEADが変わっています。手動で差分を確認してください。");
    await Promise.all(reviewFiles.map((file, index) => writeFile(file, pending.originals[index])));
    await git("reset", "--", ...reviewFiles);
    await clearJournal();
  });
}
