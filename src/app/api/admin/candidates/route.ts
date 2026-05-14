import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CandidateEvent } from "@/src/data/candidates";
import type { Event } from "@/src/data/events";
import { candidateEvents } from "@/src/data/candidates";

export const runtime = "nodejs";

const candidateEventsPath = path.join(
  process.cwd(),
  "src/data/candidate_events.ts",
);
const eventsPath = path.join(process.cwd(), "src/data/events.ts");

type AdminAction = "save" | "ignore" | "publish";

type AdminCandidateRequest = {
  action: AdminAction;
  candidate: CandidateEvent;
};

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

  return String(value);
}

function formatObject(
  object: Record<string, unknown>,
  keys: string[],
  indentLevel = 4,
) {
  const indent = " ".repeat(indentLevel);
  const childIndent = " ".repeat(indentLevel + 4);
  const lines = keys.map(
    (key) => `${childIndent}${key}: ${formatValue(object[key], indentLevel + 4)},`,
  );

  return `${indent}{\n${lines.join("\n")}\n${indent}}`;
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

function formatEventObject(candidate: CandidateEvent): Event {
  return {
    id: candidate.id,
    artists: candidate.artists,
    tourName: candidate.tourName ?? "TOUR NAME",
    date: candidate.date as Event["date"],
    prefecture: candidate.prefecture ?? "都道府県",
    venue: candidate.venue ?? "会場名",
    genres: candidate.genres,
    ticketUrl: candidate.ticketUrl,
    officialUrl: candidate.officialUrl,
    status: candidate.eventStatus,
  };
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

async function updateCandidateFile(candidate: CandidateEvent) {
  const fileContent = await readFile(candidateEventsPath, "utf8");
  const objectRange = findObjectRangeById(fileContent, candidate.id);

  if (!objectRange) {
    throw new Error(`candidate not found: ${candidate.id}`);
  }

  const nextContent = `${fileContent.slice(0, objectRange.start)}${formatCandidateObject(
    candidate,
  )}${fileContent.slice(objectRange.end)}`;

  await writeFile(candidateEventsPath, nextContent);
}

async function appendEventFile(candidate: CandidateEvent) {
  if (!candidate.date || !candidate.prefecture || !candidate.venue) {
    throw new Error("date, prefecture, and venue are required before publishing");
  }

  const eventObject = formatEventObject(candidate);
  const fileContent = await readFile(eventsPath, "utf8");

  if (
    fileContent.includes(`id: "${eventObject.id}"`) ||
    fileContent.includes(`"id": "${eventObject.id}"`)
  ) {
    return;
  }

  const insertMarker = "];\n\nexport const events =";
  const insertIndex = fileContent.lastIndexOf(insertMarker);

  if (insertIndex === -1) {
    throw new Error("events array end not found");
  }

  const nextContent = `${fileContent.slice(0, insertIndex)}${formatObject(
    eventObject,
    [
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
    ],
  )},\n${fileContent.slice(insertIndex)}`;

  await writeFile(eventsPath, nextContent);
}

function normalizeCandidate(candidate: CandidateEvent, action: AdminAction) {
  const currentCandidate = candidateEvents.find((item) => item.id === candidate.id);

  if (!currentCandidate) {
    throw new Error(`candidate not found: ${candidate.id}`);
  }

  const reviewedAt =
    action === "save"
      ? candidate.reviewedAt
      : new Date().toISOString().slice(0, 10);

  return {
    ...currentCandidate,
    ...candidate,
    artists: candidate.artists.filter(Boolean),
    genres: candidate.genres.filter(Boolean),
    ticketUrl: candidate.ticketUrl || null,
    officialUrl: candidate.officialUrl || null,
    tourName: candidate.tourName || null,
    date: candidate.date || null,
    prefecture: candidate.prefecture || null,
    venue: candidate.venue || null,
    reviewStatus:
      action === "ignore"
        ? "ignored"
        : action === "publish"
          ? "published"
          : candidate.reviewStatus,
    reviewedAt,
  } satisfies CandidateEvent;
}

export async function POST(request: Request) {
  if (!isLocalWriteAllowed()) {
    return NextResponse.json(
      { error: "Admin file writes are only enabled in local development." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as AdminCandidateRequest;
    const candidate = normalizeCandidate(body.candidate, body.action);

    if (body.action === "publish") {
      await appendEventFile(candidate);
    }

    await updateCandidateFile(candidate);

    return NextResponse.json({
      candidate,
      message:
        body.action === "publish"
          ? "published"
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
