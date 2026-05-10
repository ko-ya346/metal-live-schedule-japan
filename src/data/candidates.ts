import type { EventStatus } from "./events";

export type CandidateEventStatus =
    | "new"
    | "needs_review"
    | "approved"
    | "rejected";

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
        reviewStatus: "rejected",
        notes: "記入例。レビュー対象に出ないよう rejected のままにする。",
        collectedAt: "2026-05-10",
        reviewedAt: "2026-05-10",
    },
    {
        id: "nemophila-vs-2days-2026-tokyo-day1",
        artists: ["NEMOPHILA", "MIGHTY HOPE", "DEXCORE"],
        tourName: "NEMOPHILA vs. 2days 2026 - HINOE -",
        date: "2026-06-27",
        prefecture: "東京都",
        venue: "BLAZE GOTANDA",
        genres: ["Heavy Metal", "Metalcore"],
        ticketUrl: "https://l-tike.com/nemophila/",
        officialUrl:
            "https://nemophila.tokyo/en/live/guest-bands-for-nemophila-vs-2days-2026-hinoe-have-been-decided/",
        sourceUrl:
            "https://nemophila.tokyo/en/live/guest-bands-for-nemophila-vs-2days-2026-hinoe-have-been-decided/",
        sourceType: "band_official",
        sourceName: "NEMOPHILA Official Website",
        eventStatus: "scheduled",
        reviewStatus: "new",
        notes: "公式サイトでゲストバンドまで確認。公開前に日本語ページまたはチケットページも確認したい。",
        collectedAt: "2026-05-10",
        reviewedAt: null,
    },
    {
        id: "nemophila-vs-2days-2026-tokyo-day2",
        artists: ["NEMOPHILA", "Ailif Dopa", "NOISEMAKER"],
        tourName: "NEMOPHILA vs. 2days 2026 - HINOE -",
        date: "2026-06-28",
        prefecture: "東京都",
        venue: "BLAZE GOTANDA",
        genres: ["Heavy Metal", "Alternative Rock"],
        ticketUrl: "https://l-tike.com/nemophila/",
        officialUrl:
            "https://nemophila.tokyo/en/live/guest-bands-for-nemophila-vs-2days-2026-hinoe-have-been-decided/",
        sourceUrl:
            "https://nemophila.tokyo/en/live/guest-bands-for-nemophila-vs-2days-2026-hinoe-have-been-decided/",
        sourceType: "band_official",
        sourceName: "NEMOPHILA Official Website",
        eventStatus: "scheduled",
        reviewStatus: "new",
        notes: "公式サイトでゲストバンドまで確認。公開前に日本語ページまたはチケットページも確認したい。",
        collectedAt: "2026-05-10",
        reviewedAt: null,
    },
    {
        id: "rhythm-of-fear-2026-tokyo",
        artists: ["SxOxB", "NEMOPHILA", "COCOBAT"],
        tourName: "RHYTHM OF FEAR",
        date: "2026-06-14",
        prefecture: "東京都",
        venue: "恵比寿LIQUIDROOM",
        genres: ["Hardcore", "Heavy Metal"],
        ticketUrl: "https://eplus.jp/sf/detail/4501300001-P0030001",
        officialUrl:
            "https://nemophila.tokyo/en/live/the-band-will-perform-at-the-rhythm-of-fear-live-event-at-liquidroom-in-ebisu-tokyo/",
        sourceUrl:
            "https://nemophila.tokyo/en/live/the-band-will-perform-at-the-rhythm-of-fear-live-event-at-liquidroom-in-ebisu-tokyo/",
        sourceType: "band_official",
        sourceName: "NEMOPHILA Official Website",
        eventStatus: "scheduled",
        reviewStatus: "new",
        notes: "NEMOPHILA公式で出演確認。主催または会場ページも公開前に確認したい。",
        collectedAt: "2026-05-10",
        reviewedAt: null,
    },
    {
        id: "lovebites-2026-tokyo-1",
        artists: ["LOVEBITES"],
        tourName: "OUTSTANDING TOUR - JAPAN 2026",
        date: "2026-09-25",
        prefecture: "東京都",
        venue: "Zepp Haneda",
        genres: ["Power Metal", "Heavy Metal"],
        ticketUrl: "https://ticket.rakuten.co.jp/features/lovebites-tour2026/index.html/",
        officialUrl: "https://www.jvcmusic.co.jp/-/News/A025756/508.html",
        sourceUrl: "https://www.jvcmusic.co.jp/-/News/A025756/508.html",
        sourceType: "band_official",
        sourceName: "Victor Entertainment LOVEBITES NEWS",
        eventStatus: "scheduled",
        reviewStatus: "new",
        notes: "公式ニュースで日程確認。公開前にLOVEBITES公式サイトまたはチケット詳細ページも確認したい。",
        collectedAt: "2026-05-10",
        reviewedAt: null,
    },
    {
        id: "lovebites-2026-tokyo-2",
        artists: ["LOVEBITES"],
        tourName: "OUTSTANDING TOUR - JAPAN 2026",
        date: "2026-09-26",
        prefecture: "東京都",
        venue: "Zepp Haneda",
        genres: ["Power Metal", "Heavy Metal"],
        ticketUrl: "https://ticket.rakuten.co.jp/features/lovebites-tour2026/index.html/",
        officialUrl: "https://www.jvcmusic.co.jp/-/News/A025756/508.html",
        sourceUrl: "https://www.jvcmusic.co.jp/-/News/A025756/508.html",
        sourceType: "band_official",
        sourceName: "Victor Entertainment LOVEBITES NEWS",
        eventStatus: "scheduled",
        reviewStatus: "new",
        notes: "公式ニュースで日程確認。公開前にLOVEBITES公式サイトまたはチケット詳細ページも確認したい。",
        collectedAt: "2026-05-10",
        reviewedAt: null,
    },
];
