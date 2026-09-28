import type { Event } from "./events";
import type { CandidateEventConfidence } from "./candidate_events";

export type EventUpdateCandidateStatus = "review_needed" | "applied" | "ignored";

export type EventUpdateType =
    | "lineup"
    | "ticket"
    | "schedule"
    | "venue"
    | "status"
    | "official"
    | "metadata";

export type EventUpdateCandidate = {
    id: string;
    eventId: string;
    updateType: EventUpdateType;
    sourceUrl: string;
    sourceName: string;
    confidence: CandidateEventConfidence;
    currentSnapshot: Partial<Event>;
    proposedChanges: Partial<Event>;
    reviewNotes: string;
    reviewStatus: EventUpdateCandidateStatus;
    collectedAt: string;
    reviewedAt: string | null;
};

export const eventUpdateCandidates: EventUpdateCandidate[] = [];
