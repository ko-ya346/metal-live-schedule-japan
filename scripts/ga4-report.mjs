import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const readonlyScope = "https://www.googleapis.com/auth/analytics.readonly";
const tokenUrl = "https://oauth2.googleapis.com/token";
const apiBaseUrl = "https://analyticsdata.googleapis.com/v1beta";

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultDateRange() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);

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
  const json = process.env.GA4_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (json) {
    return JSON.parse(json);
  }

  const credentialsPath =
    process.env.GA4_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialsPath) {
    const content = await fs.readFile(credentialsPath, "utf8");
    return JSON.parse(content);
  }

  return null;
}

async function getAccessToken() {
  if (process.env.GA4_ACCESS_TOKEN) {
    return process.env.GA4_ACCESS_TOKEN;
  }

  const serviceAccount = await readServiceAccount();

  if (!serviceAccount) {
    throw new Error(
      [
        "GA4 credentials are missing.",
        "Set GA4_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.",
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

function dimensionFilter(fieldName, value, matchType = "EXACT") {
  return {
    filter: {
      fieldName,
      stringFilter: {
        matchType,
        value,
      },
    },
  };
}

function andFilters(expressions) {
  return {
    andGroup: {
      expressions,
    },
  };
}

async function runReport({
  accessToken,
  propertyId,
  startDate,
  endDate,
  metrics,
  dimensions = [],
  dimensionFilter: filterExpression,
  limit = 20,
}) {
  const response = await fetch(`${apiBaseUrl}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      metrics: metrics.map((name) => ({ name })),
      dimensions: dimensions.map((name) => ({ name })),
      ...(filterExpression ? { dimensionFilter: filterExpression } : {}),
      limit: String(limit),
      orderBys: metrics[0]
        ? [
            {
              metric: {
                metricName: metrics[0],
              },
              desc: true,
            },
          ]
        : [],
    }),
  });

  if (!response.ok) {
    throw new Error(`GA4 API request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function tryRunReport(options) {
  try {
    const data = await runReport(options);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getMetricValue(report, metricName, rowIndex = 0) {
  const metricIndex = report.metricHeaders?.findIndex((header) => header.name === metricName) ?? -1;

  if (metricIndex === -1) {
    return 0;
  }

  return Number(report.rows?.[rowIndex]?.metricValues?.[metricIndex]?.value ?? 0);
}

function getDimensionValue(row, index) {
  return row.dimensionValues?.[index]?.value ?? "(not set)";
}

function getMetricFromRow(report, row, metricName) {
  const metricIndex = report.metricHeaders?.findIndex((header) => header.name === metricName) ?? -1;

  if (metricIndex === -1) {
    return 0;
  }

  return Number(row.metricValues?.[metricIndex]?.value ?? 0);
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("ja-JP");
}

function formatOptionalNumber(value) {
  return value == null ? "未取得" : formatNumber(value);
}

function formatRate(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function escapeTableCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function simpleTable({ headers, rows }) {
  if (rows.length === 0) {
    return "_データなし_";
  }

  return [
    `| ${headers.join(" |")} |`,
    `|${headers.map((_, index) => (index === 0 ? "---" : "---:")).join("|")}|`,
    ...rows.map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`),
  ].join("\n");
}

function reportRows(report, dimensionLabels, metricName, limit = 20) {
  return (report.rows ?? []).slice(0, limit).map((row) => [
    dimensionLabels.map((_, index) => getDimensionValue(row, index)).join(" / "),
    formatNumber(getMetricFromRow(report, row, metricName)),
  ]);
}

function getEventCountByName(eventReport, eventName) {
  const row = eventReport.rows?.find((candidateRow) => getDimensionValue(candidateRow, 0) === eventName);

  if (!row) {
    return 0;
  }

  return getMetricFromRow(eventReport, row, "eventCount");
}

function getTicketCtr(ticketClicks, eventDetailViews) {
  if (ticketClicks == null || !eventDetailViews) {
    return Number.NaN;
  }

  return ticketClicks / eventDetailViews;
}

function getImprovementNotes({ ticketClicks, officialClicks, eventDetailViews, topPages }) {
  const notes = [];

  if (ticketClicks == null) {
    notes.push("- チケット送客の内訳は未取得。GA4のカスタムディメンション登録後に確認する。");
  } else if (ticketClicks === 0) {
    notes.push("- チケット送客がまだ少ないため、イベント詳細からチケット導線が見つけやすいか確認する。");
  }

  if (eventDetailViews > 0 && ticketClicks != null && ticketClicks > 0) {
    notes.push(
      `- Ticket CTRは ${formatRate(getTicketCtr(ticketClicks, eventDetailViews))}。今後はイベント詳細ページ単位で高低を比較する。`,
    );
  }

  if (
    officialClicks != null &&
    ticketClicks != null &&
    officialClicks > ticketClicks * 2 &&
    ticketClicks > 0
  ) {
    notes.push("- 公式リンクへの遷移がチケットより多い。チケット導線の文言や配置を確認する価値がある。");
  }

  const topPage = topPages.rows?.[0] ? getDimensionValue(topPages.rows[0], 0) : null;

  if (topPage) {
    notes.push(`- 上位ページは ${topPage}。このページから関連ライブとチケット導線へ進めるか確認する。`);
  }

  if (notes.length === 0) {
    notes.push("- 大きな改善対象は自動抽出されませんでした。継続してイベント追加と送客計測を優先する。");
  }

  return notes.join("\n");
}

function buildReport({
  propertyId,
  startDate,
  endDate,
  summary,
  events,
  channels,
  topPages,
  eventPagesSummary,
  eventPages,
  outboundByLinkType,
  ticketProviders,
}) {
  const activeUsers = getMetricValue(summary, "activeUsers");
  const sessions = getMetricValue(summary, "sessions");
  const pageViews = getMetricValue(summary, "screenPageViews");
  const totalEvents = getMetricValue(summary, "eventCount");
  const eventDetailViews = getMetricValue(eventPagesSummary, "screenPageViews");
  const outboundClicks = getEventCountByName(events, "outbound_event_link_click");
  const ticketClicks = outboundByLinkType.data
    ? (outboundByLinkType.data.rows ?? [])
        .filter((row) => getDimensionValue(row, 0) === "ticket")
        .reduce((sum, row) => sum + getMetricFromRow(outboundByLinkType.data, row, "eventCount"), 0)
    : null;
  const officialClicks = outboundByLinkType.data
    ? (outboundByLinkType.data.rows ?? [])
        .filter((row) => getDimensionValue(row, 0) === "official")
        .reduce((sum, row) => sum + getMetricFromRow(outboundByLinkType.data, row, "eventCount"), 0)
    : null;

  const customDimensionNotes = [
    outboundByLinkType.error
      ? `- link_type別集計は取得できませんでした。GA4でカスタムディメンション \`link_type\` を登録すると取得できます。`
      : null,
    ticketProviders.error
      ? `- ticket_provider別集計は取得できませんでした。GA4でカスタムディメンション \`ticket_provider\` を登録すると取得できます。`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `# GA4 Report ${endDate}

## Summary

- Property ID: ${propertyId}
- Period: ${startDate} - ${endDate}
- Active users: ${formatNumber(activeUsers)}
- Sessions: ${formatNumber(sessions)}
- Page views: ${formatNumber(pageViews)}
- Total events: ${formatNumber(totalEvents)}
- Event detail page views: ${formatNumber(eventDetailViews)}
- Outbound event link clicks: ${formatNumber(outboundClicks)}
- Ticket outbound clicks: ${formatOptionalNumber(ticketClicks)}
- Official outbound clicks: ${formatOptionalNumber(officialClicks)}
- Ticket CTR vs event detail views: ${formatRate(getTicketCtr(ticketClicks, eventDetailViews))}

## Improvement Notes

${getImprovementNotes({ ticketClicks, officialClicks, eventDetailViews, topPages })}

## Traffic Channels

${simpleTable({
  headers: ["Channel", "Sessions"],
  rows: reportRows(channels, ["Channel"], "sessions"),
})}

## Top Pages

${simpleTable({
  headers: ["Page", "Views"],
  rows: reportRows(topPages, ["Page"], "screenPageViews"),
})}

## Event Detail Pages

${simpleTable({
  headers: ["Event Page", "Views"],
  rows: reportRows(eventPages, ["Event Page"], "screenPageViews"),
})}

## Event Names

${simpleTable({
  headers: ["Event", "Count"],
  rows: reportRows(events, ["Event"], "eventCount"),
})}

## Outbound Link Types

${
  outboundByLinkType.data
    ? simpleTable({
        headers: ["link_type", "Clicks"],
        rows: reportRows(outboundByLinkType.data, ["link_type"], "eventCount"),
      })
    : "_データなし_"
}

## Ticket Providers

${
  ticketProviders.data
    ? simpleTable({
        headers: ["ticket_provider", "Clicks"],
        rows: reportRows(ticketProviders.data, ["ticket_provider"], "eventCount"),
      })
    : "_データなし_"
}

## Notes

- Monthly Ticket Outbound is counted as \`outbound_event_link_click\` where \`link_type = ticket\`.
- Generic GA4 \`click\` events are not used for ticket outbound reporting.
- Custom event parameters must be registered as GA4 custom dimensions before the Data API can group by them.
${customDimensionNotes}
`;
}

function printHelp() {
  console.log(`Usage: npm run analytics:ga4 -- [options]

Options:
  --start YYYY-MM-DD     Start date. Default: 30-day range ending yesterday.
  --end YYYY-MM-DD       End date. Default: yesterday.
  --output PATH          Output markdown path.
  --help                 Show this help.

Environment:
  GA4_PROPERTY_ID=123456789
  GA4_SERVICE_ACCOUNT_JSON={...}
  GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
  GA4_ACCESS_TOKEN=ya29...  # optional short-lived token
`);
}

async function main() {
  await loadDotEnvFile(path.join(process.cwd(), ".env.local"));
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const propertyId = process.env.GA4_PROPERTY_ID;

  if (!propertyId) {
    throw new Error("GA4_PROPERTY_ID is missing.");
  }

  const outputPath =
    options.output || path.join("docs", "analytics-reports", `${options.endDate}.md`);
  const accessToken = await getAccessToken();
  const queryOptions = {
    accessToken,
    propertyId,
    startDate: options.startDate,
    endDate: options.endDate,
  };

  const [
    summary,
    events,
    channels,
    topPages,
    eventPagesSummary,
    eventPages,
    outboundByLinkType,
    ticketProviders,
  ] =
    await Promise.all([
      runReport({
        ...queryOptions,
        metrics: ["activeUsers", "sessions", "screenPageViews", "eventCount"],
      }),
      runReport({
        ...queryOptions,
        dimensions: ["eventName"],
        metrics: ["eventCount"],
        limit: 50,
      }),
      runReport({
        ...queryOptions,
        dimensions: ["sessionDefaultChannelGroup"],
        metrics: ["sessions"],
        limit: 20,
      }),
      runReport({
        ...queryOptions,
        dimensions: ["pagePath"],
        metrics: ["screenPageViews"],
        limit: 25,
      }),
      runReport({
        ...queryOptions,
        metrics: ["screenPageViews"],
        dimensionFilter: dimensionFilter("pagePath", "/events/", "BEGINS_WITH"),
        limit: 1,
      }),
      runReport({
        ...queryOptions,
        dimensions: ["pagePath"],
        metrics: ["screenPageViews"],
        dimensionFilter: dimensionFilter("pagePath", "/events/", "BEGINS_WITH"),
        limit: 25,
      }),
      tryRunReport({
        ...queryOptions,
        dimensions: ["customEvent:link_type"],
        metrics: ["eventCount"],
        dimensionFilter: dimensionFilter("eventName", "outbound_event_link_click"),
        limit: 20,
      }),
      tryRunReport({
        ...queryOptions,
        dimensions: ["customEvent:ticket_provider"],
        metrics: ["eventCount"],
        dimensionFilter: andFilters([
          dimensionFilter("eventName", "outbound_event_link_click"),
          dimensionFilter("customEvent:link_type", "ticket"),
        ]),
        limit: 20,
      }),
    ]);

  const report = buildReport({
    propertyId,
    startDate: options.startDate,
    endDate: options.endDate,
    summary,
    events,
    channels,
    topPages,
    eventPagesSummary,
    eventPages,
    outboundByLinkType,
    ticketProviders,
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, report);

  console.log(`GA4 report written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
