import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { candidateEvents } from "../src/data/candidate_events.ts";
import { events } from "../src/data/events.ts";
import { canFetchUrl } from "./lib/robots-policy.mjs";
import {
  discoveryArtistKeywords,
  priorityArtistKeywords,
} from "../src/data/watchTargets.ts";

async function loadDotEnvFile(filePath) {
  let content;

  try {
    content = await readFile(filePath, "utf8");
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

await loadDotEnvFile(".env.local");

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
const promptOnly = args.has("prompt-only");
const maxPagesPerSource = Number(args.get("max-pages") ?? "3");
const maxTotalPages = Number(args.get("max-total-pages") ?? "24");
const promptMode = args.get("prompt-mode") === "full" ? "full" : "compact";
const isCompactPrompt = promptMode === "compact";
const bodyCharLimit = Number(args.get("body-chars") ?? (isCompactPrompt ? "450" : "5000"));
const maxSnippets = Number(args.get("max-snippets") ?? "6");
const snippetCharLimit = Number(args.get("snippet-chars") ?? "180");
const knownSummaryLimit = Number(args.get("known-limit") ?? "16");
const fetchTimeoutMs = Number(args.get("fetch-timeout-ms") ?? "25000");
const fetchRetryCount = Number(args.get("fetch-retries") ?? "3");
const retryBaseDelayMs = Number(args.get("fetch-retry-delay-ms") ?? "1500");
const llmTimeoutMs = Number(process.env.CANDIDATE_LLM_TIMEOUT_MS ?? 15 * 60 * 1000);
const runFile = promisify(execFile);
const model =
  process.env.CANDIDATE_LLM_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4.1-mini";
const apiKey =
  process.env.CANDIDATE_LLM_API_KEY ||
  process.env.OPENAI_API_KEY ||
  "";
const llmBaseUrl = (
  process.env.CANDIDATE_LLM_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  "https://api.openai.com/v1"
).replace(/\/+$/, "");
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

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function truncateText(value, maxLength) {
  const text = compactText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRetryDelay(attempt) {
  return retryBaseDelayMs * attempt;
}

function isRetryableFetchError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = message.match(/^HTTP (\d{3})$/);

  if (statusMatch) {
    const status = Number(statusMatch[1]);
    return status === 408 || status === 429 || status >= 500;
  }

  return (
    error?.name === "AbortError" ||
    message.includes("timeout") ||
    message.includes("aborted") ||
    message.includes("fetch failed")
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

  if (typeof value === "object") {
    return formatObject(value, Object.keys(value), indentLevel);
  }

  return String(value);
}

function formatObject(object, keys, indentLevel = 4) {
  const indent = " ".repeat(indentLevel);
  const childIndent = " ".repeat(indentLevel + 4);
  const lines = keys
    .filter((key) => object[key] !== undefined)
    .map(
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
    "endDate",
    "prefecture",
    "venue",
    "genres",
    "isInternational",
    "ticketUrl",
    "ticketLinks",
    "imageUrl",
    "organizerName",
    "organizerUrl",
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
    /#### ([^\n]+)\n\n([\s\S]*?)(?=\n#### |\n### |\n## |\n$)/g;
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

    const error = lines.find((line) => line.trim().startsWith("- 取得失敗:"))?.trim().replace("- 取得失敗:", "").trim() ?? null;
    sections.push({ sourceName, entries, error });
  }

  return sections;
}

function buildKnownIdSet() {
  return new Set([
    ...events.map((event) => event.id),
    ...candidateEvents.map((candidate) => candidate.id),
  ]);
}

function normalizeForMatch(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　"'“”‘’・･.,，.()（）\-ー]/g, "");
}

const heavySignalKeywords = [
  "metal",
  "heavy",
  "hard rock",
  "hardcore",
  "metalcore",
  "death",
  "black metal",
  "thrash",
  "doom",
  "grindcore",
  "loud",
  "メタル",
  "ヘヴィ",
  "ヘビー",
  "ハードロック",
  "ハードコア",
  "ラウド",
  "デスメタル",
  "ブラックメタル",
  "スラッシュ",
  ...discoveryArtistKeywords,
  "MORBIDFEST",
];

function inferSourceType(sourceType, sourceUrl) {
  let host = "";

  try {
    host = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    return sourceType;
  }

  if (/amass\.jp|heavy-metal-tour\.com|metal100\.com/.test(host)) {
    return "manual";
  }

  if (/eplus\.jp|l-tike\.com|t\.pia\.jp|ticket\.rakuten\.co\.jp/.test(host)) {
    return "ticket";
  }

  if (/clubcitta\.co\.jp|antiknock\.net|zirco-tokyo\.jp|otsukadeepa\.jp|club-quattro\.com/.test(host)) {
    return "venue";
  }

  if (/creativeman\.co\.jp|udo\.jp|hipjpn\.co\.jp|livenationhip\.co\.jp|evp\.jp|smash-jpn\.com/.test(host)) {
    return "promoter";
  }

  if (/x\.com|twitter\.com|instagram\.com/.test(host)) {
    return "sns";
  }

  return sourceType;
}

function buildKnownEvents() {
  return [...events, ...candidateEvents].map((event) => ({
    id: event.id,
    date: event.date ?? null,
    prefecture: normalizeForMatch(event.prefecture),
    venue: normalizeForMatch(event.venue),
    artists: event.artists.map((artist) => normalizeForMatch(artist)),
  }));
}

function hasSharedArtist(leftArtists, rightArtists) {
  return leftArtists.some((leftArtist) =>
    rightArtists.some(
      (rightArtist) =>
        leftArtist === rightArtist ||
        (leftArtist.length >= 4 && rightArtist.includes(leftArtist)) ||
        (rightArtist.length >= 4 && leftArtist.includes(rightArtist)),
    ),
  );
}

function isSameVenue(leftVenue, rightVenue) {
  if (!leftVenue || !rightVenue) {
    return false;
  }

  return (
    leftVenue === rightVenue ||
    (leftVenue.length >= 6 && rightVenue.includes(leftVenue)) ||
    (rightVenue.length >= 6 && leftVenue.includes(rightVenue))
  );
}

function isKnownEvent(candidate, knownEvents) {
  if (!candidate.date) {
    return false;
  }

  const candidateArtists = candidate.artists.map((artist) => normalizeForMatch(artist));
  const candidatePrefecture = normalizeForMatch(candidate.prefecture);
  const candidateVenue = normalizeForMatch(candidate.venue);

  return knownEvents.some((knownEvent) => {
    if (knownEvent.date !== candidate.date) {
      return false;
    }

    if (!hasSharedArtist(candidateArtists, knownEvent.artists)) {
      return false;
    }

    if (isSameVenue(candidateVenue, knownEvent.venue)) {
      return true;
    }

    return Boolean(candidatePrefecture && candidatePrefecture === knownEvent.prefecture);
  });
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

const lowValueLinkPatterns = [
  /^all$/i,
  /^band$/i,
  /^discography$/i,
  /^dvds?/i,
  /^home$/i,
  /^info$/i,
  /^link$/i,
  /^media$/i,
  /^more$/i,
  /^movie$/i,
  /^music$/i,
  /^news$/i,
  /^profile$/i,
  /^shop$/i,
  /^skip to content$/i,
  /^videos$/i,
  /お問い合わせ/,
  /公式サイト/,
  /オンラインストア/,
  /グッズ|goods/i,
];

function scoreResearchEntry(section, entry) {
  const value = `${section.sourceName} ${entry.title} ${entry.url}`;
  const normalizedValue = normalizeForMatch(value);
  const lowerValue = value.toLowerCase();
  let score = 0;

  if (lowValueLinkPatterns.some((pattern) => pattern.test(entry.title.trim()))) {
    score -= 8;
  }

  if (/(20\d{2}|[0-9]{1,2}[/-][0-9]{1,2}|[0-9]{1,2}\/[0-9]{1,2})/.test(value)) {
    score += 5;
  }

  if (/live|tour|show|ticket|公演|開演|開場|受付|発売|来日|チケット/i.test(value)) {
    score += 5;
  }

  if (/eplus|pia|l-tike|ticket|creativeman|udo|smash|evp|hip|swd|official|公式/i.test(value)) {
    score += 3;
  }

  if (section.sourceName.includes("国内広域確認")) {
    score += 6;
  }

  if (
    priorityArtistKeywords.some((keyword) =>
      normalizedValue.includes(normalizeForMatch(keyword)),
    )
  ) {
    score += 8;
  }

  if (heavySignalKeywords.some((keyword) => lowerValue.includes(keyword.toLowerCase()))) {
    score += 4;
  }

  return score;
}

async function fetchHtml(url) {
  if (!(await canFetchUrl(url))) {
    throw new Error("robots.txt disallows this URL or its policy could not be fetched");
  }

  let lastError;

  for (let attempt = 1; attempt <= fetchRetryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

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
    } catch (error) {
      lastError = error;

      if (attempt >= fetchRetryCount || !isRetryableFetchError(error)) {
        break;
      }

      await delay(getRetryDelay(attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  const message = lastError instanceof Error ? lastError.message : "fetch failed";
  throw new Error(`${message} after ${fetchRetryCount} attempts`);
}

const eventContextKeywords = [
  "2026",
  "2027",
  "open",
  "start",
  "ticket",
  "tickets",
  "tour",
  "live",
  "japan",
  "venue",
  "price",
  "sold out",
  "開場",
  "開演",
  "公演",
  "出演",
  "会場",
  "料金",
  "前売",
  "当日",
  "発売",
  "受付",
  "予定枚数",
  "チケット",
  "来日",
  "主催",
  "招聘",
  ...priorityArtistKeywords,
];

function getContextWindow(text, index, windowSize) {
  const start = Math.max(0, index - Math.floor(windowSize / 2));
  const end = Math.min(text.length, index + Math.floor(windowSize / 2));
  const snippet = text.slice(start, end);

  return truncateText(snippet, windowSize);
}

function extractContextSnippets(text, keywords) {
  const normalizedText = compactText(text);
  const lowerText = normalizedText.toLowerCase();
  const snippets = [];
  const seen = new Set();
  const relevantKeywords = [...new Set(keywords.map(compactText).filter(Boolean))];
  const dateMatches = normalizedText.matchAll(
    /(?:20\d{2}[./年-]\s?\d{1,2}[./月-]\s?\d{1,2}|\d{1,2}[./月]\s?\d{1,2})/g,
  );

  for (const match of dateMatches) {
    if (snippets.length >= maxSnippets) {
      break;
    }

    const snippet = getContextWindow(normalizedText, match.index ?? 0, snippetCharLimit);
    const key = normalizeForMatch(snippet);

    if (!seen.has(key)) {
      seen.add(key);
      snippets.push(snippet);
    }
  }

  for (const keyword of relevantKeywords) {
    if (snippets.length >= maxSnippets) {
      break;
    }

    const index = lowerText.indexOf(keyword.toLowerCase());

    if (index === -1) {
      continue;
    }

    const snippet = getContextWindow(normalizedText, index, snippetCharLimit);
    const key = normalizeForMatch(snippet);

    if (!seen.has(key)) {
      seen.add(key);
      snippets.push(snippet);
    }
  }

  return snippets;
}

function summarizeHtml(html, pageContext) {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description =
    extractMetaContent(html, "description") || extractMetaContent(html, "og:description");
  const imageUrl = extractMetaContent(html, "og:image");
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

  const bodyText = stripTags(html);
  const summary = {
    title,
    description,
    imageUrl,
    headings: headings.slice(0, isCompactPrompt ? 8 : 12),
  };

  if (!isCompactPrompt) {
    return {
      ...summary,
      bodyText: bodyText.slice(0, bodyCharLimit),
    };
  }

  const snippets = extractContextSnippets(bodyText, [
    pageContext.sourceName,
    pageContext.linkTitle,
    ...eventContextKeywords,
  ]);

  return {
    ...summary,
    text:
      snippets.length > 0
        ? snippets.join("\n")
        : truncateText(bodyText, bodyCharLimit),
  };
}

async function buildPageSummaries(sections) {
  const summaries = [];
  const seenUrls = new Set();
  const sourceCounts = new Map();
  const entries = sections
    .flatMap((section, sectionIndex) =>
      section.entries.map((entry, entryIndex) => ({
        section,
        entry,
        sectionIndex,
        entryIndex,
        score: scoreResearchEntry(section, entry),
      })),
    )
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.sectionIndex - right.sectionIndex ||
        left.entryIndex - right.entryIndex,
    );

  for (const { section, entry } of entries) {
    if (summaries.length >= maxTotalPages) {
      break;
    }

    const sourceCount = sourceCounts.get(section.sourceName) ?? 0;

    if (sourceCount >= maxPagesPerSource || seenUrls.has(entry.url)) {
      continue;
    }

    seenUrls.add(entry.url);
    sourceCounts.set(section.sourceName, sourceCount + 1);

    try {
      const html = await fetchHtml(entry.url);
      summaries.push({
        sourceName: section.sourceName,
        url: entry.url,
        linkTitle: entry.title,
        ...summarizeHtml(html, {
          sourceName: section.sourceName,
          linkTitle: entry.title,
        }),
      });
    } catch (error) {
      summaries.push({
        sourceName: section.sourceName,
        url: entry.url,
        linkTitle: entry.title,
        error: error instanceof Error ? error.message : "fetch failed",
      });
    }

    await delay(1200);
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

function normalizeDateValue(value) {
  const text = toNullableString(value);
  return text && datePattern.test(text) ? text : null;
}

function normalizePriceValue(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  const text = toNullableString(value);
  if (!text) {
    return undefined;
  }

  const normalizedText = text.replace(/[¥￥,円\s]/g, "");
  const price = Number(normalizedText);

  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

function normalizeCandidate(candidate, knownIds, knownEvents) {
  const artists = Array.isArray(candidate.artists)
    ? candidate.artists.map((artist) => String(artist).trim()).filter(Boolean)
    : [];
  const sourceUrl = normalizeUrl(toNullableString(candidate.sourceUrl) ?? "");

  if (artists.length === 0 || !sourceUrl) {
    return null;
  }

  const rawDate = toNullableString(candidate.date);
  const date = normalizeDateValue(rawDate);
  const endDate = normalizeDateValue(candidate.endDate);
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

  const requestedSourceType =
    candidate.sourceType === "promoter" ||
    candidate.sourceType === "venue" ||
    candidate.sourceType === "band_official" ||
    candidate.sourceType === "ticket" ||
    candidate.sourceType === "sns"
      ? candidate.sourceType
      : "manual";
  const sourceName = toNullableString(candidate.sourceName) ?? "Automated research";
  const sourceType = inferSourceType(requestedSourceType, sourceUrl);
  const isDiscovery = sourceType === "manual";
  const confidence =
    candidate.confidence === "high" ||
    candidate.confidence === "medium" ||
    candidate.confidence === "low"
      ? candidate.confidence
      : "medium";
  const normalizedCandidate = {
    id,
    artists,
    tourName: toNullableString(candidate.tourName),
    date,
    endDate,
    prefecture,
    venue,
    genres:
      Array.isArray(candidate.genres) && candidate.genres.length > 0
        ? candidate.genres.map((genre) => String(genre).trim()).filter(Boolean)
        : ["Heavy Metal"],
    isInternational: candidate.isInternational === true,
    ticketUrl: candidate.ticketUrl ? normalizeUrl(String(candidate.ticketUrl)) : null,
    ticketLinks: Array.isArray(candidate.ticketLinks)
      ? candidate.ticketLinks
          .map((ticketLink) => ({
            provider: toNullableString(ticketLink.provider) ?? "other",
            url: ticketLink.url ? normalizeUrl(String(ticketLink.url)) : null,
            affiliateUrl: ticketLink.affiliateUrl
              ? normalizeUrl(String(ticketLink.affiliateUrl))
              : null,
            price: normalizePriceValue(ticketLink.price),
            saleStartsAt: normalizeDateValue(ticketLink.saleStartsAt),
            saleStatus:
              ticketLink.saleStatus === "on_sale" ||
              ticketLink.saleStatus === "presale" ||
              ticketLink.saleStatus === "sold_out" ||
              ticketLink.saleStatus === "not_started" ||
              ticketLink.saleStatus === "unknown"
                ? ticketLink.saleStatus
                : "unknown",
            saleEndsAt: normalizeDateValue(ticketLink.saleEndsAt),
            priority: Number.isInteger(ticketLink.priority) ? ticketLink.priority : undefined,
          }))
          .filter((ticketLink) => ticketLink.url)
      : undefined,
    officialUrl: candidate.officialUrl
      ? normalizeUrl(String(candidate.officialUrl))
      : null,
    imageUrl: candidate.imageUrl ? normalizeUrl(String(candidate.imageUrl), sourceUrl) : null,
    organizerName: toNullableString(candidate.organizerName),
    organizerUrl: candidate.organizerUrl
      ? normalizeUrl(String(candidate.organizerUrl), sourceUrl)
      : null,
    sourceUrl,
    sourceType,
    sourceName,
    confidence: isDiscovery && confidence === "high" ? "medium" : confidence,
    eventStatus:
      candidate.eventStatus === "cancelled" || candidate.eventStatus === "postponed"
        ? candidate.eventStatus
        : "scheduled",
    reviewStatus: "review_needed",
    reviewNotes: toNullableString(candidate.reviewNotes) ?? "自動候補生成。人間の確認が必要。",
    collectedAt: today,
    reviewedAt: null,
  };

  if (
    sourceType === "manual" &&
    !heavySignalKeywords.some((keyword) =>
      [
        ...normalizedCandidate.artists,
        normalizedCandidate.tourName ?? "",
        normalizedCandidate.sourceName,
        normalizedCandidate.reviewNotes,
      ].some((value) => value.toLowerCase().includes(keyword.toLowerCase())),
    )
  ) {
    normalizedCandidate.confidence = "low";
    normalizedCandidate.reviewNotes =
      "対象範囲要確認：固定ジャンル語だけでは範囲を判断しないため、イベントの趣旨・出演者の文脈を人間が確認してください。 " +
      normalizedCandidate.reviewNotes;
  }

  if (isKnownEvent(normalizedCandidate, knownEvents)) {
    return null;
  }

  return normalizedCandidate;
}

function isLoopbackUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

async function readChatCompletionStream(response) {
  if (!response.body) {
    throw new Error("Candidate LLM response stream was empty");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  function readLine(line) {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    const chunk = JSON.parse(data);
    const delta = chunk?.choices?.[0]?.delta?.content;
    if (typeof delta === "string") content += delta;
  }

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
      buffer = buffer.slice(newlineIndex + 1);

      readLine(line);

      newlineIndex = buffer.indexOf("\n");
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) readLine(buffer.replace(/\r$/, ""));

  if (content.trim().length === 0) {
    throw new Error("Candidate LLM response was empty");
  }

  return content;
}

async function sendChatCompletionRequest(url, options) {
  if (!isLoopbackUrl(url)) {
    const response = await fetch(url, options);
    return {
      ok: response.ok,
      status: response.status,
      body: response.body,
      cleanup: () => {},
    };
  }

  const parsedUrl = new URL(url);
  const request = (parsedUrl.protocol === "https:" ? httpsRequest : httpRequest)(parsedUrl, {
    method: options.method,
    headers: options.headers,
  });
  const onAbort = () => request.destroy(options.signal.reason);
  if (options.signal.aborted) {
    onAbort();
  } else {
    options.signal.addEventListener("abort", onAbort, { once: true });
  }

  return new Promise((resolve, reject) => {
    request.once("response", (incoming) => {
      resolve({
        ok: incoming.statusCode >= 200 && incoming.statusCode < 300,
        status: incoming.statusCode,
        body: incoming,
        cleanup: () => options.signal.removeEventListener("abort", onAbort),
      });
    });
    request.once("error", (error) => {
      options.signal.removeEventListener("abort", onAbort);
      reject(error);
    });
    request.end(options.body);
  });
}

function discardResponseBody(body) {
  if (typeof body?.destroy === "function") {
    body.destroy();
  } else if (typeof body?.cancel === "function") {
    void body.cancel().catch(() => {});
  }
}

async function stopLocalModelAfterTimeout() {
  const cli = process.env.OLLAMA_CLI_PATH || "ollama";
  console.error(`[candidate-collection] stage=llm_runner_stop status=start model=${model}`);

  try {
    await runFile(cli, ["stop", model], { timeout: 30_000 });
    console.error(`[candidate-collection] stage=llm_runner_stop status=complete model=${model}`);
  } catch (error) {
    console.error(
      `[candidate-collection] stage=llm_runner_stop status=failed model=${model} error=${error instanceof Error ? error.name : "unknown"}`,
    );
  }
}

async function callCandidateLlm(prompt) {
  if (promptOnly) {
    return { candidates: [], skippedReason: "prompt-only mode; candidate LLM request was skipped." };
  }

  if (!apiKey && !isLoopbackUrl(llmBaseUrl)) {
    return {
      candidates: [],
      skippedReason: "Candidate LLM API key is not configured for a non-local endpoint.",
    };
  }

  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  if (!Number.isFinite(llmTimeoutMs) || llmTimeoutMs <= 0) {
    throw new Error("CANDIDATE_LLM_TIMEOUT_MS must be a positive finite number");
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), llmTimeoutMs);
  console.error(`[candidate-collection] stage=llm status=start model=${model} timeout_ms=${llmTimeoutMs}`);
  let response;

  try {
    response = await sendChatCompletionRequest(`${llmBaseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        stream: true,
        response_format: { type: "json_object" },
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
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await readChatCompletionStream(response);
    response.cleanup();
    console.error(`[candidate-collection] stage=llm status=complete model=${model} elapsed_ms=${Date.now() - startedAt}`);
    return extractJsonObject(content);
  } catch (error) {
    response?.cleanup();
    discardResponseBody(response?.body);
    const elapsedMs = Date.now() - startedAt;
    const timedOut = controller.signal.aborted;
    console.error(
      `[candidate-collection] stage=llm status=failed model=${model} elapsed_ms=${elapsedMs} timeout_ms=${llmTimeoutMs} reason=${timedOut ? "timeout" : "request_error"}`,
    );
    if (timedOut && isLoopbackUrl(llmBaseUrl)) {
      await stopLocalModelAfterTimeout();
    }
    const message = timedOut
      ? `Candidate LLM request timed out after ${llmTimeoutMs}ms (model=${model})`
      : `Candidate LLM request failed (model=${model}, error=${error instanceof Error ? error.name : "unknown"})`;
    throw new Error(message, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(summaries, knownSummary) {
  const priorityArtists = priorityArtistKeywords.join(", ");

  return [
    "Metals Calendar is a Japan metal live event calendar.",
    "Act like the project's normal Codex-assisted candidate collection workflow.",
    "Extract only candidate events for manual review from the supplied page summaries.",
    "Public events must not be updated. These candidates will be shown in /admin/candidates.",
    "",
    "Target information:",
    "- Japan live events, visiting international tours, domestic metal/heavy music shows, festivals.",
    "- Include metal, hard rock, loud rock, metalcore, hardcore, punk/hardcore-adjacent festivals, extreme metal, death metal, black metal, thrash, power metal, and related heavy music.",
    "- Ticket sale starts, lineup additions, date changes, postponements, cancellations are allowed only if the live event itself is clear.",
    "- Album release news alone is out of scope.",
    `- Preferred watch artists include: ${priorityArtists}. Check these carefully, but do not limit candidates to them.`,
    "",
    "Source policy:",
    "- Prefer official band, promoter, venue, label, and ticket pages.",
    "- News or discovery pages may be used only as low/medium confidence candidates and reviewNotes must say official confirmation is needed.",
    "- SNS-only items must be official and low confidence.",
    "- Do not use fan speculation.",
    "- Do not exclude a domestic live event only because the artist has no single clear genre label or is not on the watch list.",
    "- Judge domestic scope from the official event description, organizer or venue context, co-performers, and known scene relationships. Do not assign a genre based on guesswork.",
    "- If the Japan date, venue, and performers are concrete and there is a plausible event-context signal but scope remains uncertain, keep it as a low-confidence review candidate. Start reviewNotes with 対象範囲要確認: and state the evidence and uncertainty.",
    "- Exclude generic music news without an event-specific Japan date, venue, and performers, or an event with no evidence connecting it to the site's heavy-live audience.",
    "- If a page describes multiple dates of the same tour, create one candidate per clearly confirmed date when date and venue are visible.",
    "- When a candidate looks like a tour or multi-date run, do not stop at the first date. Check the artist/promoter/ticket tour page for other Japan dates and add every clearly confirmed date.",
    "- For tour-like candidates, reviewNotes must say whether the full tour schedule was checked. Use wording like `公式ツアーページとチケットページで全日程確認済み` or `他日程の有無は未確認`.",
    "- Treat words like Japan Tour, Tour, nationwide tour, one-man tour, additional show, Tokyo/Nagoya/Osaka dates, and shared ticket reception pages as signals to check for other dates.",
    "- Set isInternational to true when the main purpose is a visiting international artist's Japan show. Domestic-only events should be false.",
    "- If date, prefecture, or venue is missing but the announcement is important, keep the missing field null and explain it in reviewNotes.",
    "- When visible, collect event end date, event image URL, organizer/promoter name and URL, ticket price, ticket sale start date, ticket sale end date, and ticket availability.",
    "- Use ticketLinks: null when no ticket purchase URL is visible.",
    "- Do not invent prices. Only set ticketLinks[].price when an actual numeric ticket price is visible. Use null or omit it when unknown.",
    "- Set ticketLinks[].saleStartsAt only when the ticket sale start date is visible. Do not use the event date as the sale start date.",
    "- Use imageUrl only for a relevant event, artist, tour, venue, or official OG image URL from the source page.",
    "- Keep reviewNotes in Japanese and include why a human should review it.",
    "",
    "Return JSON only with this shape:",
    `{
  "candidates": [
    {
      "id": "ascii-slug",
      "artists": ["ARTIST"],
      "tourName": null,
      "date": "YYYY-MM-DD or null",
      "endDate": "YYYY-MM-DD or null",
      "prefecture": "東京都 or null",
      "venue": "venue name or null",
      "genres": ["Heavy Metal"],
      "isInternational": true,
      "ticketUrl": null,
      "ticketLinks": [
        {
          "provider": "eplus|pia|lawson|livepocket|rakuten|creativeman|smash|evp|other",
          "url": "https://...",
          "affiliateUrl": null,
          "price": 8800,
          "saleStartsAt": "YYYY-MM-DD or null",
          "saleStatus": "on_sale|presale|sold_out|not_started|unknown",
          "saleEndsAt": "YYYY-MM-DD or null",
          "priority": 1
        }
      ],
      "imageUrl": "https://... or null",
      "organizerName": "organizer/promoter name or null",
      "organizerUrl": "https://... or null",
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
    knownSummary.published.slice(-knownSummaryLimit).map((line) => `- ${line}`).join("\n"),
    "",
    "Known review-needed candidates:",
    knownSummary.reviewNeeded.slice(-knownSummaryLimit).map((line) => `- ${line}`).join("\n"),
    "",
    `Page summaries (${promptMode}):`,
    JSON.stringify(summaries),
  ].join("\n");
}

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function buildReport({ sections, summaries, candidates, skipped, skippedReason, prompt }) {
  const pilotSourceNames = new Set([
    "仙台MACANA（国内広域確認）",
    "広島SECOND CRUTCH（国内広域確認）",
    "松山SALONKITTY（国内広域確認）",
    "鹿児島SR HALL（国内広域確認）",
  ]);
  const sourcePages = (section) => summaries.filter((summary) => summary.sourceName === section.sourceName);
  const candidatesForSource = (section) => {
    const urls = new Set(sourcePages(section).map((summary) => summary.url));
    return candidates.filter((candidate) =>
      candidate.sourceName === section.sourceName || urls.has(normalizeUrl(candidate.sourceUrl, section.entries[0]?.url)),
    );
  };
  const unselectedReason = (section, entry) => {
    const score = scoreResearchEntry(section, entry);
    if (score <= 0) return "スコア対象外";
    const pages = sourcePages(section);
    if (pages.length >= maxPagesPerSource) return "ソース別ページ上限";
    if (summaries.length >= maxTotalPages) return "全体ページ上限";
    return "重複URLまたは未選定";
  };
  const lines = [
    "# 候補自動生成レポート (" + today + ")",
    "",
    "このレポートは自動生成です。公開イベントには直接反映していません。",
    "",
    "- 対象ソース数: " + sections.length,
    "- 取得リンク数: " + sections.reduce((total, section) => total + section.entries.length, 0),
    "- 要約対象ページ数: " + summaries.length,
    "- 要約ページ取得失敗数: " + summaries.filter((item) => item.error).length,
    "- リンク候補ゼロのソース数: " + sections.filter((section) => section.entries.length === 0 && !section.error).length,
    "- リンク収集失敗ソース数: " + sections.filter((section) => section.error).length,
    "- プロンプトモード: " + promptMode,
    "- 生成モデル: " + model,
    "- プロンプト概算: " + prompt.length.toLocaleString() + " chars / 約" + estimateTokens(prompt).toLocaleString() + " tokens",
    "- 追加候補数: " + candidates.length,
    "- 重複/不正で除外: " + skipped,
    "",
    "発見用ソースは候補探索の入口です。公演情報が具体的でも範囲が曖昧な候補は低確信度・要確認として表示します。",
    "",
    "## ソース別結果",
    "",
    "| ソース | リンク | 要約成功 | 要約失敗 | 未選定 | 候補 | 状態 |",
    "|---|---:|---:|---:|---:|---:|---|",
    ...sections.map((section) => {
      const pages = sourcePages(section);
      const failedPages = pages.filter((item) => item.error).length;
      const selectedUrls = new Set(pages.map((item) => item.url));
      const unselectedCount = section.entries.filter((entry) => !selectedUrls.has(entry.url)).length;
      const candidateCount = candidatesForSource(section).length;
      let status = "取得・判定";
      if (section.error) status = "リンク収集失敗";
      else if (section.entries.length === 0) status = "リンク候補なし";
      else if (pages.length === 0) status = "要約ページ未選定";
      else if (failedPages === pages.length) status = "要約ページ取得失敗";
      else if (candidateCount === 0) status = "取得後、候補なし";
      return "| " + section.sourceName.replaceAll("|", "／") + " | " + section.entries.length + " | " + (pages.length - failedPages) + " | " + failedPages + " | " + unselectedCount + " | " + candidateCount + " | " + status + " |";
    }),
    "",
    "## 地方4会場のページ確認",
    "",
    "以下の4会場について、リンク収集、ページ要約の選定、取得結果、モデル入力に含まれた抽出根拠を分けて記録します。",
    "",
  ];

  const pilotSections = sections.filter((item) => pilotSourceNames.has(item.sourceName));
  const presentPilotNames = new Set(pilotSections.map((section) => section.sourceName));
  const missingPilotNames = [...pilotSourceNames].filter((name) => !presentPilotNames.has(name));
  if (missingPilotNames.length > 0) {
    lines.push("対象ソースが調査メモにありません: " + missingPilotNames.join(" / "), "");
  }

  for (const section of pilotSections) {
    const pages = sourcePages(section);
    const sourceCandidates = candidatesForSource(section);
    lines.push("### " + section.sourceName, "");
    lines.push("- リンク収集: " + (section.error ? "失敗: " + section.error : section.entries.length + "件"));
    lines.push("- ページ要約: " + pages.length + "件成功 / " + pages.filter((page) => page.error).length + "件失敗");
    lines.push("- 公演候補: " + sourceCandidates.length + "件");
    if (sourceCandidates.length > 0) {
      lines.push("- 候補ID: " + sourceCandidates.map((candidate) => candidate.id).join(", "));
    }
    lines.push("", "#### ページごとの状態", "");
    for (const entry of section.entries) {
      const page = pages.find((item) => item.url === entry.url);
      const state = page
        ? page.error ? "取得失敗: " + page.error : "取得成功・モデル入力済み"
        : "未選定: " + unselectedReason(section, entry);
      lines.push("- " + entry.title + " — " + state);
      lines.push("  " + entry.url);
    }
    if (section.entries.length === 0 && section.error) {
      lines.push("- 個別リンクを取得できませんでした。");
    }
    lines.push("", "#### モデル入力に含まれたページ根拠", "");
    if (pages.length === 0) {
      lines.push("- モデルに渡したページはありません。", "");
      continue;
    }
    for (const page of pages) {
      lines.push("- ページ: " + (page.linkTitle || page.title || "タイトルなし"));
      lines.push("  URL: " + page.url);
      if (page.error) {
        lines.push("  取得エラー: " + page.error);
        continue;
      }
      if (page.title) lines.push("  HTML title: " + truncateText(page.title, 180));
      if (page.description) lines.push("  description: " + truncateText(page.description, 240));
      if (page.headings?.length) lines.push("  見出し: " + page.headings.slice(0, 6).map((heading) => truncateText(heading, 80)).join(" / "));
      const extractedText = page.text || page.bodyText || "";
      if (extractedText) {
        const evidenceLimit = page.text ? 1200 : 500;
        lines.push("  抽出本文（モデル入力）: " + truncateText(extractedText, evidenceLimit));
      }
    }
    lines.push("");
  }

  if (skippedReason) {
    lines.push("- 候補生成スキップ理由: " + skippedReason, "");
  }

  lines.push("## /admin/candidates で確認してください", "");
  if (candidates.length === 0) {
    lines.push("- 新規候補なし");
  } else {
    for (const candidate of candidates) {
      lines.push("- " + candidate.id);
      lines.push("  - " + candidate.artists.join(" / "));
      lines.push("  - " + (candidate.date ?? "日付未定") + " / " + ([candidate.prefecture, candidate.venue].filter(Boolean).join(" / ") || "会場未定"));
      lines.push("  - " + candidate.confidence + " / " + candidate.sourceName);
      lines.push("  - " + candidate.sourceUrl);
      lines.push("  - 確認メモ: " + candidate.reviewNotes);
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
  console.error("[candidate-collection] stage=input status=start");
  const markdown = await readFile(inputPath, "utf8");
  const sections = parseResearchSections(markdown);
  console.error(`[candidate-collection] stage=page_summary status=start sources=${sections.length}`);
  const summaries = await buildPageSummaries(sections);
  console.error(`[candidate-collection] stage=page_summary status=complete pages=${summaries.length}`);
  const knownIds = buildKnownIdSet();
  const knownSummary = getKnownSummary();
  const prompt = buildPrompt(summaries, knownSummary);
  const parsed = await callCandidateLlm(prompt);
  const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  const candidates = [];
  let skipped = parsed.skippedReason ? 1 : 0;
  const knownEvents = buildKnownEvents();

  for (const rawCandidate of rawCandidates) {
    const candidate = normalizeCandidate(rawCandidate, knownIds, knownEvents);

    if (!candidate) {
      skipped += 1;
      continue;
    }

    knownIds.add(candidate.id);
    knownEvents.push({
      id: candidate.id,
      date: candidate.date,
      prefecture: normalizeForMatch(candidate.prefecture),
      venue: normalizeForMatch(candidate.venue),
      artists: candidate.artists.map((artist) => normalizeForMatch(artist)),
    });
    candidates.push(candidate);
  }

  await appendCandidates(candidates);
  console.error(`[candidate-collection] stage=write_candidates status=complete count=${candidates.length}`);
  await writeReport(
    buildReport({
      sections,
      summaries,
      candidates,
      skipped,
      skippedReason: parsed.skippedReason,
      prompt,
    }),
  );
}

await main();
