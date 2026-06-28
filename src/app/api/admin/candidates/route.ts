import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CandidateEvent, CandidateEventStatus } from "@/src/data/candidates";
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
  candidate?: CandidateEvent;
  candidateId?: string;
};

function isAdminAction(value: unknown): value is AdminAction {
  return value === "save" || value === "ignore" || value === "publish";
}

function isCandidateEventStatus(value: unknown): value is CandidateEventStatus {
  return value === "review_needed" || value === "published" || value === "ignored";
}

function getMissingPublishFields(candidate: CandidateEvent) {
  const missingFields: string[] = [];

  if (!candidate.date) {
    missingFields.push("日付");
  }

  if (!candidate.prefecture) {
    missingFields.push("都道府県");
  }

  if (!candidate.venue) {
    missingFields.push("会場");
  }

  return missingFields;
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
    "isInternational",
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
    isInternational: candidate.isInternational,
    ticketUrl: candidate.ticketUrl,
    officialUrl: candidate.officialUrl,
    status: candidate.eventStatus,
    candidateCreatedAt: candidate.collectedAt,
    publishedAt: getTodayInJapan(),
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

  const insertMarker = "];\n\nexport const publishedEvents =";
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
      "isInternational",
      "ticketUrl",
      "officialUrl",
      "status",
      "candidateCreatedAt",
      "publishedAt",
    ],
  )},\n${fileContent.slice(insertIndex)}`;

  await writeFile(eventsPath, nextContent);
}

function normalizeCandidate(candidate: CandidateEvent, action: AdminAction) {
  const currentCandidate = candidateEvents.find((item) => item.id === candidate.id);

  if (!currentCandidate) {
    throw new Error(`candidate not found: ${candidate.id}`);
  }

  const reviewedAt = action === "save" ? candidate.reviewedAt : getTodayInJapan();

  return {
    ...currentCandidate,
    ...candidate,
    artists: candidate.artists.filter(Boolean),
    genres: candidate.genres.filter(Boolean),
    isInternational: candidate.isInternational,
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

function formValueToString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formValueToList(formData: FormData, key: string) {
  return formValueToString(formData, key)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function parseAdminCandidateRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return {
      body: (await request.json()) as AdminCandidateRequest,
      shouldRedirect: false,
    };
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const candidateId = formData.get("candidateId");
  const currentCandidate = candidateEvents.find(
    (candidate) => candidate.id === candidateId,
  );

  if (!currentCandidate) {
    throw new Error(`candidate not found: ${candidateId ?? "unknown"}`);
  }

  return {
    body: {
      action,
      candidate: {
        ...currentCandidate,
        artists: formValueToList(formData, "artists"),
        tourName: formValueToString(formData, "tourName") || null,
        date: formValueToString(formData, "date") || null,
        prefecture: formValueToString(formData, "prefecture") || null,
        venue: formValueToString(formData, "venue") || null,
        genres: formValueToList(formData, "genres"),
        isInternational: formData.get("isInternational") === "on",
        ticketUrl: formValueToString(formData, "ticketUrl") || null,
        officialUrl: formValueToString(formData, "officialUrl") || null,
        reviewNotes: formValueToString(formData, "reviewNotes"),
      },
      candidateId: typeof candidateId === "string" ? candidateId : undefined,
    } as AdminCandidateRequest,
    shouldRedirect: true,
  };
}

function getCandidateFromRequest(body: AdminCandidateRequest) {
  if (body.candidate) {
    return body.candidate;
  }

  const currentCandidate = candidateEvents.find(
    (candidate) => candidate.id === body.candidateId,
  );

  if (!currentCandidate) {
    throw new Error(`candidate not found: ${body.candidateId ?? "unknown"}`);
  }

  return currentCandidate;
}

function redirectWithMessage(
  request: Request,
  message: string,
  fallbackStatus: CandidateEventStatus,
) {
  const referer = request.headers.get("referer");
  const url = new URL(referer ?? request.url);
  const currentStatus = url.searchParams.get("status");
  const nextStatus = isCandidateEventStatus(currentStatus)
    ? currentStatus
    : fallbackStatus;

  url.pathname = "/admin/candidates";
  url.search = "";
  url.searchParams.set("status", nextStatus);
  url.searchParams.set("adminMessage", message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  if (!isLocalWriteAllowed()) {
    return NextResponse.json(
      { error: "Admin file writes are only enabled in local development." },
      { status: 403 },
    );
  }

  try {
    const { body, shouldRedirect } = await parseAdminCandidateRequest(request);

    if (!isAdminAction(body.action)) {
      throw new Error("invalid admin action");
    }

    const requestCandidate = getCandidateFromRequest(body);
    const candidate = normalizeCandidate(requestCandidate, body.action);

    if (body.action === "publish") {
      const missingPublishFields = getMissingPublishFields(candidate);
      if (missingPublishFields.length > 0) {
        return redirectWithMessage(
          request,
          `${candidate.id} は公開できません。${missingPublishFields.join(" / ")} を埋めてください`,
          "review_needed",
        );
      }

      await appendEventFile(candidate);
    }

    await updateCandidateFile(candidate);

    if (shouldRedirect) {
      return redirectWithMessage(
        request,
        body.action === "publish"
          ? `${candidate.id} を公開しました`
          : body.action === "ignore"
            ? `${candidate.id} を対象外にしました`
            : `${candidate.id} を保存しました`,
        candidate.reviewStatus,
      );
    }

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
