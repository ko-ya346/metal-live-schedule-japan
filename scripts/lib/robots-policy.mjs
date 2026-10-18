const userAgentToken = "MetalsCalendarResearchBot";
const requestDelayMs = 1200;
const robotsByOrigin = new Map();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRobots(text) {
  const groups = [];
  let group = null;
  let hasDirectives = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0].trim();
    const separator = line.indexOf(":");

    if (separator === -1) continue;

    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (directive === "user-agent") {
      if (!group || hasDirectives) {
        group = { agents: [], rules: [] };
        groups.push(group);
        hasDirectives = false;
      }
      group.agents.push(value.toLowerCase());
      continue;
    }

    if (!group || !["allow", "disallow"].includes(directive)) continue;
    hasDirectives = true;
    if (value) group.rules.push({ allow: directive === "allow", path: value });
  }

  const matchingGroups = groups.filter((candidate) =>
    candidate.agents.some((agent) => agent === "*" || userAgentToken.toLowerCase().includes(agent)),
  );
  const specificGroups = matchingGroups.filter((candidate) =>
    candidate.agents.some((agent) => agent !== "*"),
  );

  if (specificGroups.length > 0) {
    const longestAgent = Math.max(
      ...specificGroups.flatMap((candidate) =>
        candidate.agents
          .filter((agent) => agent !== "*")
          .map((agent) => agent.length),
      ),
    );
    return specificGroups
      .filter((candidate) => candidate.agents.some((agent) => agent.length === longestAgent))
      .flatMap((candidate) => candidate.rules);
  }

  return matchingGroups.flatMap((candidate) => candidate.rules);
}

function isAllowedByRules(url, rules) {
  const path = `${url.pathname}${url.search}`;
  const matches = rules
    .filter(({ path: rulePath }) => {
      const endAnchored = rulePath.endsWith("$");
      const unanchoredRule = endAnchored ? rulePath.slice(0, -1) : rulePath;
      const pattern = unanchoredRule
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replaceAll("*", ".*");
      return new RegExp(`^${pattern}${endAnchored ? "$" : ".*"}`).test(path);
    })
    .sort((left, right) =>
      right.path.replace(/\$$/, "").replaceAll("*", "").length -
      left.path.replace(/\$$/, "").replaceAll("*", "").length,
    );

  return matches.length === 0 || matches[0].allow;
}

async function getRobotsPolicy(origin) {
  if (robotsByOrigin.has(origin)) return robotsByOrigin.get(origin);

  const policyPromise = (async () => {
    try {
      const response = await fetch(new URL("/robots.txt", origin), {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": `${userAgentToken}/0.1 (+https://metalscalendar.com)` },
      });
      await delay(requestDelayMs);

      if (response.status === 404 || response.status === 410) return [];
      if (!response.ok) return null;
      return parseRobots(await response.text());
    } catch {
      return null;
    }
  })();

  robotsByOrigin.set(origin, policyPromise);
  return policyPromise;
}

export async function canFetchUrl(target) {
  const url = new URL(target);
  const rules = await getRobotsPolicy(url.origin);
  return rules !== null && isAllowedByRules(url, rules);
}
