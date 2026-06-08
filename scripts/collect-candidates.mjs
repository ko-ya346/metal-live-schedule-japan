import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { candidateEvents } from "../src/data/candidate_events.ts";
import { events } from "../src/data/events.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidateEventsPath = path.join(__dirname, "../src/data/candidate_events.ts");
const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const sources = [
  {
    name: "SMASH",
    sourceType: "promoter",
    urls: [
      "https://smash-jpn.com/live/?id=4629",
    ],
    genres: ["Heavy Metal", "Thrash Metal"],
  },
  {
    name: "CREATIVEMAN PRODUCTIONS",
    sourceType: "promoter",
    urls: [
      "https://www.creativeman.co.jp/news/",
    ],
    genres: ["Heavy Metal", "Hard Rock"],
  },
  {
    name: "EVP4U",
    sourceType: "promoter",
    urls: [
      "https://evp.jp/",
    ],
    genres: ["Heavy Metal"],
  },
  {
    name: "UDO",
    sourceType: "promoter",
    urls: [
      "https://www.udo.jp/concert",
    ],
    genres: ["Hard Rock", "Heavy Metal"],
  },
];

const watchKeywords = [
  "metal",
  "heavy",
  "hardcore",
  "loud",
  "death",
  "thrash",
  "メタル",
  "ラウド",
  "ハードコア",
  "SEX MACHINEGUNS",
  "人間椅子",
  "アイリフドーパ",
  "LOUDNESS",
  "NEMOPHILA",
  "LOVEBITES",
  "BRIDEAR",
  "SABLE HILLS",
  "CRYSTAL LAKE",
  "DEVILOOF",
  "THE HAUNTED",
  "CARCASS",
  "BRUJERIA",
  "THE CROWN",
  "LORNA SHORE",
];

const ignoredLinkPatterns = [
  /facebook\.com/i,
  /twitter\.com/i,
  /x\.com/i,
  /instagram\.com/i,
  /youtube\.com/i,
  /tiktok\.com/i,
  /mailto:/i,
  /tel:/i,
  /\/contact/i,
  /\/privacy/i,
  /\/goods/i,
];

const ignoredTitlePatterns = [
  /^top\b/i,
  /^グループ詳細\b/,
  /^公演一覧$/,
  /^ticket$/i,
];

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
  return decodeHtml(value.replace(/<[^>]*>/g, " "));
}

