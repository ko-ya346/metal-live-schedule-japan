import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { candidateEvents } from "../src/data/candidate_events.ts";
import { events } from "../src/data/events.ts";

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  if (match) {
    args.set(match[1], match[2]);
  } else {
    args.set(arg.replace(/^--/, ""), "true");
  }
}

const inputPath = args.get("input") ?? "research-links.md";
const reportPath = args.get("report") ?? null;
const shouldWrite = args.has("write");
const maxPagesPerSource = Number(args.get("max-pages") ?? "3");
const maxTotalPages = Number(args.get("max-total-pages") ?? "24");
const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const apiKey = process.env.OPENAI_API_KEY ?? "";
const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function stripTags(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTextMatch(html, pattern) {
  const match = html.match(pattern);
  return match?.[1] ? stripTags(match[1]) : "";
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function shortHash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function getJapanDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatValue(value, indentLevel) {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    const indent = " ".repeat(indentLevel);
    const childIndent = " ".repeat(indentLevel + 4);
    const items = value
      .map((item) => `${childIndent}${formatValue(item, indentLevel + 4)},`)
      .join("\n");

    return `[\n${items}\n${indent}]`;
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatObject(object, keys, indentLevel = 4) {
  const indent = " ".repeat(indentLevel);
  const childIndent = " ".repeat(indentLevel + 4);
  const lines = keys.map(
    (key) => `${childIndent}${key}: ${formatValue(object[key], indentLevel + 4)},`,
  );

  return `${indent}{\n${lines.join("\n")}\n${indent}}`;
}

function formatCandidateObject(candidate) {
  return `${formatObject(candidate, [
    "id",
    "artists",
    "tourName",
    "date",
    "prefecture",
    "venue",
    "genres",
    "ticketUrl",
    "officialUrl",
    "sourceUrl",
    "sourceType",
    "sourceName",
    "confidence",
    "eventStatus",
    "reviewStatus",
    "reviewNotes",
    "collectedAt",
    "reviewedAt",
  ])},`;
}

function findArrayInsertionPoint(fileContent) {
  const marker = "];";
  const index = fileContent.lastIndexOf(marker);

  if (index === -1) {
    throw new Error("candidate events array end not found");
  }

  return index;
}

function parseResearchSections(markdown) {
  const sections = [];
  const sectionPattern =
    /### ([^\n]+)\n\n([\s\S]*?)(?=\n### |\n## 作業後チェック|\n$)/g;
  let match;

  while ((match = sectionPattern.exec(markdown)) !== null) {
    const sourceName = match[1].trim();
    const body = match[2];
    const lines = body.split("\n");
    const entries = [];

    for (let index = 0; index < lines.length; index += 1) {
      const titleLine = lines[index]?.trim();
      const urlLine = lines[index + 1]?.trim();

      if (!titleLine?.startsWith("- ") || !urlLine?.startsWith("http")) {
        continue;
      }

      const title = titleLine.slice(2).trim();
      const url = normalizeUrl(urlLine);

      if (url) {
        entries.push({ title, url });
      }
    }

    if (entries.length > 0) {
      sections.push({ sourceName, entries });
    }
  }

  return sections;
}

function buildKnownIndex() {
  const knownIds = new Set(events.map((event) => event.id));
  for (const candidate of candidateEvents) {
    knownIds.add(candidate.id);
  }

  return { knownIds };
}

function extractKnownSummary() {
  const recentEvents = events
    .slice(-100)
    .map((event) =>
      [
        event.id,
        event.date,
        event.artists.join(" / "),
        [event.prefecture, event.venue].filter(Boolean).join(" / "),
      ]
        .filter(Boolean)
        .join(" | "),
    );

  const reviewNeededCandidates = candidateEvents
    .filter((candidate) => candidate.reviewStatus === "review_needed")
    .slice(-100)
    .map((candidate) =>
      [
        candidate.id,
        candidate.date ?? "date unknown",
        candidate.artists.join(" / "),
        [candidate.prefecture, candidate.venue].filter(Boolean).join(" / "),
      ]
        .filter(Boolean)
        .join(" | "),
    );

  return { recentEvents, reviewNeededCandidates };
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MetalsCalendarResearchBot/0.2 (+https://metalscalendar.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeHtml(html) {
  const title = getTextMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    getTextMatch(
      html,
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    ) ||
    getTextMatch(
      html,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i,
    );

  const headings = [];
  for (const pattern of [
    /<h1[^>]*>([\s\S]*?)<\/h1>/gi,
    /<h2[^>]*>([\s\S]*?)<\/h2>/gi,
    /<h3[^>]*>([\s\S]*?)<\/h3>/gi,
  ]) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const text = stripTags(match[1]);
      if (text && !headings.includes(text)) {
        headings.push(text);
      }
      if (headings.length >= 12) {
        break;
      }
    }
  }

  const bodyText = stripTags(html).slice(0, 5000);

  return {
    title,
    description,
    headings,
    bodyText,
  };
}

async function buildPageSummaries(sections) {
  const summaries = [];
  const seen = new Set();

  for (const section of sections) {
    let count = 0;

    for (const entry of section.entries) {
      if (count >= maxPagesPerSource || summaries.length >= maxTotalPages) {
        break;
      }

      if (seen.has(entry.url)) {
        continue;
      }

      seen.add(entry.url);

      try {
        const html = await fetchWithTimeout(entry.url);
        const summary = summarizeHtml(html);
        summaries.push({
          sourceName: section.sourceName,
          url: entry.url,
          linkTitle: entry.title,
          ...summary,
        });
        count += 1;
      } catch (error) {
        summaries.push({
          sourceName: section.sourceName,
          url: entry.url,
          linkTitle: entry.title,
          error: error instanceof Error ? error.message : "fetch failed",
        });
        count += 1;
      }
    }
  }

  return summaries;
}

function extractJsonObject(value) {
  const trimmed = value.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("LLM response did not contain JSON");
    }

    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function normalizeCandidate(candidate, knownIds) {
  const artists = Array.isArray(candidate.artists)
    ? candidate.artists.map((artist) => String(artist).trim()).filter(Boolean)
    : [];
  const primaryArtist = artists[0] ?? "candidate";
  const date = candidate.date ? String(candidate.date).slice(0, 10) : null;
  const prefecture = candidate.prefecture ? String(candidate.prefecture).trim() : null;
  const venue = candidate.venue ? String(candidate.venue).trim() : null;
  const sourceUrl = normalizeUrl(String(candidate.sourceUrl ?? ""));

  if (!sourceUrl) {
    return null;
  }

  const ticketUrl = candidate.ticketUrl ? normalizeUrl(String(candidate.ticketUrl)) : null;
  const officialUrl = candidate.officialUrl ? normalizeUrl(String(candidate.officialUrl)) : null;
  const baseId = slugify(primaryArtist) || "candidate";
  const idSeed = [baseId, date ?? "undated", slugify(prefecture ?? venue ?? "source") || shortHash(sourceUrl)]
    .filter(Boolean)
    .join("-");
  const id = candidate.id && typeof candidate.id === "string"
    ? candidate.id
    : `${idSeed}-${shortHash([sourceUrl, artists.join("|"), candidate.tourName ?? ""].join("::"))}`;

  if (knownIds.has(id)) {
    return null;
  }

  return {
    id,
    artists,
    tourName: candidate.tourName ? String(candidate.tourName).trim() : null,
    date,
    prefecture,
    venue,
    genres: Array.isArray(candidate.genres)
      ? candidate.genres.map((genre) => String(genre).trim()).filter(Boolean)
      : ["Heavy Metal"],
    ticketUrl,
    officialUrl,
    sourceUrl,
    sourceType: candidate.sourceType ?? "manual",
    sourceName: String(candidate.sourceName ?? "Automated research"),
    confidence: candidate.confidence === "high" || candidate.confidence === "medium" || candidate.confidence === "low"
      ? candidate.confidence
      : "medium",
    eventStatus:
      candidate.eventStatus === "cancelled" || candidate.eventStatus === "postponed"
        ? candidate.eventStatus
        : "scheduled",
    reviewStatus: "review_needed",
    reviewNotes: String(candidate.reviewNotes ?? "").trim(),
    collectedAt: today,
    reviewedAt: null,
  };
}

function formatCandidateReport({ sections, summaries, candidates, skipped }) {
  const lines = [
    `# 自動候補調査レポート (${today})`,
    "",
    "このレポートは GitHub Actions による自動調査結果です。公開データには直接反映していません。",
    "",
    "## 入力",
    "",
    `- ソースセクション数: ${sections.length}`,
    `- 取得ページ数: ${summaries.length}`,
    `- 新規候補数: ${candidates.length}`,
    `- 既知データで除外した件数: ${skipped}`,
    "",
    "## 新規候補",
    "",
  ];

  if (candidates.length === 0) {
    lines.push("- 新規候補なし");
  } else {
    for (const candidate of candidates) {
      lines.push(`### ${candidate.id}`);
      lines.push("");
      lines.push(`- 出演: ${candidate.artists.join(" / ")}`);
      lines.push(`- 日付: ${candidate.date ?? "未確定"}`);
      lines.push(`- 会場: ${[candidate.prefecture, candidate.venue].filter(Boolean).join(" / ") || "未確定"}`);
      lines.push(`- 信頼度: ${candidate.confidence}`);
      lines.push(`- 情報源: ${candidate.sourceName}`);
      lines.push(`- 元URL: ${candidate.sourceUrl}`);
      if (candidate.reviewNotes) {
        lines.push(`- メモ: ${candidate.reviewNotes}`);
      }
      lines.push("");
    }
  }

  lines.push("## 作業メモ");
  lines.push("");
  lines.push("- 本番イベントには直接反映していません。");
  lines.push("- `/admin/candidates` で人間が確認してから公開してください。");

  return lines.join("\n");
}

async function callOpenAI(prompt) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for automated candidate research");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You extract Japan metal live event candidates from official or reliable web sources. Return JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed: HTTP ${response.status} ${body}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenAI response was empty");
  }

  return content;
}

