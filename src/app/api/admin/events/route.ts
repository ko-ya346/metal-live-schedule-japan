import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { candidateEvents, type CandidateEvent } from "@/src/data/candidates";
import { events, type Event, type EventStatus } from "@/src/data/events";

export const runtime = "nodejs";

const candidateEventsPath = path.join(
  process.cwd(),
  "src/data/candidate_events.ts",
);
const eventsPath = path.join(process.cwd(), "src/data/events.ts");

type AdminAction = "save" | "unpublish";

type AdminEventRequest = {
  action: AdminAction;
  event: Event;
};

function getTodayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isLocalWriteAllowed() {
  return process.env.NODE_ENV !== "production";
}

function formatValue(value: unknown, indentLevel: number): string {
  if (value === null || value === undefined) {
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

function formatObject(
  object: Record<string, unknown>,
  keys: string[],
  indentLevel = 4,
) {
  const indent = " ".repeat(indentLevel);
  const childIndent = " ".repeat(indentLevel + 4);
  const lines = keys
    .filter((key) => object[key] !== undefined)
    .map(
      (key) => `${childIndent}${key}: ${formatValue(object[key], indentLevel + 4)},`,
    );

  return `${indent}{\n${lines.join("\n")}\n${indent}}`;
}

function formatEventObject(event: Event) {
  return `${formatObject(event, [
    "id",
    "artists",
    "tourName",
    "date",
    "prefecture",
    "venue",
    "genres",
    "ticketUrl",
    "officialUrl",
    "status",
    "candidateCreatedAt",
    "publishedAt",
  ])},`;
}

function formatCandidateObject(candidate: CandidateEvent) {
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

function findObjectRangeById(fileContent: string, id: string) {
  const idIndex = Math.max(
    fileContent.indexOf(`id: "${id}"`),
    fileContent.indexOf(`"id": "${id}"`),
  );
  if (idIndex === -1) {
    return null;
  }

  const start = fileContent.lastIndexOf("    {", idIndex);
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let isInString = false;
  let previousCharacter = "";

  for (let index = start; index < fileContent.length; index += 1) {
    const character = fileContent[index];

    if (character === `"` && previousCharacter !== "\\") {
      isInString = !isInString;
    }

    if (!isInString) {
      if (character === "{") {
        depth += 1;
      }

      if (character === "}") {
        depth -= 1;

        if (depth === 0) {
          const commaIndex =
            fileContent[index + 1] === "," ? index + 2 : index + 1;
          return {
            start,
            end: commaIndex,
          };
        }
      }
    }

    previousCharacter = character;
  }

  return null;
}

async function updateEventFile(event: Event) {
  const fileContent = await readFile(eventsPath, "utf8");
  const objectRange = findObjectRangeById(fileContent, event.id);

  if (!objectRange) {
    throw new Error(`event not found: ${event.id}`);
  }

  const nextContent = `${fileContent.slice(0, objectRange.start)}${formatEventObject(
    event,
  )}${fileContent.slice(objectRange.end)}`;

  await writeFile(eventsPath, nextContent);
}

async function removeEventFromFile(eventId: string) {
  const fileContent = await readFile(eventsPath, "utf8");
  const objectRange = findObjectRangeById(fileContent, eventId);

  if (!objectRange) {
    throw new Error(`event not found: ${eventId}`);
  }

  const nextContent = `${fileContent.slice(0, objectRange.start)}${fileContent.slice(
    objectRange.end,
  )}`;

  await writeFile(eventsPath, nextContent);
}

async function appendIgnoredCandidate(event: Event) {
  const candidate: CandidateEvent = {
    id: event.id,
    artists: event.artists,
    tourName: event.tourName,
    date: event.date,
    prefecture: event.prefecture,
    venue: event.venue,
    genres: event.genres,
    ticketUrl: event.ticketUrl,
    officialUrl: event.officialUrl,
    sourceUrl:
      event.officialUrl ??
      event.ticketUrl ??
      "https://metal-live-schedule-japan.vercel.app",
    sourceType: "manual",
    sourceName: "Admin unpublished event",
    confidence: "medium",
    eventStatus: event.status,
    reviewStatus: "ignored",
    reviewNotes: "公開済みイベントから公開取り消し。",
    collectedAt: event.candidateCreatedAt ?? event.publishedAt ?? getTodayInJapan(),
    reviewedAt: getTodayInJapan(),
  };

  const fileContent = await readFile(candidateEventsPath, "utf8");
  const insertMarker = "];";
  const insertIndex = fileContent.lastIndexOf(insertMarker);

  if (insertIndex === -1) {
    throw new Error("candidate events array end not found");
  }

  const nextContent = `${fileContent.slice(0, insertIndex)}${formatCandidateObject(
    candidate,
  )}\n${fileContent.slice(insertIndex)}`;

  await writeFile(candidateEventsPath, nextContent);
}

async function markCandidateIgnored(event: Event) {
  const currentCandidate = candidateEvents.find(
    (candidate) => candidate.id === event.id,
  );

  if (!currentCandidate) {
    await appendIgnoredCandidate(event);
    return;
  }

  const fileContent = await readFile(candidateEventsPath, "utf8");
  const objectRange = findObjectRangeById(fileContent, event.id);

  if (!objectRange) {
    return;
  }

  const nextCandidate: CandidateEvent = {
    ...currentCandidate,
    reviewStatus: "ignored",
    reviewedAt: getTodayInJapan(),
    reviewNotes: currentCandidate.reviewNotes.includes("公開取り消し")
      ? currentCandidate.reviewNotes
      : `${currentCandidate.reviewNotes} 公開取り消し済み。`,
  };

  const nextContent = `${fileContent.slice(0, objectRange.start)}${formatCandidateObject(
    nextCandidate,
  )}${fileContent.slice(objectRange.end)}`;

  await writeFile(candidateEventsPath, nextContent);
}

function normalizeEvent(event: Event) {
  const currentEvent = events.find((item) => item.id === event.id);

  if (!currentEvent) {
    throw new Error(`event not found: ${event.id}`);
  }

  const status = event.status as EventStatus;

  return {
    ...currentEvent,
    ...event,
    artists: event.artists.filter(Boolean),
    genres: event.genres.filter(Boolean),
    ticketUrl: event.ticketUrl || null,
    officialUrl: event.officialUrl || null,
    status,
  } satisfies Event;
}

export async function POST(request: Request) {
  if (!isLocalWriteAllowed()) {
    return NextResponse.json(
      { error: "Admin file writes are only enabled in local development." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as AdminEventRequest;
    const event = normalizeEvent(body.event);

    if (body.action === "unpublish") {
      await removeEventFromFile(event.id);
      await markCandidateIgnored(event);

      return NextResponse.json({
        event,
        message: "unpublished",
      });
    }

    await updateEventFile(event);

    return NextResponse.json({
      event,
      message: "saved",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown admin error",
      },
      { status: 400 },
    );
  }
}
