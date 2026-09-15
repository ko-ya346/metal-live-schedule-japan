import { candidateEvents } from "../src/data/candidate_events.ts";
import { crawlTargets } from "../src/data/crawlTargets.ts";
import { events } from "../src/data/events.ts";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const eventStatuses = new Set(["scheduled", "cancelled", "postponed"]);
const reviewStatuses = new Set(["review_needed", "published", "ignored"]);
const confidences = new Set(["high", "medium", "low"]);
const sourceTypes = new Set(["promoter", "venue", "band_official", "ticket", "sns", "manual"]);
const targetTypes = new Set(["promoter", "venue", "band_official", "ticket", "sns"]);
const priorities = new Set(["high", "medium", "low"]);
const targetRegions = new Set(["kanto", "kansai", "tokai", "other", "nationwide"]);
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

function isValidDate(value) {
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function checkRequiredString(item, label, field) {
  if (!isNonEmptyString(item[field])) {
    errors.push(`${label}:${item.id}: ${field} must not be empty`);
  }
}

function checkOptionalDate(item, label, field, allowNull = false) {
  const value = item[field];

  if (value === undefined || (allowNull && value === null)) {
    return;
  }

  if (!isNonEmptyString(value) || !isValidDate(value)) {
    errors.push(`${label}:${item.id}: ${field} must be a valid YYYY-MM-DD date`);
  }
}

function checkStringArray(item, label, field) {
  const values = item[field];

  if (!Array.isArray(values) || values.length === 0) {
    errors.push(`${label}:${item.id}: ${field} must not be empty`);
    return;
  }

  const seen = new Set();

  for (const value of values) {
    if (!isNonEmptyString(value)) {
      errors.push(`${label}:${item.id}: ${field} must not contain empty values`);
      continue;
    }

    const normalizedValue = value.trim().toLocaleLowerCase();

    if (seen.has(normalizedValue)) {
      warnings.push(`${label}:${item.id}: duplicate ${field} value "${value}"`);
    }

    seen.add(normalizedValue);
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

function normalizeForDuplicateCheck(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　"'“”‘’・･.,，.()（）\-ー]/g, "");
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

function isSamePlace(left, right) {
  if (left.prefecture && right.prefecture && left.prefecture !== right.prefecture) {
    return false;
  }

  if (!left.venue || !right.venue) {
    return Boolean(left.prefecture && right.prefecture && left.prefecture === right.prefecture);
  }

  return (
    left.venue === right.venue ||
    (left.venue.length >= 6 && right.venue.includes(left.venue)) ||
    (right.venue.length >= 6 && left.venue.includes(right.venue))
  );
}

function toDuplicateCheckItem(item, label) {
  return {
    id: item.id,
    label,
    date: item.date ?? null,
    prefecture: normalizeForDuplicateCheck(item.prefecture),
    venue: normalizeForDuplicateCheck(item.venue),
    artists: item.artists.map((artist) => normalizeForDuplicateCheck(artist)),
    reviewStatus: item.reviewStatus ?? "published",
  };
}

function checkDuplicateEvents() {
  const items = [
    ...events.map((event) => toDuplicateCheckItem(event, "events")),
    ...candidateEvents
      .filter((candidate) => candidate.reviewStatus === "review_needed")
      .map((candidate) => toDuplicateCheckItem(candidate, "candidateEvents")),
  ];

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    const left = items[leftIndex];

    if (!left.date) {
      continue;
    }

    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      const right = items[rightIndex];

      if (left.date !== right.date || !hasSharedArtist(left.artists, right.artists)) {
        continue;
      }

      if (!isSamePlace(left, right)) {
        continue;
      }

      const message = `${left.label}:${left.id} may duplicate ${right.label}:${right.id}`;

      if (left.label === "events" && right.label === "events") {
        warnings.push(message);
      } else {
        errors.push(message);
      }
    }
  }
}

checkUniqueIds(events, "events");
checkUniqueIds(candidateEvents, "candidateEvents");
checkUniqueIds(crawlTargets, "crawlTargets");

for (const event of events) {
  checkRequiredString(event, "events", "id");
  checkRequiredString(event, "events", "tourName");
  checkRequiredString(event, "events", "prefecture");
  checkRequiredString(event, "events", "venue");
  checkStringArray(event, "events", "artists");
  checkStringArray(event, "events", "genres");

  checkOptionalDate(event, "events", "date");

  if (!eventStatuses.has(event.status)) {
    errors.push(`events:${event.id}: invalid status "${event.status}"`);
  }

  if (typeof event.isInternational !== "boolean") {
    errors.push(`events:${event.id}: isInternational must be boolean`);
  }

  for (const field of ["ticketUrl", "officialUrl"]) {
    if (!isValidUrl(event[field])) {
      errors.push(`events:${event.id}: invalid ${field}`);
    }
  }

  for (const field of ["candidateCreatedAt", "publishedAt", "updatedAt"]) {
    checkOptionalDate(event, "events", field);
  }
}

for (const candidate of candidateEvents) {
  checkRequiredString(candidate, "candidateEvents", "id");
  checkRequiredString(candidate, "candidateEvents", "sourceUrl");
  checkRequiredString(candidate, "candidateEvents", "sourceName");
  checkStringArray(candidate, "candidateEvents", "artists");
  checkStringArray(candidate, "candidateEvents", "genres");

  checkOptionalDate(candidate, "candidateEvents", "date", true);
  checkOptionalDate(candidate, "candidateEvents", "collectedAt");
  checkOptionalDate(candidate, "candidateEvents", "reviewedAt", true);

  if (candidate.tourName !== null && !isNonEmptyString(candidate.tourName)) {
    errors.push(`candidateEvents:${candidate.id}: tourName must be a string or null`);
  }

  if (candidate.prefecture !== null && !isNonEmptyString(candidate.prefecture)) {
    errors.push(`candidateEvents:${candidate.id}: prefecture must be a string or null`);
  }

  if (candidate.venue !== null && !isNonEmptyString(candidate.venue)) {
    errors.push(`candidateEvents:${candidate.id}: venue must be a string or null`);
  }

  if (!eventStatuses.has(candidate.eventStatus)) {
    errors.push(`candidateEvents:${candidate.id}: invalid eventStatus`);
  }

  if (!reviewStatuses.has(candidate.reviewStatus)) {
    errors.push(`candidateEvents:${candidate.id}: invalid reviewStatus`);
  }

  if (!confidences.has(candidate.confidence)) {
    errors.push(`candidateEvents:${candidate.id}: invalid confidence`);
  }

  if (typeof candidate.isInternational !== "boolean") {
    errors.push(`candidateEvents:${candidate.id}: isInternational must be boolean`);
  }

  if (!sourceTypes.has(candidate.sourceType)) {
    errors.push(`candidateEvents:${candidate.id}: invalid sourceType`);
  }

  for (const field of ["ticketUrl", "officialUrl", "sourceUrl"]) {
    if (!isValidUrl(candidate[field])) {
      errors.push(`candidateEvents:${candidate.id}: invalid ${field}`);
    }
  }

  const publishedEvent = events.find((event) => event.id === candidate.id);

  if (candidate.reviewStatus === "review_needed" && publishedEvent) {
    warnings.push(
      `candidateEvents:${candidate.id}: review_needed candidate is already in published events`,
    );
  }

  if (candidate.reviewStatus !== "review_needed" && candidate.reviewedAt === null) {
    warnings.push(
      `candidateEvents:${candidate.id}: reviewed candidate should have reviewedAt`,
    );
  }

  if (candidate.reviewStatus === "published" && !publishedEvent) {
    warnings.push(
      `candidateEvents:${candidate.id}: published candidate is not found in published events`,
    );
  }
}

for (const target of crawlTargets) {
  checkRequiredString(target, "crawlTargets", "id");
  checkRequiredString(target, "crawlTargets", "name");

  if (!targetTypes.has(target.type)) {
    errors.push(`crawlTargets:${target.id}: invalid type`);
  }

  if (!priorities.has(target.priority)) {
    errors.push(`crawlTargets:${target.id}: invalid priority`);
  }

  if (!targetRegions.has(target.region)) {
    errors.push(`crawlTargets:${target.id}: invalid region`);
  }

  if (!isValidUrl(target.url)) {
    errors.push(`crawlTargets:${target.id}: invalid url`);
  }

  checkOptionalDate(target, "crawlTargets", "lastCheckedAt", true);
}

checkDuplicateEvents();

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