function normalizeUrl(href, baseUrl) {
  try {
    const url = new URL(decodeHtml(href), baseUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractLinks(html, baseUrl) {
  const links = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(html)) !== null) {
    const url = normalizeUrl(match[1], baseUrl);
    const title = stripTags(match[2]);

    if (!url || title.length === 0) {
      continue;
    }

    links.push({ title, url });
  }

  return links;
}

function textMatchesScope(text) {
  const normalizedText = text.toLowerCase();

  return watchKeywords.some((keyword) =>
    normalizedText.includes(keyword.toLowerCase()),
  );
}

function isIgnoredUrl(url) {
  return ignoredLinkPatterns.some((pattern) => pattern.test(url));
}

function parseDate(text) {
  const patterns = [
    /20\d{2}[./-]\d{1,2}[./-]\d{1,2}/,
    /20\d{2}年\d{1,2}月\d{1,2}日/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    const [year, month, day] = match[0].match(/\d+/g) ?? [];

    if (year && month && day) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  return null;
}

function isPastDate(date) {
  if (!date) {
    return false;
  }

  return date < today;
}

function inferPrefecture(text) {
  const prefectures = [
    "北海道",
    "宮城県",
    "東京都",
    "神奈川県",
    "千葉県",
    "埼玉県",
    "愛知県",
    "大阪府",
    "京都府",
    "兵庫県",
    "広島県",
    "福岡県",
  ];

  for (const prefecture of prefectures) {
    if (text.includes(prefecture)) {
      return prefecture;
    }
  }

  if (/(東京|渋谷|新宿|池袋|下北沢|吉祥寺|代官山|恵比寿)/.test(text)) {
    return "東京都";
  }

  if (/(大阪|梅田|心斎橋|難波|なんば)/.test(text)) {
    return "大阪府";
  }

  if (/(名古屋|今池)/.test(text)) {
    return "愛知県";
  }

  if (/(川崎|横浜)/.test(text)) {
    return "神奈川県";
  }

  return null;
}

function inferVenue(text) {
  const venuePatterns = [
    /(?:会場|VENUE|Venue)[:：]\s*([^\n\r|／/]+)/i,
    /(渋谷CLUB QUATTRO|NAGOYA CLUB QUATTRO|UMEDA CLUB QUATTRO|豊洲PIT|Zepp [^\s\n\r|／/]+|SPACE ODD|SHIBUYA CYCLONE|SOCORE FACTORY|clubasia|CLUB CITTA'?|BlackHole|EARTHDOM|初台ライブハウスWALL)/i,
  ];

  for (const pattern of venuePatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }

    if (match?.[0]) {
      return match[0].trim();
    }
  }

  return null;
}

function titleFromHtml(html, fallback) {
  const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);

  if (ogTitle?.[1]) {
    return decodeHtml(ogTitle[1]);
  }

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (title?.[1]) {
    return stripTags(title[1]);
  }

  return fallback;
}

function createId(title, date, sourceUrl) {
  const hash = createHash("sha1").update(sourceUrl).digest("hex").slice(0, 8);
  const slug = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `auto-${date ?? "date-unknown"}-${slug || "event"}-${hash}`;
}

function buildKnownKeys() {
  const ids = new Set();
  const urls = new Set();
  const eventKeys = new Set();

  for (const event of events) {
    ids.add(event.id);

    if (event.ticketUrl) {
      urls.add(event.ticketUrl);
    }

    if (event.officialUrl) {
      urls.add(event.officialUrl);
    }

    eventKeys.add(`${event.artists.join("/")}|${event.date}|${event.venue}`);
  }

  for (const candidate of candidateEvents) {
    ids.add(candidate.id);
    urls.add(candidate.sourceUrl);

    if (candidate.ticketUrl) {
      urls.add(candidate.ticketUrl);
    }

    if (candidate.officialUrl) {
      urls.add(candidate.officialUrl);
    }

    if (candidate.date && candidate.venue) {
      eventKeys.add(`${candidate.artists.join("/")}|${candidate.date}|${candidate.venue}`);
    }
  }

  return { ids, urls, eventKeys };
}

function createCandidate({ source, title, url, pageText }) {
  const date = parseDate(pageText);
  const venue = inferVenue(pageText);
  const prefecture = inferPrefecture(pageText);
  const artists = title
    .replace(/\s*\|.*$/, "")
    .replace(/\s*[-–—]\s*(公演|LIVE|ライブ|Japan|Tour).*$/i, "")
    .split(/\s*[／/]|\s+x\s+|\s+with\s+/i)
    .map((artist) => artist.trim())
    .filter(Boolean)
    .slice(0, 5);

  return {
    id: createId(title, date, url),
    artists: artists.length > 0 ? artists : [title],
    tourName: title,
    date,
    prefecture,
    venue,
    genres: source.genres,
    ticketUrl: url,
    officialUrl: url,
    sourceUrl: url,
    sourceType: source.sourceType,
    sourceName: source.name,
    confidence: date && venue ? "medium" : "low",
    eventStatus: "scheduled",
    reviewStatus: "review_needed",
    reviewNotes:
      "自動候補生成。公開前に日程・会場・出演者・公式URLを必ず確認してください。",
    collectedAt: today,
    reviewedAt: null,
  };
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

function formatCandidate(candidate) {
  const keys = [
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
  ];
  const lines = keys.map(
    (key) => `        ${key}: ${formatValue(candidate[key], 8)},`,
  );

  return `    {\n${lines.join("\n")}\n    },`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MetalsCalendarCandidateCollector/0.1 (+https://metalscalendar.com)",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

async function appendCandidates(candidates) {
  if (candidates.length === 0) {
    return;
  }

  const fileContent = await readFile(candidateEventsPath, "utf8");
  const insertMarker = "];";
  const insertIndex = fileContent.lastIndexOf(insertMarker);

  if (insertIndex === -1) {
    throw new Error("candidate events array end not found");
  }

  const nextContent = `${fileContent.slice(0, insertIndex)}${candidates
    .map(formatCandidate)
    .join("\n")}\n${fileContent.slice(insertIndex)}`;

  await writeFile(candidateEventsPath, nextContent);
}

async function collectCandidates() {
  const known = buildKnownKeys();
  const candidates = [];
  const seenUrls = new Set(known.urls);
  const seenIds = new Set(known.ids);

  for (const source of sources) {
    for (const sourceUrl of source.urls) {
      console.log(`Checking ${source.name}: ${sourceUrl}`);

      try {
        const html = await fetchText(sourceUrl);
        const pageTitle = titleFromHtml(html, source.name);
        const links = extractLinks(html, sourceUrl);
        const candidateLinks = [
          { title: pageTitle, url: sourceUrl },
          ...links.filter((link) => !isIgnoredUrl(link.url)),
        ];

        for (const link of candidateLinks) {
          if (seenUrls.has(link.url) || !textMatchesScope(`${link.title} ${link.url}`)) {
            continue;
          }

          let pageHtml = html;

          if (link.url !== sourceUrl) {
            try {
              pageHtml = await fetchText(link.url);
              await delay(800);
            } catch {
              continue;
            }
          }

          const title = titleFromHtml(pageHtml, link.title);
          const pageText = stripTags(pageHtml);

          if (
            ignoredTitlePatterns.some((pattern) => pattern.test(title)) ||
            !textMatchesScope(`${title} ${pageText}`)
          ) {
            continue;
          }

          const candidate = createCandidate({
            source,
            title,
            url: link.url,
            pageText,
          });
          const eventKey =
            candidate.date && candidate.venue
              ? `${candidate.artists.join("/")}|${candidate.date}|${candidate.venue}`
              : null;

          if (
            isPastDate(candidate.date) ||
            seenIds.has(candidate.id) ||
            seenUrls.has(candidate.sourceUrl) ||
            (eventKey && known.eventKeys.has(eventKey))
          ) {
            continue;
          }

          seenIds.add(candidate.id);
          seenUrls.add(candidate.sourceUrl);
          candidates.push(candidate);
        }
      } catch (error) {
        console.warn(
          `  skipped: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      await delay(1200);
    }
  }

  await appendCandidates(candidates);
  console.log(`Collected ${candidates.length} candidate events.`);
}

await collectCandidates();
