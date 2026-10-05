import fs from "node:fs/promises";
import path from "node:path";
import { candidateEvents } from "../src/data/candidate_events.ts";
import { discoveryPicks } from "../src/data/discovery.ts";
import { eventUpdateCandidates } from "../src/data/event_update_candidates.ts";
import { events } from "../src/data/events.ts";

const defaultSiteUrl = "https://metalscalendar.com";
const defaultBaseUrl = "https://openrouter.ai/api/v1";
const maxPageChars = 8000;
const maxDocChars = 9000;

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getJstToday() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function parseArgs(argv) {
  const options = {
    siteUrl: process.env.SITE_REVIEW_SITE_URL || defaultSiteUrl,
    output: "site-review-report.md",
    jsonOutput: "site-review-result.json",
    githubOutput: process.env.GITHUB_OUTPUT || null,
    promptOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [key, value] = arg.split("=", 2);

    if (key === "--site-url") {
      options.siteUrl = value ?? argv[index + 1];
      index += value === undefined ? 1 : 0;
      continue;
    }

    if (key === "--output") {
      options.output = value ?? argv[index + 1];
      index += value === undefined ? 1 : 0;
      continue;
    }

    if (key === "--json-output") {
      options.jsonOutput = value ?? argv[index + 1];
      index += value === undefined ? 1 : 0;
      continue;
    }

    if (key === "--github-output") {
      options.githubOutput = value ?? argv[index + 1];
      index += value === undefined ? 1 : 0;
      continue;
    }

    if (arg === "--prompt-only") {
      options.promptOnly = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function loadDotEnvFile(filePath) {
  let content;

  try {
    content = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }

    throw error;
  }

  const existingKeys = new Set(Object.keys(process.env));

  for (const line of content.split("\n")) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    let value = trimmedLine.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!existingKeys.has(key)) {
      process.env[key] = value.replaceAll("\\n", "\n");
    }
  }
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n...[truncated ${value.length - maxLength} chars]`;
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(html) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "MetalsCalendarSiteReviewBot/1.0 (+https://metalscalendar.com)",
      },
      signal: controller.signal,
    });
    const body = await response.text();

    return {
      url,
      ok: response.ok,
      status: response.status,
      title: extractTitle(body),
      description: extractMetaDescription(body),
      text: truncateText(stripHtml(body), maxPageChars),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: null,
      title: null,
      description: null,
      text: `Fetch failed: ${error.message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeWhitespace(match[1]) : null;
}

function extractMetaDescription(html) {
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  );

  return match ? normalizeWhitespace(match[1]) : null;
}

function unique(values) {
  return [...new Set(values)];
}

function countBy(values) {
  const counts = new Map();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))
    .map(([label, count]) => ({ label, count }));
}

function getMonthKey(date) {
  return date.slice(0, 7);
}

function buildDataSummary(today) {
  const upcoming = events.filter((event) => event.date >= today);
  const past = events.filter((event) => event.date < today);
  const next90DaysEnd = new Date(`${today}T00:00:00+09:00`);
  next90DaysEnd.setDate(next90DaysEnd.getDate() + 90);
  const next90DayKey = formatDate(next90DaysEnd);
  const next90Days = upcoming.filter((event) => event.date <= next90DayKey);
  const internationalUpcoming = upcoming.filter((event) => event.isInternational);
  const reviewNeededCandidates = candidateEvents.filter(
    (candidate) => candidate.reviewStatus === "review_needed",
  );
  const reviewNeededUpdates = eventUpdateCandidates.filter(
    (candidate) => candidate.reviewStatus === "review_needed",
  );
  const upcomingByMonth = countBy(upcoming.map((event) => getMonthKey(event.date))).slice(0, 8);
  const upcomingByPrefecture = countBy(upcoming.map((event) => event.prefecture)).slice(0, 12);
  const upcomingByGenre = countBy(upcoming.flatMap((event) => event.genres)).slice(0, 12);
  const newestEvents = [...events]
    .filter((event) => event.publishedAt || event.updatedAt)
    .sort((a, b) =>
      String(b.publishedAt ?? b.updatedAt).localeCompare(String(a.publishedAt ?? a.updatedAt)),
    )
    .slice(0, 12)
    .map((event) => ({
      id: event.id,
      date: event.date,
      artists: event.artists.slice(0, 4),
      prefecture: event.prefecture,
      venue: event.venue,
      publishedAt: event.publishedAt ?? null,
      updatedAt: event.updatedAt ?? null,
    }));
  const nearEvents = upcoming.slice(0, 12).map((event) => ({
    id: event.id,
    date: event.date,
    artists: event.artists.slice(0, 5),
    prefecture: event.prefecture,
    venue: event.venue,
    isInternational: event.isInternational,
  }));

  return {
    today,
    totalEvents: events.length,
    upcomingEvents: upcoming.length,
    pastEvents: past.length,
    next90DaysEvents: next90Days.length,
    upcomingInternationalEvents: internationalUpcoming.length,
    reviewNeededCandidates: reviewNeededCandidates.length,
    reviewNeededUpdates: reviewNeededUpdates.length,
    uniquePrefectures: unique(events.map((event) => event.prefecture)).length,
    uniqueArtists: unique(events.flatMap((event) => event.artists)).length,
    upcomingByMonth,
    upcomingByPrefecture,
    upcomingByGenre,
    nearEvents,
    newestEvents,
    discoveryPicks,
  };
}

