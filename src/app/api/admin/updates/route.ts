import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  eventUpdateCandidates,
  type EventUpdateCandidate,
} from "@/src/data/event_update_candidates";
import type { Event } from "@/src/data/events";
import { events } from "@/src/data/events";

export const runtime = "nodejs";

const eventUpdateCandidatesPath = path.join(
  process.cwd(),
  "src/data/event_update_candidates.ts",
);
const eventsPath = path.join(process.cwd(), "src/data/events.ts");

type AdminUpdateAction = "save" | "apply" | "ignore";

type AdminUpdateRequest = {
  action: AdminUpdateAction;
  candidate?: EventUpdateCandidate;
  candidateId?: string;
};

const eventKeys = [
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
  "status",
  "candidateCreatedAt",
  "publishedAt",
  "updatedAt",
] satisfies Array<keyof Event>;

function isAdminUpdateAction(value: unknown): value is AdminUpdateAction {
  return value === "save" || value === "apply" || value === "ignore";
}

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
    return formatObject(value as Record<string, unknown>, Object.keys(value), indentLevel);
  }

  return String(value);
}

function formatObject(
  object: Record<string, unknown>,
  keys: string[],
  indentLevel = 4,
) {
  const childIndent = " ".repeat(indentLevel + 4);
  const indent = " ".repeat(indentLevel);
  const lines = keys
    .filter((key) => object[key] !== undefined)
    .map(
      (key) => `${childIndent}${key}: ${formatValue(object[key], indentLevel + 4)},`,
    );

  return `${indent}{\n${lines.join("\n")}\n${indent}}`;
}

function formatUpdateCandidateObject(candidate: EventUpdateCandidate) {
  return `${formatObject(candidate, [
    "id",
    "eventId",
    "updateType",
    "sourceUrl",
    "sourceName",
    "confidence",
    "currentSnapshot",
    "proposedChanges",
    "reviewNotes",
    "reviewStatus",
    "collectedAt",
    "reviewedAt",
  ])},`;
}

function formatEventObject(event: Event) {
  return `${formatObject(event, eventKeys)},`;
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

function normalizeCandidate(
  candidate: EventUpdateCandidate,
  action: AdminUpdateAction,
) {
  const currentCandidate = eventUpdateCandidates.find(
    (item) => item.id === candidate.id,
  );

  if (!currentCandidate) {
    throw new Error(`update candidate not found: ${candidate.id}`);
  }

  return {
    ...currentCandidate,
    ...candidate,
    currentSnapshot: candidate.currentSnapshot ?? {},
    proposedChanges: candidate.proposedChanges ?? {},
    reviewStatus:
      action === "ignore"
        ? "ignored"
        : action === "apply"
          ? "applied"
          : candidate.reviewStatus,
    reviewedAt: action === "save" ? candidate.reviewedAt : getTodayInJapan(),
  } satisfies EventUpdateCandidate;
}

async function updateUpdateCandidateFile(candidate: EventUpdateCandidate) {
  const fileContent = await readFile(eventUpdateCandidatesPath, "utf8");
  const objectRange = findObjectRangeById(fileContent, candidate.id);

  if (!objectRange) {
    throw new Error(`update candidate not found: ${candidate.id}`);
  }

  const nextContent = `${fileContent.slice(0, objectRange.start)}${formatUpdateCandidateObject(
    candidate,
  )}${fileContent.slice(objectRange.end)}`;

  await writeFile(eventUpdateCandidatesPath, nextContent);
}

async function updateEventFile(candidate: EventUpdateCandidate) {
  const currentEvent = events.find((event) => event.id === candidate.eventId);

  if (!currentEvent) {
    throw new Error(`event not found: ${candidate.eventId}`);
  }

  const nextEvent = {
    ...currentEvent,
    ...candidate.proposedChanges,
    id: currentEvent.id,
    updatedAt: getTodayInJapan(),
  } satisfies Event;

  const fileContent = await readFile(eventsPath, "utf8");
  const objectRange = findObjectRangeById(fileContent, currentEvent.id);

  if (!objectRange) {
    throw new Error(`event object not found: ${currentEvent.id}`);
  }

  const nextContent = `${fileContent.slice(0, objectRange.start)}${formatEventObject(
    nextEvent,
  )}${fileContent.slice(objectRange.end)}`;

  await writeFile(eventsPath, nextContent);
}

function getCandidateFromRequest(body: AdminUpdateRequest) {
  if (body.candidate) {
    return body.candidate;
  }

  const currentCandidate = eventUpdateCandidates.find(
    (candidate) => candidate.id === body.candidateId,
  );

  if (!currentCandidate) {
    throw new Error(`update candidate not found: ${body.candidateId ?? "unknown"}`);
  }

  return currentCandidate;
}

export async function POST(request: Request) {
  if (!isLocalWriteAllowed()) {
    return NextResponse.json(
      { error: "Admin file writes are only enabled in local development." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as AdminUpdateRequest;

    if (!isAdminUpdateAction(body.action)) {
      throw new Error("invalid admin action");
    }

    const requestCandidate = getCandidateFromRequest(body);
    const candidate = normalizeCandidate(requestCandidate, body.action);

    if (body.action === "apply") {
      await updateEventFile(candidate);
    }

    await updateUpdateCandidateFile(candidate);

    return NextResponse.json({
      candidate,
      message:
        body.action === "apply"
          ? "applied"
          : body.action === "ignore"
            ? "ignored"
            : "saved",
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
