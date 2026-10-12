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
const contextPath = path.join(runDir, "generator-context.txt");
const generatorAttemptsPath = path.join(runDir, "generator-attempts.json");
const generatorHistoryPath = path.join(runDir, "generator-history.json");
const evidenceResultPath = path.join(runDir, "evidence-review.json");
const evidenceReportPath = path.join(runDir, "evidence-review.md");
const pendingPath = path.join(runDir, "notification.md");
const model = process.env.SITE_REVIEW_LLM_MODEL || "metals-review:8b";
const evidenceReviewMaxRuns = 3;

type EvidenceCandidateReview = {
  candidateIndex: number;
  title: string;
  verdict: "APPROVE" | "REQUEST_CHANGES" | "REJECT";
  summary: string;
  claims: Array<{
    claim: string;
    classification: "supported" | "mismatch" | "unsupported";
    source: string;
    reason: string;
  }>;
};

type EvidenceReviewerOutput = {
  verdict: "APPROVE" | "REQUEST_CHANGES" | "REJECT";
  artifactDigest: string;
  contextDigest: string;
  promptVersion: number;
  durationMs: number;
  candidateReviews: EvidenceCandidateReview[];
};

type EvidenceReviewState = {
  status: "completed" | "failed" | "skipped";
  reason?: string;
  experimentRun?: number;
  completedRuns?: number;
  maxRuns: number;
  verdict?: EvidenceReviewerOutput["verdict"];
  artifactDigest?: string;
  contextDigest?: string;
  reviewDigest?: string;
  promptVersion?: number;
  durationMs?: number;
  candidateReviews?: EvidenceCandidateReview[];
};

type GeneratorAttemptState = {
  attemptCount: number;
  initialAttemptSucceeded: boolean;
  retryCount: number;
  finalStatus: "success" | "failed" | "unknown";
};

type GeneratorHistoryFinding = {
  title: string;
  category: string;
  observation: string;
  evidence: string[];
};

type GeneratorHistory = {
  schemaVersion: 1;
  sourceRuns: Array<{
    runId: string;
    finishedAt: string;
    findings: GeneratorHistoryFinding[];
  }>;
  findingCount: number;
};

async function run(args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: "inherit", timeout: 20 * 60 * 1000 });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`Review exited: ${code ?? signal}`)));
  });
}