async function readIfExists(filePath, maxLength = maxDocChars) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return truncateText(content, maxLength);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function getLatestMarkdown(dirPath) {
  let entries;

  try {
    entries = await fs.readdir(dirPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }

  const markdownFiles = entries
    .filter((entry) => entry.endsWith(".md") && entry !== "TEMPLATE.md")
    .sort()
    .reverse();
  const latest = markdownFiles[0];

  if (!latest) {
    return null;
  }

  return {
    path: path.join(dirPath, latest),
    content: await readIfExists(path.join(dirPath, latest)),
  };
}

async function collectContext(options, today) {
  const siteUrl = options.siteUrl.replace(/\/$/, "");
  const routes = [
    "/",
    "/international",
    `/months/${today.slice(0, 7)}`,
    "/prefectures/tokyo",
    "/prefectures/osaka",
  ];
  const nextEvent = events.find((event) => event.date >= today);

  if (nextEvent) {
    routes.push(`/events/${nextEvent.id}`);
  }

  const pages = await Promise.all(
    routes.map((route) => fetchWithTimeout(`${siteUrl}${route}`)),
  );
  const latestGa4 = await getLatestMarkdown(path.join("docs", "analytics-reports"));
  const latestSearchConsole = await getLatestMarkdown(
    path.join("docs", "search-console-reports"),
  );

  return {
    siteUrl,
    pages,
    dataSummary: buildDataSummary(today),
    docs: {
      readme: await readIfExists("README.md", 6000),
      roadmap: await readIfExists(path.join("docs", "ROADMAP.md"), 7000),
      llmWiki: await readIfExists(path.join("docs", "llm-wiki", "index.md"), 7000),
      latestGa4,
      latestSearchConsole,
    },
  };
}

function buildPrompt(context) {
  return [
    "あなたはMetals Calendarの毎朝のサイト改善担当です。",
    "人間の代わりにサイト構成、公開イベントデータ、直近の計測レポートを眺めて、改善Issueにする価値がある気づきを出します。",
    "",
    "前提:",
    "- Metals Calendarは日本国内のメタル/ラウド系ライブと来日公演を探すサービスです。",
    "- 現在はユーザー増加、検索流入、チケット/公式サイト送客の計測と改善を重視しています。",
    "- 実装は小さく、個人開発で維持しやすい提案を優先します。",
    "- AIはコードを直接変更せず、GitHub Issueに改善提案を出すだけです。",
    "",
    "出力ルール:",
    "- 日本語で書く。",
    "- 事実と推測を分ける。",
    "- 薄いSEO量産ページや過剰な機能追加は避ける。",
    "- 同じような提案を複数に分けすぎない。",
    "- issue化する価値が低いものは findings から外す。",
    "- GitHub Issueに貼る前提で、具体的な作業に落とせる内容にする。",
    "",
    "Return JSON only with this shape:",
    `{
  "summary": "今日の全体所感を1〜3文で",
  "findings": [
    {
      "title": "Issueタイトル",
      "priority": "high|medium|low",
      "category": "seo|ux|content|analytics|data|performance|operation",
      "observation": "観察した事実",
      "hypothesis": "なぜ問題または機会だと思うか",
      "suggestedIssueBody": "GitHub Issue本文として使えるMarkdown。背景、提案、確認方法を含める",
      "evidence": ["根拠1", "根拠2"]
    }
  ]
}`,
    "",
    "Context:",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

function extractJsonObject(content) {
  const trimmed = content.trim();

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);

  if (match) {
    return JSON.parse(match[1]);
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error("LLM response did not include a JSON object.");
}

function getLlmConfig() {
  const apiKey =
    process.env.SITE_REVIEW_LLM_API_KEY ||
    process.env.OPENWEIGHT_LLM_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    "";
  const baseUrl =
    process.env.SITE_REVIEW_LLM_BASE_URL ||
    process.env.OPENWEIGHT_LLM_BASE_URL ||
    process.env.OPENROUTER_BASE_URL ||
    defaultBaseUrl;
  const model =
    process.env.SITE_REVIEW_LLM_MODEL ||
    process.env.OPENWEIGHT_LLM_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "";

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
    model,
  };
}

function isLocalLlmUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function callLlm(prompt) {
  const config = getLlmConfig();
  const usesLocalLlm = isLocalLlmUrl(config.baseUrl);

  if (!config.apiKey && !usesLocalLlm) {
    return {
      skippedReason:
        "SITE_REVIEW_LLM_API_KEY, OPENWEIGHT_LLM_API_KEY, or OPENROUTER_API_KEY is not configured.",
    };
  }

  if (!config.model) {
    return {
      skippedReason:
        "SITE_REVIEW_LLM_MODEL, OPENWEIGHT_LLM_MODEL, or OPENROUTER_MODEL is not configured.",
    };
  }

  let response;

  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        "Content-Type": "application/json",
        "HTTP-Referer": "https://metalscalendar.com",
        "X-Title": "Metals Calendar Site Review Agent",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a careful product reviewer for a Japanese metal live event calendar. Return JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });
  } catch (error) {
    return {
      skippedReason: `LLM request failed: ${error.message}`,
    };
  }

  if (!response.ok) {
    return {
      skippedReason: `LLM request failed: HTTP ${response.status} ${await response.text()}`,
    };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    return { skippedReason: "LLM response was empty." };
  }

  return extractJsonObject(content);
}

