export type EventDate = `${number}-${number}-${number}`;
export type EventStatus = "scheduled" | "cancelled" | "postponed";

export type Event = {
    id: string;
    artist: string;
    tourName: string;
    // Use YYYY-MM-DD.
    date: EventDate;
    prefecture: string;
    venue: string;
    genres: string[];
    // Use null when ticket information is not published yet.
    ticketUrl: string | null;
    // Artist, venue, or organizer event page used to verify event details.
    officialUrl: string | null;
    status: EventStatus;
};

// Replace this array when adding real events. Keep the Event shape above unchanged.
export const events: Event[] = [
    {
        id: "deftones-2026-tokyo",
        artist: "DEFTONES",
        tourName: "DEFTONES JAPAN 2026",
        date: "2026-05-18",
        prefecture: "東京都",
        venue: "東京ガーデンシアター",
        genres: ["Alternative Metal", "Nu Metal"],
        ticketUrl: "https://eplus.jp/deftones/",
        officialUrl: "https://www.creativeman.co.jp/event/deftones/",
        status: "scheduled",
    },
    {
        id: "deftones-2026-osaka",
        artist: "DEFTONES",
        tourName: "DEFTONES JAPAN 2026",
        date: "2026-05-19",
        prefecture: "大阪府",
        venue: "Zepp Osaka Bayside",
        genres: ["Alternative Metal", "Nu Metal"],
        ticketUrl: "https://eplus.jp/deftones/",
        officialUrl: "https://www.creativeman.co.jp/event/deftones/",
        status: "scheduled",
    },
    {
        id: "deftones-2026-aichi",
        artist: "DEFTONES",
        tourName: "DEFTONES JAPAN 2026",
        date: "2026-05-20",
        prefecture: "愛知県",
        venue: "COMTEC PORTBASE",
        genres: ["Alternative Metal", "Nu Metal"],
        ticketUrl: "https://eplus.jp/deftones/",
        officialUrl: "https://www.creativeman.co.jp/event/deftones/",
        status: "scheduled",
    },
    {
        id: "amorphis-2026-tokyo-1",
        artist: "AMORPHIS",
        tourName: "BORDERLAND JAPAN TOUR 2026",
        date: "2026-09-15",
        prefecture: "東京都",
        venue: "渋谷CLUB QUATTRO",
        genres: ["Melodic Death Metal", "Progressive Metal"],
        ticketUrl: "https://eplus.jp/amorphis/",
        officialUrl: "https://www.creativeman.co.jp/event/amorphis26/",
        status: "scheduled",
    },
    {
        id: "amorphis-2026-tokyo-2",
        artist: "AMORPHIS",
        tourName: "BORDERLAND JAPAN TOUR 2026",
        date: "2026-09-16",
        prefecture: "東京都",
        venue: "渋谷CLUB QUATTRO",
        genres: ["Melodic Death Metal", "Progressive Metal"],
        ticketUrl: "https://eplus.jp/amorphis/",
        officialUrl: "https://www.creativeman.co.jp/event/amorphis26/",
        status: "scheduled",
    },
    {
        id: "amorphis-2026-osaka",
        artist: "AMORPHIS",
        tourName: "BORDERLAND JAPAN TOUR 2026",
        date: "2026-09-17",
        prefecture: "大阪府",
        venue: "梅田CLUB QUATTRO",
        genres: ["Melodic Death Metal", "Progressive Metal"],
        ticketUrl: "https://eplus.jp/amorphis/",
        officialUrl: "https://www.creativeman.co.jp/event/amorphis26/",
        status: "scheduled",
    },
];
