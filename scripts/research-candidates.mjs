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
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const apiKey = process.env.OPENAI_API_KEY || "";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function normalizeUrl(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  );
}

function extractMetaContent(html, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta[^>]*(?:name|property)=["']${escapedName}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const reversePattern = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${escapedName}["'][^>]*>`,
    "i",
  );

  return decodeHtml(html.match(pattern)?.[1] ?? html.match(reversePattern)?.[1] ?? "");
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

function shortHash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
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

function buildKnownIdSet() {
  return new Set([
    ...events.map((event) => event.id),
    ...candidateEvents.map((candidate) => candidate.id),
  ]);
}

function getKnownSummary() {
  const published = events.slice(-80).map((event) =>
    [
      event.id,
      event.date,
      event.artists.join(" / "),
      [event.prefecture, event.venue].filter(Boolean).join(" / "),
    ]
      .filter(Boolean)
      .join(" | "),
  );
  const reviewNeeded = candidateEvents
    .filter((candidate) => candidate.reviewStatus === "review_needed")
    .slice(-80)
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

  return { published, reviewNeeded };
}

async function fetchHtml(url) {
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

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeHtml(html) {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description =
    extractMetaContent(html, "description") || extractMetaContent(html, "og:description");
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

  return {
    title,
    description,
    headings,
    bodyText: stripTags(html).slice(0, 5000),
  };
}

async function buildPageSummaries(sections) {
  const summaries = [];
  const seenUrls = new Set();

  for (const section of sections) {
    let sourceCount = 0;

    for (const entry of section.entries) {
      if (sourceCount >= maxPagesPerSource || summaries.length >= maxTotalPages) {
        break;
      }

      if (seenUrls.has(entry.url)) {
        continue;
      }

      seenUrls.add(entry.url);
      sourceCount += 1;

      try {
        const html = await fetchHtml(entry.url);
        summaries.push({
          sourceName: section.sourceName,
          url: entry.url,
          linkTitle: entry.title,
          ...summarizeHtml(html),
        });
      } catch (error) {
        summaries.push({
          sourceName: section.sourceName,
          url: entry.url,
          linkTitle: entry.title,
          error: error instanceof Error ? error.message : "fetch failed",
        });
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

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeCandidate(candidate, knownIds) {
  const artists = Array.isArray(candidate.artists)
    ? candidate.artists.map((artist) => String(artist).trim()).filter(Boolean)
    : [];
  const sourceUrl = normalizeUrl(toNullableString(candidate.sourceUrl) ?? "");

  if (artists.length === 0 || !sourceUrl) {
    return null;
  }

  const rawDate = toNullableString(candidate.date);
  const date = rawDate && datePattern.test(rawDate) ? rawDate : null;
  const prefecture = toNullableString(candidate.prefecture);
  const venue = toNullableString(candidate.venue);
  const primaryArtist = artists[0];
  const baseId = [
    slugify(primaryArtist) || "candidate",
    date ?? "undated",
    slugify(prefecture ?? venue ?? "") || shortHash(sourceUrl),
  ].join("-");
  const suggestedId =
    typeof candidate.id === "string" && candidate.id.trim()
      ? slugify(candidate.id)
      : "";
  const id =
    suggestedId ||
    `${baseId}-${shortHash([sourceUrl, artists.join("|"), candidate.tourName ?? ""].join("::"))}`;

  if (knownIds.has(id)) {
    return null;
  }

  return {
    id,
    artists,
    tourName: toNullableString(candidate.tourName),
    date,
    prefecture,
    venue,
    genres:
      Array.isArray(candidate.genres) && candidate.genres.length > 0
        ? candidate.genres.map((genre) => String(genre).trim()).filter(Boolean)
        : ["Heavy Metal"],
    ticketUrl: candidate.ticketUrl ? normalizeUrl(String(candidate.ticketUrl)) : null,
    officialUrl: candidate.officialUrl
      ? normalizeUrl(String(candidate.officialUrl))
      : null,
    sourceUrl,
    sourceType:
      candidate.sourceType === "promoter" ||
      candidate.sourceType === "venue" ||
      candidate.sourceType === "band_official" ||
      candidate.sourceType === "ticket" ||
      candidate.sourceType === "sns"
        ? candidate.sourceType
        : "manual",
    sourceName: toNullableString(candidate.sourceName) ?? "Automated research",
    confidence:
      candidate.confidence === "high" ||
      candidate.confidence === "medium" ||
      candidate.confidence === "low"
        ? candidate.confidence
        : "medium",
    eventStatus:
      candidate.eventStatus === "cancelled" || candidate.eventStatus === "postponed"
        ? candidate.eventStatus
        : "scheduled",
    reviewStatus: "review_needed",
    reviewNotes: toNullableString(candidate.reviewNotes) ?? "自動候補生成。人間の確認が必要。",
    collectedAt: today,
    reviewedAt: null,
  };
}

async function callOpenAI(prompt) {
  if (!apiKey) {
    return { candidates: [], skippedReason: "OPENAI_API_KEY is not configured." };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You extract Japan metal and heavy music live event candidates. Return JSON only. Never invent facts.",
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
    return {
      candidates: [],
      skippedReason: `OpenAI request failed: HTTP ${response.status} ${body}`,
    };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenAI response was empty");
  }

  return extractJsonObject(content);
}

function buildPrompt(summaries, knownSummary) {
  return [
    "Metals Calendar is a Japan metal live event calendar.",
    "Extract only candidate events for manual review from the supplied page summaries.",
    "Public events must not be updated. These candidates will be shown in /admin/candidates.",
    "",
    "Target information:",
    "- Japan live events, visiting international tours, domestic metal/heavy music shows, festivals.",
    "- Ticket sale starts, lineup additions, date changes, postponements, cancellations are allowed only if the live event itself is clear.",
    "- Album release news alone is out of scope.",
    "",
    "Source policy:",
    "- Prefer official band, promoter, venue, label, and ticket pages.",
    "- SNS-only items must be official and low confidence.",
    "- Do not use fan speculation.",
    "",
    "Return JSON only with this shape:",
    `{
  "candidates": [
    {
      "id": "ascii-slug",
      "artists": ["ARTIST"],
      "tourName": null,
      "date": "YYYY-MM-DD or null",
      "prefecture": "東京都 or null",
      "venue": "venue name or null",
      "genres": ["Heavy Metal"],
      "ticketUrl": null,
      "officialUrl": null,
      "sourceUrl": "https://...",
      "sourceType": "promoter|venue|band_official|ticket|sns|manual",
      "sourceName": "Source name",
      "confidence": "high|medium|low",
      "eventStatus": "scheduled|postponed|cancelled",
      "reviewNotes": "Japanese note for human review"
    }
  ]
}`,
    "",
    "Known published events:",
    knownSummary.published.slice(-40).map((line) => `- ${line}`).join("\n"),
    "",
    "Known review-needed candidates:",
    knownSummary.reviewNeeded.slice(-40).map((line) => `- ${line}`).join("\n"),
    "",
    "Page summaries:",
    JSON.stringify(summaries, null, 2),
  ].join("\n");
}

function buildReport({ sections, summaries, candidates, skipped, skippedReason }) {
  const lines = [
    `# 候補自動生成レポート (${today})`,
    "",
    "このレポートは自動生成です。公開イベントには直接反映していません。",
    "",
    `- 調査ソース数: ${sections.length}`,
    `- 取得ページ数: ${summaries.length}`,
    `- 追加候補数: ${candidates.length}`,
    `- 重複/不正で除外: ${skipped}`,
    "",
  ];

  if (skippedReason) {
    lines.push(`- 候補生成スキップ理由: ${skippedReason}`);
    lines.push("");
  }

  lines.push("## /admin/candidates で確認してください");
  lines.push("");

  if (candidates.length === 0) {
    lines.push("- 新規候補なし");
  } else {
    for (const candidate of candidates) {
      lines.push(`- ${candidate.id}`);
      lines.push(`  - ${candidate.artists.join(" / ")}`);
      lines.push(`  - ${candidate.date ?? "日付未定"} / ${[candidate.prefecture, candidate.venue].filter(Boolean).join(" / ") || "会場未定"}`);
      lines.push(`  - ${candidate.confidence} / ${candidate.sourceName}`);
      lines.push(`  - ${candidate.sourceUrl}`);
    }
  }

  return lines.join("\n");
}

async function writeReport(report) {
  if (reportPath) {
    await writeFile(reportPath, report);
  }

  console.log(report);
}

async function appendCandidates(candidates) {
  if (!shouldWrite || candidates.length === 0) {
    return;
  }

  const candidateFilePath = new URL("../src/data/candidate_events.ts", import.meta.url);
  const fileContent = await readFile(candidateFilePath, "utf8");
  const insertIndex = fileContent.lastIndexOf("];");

  if (insertIndex === -1) {
    throw new Error("candidate events array end not found");
  }

  const insertion = candidates
    .map((candidate) => `\n${formatCandidateObject(candidate)}`)
    .join("");
  const nextContent = `${fileContent.slice(0, insertIndex)}${insertion}\n${fileContent.slice(insertIndex)}`;

  await writeFile(candidateFilePath, nextContent);
}

async function main() {
  const markdown = await readFile(inputPath, "utf8");
  const sections = parseResearchSections(markdown);
  const summaries = await buildPageSummaries(sections);
  const knownIds = buildKnownIdSet();
  const knownSummary = getKnownSummary();
  const prompt = buildPrompt(summaries, knownSummary);
  const parsed = await callOpenAI(prompt);
  const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  const candidates = [];
  let skipped = parsed.skippedReason ? 1 : 0;

  for (const rawCandidate of rawCandidates) {
    const candidate = normalizeCandidate(rawCandidate, knownIds);

    if (!candidate) {
      skipped += 1;
      continue;
    }

    knownIds.add(candidate.id);
    candidates.push(candidate);
  }

  await appendCandidates(candidates);
  await writeReport(
    buildReport({
      sections,
      summaries,
      candidates,
      skipped,
      skippedReason: parsed.skippedReason,
    }),
  );
}

await main();
