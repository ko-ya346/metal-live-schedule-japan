import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { events } from "../src/data/events.ts";
import { eventUpdateCandidates } from "../src/data/event_update_candidates.ts";

const args = new Map(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.split("=");
  return [key, rest.join("=")];
}));
const write = process.argv.includes("--write");
const maxPages = Number(args.get("--max-pages") || 8);
const reportPath = args.get("--report") || "event-update-report.md";
const rawDir = args.get("--raw-dir") || ".research-cache/event-updates";
const baseUrl = process.env.CANDIDATE_LLM_BASE_URL || "http://127.0.0.1:11434/v1";
const model = process.env.CANDIDATE_LLM_MODEL || "metals-review:8b";
const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
const allowedKeys = new Set(["artists", "tourName", "date", "endDate", "prefecture", "venue", "genres", "isInternational", "ticketUrl", "ticketLinks", "imageUrl", "organizerName", "organizerUrl", "officialUrl", "status"]);
const knownIds = new Set(eventUpdateCandidates.map((candidate) => candidate.id));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function plainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function relevantExcerpt(text) {
  const matches = [];
  const pattern = /(cancel|postpon|中止|延期|振替|出演|会場|開場|開演|ticket|チケット|発売|sold out|完売|price|料金)/gi;
  for (const match of text.matchAll(pattern)) {
    matches.push(text.slice(Math.max(0, match.index - 140), match.index + 320));
    if (matches.length >= 8) break;
  }
  return (matches.length ? matches.join(" … ") : text.slice(0, 2200)).slice(0, 3200);
}

const robotsCache = new Map();
async function robotsAllows(url) {
  const parsed = new URL(url);
  if (!robotsCache.has(parsed.origin)) {
    try {
      const response = await fetch(`${parsed.origin}/robots.txt`, { signal: AbortSignal.timeout(10000) });
      robotsCache.set(parsed.origin, response.ok ? await response.text() : "");
    } catch {
      robotsCache.set(parsed.origin, "");
    }
  }
  const lines = robotsCache.get(parsed.origin).split(/\r?\n/);
  let applies = false;
  const disallowed = [];
  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    const [field, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (field?.toLowerCase() === "user-agent") applies = value === "*";
    if (applies && field?.toLowerCase() === "disallow" && value) disallowed.push(value);
  }
  return !disallowed.some((rule) => parsed.pathname.startsWith(rule));
}