async function main() {
  const markdown = await readFile(inputPath, "utf8");
  const sections = parseResearchSections(markdown);
  const summaries = await buildPageSummaries(sections);
  const { knownIds } = buildKnownIndex();
  const { recentEvents, reviewNeededCandidates } = extractKnownSummary();

  const prompt = [
    "Project goal: maintain a Japan metal live calendar.",
    "Use only the supplied page summaries. Do not invent dates, venues, or artists.",
    "Return JSON only with this shape:",
    `{
  "candidates": [
    {
      "id": "ascii-slug",
      "artists": ["ARTIST"],
      "tourName": null,
      "date": "YYYY-MM-DD or null",
      "prefecture": "東京都 or null",
      "venue": "会場名 or null",
      "genres": ["Heavy Metal"],
      "ticketUrl": null,
      "officialUrl": null,
      "sourceUrl": "https://...",
      "sourceType": "promoter|venue|band_official|ticket|sns|manual",
      "sourceName": "Source name",
      "confidence": "high|medium|low",
      "eventStatus": "scheduled|postponed|cancelled",
      "reviewNotes": "Japanese note"
    }
  ]
}`,
    "",
    "Rules:",
    "- Only include new candidates that are not already represented in known ids or URLs.",
    "- Prefer official band, promoter, venue, and ticket pages.",
    "- SNS-only items must be official and low confidence.",
    "- Do not include album-release news unless it is clearly tied to a live event change or announcement.",
    "- If a page confirms a ticket sale, lineup addition, date change, or festival date, you may include it as a candidate only when the live event itself is clear.",
    "- Keep reviewNotes short and factual in Japanese.",
    "",
    "Known published event summaries:",
    recentEvents.slice(-40).map((line) => `- ${line}`).join("\n"),
    "",
    "Known review-needed candidate summaries:",
    reviewNeededCandidates.slice(-40).map((line) => `- ${line}`).join("\n"),
    "",
    "Page summaries:",
    JSON.stringify(summaries, null, 2),
  ].join("\n");

  const rawResponse = await callOpenAI(prompt);
  const parsed = extractJsonObject(rawResponse);
  const rawCandidates = Array.isArray(parsed?.candidates) ? parsed.candidates : [];
  const normalized = [];
  const skipped = [];
  const seenIds = new Set([...knownIds]);

  for (const candidate of rawCandidates) {
    const normalizedCandidate = normalizeCandidate(candidate, seenIds);

    if (!normalizedCandidate) {
      skipped.push(candidate?.sourceUrl ?? candidate?.id ?? "unknown");
      continue;
    }

    seenIds.add(normalizedCandidate.id);
    normalized.push(normalizedCandidate);
  }

  const report = formatCandidateReport({
    sections,
    summaries,
    candidates: normalized,
    skipped: skipped.length,
  });

  if (reportPath) {
    await writeFile(reportPath, report);
  }

  if (!shouldWrite || normalized.length === 0) {
    console.log(report);
    return;
  }

  const candidateFilePath = new URL("../src/data/candidate_events.ts", import.meta.url);
  const candidateFile = await readFile(candidateFilePath, "utf8");
  const insertIndex = findArrayInsertionPoint(candidateFile);
  const insertion = normalized.map((candidate) => `\n${formatCandidateObject(candidate)}`).join("");
  const nextContent = `${candidateFile.slice(0, insertIndex)}${insertion}\n${candidateFile.slice(insertIndex)}`;

  await writeFile(candidateFilePath, nextContent);
  console.log(report);
}

await main();