async function getEvidenceReviewRunCount(): Promise<number> {
  const entries = await fs.readdir(stateDir, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.endsWith("-prompt") || entry.name === "review.lock") continue;
    try {
      const finished = JSON.parse(await fs.readFile(path.join(stateDir, entry.name, "finished.json"), "utf8"));
      if (["completed", "failed"].includes(finished?.evidenceReview?.status)) count += 1;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  return count;
}

async function collectGeneratorHistory(): Promise<GeneratorHistory> {
  const entries = await fs.readdir(stateDir, { withFileTypes: true });
  const runs: GeneratorHistory["sourceRuns"] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || path.join(stateDir, entry.name) === runDir || entry.name.endsWith("-prompt") || entry.name === "review.lock") continue;
    try {
      const [finished, result] = await Promise.all([
        fs.readFile(path.join(stateDir, entry.name, "finished.json"), "utf8").then(JSON.parse),
        fs.readFile(path.join(stateDir, entry.name, "result.json"), "utf8").then(JSON.parse),
      ]);
      if (finished?.status !== "success" || !Array.isArray(result?.findings)) continue;
      const findings = result.findings.flatMap((finding: unknown): GeneratorHistoryFinding[] => {
        if (!finding || typeof finding !== "object") return [];
        const value = finding as Record<string, unknown>;
        if (typeof value.title !== "string" || typeof value.category !== "string" || typeof value.observation !== "string" || !Array.isArray(value.evidence)) return [];
        return [{
          title: value.title,
          category: value.category,
          observation: value.observation,
          evidence: value.evidence.filter((item): item is string => typeof item === "string"),
        }];
      });
      runs.push({ runId: entry.name, finishedAt: String(finished.finishedAt ?? ""), findings });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  runs.sort((left, right) => right.finishedAt.localeCompare(left.finishedAt) || right.runId.localeCompare(left.runId));
  let remaining = 18;
  const sourceRuns = runs.slice(0, 6).flatMap((run) => {
    if (remaining === 0) return [];
    const findings = run.findings.slice(0, remaining);
    remaining -= findings.length;
    return findings.length > 0 ? [{ ...run, findings }] : [];
  });
  return {
    schemaVersion: 1,
    sourceRuns,
    findingCount: sourceRuns.reduce((total, run) => total + run.findings.length, 0),
  };
}

function buildHumanReviewCard(evidenceReview: EvidenceReviewState): string {
  const lines = [
    "## C. Human decision（ここだけ確認してください）",
    "",
    "Evidence Reviewerは助言だけを行います。採用、REQUEST CHANGES、却下の最終判断は人間が行います。",
    "",
  ];

  if (evidenceReview.status !== "completed") {
    lines.push(
      `Reviewer状態: **${evidenceReview.status}**${evidenceReview.reason ? `（${evidenceReview.reason}）` : ""}`,
      "",
      "Reviewerが完了していないため、提案を次工程へ進めず、実行状態だけ確認してください。",
    );
    return lines.join("\n");
  }

  lines.push(
    "| 候補 | Generatorの提案 | Reviewer推奨 | Human decision |",
    "|---:|---|---|---|",
  );
  for (const candidate of evidenceReview.candidateReviews ?? []) {
    const title = String(candidate.title).replaceAll("|", "\\|").replaceAll("\n", " ");
    lines.push(`| ${candidate.candidateIndex} | ${title} | **${candidate.verdict}** | 未決定 |`);
  }
  lines.push("", "回答例: `1却下、2 REQUEST CHANGES、3採用、確認2分`");
  return lines.join("\n");
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
      let artifactDigest = "unknown";
      let contextDigest = "unknown";
      let generatorFindingCount = 0;
      let generatorAttempts: GeneratorAttemptState | null = null;
      let generatorHistoryDigest = "unknown";
      let generatorHistoryFindingCount = 0;
      let evidenceReview: EvidenceReviewState = {
        status: "skipped",
        reason: mode === "prompt-only" ? "prompt_only" : "generator_not_completed",
        maxRuns: evidenceReviewMaxRuns,
      };
      try {
        // The dedicated checkout must not contain application secrets.
        if (await fs.access(path.join(root, ".env.local")).then(() => true, () => false)) {
          throw new Error("Use a dedicated checkout without .env.local");
        }
        baseSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
        scriptDigest = createHash("sha256")
          .update(await fs.readFile(new URL(import.meta.url)))
          .update(await fs.readFile(path.join(root, "scripts/site-review-agent.mjs")))
          .update(await fs.readFile(path.join(root, "scripts/review-site-artifact.mjs")))
          .digest("hex");
        if (mode !== "prompt-only") {
          const response = await fetch("http://127.0.0.1:11434/api/tags", { signal: AbortSignal.timeout(10_000) });
          if (!response.ok) throw new Error(`Ollama tags HTTP ${response.status}`);
          const data = await response.json() as { models: { name: string; digest: string }[] };
          const installed = data.models.find(item => item.name === model);
          if (!installed) throw new Error(`Model not installed: ${model}`);
          modelDigest = installed.digest;
        }
        const generatorHistory = await collectGeneratorHistory();
        const generatorHistoryJson = JSON.stringify(generatorHistory, null, 2);
        await fs.writeFile(generatorHistoryPath, generatorHistoryJson, { mode: 0o600 });
        generatorHistoryDigest = createHash("sha256").update(generatorHistoryJson).digest("hex");
        generatorHistoryFindingCount = generatorHistory.findingCount;
        await run(["--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/site-review-agent.mjs",
          "--compact", `--output=${reportPath}`, `--json-output=${resultPath}`, `--prompt-output=${contextPath}`,
          `--history-input=${generatorHistoryPath}`,
          ...(mode === "prompt-only" ? [] : [`--attempts-output=${generatorAttemptsPath}`]),
          ...(mode === "prompt-only" ? ["--prompt-only"] : [])], env);
        if (mode === "prompt-only") {
          console.log(`Prompt saved: ${reportPath}`);
        } else {
          const result = JSON.parse(await fs.readFile(resultPath, "utf8")) as {
            skippedReason?: string;
            findings?: unknown[];
          };
          if (result.skippedReason) throw new Error(result.skippedReason);
          generatorFindingCount = Array.isArray(result.findings) ? result.findings.length : 0;
          report = await fs.readFile(reportPath, "utf8");
          const context = await fs.readFile(contextPath, "utf8");
          artifactDigest = createHash("sha256").update(report).digest("hex");
          contextDigest = createHash("sha256").update(context).digest("hex");

          const completedReviews = await getEvidenceReviewRunCount();
          if (completedReviews >= evidenceReviewMaxRuns) {
            evidenceReview = {
              status: "skipped",
              reason: "experiment_limit_reached",
              completedRuns: completedReviews,
              maxRuns: evidenceReviewMaxRuns,
            };
          } else {
            const experimentRun = completedReviews + 1;
            try {
              await run([
                "scripts/review-site-artifact.mjs",
                `--context=${contextPath}`,
                `--artifact=${reportPath}`,
                `--output=${evidenceReportPath}`,
                `--json-output=${evidenceResultPath}`,
              ], env);
              const reviewed = JSON.parse(
                await fs.readFile(evidenceResultPath, "utf8"),
              ) as EvidenceReviewerOutput;
              if (reviewed.artifactDigest !== artifactDigest || reviewed.contextDigest !== contextDigest) {
                throw new Error("Evidence Reviewer digest mismatch");
              }
              const reviewedIndices = reviewed.candidateReviews.map((candidate) => candidate.candidateIndex);
              const expectedIndices = Array.from(
                { length: generatorFindingCount },
                (_, index) => index + 1,
              );
              if (JSON.stringify(reviewedIndices) !== JSON.stringify(expectedIndices)) {
                throw new Error("Evidence Reviewer did not evaluate every Generator candidate in order");
              }
              evidenceReview = {
                status: "completed",
                experimentRun,
                maxRuns: evidenceReviewMaxRuns,
                verdict: reviewed.verdict,
                artifactDigest: reviewed.artifactDigest,
                contextDigest: reviewed.contextDigest,
                reviewDigest: createHash("sha256")
                  .update(await fs.readFile(evidenceResultPath, "utf8"))
                  .digest("hex"),
                promptVersion: reviewed.promptVersion,
                durationMs: reviewed.durationMs,
                candidateReviews: reviewed.candidateReviews,
              };
            } catch (error) {
              evidenceReview = {
                status: "failed",
                experimentRun,
                maxRuns: evidenceReviewMaxRuns,
                artifactDigest,
                contextDigest,
                reason: error instanceof Error ? error.message : String(error),
              };
              await fs.writeFile(
                evidenceReportPath,
                `## B. open-weight Evidence Reviewer\n\n状態: **failed**\n\n${evidenceReview.reason}`,
              );
            }
          }
        }
      } catch (error) {
        status = "failed";
        report = `Review failed: ${error instanceof Error ? error.message : String(error)}`;
      }
      if (mode !== "prompt-only") {
        generatorAttempts = await fs.readFile(generatorAttemptsPath, "utf8")
          .then((content) => JSON.parse(content) as GeneratorAttemptState)
          .catch((error: NodeJS.ErrnoException) => {
            if (error.code === "ENOENT") return null;
            throw error;
          });
        const hash = createHash("sha256").update(report).digest("hex").slice(0, 16);
        const evidenceReport = evidenceReview.status === "skipped"
          ? `## B. open-weight Evidence Reviewer\n\n状態: **skipped**（${evidenceReview.reason}）`
          : await fs.readFile(evidenceReportPath, "utf8");
        const body = `<!-- ubuntu-review:${day}:${hash} -->\n## Ubuntu提案専用試行 ${day}\n\n状態: ${status} / モデル: ${model}\n実装・公開・マージは行っていません。Evidence Reviewerはshadow動作で、投稿を停止・修正しません。\n\n## A. open-weight Generator\n\n${report.slice(0, 30_000)}\n\n${evidenceReport.slice(0, 20_000)}\n\n${buildHumanReviewCard(evidenceReview)}`;
        await fs.writeFile(pendingPath, body);
        await fs.writeFile(path.join(runDir, "finished.json"), JSON.stringify({
          startedAt, finishedAt: new Date().toISOString(), status, model, modelDigest, baseSha,
          scriptDigest, promptVersion: 1, artifactDigest, contextDigest,
          generatorHistoryDigest, generatorHistoryFindingCount,
          generator: generatorAttempts,
          evidenceReview,
        }, null, 2));
        await notify();
      }
      if (status === "failed") process.exitCode = 1;
    }
  }
} finally {
  await fs.rm(lock, { recursive: true });
}
