import type { EventStatus } from "./events";

export type CandidateEventStatus =
    | "review_needed"
    | "ignored";

export type CandidateEventSourceType =
    | "promoter"
    | "venue"
    | "band_official"
    | "sns"
    | "manual";

export type CandidateEvent = {
    id: string;
    artists: string[];
    tourName: string | null;
    // Use null when the date is not confirmed yet.
    date: string | null;
    prefecture: string | null;
    venue: string | null;
    genres: string[];
    ticketUrl: string | null;
    officialUrl: string | null;
    sourceUrl: string;
    sourceType: CandidateEventSourceType;
    sourceName: string;
    eventStatus: EventStatus;
    reviewStatus: CandidateEventStatus;
    notes: string;
    collectedAt: string;
    reviewedAt: string | null;
};

// Candidate events are review-only. They are never read by the public page.
export const candidateEvents: CandidateEvent[] = [
    {
        id: "candidate-example-2026-tokyo",
        artists: ["EXAMPLE BAND"],
        tourName: null,
        date: null,
        prefecture: "東京都",
        venue: null,
        genres: ["Heavy Metal"],
        ticketUrl: null,
        officialUrl: null,
        sourceUrl: "https://example.com/live",
        sourceType: "manual",
        sourceName: "Example source",
        eventStatus: "scheduled",
        reviewStatus: "ignored",
        notes: "記入例。レビュー対象に出ないよう ignored のままにする。",
        collectedAt: "2026-05-10",
        reviewedAt: "2026-05-10",
    },
];
