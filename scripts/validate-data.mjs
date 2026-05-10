import { candidateEvents } from "../src/data/candidates.ts";
import { crawlTargets } from "../src/data/crawlTargets.ts";
import { events } from "../src/data/events.ts";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const eventStatuses = new Set(["scheduled", "cancelled", "postponed"]);
const reviewStatuses = new Set(["new", "needs_review", "approved", "rejected"]);
const sourceTypes = new Set(["promoter", "venue", "band_official", "sns", "manual"]);
const targetTypes = new Set(["promoter", "venue", "band_official", "sns"]);
const priorities = new Set(["high", "medium", "low"]);
const errors = [];
const warnings = [];

function isValidUrl(value) {
  if (value === null) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function checkUniqueIds(items, label) {
  const seen = new Set();

  for (const item of items) {
    if (seen.has(item.id)) {
      errors.push(`${label}: duplicate id "${item.id}"`);
    }

    seen.add(item.id);
  }
}

checkUniqueIds(events, "events");
checkUniqueIds(candidateEvents, "candidateEvents");
checkUniqueIds(crawlTargets, "crawlTargets");

for (const event of events) {
  if (!Array.isArray(event.artists) || event.artists.length === 0) {
    errors.push(`events:${event.id}: artists must not be empty`);
  }

  if (!datePattern.test(event.date)) {
    errors.push(`events:${event.id}: date must be YYYY-MM-DD`);
  }

  if (!eventStatuses.has(event.status)) {
    errors.push(`events:${event.id}: invalid status "${event.status}"`);
  }

  for (const field of ["ticketUrl", "officialUrl"]) {
    if (!isValidUrl(event[field])) {
      errors.push(`events:${event.id}: invalid ${field}`);
    }
  }
}

for (const candidate of candidateEvents) {
  if (!Array.isArray(candidate.artists) || candidate.artists.length === 0) {
    errors.push(`candidateEvents:${candidate.id}: artists must not be empty`);
  }

  if (candidate.date !== null && !datePattern.test(candidate.date)) {
    errors.push(`candidateEvents:${candidate.id}: date must be YYYY-MM-DD or null`);
  }

  if (!eventStatuses.has(candidate.eventStatus)) {
    errors.push(`candidateEvents:${candidate.id}: invalid eventStatus`);
  }

  if (!reviewStatuses.has(candidate.reviewStatus)) {
    errors.push(`candidateEvents:${candidate.id}: invalid reviewStatus`);
  }

  if (!sourceTypes.has(candidate.sourceType)) {
    errors.push(`candidateEvents:${candidate.id}: invalid sourceType`);
  }

  for (const field of ["ticketUrl", "officialUrl", "sourceUrl"]) {
    if (!isValidUrl(candidate[field])) {
      errors.push(`candidateEvents:${candidate.id}: invalid ${field}`);
    }
  }

  if (candidate.reviewStatus === "approved") {
    const publishedEvent = events.find((event) => event.id === candidate.id);

    if (!publishedEvent) {
      warnings.push(
        `candidateEvents:${candidate.id}: approved candidate is not in published events`,
      );
    }
  }
}

for (const target of crawlTargets) {
  if (!targetTypes.has(target.type)) {
    errors.push(`crawlTargets:${target.id}: invalid type`);
  }

  if (!priorities.has(target.priority)) {
    errors.push(`crawlTargets:${target.id}: invalid priority`);
  }

  if (!isValidUrl(target.url)) {
    errors.push(`crawlTargets:${target.id}: invalid url`);
  }

  if (target.lastCheckedAt !== null && !datePattern.test(target.lastCheckedAt)) {
    errors.push(`crawlTargets:${target.id}: lastCheckedAt must be YYYY-MM-DD or null`);
  }
}

for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`Error: ${error}`);
  }

  process.exit(1);
}

console.log(
  `Data validation passed: ${events.length} published events, ${candidateEvents.length} candidates, ${crawlTargets.length} crawl targets.`,
);