function selectEvents() {
  const start = new Date(`${today}T00:00:00+09:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 90);
  const eligible = events.filter((event) => {
    const date = new Date(`${event.date}T00:00:00+09:00`);
    return date >= start && date <= end && (event.officialUrl || event.ticketUrl);
  });
  const urgent = eligible.filter((event) => {
    const days = (new Date(`${event.date}T00:00:00+09:00`) - start) / 86400000;
    return days <= 14;
  }).slice(0, Math.ceil(maxPages / 2));
  const rest = eligible.filter((event) => !urgent.includes(event));
  const week = Math.floor(start.getTime() / (7 * 86400000));
  const offset = rest.length ? (week * Math.max(1, maxPages - urgent.length)) % rest.length : 0;
  return [...urgent, ...rest.slice(offset).concat(rest.slice(0, offset))]
    .filter((event, index, list) => list.findIndex((item) => (item.officialUrl || item.ticketUrl) === (event.officialUrl || event.ticketUrl)) === index)
    .slice(0, maxPages);
}

async function collectPages(selected) {
  const pages = [];
  await mkdir(rawDir, { recursive: true });
  for (const event of selected) {
    const url = event.officialUrl || event.ticketUrl;
    if (!url || !(await robotsAllows(url))) continue;
    await sleep(1500);
    try {
      const response = await fetch(url, { headers: { "User-Agent": "MetalsCalendarResearch/1.0 (+https://metalscalendar.com)" }, signal: AbortSignal.timeout(20000) });
      if (!response.ok || !String(response.headers.get("content-type")).includes("text/html")) continue;
      const html = await response.text();
      const hash = createHash("sha256").update(url).digest("hex").slice(0, 12);
      await writeFile(path.join(rawDir, `${today}-${hash}.html`), html);
      pages.push({ event, sourceUrl: url, excerpt: relevantExcerpt(plainText(html)) });
    } catch (error) {
      console.warn(`Fetch failed: ${url}: ${error.message}`);
    }
  }
  return pages;
}

function promptFor(pages) {
  return `You audit already-published Japan heavy-music events for factual changes. Return JSON only as {"updates":[]}.
Only propose a change when the supplied source excerpt explicitly differs from the current event. Never infer missing facts. Ignore cosmetic wording. Focus on cancellation/postponement, date, venue, lineup, official/ticket links, ticket price/status, organizer, or image.
Each update: {"eventId":"existing id","updateType":"lineup|ticket|schedule|venue|status|official|metadata","sourceUrl":"exact supplied URL","sourceName":"site hostname","proposedChanges":{},"reviewNotes":"Japanese evidence note"}.
Do not include unchanged fields. Do not output an update if evidence is weak.
Input: ${JSON.stringify(pages.map(({ event, sourceUrl, excerpt }) => ({ current: event, sourceUrl, excerpt })))}`;
}

async function callModel(prompt) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, temperature: 0.1, response_format: { type: "json_object" }, messages: [
      { role: "system", content: "Return grounded JSON only. Never invent event changes." },
      { role: "user", content: prompt },
    ] }),
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });
  if (!response.ok) throw new Error(`LLM HTTP ${response.status}: ${await response.text()}`);
  const body = await response.json();
  const content = body?.choices?.[0]?.message?.content;
  if (!content) return { updates: [] };
  return JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
}

function normalize(raw, pages) {
  const page = pages.find(({ event, sourceUrl }) => event.id === raw.eventId && sourceUrl === raw.sourceUrl);
  if (!page || !raw.proposedChanges || typeof raw.proposedChanges !== "object") return null;
  const proposedChanges = Object.fromEntries(Object.entries(raw.proposedChanges)
    .filter(([key, value]) => allowedKeys.has(key) && JSON.stringify(page.event[key]) !== JSON.stringify(value)));
  const keys = Object.keys(proposedChanges);
  if (!keys.length) return null;
  const type = ["lineup", "ticket", "schedule", "venue", "status", "official", "metadata"].includes(raw.updateType) ? raw.updateType : "metadata";
  const id = `${page.event.id}-${type}-${today}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  if (knownIds.has(id)) return null;
  return {
    id, eventId: page.event.id, updateType: type, sourceUrl: page.sourceUrl,
    sourceName: new URL(page.sourceUrl).hostname, confidence: "medium",
    currentSnapshot: Object.fromEntries(keys.map((key) => [key, page.event[key] ?? null])),
    proposedChanges,
    reviewNotes: String(raw.reviewNotes || "公式ページの再確認で差分候補を検出。人間の確認が必要。"),
    reviewStatus: "review_needed", collectedAt: today, reviewedAt: null,
  };
}

function format(value, indent = 4) {
  if (value === null) return "null";
  if (Array.isArray(value)) return value.length ? `[\n${value.map((item) => `${" ".repeat(indent + 4)}${format(item, indent + 4)},`).join("\n")}\n${" ".repeat(indent)}]` : "[]";
  if (typeof value === "object") return `{\n${Object.entries(value).map(([key, item]) => `${" ".repeat(indent + 4)}${key}: ${format(item, indent + 4)},`).join("\n")}\n${" ".repeat(indent)}}`;
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

async function append(updates) {
  if (!write || !updates.length) return;
  const file = "src/data/event_update_candidates.ts";
  const content = await readFile(file, "utf8");
  const marker = "\n];";
  const index = content.lastIndexOf(marker);
  if (index < 0) throw new Error("event update candidates array end not found");
  const objects = updates.map((update) => `\n    ${format(update)},`).join("");
  await writeFile(file, `${content.slice(0, index)}${objects}${content.slice(index)}`);
}

const selected = selectEvents();
const pages = await collectPages(selected);
const parsed = pages.length ? await callModel(promptFor(pages)) : { updates: [] };
const updates = (Array.isArray(parsed.updates) ? parsed.updates : []).map((raw) => normalize(raw, pages)).filter(Boolean);
await append(updates);
await writeFile(reportPath, `# 公開イベント更新候補レポート (${today})\n\n- 確認対象: ${selected.length}\n- 取得成功: ${pages.length}\n- 更新候補: ${updates.length}\n\n${updates.map((update) => `- ${update.eventId}: ${update.updateType}\n  - ${update.reviewNotes}\n  - ${update.sourceUrl}`).join("\n") || "- 更新候補なし"}\n`);
console.log(await readFile(reportPath, "utf8"));

