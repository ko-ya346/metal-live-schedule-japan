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
    {
        id: "pig-2026-tokyo-1",
        artist: "PIG",
        tourName: "Japan Shows 2026 PIG “Hurt People Hurt” Tour",
        date: "2026-06-25",
        prefecture: "東京都",
        venue: "高円寺HIGH",
        genres: ["Industrial Rock", "Industrial Metal"],
        ticketUrl: "https://eplus.tickets/pig/",
        officialUrl: "https://www.creativeman.co.jp/event/pig_2026/",
        status: "scheduled",
    },
    {
        id: "pig-2026-tokyo-2",
        artist: "PIG",
        tourName: "Japan Shows 2026 PIG “Hurt People Hurt” Tour",
        date: "2026-06-26",
        prefecture: "東京都",
        venue: "高円寺HIGH",
        genres: ["Industrial Rock", "Industrial Metal"],
        ticketUrl: "https://eplus.tickets/pig/",
        officialUrl: "https://www.creativeman.co.jp/event/pig_2026/",
        status: "scheduled",
    },
    {
        id: "iron-maiden-2026-kanagawa-1",
        artist: "IRON MAIDEN",
        tourName: "RUN FOR YOUR LIVES WORLD TOUR 2026",
        date: "2026-11-24",
        prefecture: "神奈川県",
        venue: "Kアリーナ横浜",
        genres: ["Heavy Metal", "NWOBHM"],
        ticketUrl: "https://www.creativeman.co.jp/artist/2026/11ironmaiden/",
        officialUrl: "https://www.creativeman.co.jp/artist/2026/11ironmaiden/",
        status: "scheduled",
    },
    {
        id: "iron-maiden-2026-kanagawa-2",
        artist: "IRON MAIDEN",
        tourName: "RUN FOR YOUR LIVES WORLD TOUR 2026",
        date: "2026-11-25",
        prefecture: "神奈川県",
        venue: "Kアリーナ横浜",
        genres: ["Heavy Metal", "NWOBHM"],
        ticketUrl: "https://www.creativeman.co.jp/artist/2026/11ironmaiden/",
        officialUrl: "https://www.creativeman.co.jp/artist/2026/11ironmaiden/",
        status: "scheduled",
    },
    {
        id: "band-maid-2026-tokyo-1",
        artist: "BAND-MAID",
        tourName: "BAND-MAID WORLD TOUR 2026 FINAL",
        date: "2026-11-13",
        prefecture: "東京都",
        venue: "日本武道館",
        genres: ["Hard Rock", "Heavy Metal"],
        ticketUrl: "https://bandmaid.tokyo/",
        officialUrl: "https://www.creativeman.co.jp/event/band-maid-world-tour-2026-final/",
        status: "scheduled",
    },
    {
        id: "band-maid-2026-tokyo-2",
        artist: "BAND-MAID",
        tourName: "BAND-MAID WORLD TOUR 2026 FINAL",
        date: "2026-11-14",
        prefecture: "東京都",
        venue: "日本武道館",
        genres: ["Hard Rock", "Heavy Metal"],
        ticketUrl: "https://bandmaid.tokyo/",
        officialUrl: "https://www.creativeman.co.jp/event/band-maid-world-tour-2026-final/",
        status: "scheduled",
    },
];