function normalizeFinding(finding) {
  const priority = ["high", "medium", "low"].includes(finding?.priority)
    ? finding.priority
    : "medium";
  const category = [
    "seo",
    "ux",
    "content",
    "analytics",
    "data",
    "performance",
    "operation",
  ].includes(finding?.category)
    ? finding.category
    : "operation";
  const title = String(finding?.title ?? "").trim();
  const suggestedIssueBody = String(finding?.suggestedIssueBody ?? "").trim();

  if (!title || !suggestedIssueBody) {
    return null;
  }

  return {
    title,
    priority,
    category,
    observation: String(finding?.observation ?? "").trim(),
    hypothesis: String(finding?.hypothesis ?? "").trim(),
    suggestedIssueBody,
    evidence: Array.isArray(finding?.evidence)
      ? finding.evidence.map((item) => String(item).trim()).filter(Boolean)
      : [],
  };
}

function normalizeResult(rawResult) {
  const findings = Array.isArray(rawResult?.findings)
    ? rawResult.findings.map(normalizeFinding).filter(Boolean).slice(0, 5)
    : [];

  return {
    summary: String(rawResult?.summary ?? "サイトレビュー結果です。").trim(),
    findings,
  };
}

function buildReport({ result, today, skippedReason, promptOnly }) {
  const lines = [
    `# AIサイトレビュー ${today}`,
    "",
    "Metals Calendarのサイト構成、イベントデータ、直近レポートをもとにした毎朝の改善メモです。",
    "",
  ];

  if (promptOnly) {
    lines.push("## 実行結果", "", "prompt-only のためLLM呼び出しは行っていません。", "");
  }

  if (skippedReason) {
    lines.push("## 実行結果", "", `LLMレビューをスキップしました: ${skippedReason}`, "");
    return lines.join("\n");
  }

  lines.push("## 全体所感", "", result.summary, "");

  if (result.findings.length === 0) {
    lines.push("## 気づき", "", "今日Issue化するほどの改善候補はありませんでした。", "");
    return lines.join("\n");
  }

  lines.push("## Issue候補", "");

  for (const [index, finding] of result.findings.entries()) {
    lines.push(
      `### ${index + 1}. ${finding.title}`,
      "",
      `- 優先度: ${finding.priority}`,
      `- 分類: ${finding.category}`,
    );

    if (finding.observation) {
      lines.push(`- 観察: ${finding.observation}`);
    }

    if (finding.hypothesis) {
      lines.push(`- 仮説: ${finding.hypothesis}`);
    }

    if (finding.evidence.length > 0) {
      lines.push("- 根拠:");
      for (const evidence of finding.evidence) {
        lines.push(`  - ${evidence}`);
      }
    }

    lines.push("", "#### Issue本文案", "", finding.suggestedIssueBody, "");
  }

  return lines.join("\n");
}

async function writeGithubOutput(filePath, values) {
  if (!filePath) {
    return;
  }

  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  await fs.appendFile(filePath, `${lines.join("\n")}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await loadDotEnvFile(".env.local");

  const today = getJstToday();
  const context = await collectContext(options, today);
  const prompt = buildPrompt(context);

  if (options.promptOnly) {
    await fs.writeFile(options.output, prompt);
    await fs.writeFile(
      options.jsonOutput,
      JSON.stringify({ skippedReason: "prompt-only", findings: [] }, null, 2),
    );
    await writeGithubOutput(options.githubOutput, { should_create_issue: "false" });
    console.log(`Site review prompt written to ${options.output}`);
    return;
  }

  const rawResult = await callLlm(prompt);
  const skippedReason = rawResult?.skippedReason ?? null;
  const result = skippedReason ? { summary: "", findings: [] } : normalizeResult(rawResult);
  const report = buildReport({ result, today, skippedReason, promptOnly: false });
  const shouldCreateIssue = !skippedReason && result.findings.length > 0;

  await fs.writeFile(options.output, report);
  await fs.writeFile(
    options.jsonOutput,
    JSON.stringify(
      {
        today,
        siteUrl: context.siteUrl,
        skippedReason,
        shouldCreateIssue,
        ...result,
      },
      null,
      2,
    ),
  );
  await writeGithubOutput(options.githubOutput, {
    should_create_issue: shouldCreateIssue ? "true" : "false",
  });

  console.log(`Site review report written to ${options.output}`);
  console.log(`Issue creation: ${shouldCreateIssue ? "yes" : "no"}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
