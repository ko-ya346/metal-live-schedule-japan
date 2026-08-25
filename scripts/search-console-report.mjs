import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const defaultSiteUrl = "sc-domain:metalscalendar.com";
const readonlyScope = "https://www.googleapis.com/auth/webmasters.readonly";
const tokenUrl = "https://oauth2.googleapis.com/token";
const apiBaseUrl = "https://www.googleapis.com/webmasters/v3/sites";

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultDateRange() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function parseArgs(argv) {
  const defaults = getDefaultDateRange();
  const options = {
    startDate: defaults.startDate,
    endDate: defaults.endDate,
    output: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--start") {
      options.startDate = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--end") {
      options.endDate = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.output = argv[index + 1];
      index += 1;
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

    if (!process.env[key]) {
      process.env[key] = value.replaceAll("\\n", "\n");
    }
  }
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function signJwt(payload, serviceAccount) {
  const header = {
    alg: "RS256",
    typ: "JWT",
    ...(serviceAccount.private_key_id ? { kid: serviceAccount.private_key_id } : {}),
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign(
    "RSA-SHA256",
    Buffer.from(signingInput),
    serviceAccount.private_key,
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function readServiceAccount() {
  const json =
    process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (json) {
    return JSON.parse(json);
  }

  const credentialsPath =
    process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_FILE ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialsPath) {
    const content = await fs.readFile(credentialsPath, "utf8");
    return JSON.parse(content);
  }

  return null;
}

async function getAccessToken() {
  if (process.env.SEARCH_CONSOLE_ACCESS_TOKEN) {
    return process.env.SEARCH_CONSOLE_ACCESS_TOKEN;
  }

  const serviceAccount = await readServiceAccount();

  if (!serviceAccount) {
    throw new Error(
      [
        "Search Console credentials are missing.",
        "Set SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.",
      ].join(" "),
    );
  }

  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Service account JSON must include client_email and private_key.");
  }

  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(
    {
      iss: serviceAccount.client_email,
      scope: readonlyScope,
      aud: tokenUrl,
      exp: now + 3600,
      iat: now,
    },
    serviceAccount,
  );
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();

  return data.access_token;
}

async function querySearchAnalytics({ accessToken, siteUrl, startDate, endDate, dimensions = [] }) {
  const response = await fetch(
    `${apiBaseUrl}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions,
        rowLimit: dimensions.length === 0 ? 1 : 250,
        dataState: "final",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Search Console API request failed: ${response.status} ${await response.text()}`,
    );
  }

  const data = await response.json();

  return data.rows ?? [];
}

function sumRows(rows) {
  return rows.reduce(
    (total, row) => ({
      clicks: total.clicks + (row.clicks ?? 0),
      impressions: total.impressions + (row.impressions ?? 0),
    }),
    { clicks: 0, impressions: 0 },
  );
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("ja-JP");
}

function formatRate(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatPosition(value) {
  return value ? value.toFixed(1) : "-";
}

function escapeTableCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function tableRows(rows, keyLabel, limit = 20) {
  if (rows.length === 0) {
    return "_データなし_";
  }

  return [
    `| ${keyLabel} | Clicks | Impressions | CTR | Position |`,
    "|---|---:|---:|---:|---:|",
    ...rows.slice(0, limit).map((row) => {
      const key = escapeTableCell(row.keys?.join(" / ") ?? "合計");

      return `| ${key} | ${formatNumber(row.clicks)} | ${formatNumber(
        row.impressions,
      )} | ${formatRate(row.ctr)} | ${formatPosition(row.position)} |`;
    }),
  ].join("\n");
}

function getLowCtrRows(rows) {
  return rows
    .filter((row) => row.impressions >= 20)
    .sort((a, b) => {
      const ctrDiff = a.ctr - b.ctr;

      if (ctrDiff !== 0) {
        return ctrDiff;
      }

      return b.impressions - a.impressions;
    })
    .slice(0, 10);
}

function getImprovementNotes({ queryRows, pageRows, lowCtrQueries, lowCtrPages }) {
  const notes = [];
  const topQuery = queryRows[0]?.keys?.[0];
  const topPage = pageRows[0]?.keys?.[0];

  if (topQuery) {
    notes.push(`- 上位クエリは「${topQuery}」。この検索意図に合う導線がトップと関連ページにあるか確認する。`);
  }

  if (topPage) {
    notes.push(`- 上位ページは ${topPage}。このページから関連ライブ、地域、ジャンルへ進める導線を確認する。`);
  }

  if (lowCtrQueries.length > 0) {
    notes.push(
      "- 表示回数があるのにCTRが低いクエリは、title/description とページ冒頭の表現が検索意図に合っているか見直す。",
    );
  }

  if (lowCtrPages.length > 0) {
    notes.push(
      "- CTRが低いページは、検索結果で見えるタイトル、description、ページ上部の要約を優先して改善する。",
    );
  }

  if (notes.length === 0) {
    notes.push("- 大きな改善対象は自動抽出されませんでした。表示回数が増えるまではデータ追加と内部導線を優先する。");
  }

  return notes.join("\n");
}

function buildReport({ siteUrl, startDate, endDate, totalRows, dateRows, queryRows, pageRows }) {
  const total = totalRows[0] ?? {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
  };
  const dateTotal = sumRows(dateRows);
  const lowCtrQueries = getLowCtrRows(queryRows);
  const lowCtrPages = getLowCtrRows(pageRows);

  return `# Search Console Report ${endDate}

## Summary

- Property: ${siteUrl}
- Period: ${startDate} - ${endDate}
- Clicks: ${formatNumber(total.clicks ?? dateTotal.clicks)}
- Impressions: ${formatNumber(total.impressions ?? dateTotal.impressions)}
- CTR: ${formatRate(total.ctr ?? 0)}
- Average position: ${formatPosition(total.position)}

## Improvement Notes

${getImprovementNotes({ queryRows, pageRows, lowCtrQueries, lowCtrPages })}

## Daily Trend

${tableRows(dateRows, "Date", 31)}

## Top Queries

${tableRows(queryRows, "Query")}

## Low CTR Queries

${tableRows(lowCtrQueries, "Query", 10)}

## Top Pages

${tableRows(pageRows, "Page")}

## Low CTR Pages

${tableRows(lowCtrPages, "Page", 10)}

## Notes

- Search Console API data is sampled/limited to top rows and may not match the UI exactly.
- Recent data can change. This script uses finalized data.
- Use this report to choose small SEO or internal-link improvements, not as an A/B test source.
`;
}

function printHelp() {
  console.log(`Usage: npm run analytics:search-console -- [options]

Options:
  --start YYYY-MM-DD     Start date. Default: 28-day range ending 3 days ago.
  --end YYYY-MM-DD       End date. Default: 3 days ago.
  --output PATH          Output markdown path.
  --help                 Show this help.

Environment:
  SEARCH_CONSOLE_SITE_URL=sc-domain:metalscalendar.com
  SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON={...}
  GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
  SEARCH_CONSOLE_ACCESS_TOKEN=ya29...  # optional short-lived token
`);
}

async function main() {
  await loadDotEnvFile(path.join(process.cwd(), ".env.local"));
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL || defaultSiteUrl;
  const outputPath =
    options.output ||
    path.join("docs", "search-console-reports", `${options.endDate}.md`);
  const accessToken = await getAccessToken();
  const queryOptions = {
    accessToken,
    siteUrl,
    startDate: options.startDate,
    endDate: options.endDate,
  };
  const [totalRows, dateRows, queryRows, pageRows] = await Promise.all([
    querySearchAnalytics(queryOptions),
    querySearchAnalytics({ ...queryOptions, dimensions: ["date"] }),
    querySearchAnalytics({ ...queryOptions, dimensions: ["query"] }),
    querySearchAnalytics({ ...queryOptions, dimensions: ["page"] }),
  ]);
  const report = buildReport({
    siteUrl,
    startDate: options.startDate,
    endDate: options.endDate,
    totalRows,
    dateRows,
    queryRows,
    pageRows,
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, report);

  console.log(`Search Console report written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
