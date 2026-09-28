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

export const eventUpdateCandidates: EventUpdateCandidate[] = [
    {
        id: "full-metal-japan-2026-yokohama-day1-lineup-2026-09-28",
        eventId: "full-metal-japan-2026-yokohama-day1",
        updateType: "lineup",
        sourceUrl: "https://fullmetaljapan.com/",
        sourceName: "FULL METAL JAPAN official",
        confidence: "high",
        currentSnapshot:         {
            artists: [
                "MICHAEL SCHENKER GROUP",
                "STRATOVARIUS",
                "LOVEBITES",
                "RAGE",
                "Gus G. & RONNIE ROMERO",
            ],
        },
        proposedChanges:         {
            artists: [
                "MICHAEL SCHENKER GROUP",
                "STRATOVARIUS",
                "LOVEBITES",
                "VANDENBERG",
                "Gus G. & RONNIE ROMERO",
            ],
        },
        reviewNotes: "公式サイトとぴあ発表で、DAY1はRAGE出演キャンセル、VANDENBERG出演決定を確認。公開済みDAY1の出演者差し替え候補。",
        reviewStatus: "applied",
        collectedAt: "2026-09-28",
        reviewedAt: "2026-09-28",
    },
    {
        id: "paradise-lost-2026-osaka-lineup-2026-09-28",
        eventId: "paradise-lost-2026-osaka",
        updateType: "lineup",
        sourceUrl: "https://evp.jp/project/pl26/",
        sourceName: "EVP4U official",
        confidence: "high",
        currentSnapshot:         {
            artists: [
                "Paradise Lost",
                "Draconian",
            ],
        },
        proposedChanges:         {
            artists: [
                "Paradise Lost",
                "Draconian",
                "Second to None",
            ],
        },
        reviewNotes: "EVP4U公式で大阪公演の出演アーティストにSecond to Noneが掲載されていることを確認。東京公演は既存データと一致。",
        reviewStatus: "applied",
        collectedAt: "2026-09-28",
        reviewedAt: "2026-09-28",
    },
    {
        id: "hanabie-2mami-tour-2026-aichi-lineup-2026-09-28",
        eventId: "hanabie-2mami-tour-2026-aichi",
        updateType: "lineup",
        sourceUrl: "https://www.sonymusic.co.jp/artist/hanabie/info/583341",
        sourceName: "Sony Music official",
        confidence: "high",
        currentSnapshot:         {
            artists: [
                "花冷え。",
            ],
        },
        proposedChanges:         {
            artists: [
                "花冷え。",
                "OwL",
            ],
        },
        reviewNotes: "Sony Music公式で10/18愛知公演の出演にOwLが掲載されていることを確認。",
        reviewStatus: "applied",
        collectedAt: "2026-09-28",
        reviewedAt: "2026-09-28",
    },
    {
        id: "nemophila-2026-10-12-tokyo-official-ticket-2026-09-28",
        eventId: "nemophila-2026-10-12-tokyo",
        updateType: "official",
        sourceUrl: "https://ex-theater.com/schedule/2225/",
        sourceName: "EX THEATER ROPPONGI official",
        confidence: "high",
        currentSnapshot:         {
            officialUrl: null,
            ticketUrl: "https://eplus.jp/sf/detail/3563520001-P0030012P021001",
        },
        proposedChanges:         {
            officialUrl: "https://ex-theater.com/schedule/2225/",
            ticketLinks: [
                                {
                    provider: "eplus",
                    url: "https://eplus.jp/sf/detail/3563520001-P0030012P021001",
                    affiliateUrl: null,
                    saleStatus: "on_sale",
                    saleEndsAt: null,
                    priority: 1,
                },
                                {
                    provider: "pia",
                    url: "https://w.pia.jp/t/nemophila/",
                    affiliateUrl: null,
                    saleStatus: "on_sale",
                    saleEndsAt: null,
                    priority: 2,
                },
                                {
                    provider: "lawson",
                    url: "https://l-tike.com/nemophila/",
                    affiliateUrl: null,
                    saleStatus: "on_sale",
                    saleEndsAt: null,
                    priority: 3,
                },
            ],
        },
        reviewNotes: "EX THEATER公式で出演者、開場/開演、料金、イープラス・ぴあ・ローチケの販売導線を確認。公式URL未設定の補完候補。",
        reviewStatus: "applied",
        collectedAt: "2026-09-28",
        reviewedAt: "2026-09-28",
    },
];
