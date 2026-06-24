import { candidateEvents } from "../src/data/candidate_events.ts";
import { events } from "../src/data/events.ts";

const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const sources = [
  {
    name: "Creativeman",
    url: "https://www.creativeman.co.jp/news/",
    maxLinks: 6,
  },
  {
    name: "Creativeman artists",
    url: "https://www.creativeman.co.jp/artist/",
    maxLinks: 8,
  },
  {
    name: "UDO",
    url: "https://www.udo.jp/concert",
    maxLinks: 5,
  },
  {
    name: "H.I.P.",
    url: "https://www.hipjpn.co.jp/",
    maxLinks: 5,
  },
  {
    name: "SMASH",
    url: "https://smash-jpn.com/",
    maxLinks: 5,
  },
  {
    name: "Evoken / EVP",
    url: "https://evp.jp/",
    maxLinks: 5,
  },
  {
    name: "eplus metal / hardcore",
    url: "https://eplus.jp/sf/live/metal-core",
    maxLinks: 8,
  },
  {
    name: "eplus metal / hardcore page 2",
    url: "https://eplus.jp/sf/live/metal-core/p2",
    maxLinks: 8,
  },
  {
    name: "amass live news",
    url: "https://amass.jp/",
    maxLinks: 6,
  },
  {
    name: "Club Citta",
    url: "https://clubcitta.co.jp/",
    maxLinks: 4,
  },
  {
    name: "SHINJUKU ANTIKNOCK",
    url: "https://www.antiknock.net/",
    maxLinks: 4,
  },
  {
    name: "Zirco Tokyo",
    url: "https://zirco-tokyo.jp/",
    maxLinks: 4,
  },
  {
    name: "大塚Deepa",
    url: "https://otsukadeepa.jp/",
    maxLinks: 4,
  },
];

const includeKeywords = [
  "metal",
  "heavy",
  "hardcore",
  "loud",
  "death",
  "thrash",
  "core",
  "punk",
  "新規公演",
  "来日",
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
  "KOIAI",
  "METALVERSE",
  "SiM",
  "UADA",
  "FRONTLINE FESTIVAL",
  "MAYHEM",
  "EVANESCENCE",
  "ELVENKING",
  "MORBIDFEST",
  "Black Sun Rising",
  "I Am Morbid",
  "Terrorizer",
  "Pagan Metal",
  "PUNK LIVES",
  "HYENA",
];

const excludePatterns = [
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
  /\/faq/i,
  /\/company/i,
  /\/access/i,
  /\/login/i,
  /\/mypage/i,
  /\/register/i,
  /\/search/i,
  /\/sf\/word\//i,
  /\/newrelease/i,
  /\/tag\//i,
  /\/category\//i,
  /hb\.afl\.rakuten\.co\.jp/i,
  /backnumber/i,
  /^会員メニュー$/,
  /^メタル･ハードコアのワード一覧$/,
  /^ジャンルで探す$/,
  /^次へ$/,
  /^前へ$/,
  /^コンテンツへスキップ$/,
  /^New Release$/i,
  /^100%Metal - metal100\.com$/i,
  /^Top$/i,
  /^Tour Date$/i,
  /^WOM$/i,
  /^About$/i,
  /^[0-9]+$/,
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

function getMatchedKeywords(title, url) {
  const haystack = `${title} ${url}`.toLowerCase();

  return includeKeywords.filter((keyword) =>
    haystack.includes(keyword.toLowerCase()),
  );
}

function isExcluded(title, url) {
  const value = `${title} ${url}`;
  return excludePatterns.some((pattern) => pattern.test(title) || pattern.test(value));
}

function getKnownUrls() {
  const urls = new Set();

  for (const event of events) {
    if (event.ticketUrl) {
      urls.add(event.ticketUrl);
    }

    if (event.officialUrl) {
      urls.add(event.officialUrl);
    }
  }

  for (const candidate of candidateEvents) {
    urls.add(candidate.sourceUrl);

    if (candidate.ticketUrl) {
      urls.add(candidate.ticketUrl);
    }

    if (candidate.officialUrl) {
      urls.add(candidate.officialUrl);
    }
  }

  return urls;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MetalsCalendarResearchBot/0.1 (+https://metalscalendar.com)",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

async function collectSource(source, knownUrls, globalSeenUrls) {
  try {
    const html = await fetchHtml(source.url);
    const links = extractLinks(html, source.url);
    const results = [];

    for (const link of links) {
      if (
        results.length >= source.maxLinks ||
        globalSeenUrls.has(link.url) ||
        knownUrls.has(link.url) ||
        isExcluded(link.title, link.url)
      ) {
        continue;
      }

      const matchedKeywords = getMatchedKeywords(link.title, link.url);

      if (matchedKeywords.length === 0) {
        continue;
      }

      globalSeenUrls.add(link.url);
      results.push({
        ...link,
        matchedKeywords,
      });
    }

    return {
      source,
      links: results,
      error: null,
    };
  } catch (error) {
    return {
      source,
      links: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function renderMarkdown(results) {
  const lines = [
    `# 新着ライブ調査メモ (${today})`,
    "",
    "このIssueのリンクは自動収集された調査材料です。候補イベントとして正しいとは限りません。",
    "",
    "## Codexへの依頼",
    "",
    "```text",
    "このIssueの自動収集リンクを参考にしつつ、追加で公式/信頼できるソースを確認して、新着ライブ候補を src/data/candidate_events.ts に review_needed で追加してください。",
    "公開イベントには追加しないでください。",
    "重複を避け、npm run data:validate と npm run build を通してください。",
    "```",
    "",
    "## 自動収集リンク",
    "",
  ];

  for (const result of results) {
    lines.push(`### ${result.source.name}`);
    lines.push("");

    if (result.error) {
      lines.push(`- 取得失敗: ${result.error}`);
      lines.push("");
      continue;
    }

    if (result.links.length === 0) {
      lines.push("- 新しい調査リンク候補なし");
      lines.push("");
      continue;
    }

    for (const link of result.links) {
      lines.push(`- ${link.title}`);
      lines.push(`  ${link.url}`);
      lines.push(`  keywords: ${link.matchedKeywords.join(", ")}`);
    }

    lines.push("");
  }

  lines.push("## 作業後チェック");
  lines.push("");
  lines.push("- [ ] /admin/candidates で候補を確認");
  lines.push("- [ ] 公開するものだけ公開");
  lines.push("- [ ] 対象外は ignore");
  lines.push("- [ ] 必要ならX投稿");
  lines.push("- [ ] push");

  return lines.join("\n");
}

async function main() {
  const knownUrls = getKnownUrls();
  const globalSeenUrls = new Set(knownUrls);
  const results = [];

  for (const source of sources) {
    results.push(await collectSource(source, knownUrls, globalSeenUrls));
    await delay(1200);
  }

  console.log(renderMarkdown(results));
}

await main();
