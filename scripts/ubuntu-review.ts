// Proposal-only pilot. No code editing, publishing, approval or merge capability.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = process.cwd();
const stateDir = path.resolve(process.env.UBUNTU_REVIEW_STATE_DIR || path.join(os.homedir(), ".local/state/metals-calendar"));
const mode = process.argv[2] || "review";
if (!["review", "prompt-only", "notify"].includes(mode)) throw new Error("Expected review, prompt-only or notify");
const day = process.env.UBUNTU_REVIEW_DATE || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day) {
  throw new Error("UBUNTU_REVIEW_DATE must be a valid YYYY-MM-DD");
}
if (process.env.UBUNTU_REVIEW_DATE && mode !== "notify") throw new Error("Date override is only for resending notifications");
const runDir = path.join(stateDir, mode === "prompt-only" ? `${day}-prompt` : day);
const resultPath = path.join(runDir, "result.json");
const reportPath = path.join(runDir, "report.md");
const pendingPath = path.join(runDir, "notification.md");
const model = process.env.SITE_REVIEW_LLM_MODEL || "metals-review:8b";

async function run(args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: "inherit", timeout: 20 * 60 * 1000 });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`Review exited: ${code ?? signal}`)));
  });
}

async function notify() {
  const body = await fs.readFile(pendingPath, "utf8");
  const token = process.env.GH_TOKEN;
  if (!token) {
    console.log(`Notification pending (GH_TOKEN unavailable): ${pendingPath}`);
    return;
  }
  // Fixed destination: model output cannot choose a repository, Issue, or API URL.
  const endpoint = "https://api.github.com/repos/ko-ya346/metal-live-schedule-japan/issues/78/comments";
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const marker = body.split("\n", 1)[0];
  // Check all pages: a lost HTTP response must not create duplicate comments on retry.
  for (let page = 1; ; page++) {
    const response = await fetch(`${endpoint}?per_page=100&page=${page}`, { headers, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`GitHub read HTTP ${response.status}`);
    const comments = await response.json() as { body: string }[];
    if (comments.some(comment => comment.body.startsWith(marker))) {
      await fs.writeFile(path.join(runDir, "notified"), marker);
      console.log("Already notified");
      return;
    }
    if (comments.length < 100) break;
  }
  const response = await fetch(endpoint, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ body }), signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub write HTTP ${response.status}`);
  await fs.writeFile(path.join(runDir, "notified"), marker);
  console.log("Notified Issue #78");
}

await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
const lock = path.join(stateDir, "review.lock");
await fs.mkdir(lock); // An existing lock fails closed. Inspect PID before manual recovery.
try {
  await fs.writeFile(path.join(lock, "owner.json"), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  await fs.mkdir(runDir, { recursive: true, mode: 0o700 });
  if (mode === "notify") {
    await notify();
  } else {
    const completed = await fs.access(path.join(runDir, "finished.json")).then(() => true, () => false);
    if (completed && mode === "review") {
      console.log("Today's run already finished; retry only its pending notification");
      await notify();
      const previous = JSON.parse(await fs.readFile(path.join(runDir, "finished.json"), "utf8"));
      if (previous.status === "failed") process.exitCode = 1;
    } else {
      // Only expose the review process to explicitly required variables; never GH_TOKEN.
      const env: NodeJS.ProcessEnv = {
        NODE_ENV: "production",
        PATH: process.env.PATH, HOME: process.env.HOME, LANG: process.env.LANG,
        SITE_REVIEW_LLM_BASE_URL: "http://127.0.0.1:11434/v1",
        SITE_REVIEW_LLM_MODEL: model,
        SITE_REVIEW_LLM_REASONING_EFFORT: "none",
      };
      const startedAt = new Date().toISOString();
      let status = "success";
      let report = "";
      let baseSha = "unknown";
      let modelDigest = "unknown";
      let scriptDigest = "unknown";
      try {
        // The dedicated checkout must not contain application secrets.
        if (await fs.access(path.join(root, ".env.local")).then(() => true, () => false)) {
          throw new Error("Use a dedicated checkout without .env.local");
        }
        baseSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
        scriptDigest = createHash("sha256")
          .update(await fs.readFile(new URL(import.meta.url)))
          .update(await fs.readFile(path.join(root, "scripts/site-review-agent.mjs")))
          .digest("hex");
        if (mode !== "prompt-only") {
          const response = await fetch("http://127.0.0.1:11434/api/tags", { signal: AbortSignal.timeout(10_000) });
          if (!response.ok) throw new Error(`Ollama tags HTTP ${response.status}`);
          const data = await response.json() as { models: { name: string; digest: string }[] };
          const installed = data.models.find(item => item.name === model);
          if (!installed) throw new Error(`Model not installed: ${model}`);
          modelDigest = installed.digest;
        }
        await run(["--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/site-review-agent.mjs",
          "--compact", `--output=${reportPath}`, `--json-output=${resultPath}`, ...(mode === "prompt-only" ? ["--prompt-only"] : [])], env);
        if (mode === "prompt-only") {
          console.log(`Prompt saved: ${reportPath}`);
        } else {
          const result = JSON.parse(await fs.readFile(resultPath, "utf8")) as { skippedReason?: string };
          if (result.skippedReason) throw new Error(result.skippedReason);
          report = await fs.readFile(reportPath, "utf8");
        }
      } catch (error) {
        status = "failed";
        report = `Review failed: ${error instanceof Error ? error.message : String(error)}`;
      }
      if (mode !== "prompt-only") {
        const hash = createHash("sha256").update(report).digest("hex").slice(0, 16);
        const body = `<!-- ubuntu-review:${day}:${hash} -->\n## Ubuntu提案専用試行 ${day}\n\n状態: ${status} / モデル: ${model}\n実装・公開・マージは行っていません。モデルの提案は未検証です。\n\n${report.slice(0, 30_000)}`;
        await fs.writeFile(pendingPath, body);
        await fs.writeFile(path.join(runDir, "finished.json"), JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), status, model, modelDigest, baseSha, scriptDigest, promptVersion: 1 }, null, 2));
        await notify();
      }
      if (status === "failed") process.exitCode = 1;
    }
  }
} finally {
  await fs.rm(lock, { recursive: true });
}
