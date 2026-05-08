export type Event = {
    id: string;
    artist: string;
    tourName: string;
    date: string;
    prefecture: string;
    venue: string;
    genres: string[];
    ticketUrl: string;
    // Artist, venue, or organizer event page used to verify event details.
    officialUrl: string;
    status: "scheduled" | "cancelled" | "postponed";
};

export const events: Event[] = [
    {
        id: "1",
        artist: "Iron Valley",
        tourName: "Shinjuku Thunder Night",
        date: "2026-05-07",
        prefecture: "Tokyo",
        venue: "Shinjuku Antiknock",
        genres: ["Heavy Metal", "Power Metal"],
        ticketUrl: "https://example.com/tickets",
        officialUrl: "https://example.com/iron-valley",
        status: "scheduled",
    },
    {
        id: "2",
        artist: "Crimson Fang",
        tourName: "Osaka Black Flame Tour",
        date: "2026-05-08",
        prefecture: "Osaka",
        venue: "Umeda Club Quattro",
        genres: ["Black Metal"],
        ticketUrl: "https://example.com/tickets",
        officialUrl: "https://example.com/crimson-fang",
        status: "scheduled",
    },
    {
        id: "3",
        artist: "Kurogane Riot",
        tourName: "Nagoya Steel Assault",
        date: "2026-05-09",
        prefecture: "Aichi",
        venue: "Nagoya Electric Lady Land",
        genres: ["Thrash Metal"],
        ticketUrl: "https://example.com/tickets",
        officialUrl: "https://example.com/kurogane-riot",
        status: "scheduled",
    },
    {
        id: "4",
        artist: "Azure Shrine",
        tourName: "Melodic Storm Japan",
        date: "2026-05-09",
        prefecture: "Tokyo",
        venue: "Spotify O-WEST",
        genres: ["Melodic Death Metal"],
        ticketUrl: "https://example.com/tickets",
        officialUrl: "https://example.com/azure-shrine",
        status: "scheduled",
    },
    {
        id: "5",
        artist: "North Hammer",
        tourName: "Sapporo Frost Riffs",
        date: "2026-05-10",
        prefecture: "Hokkaido",
        venue: "Sapporo Bessie Hall",
        genres: ["Doom Metal", "Heavy Metal"],
        ticketUrl: "https://example.com/tickets",
        officialUrl: "https://example.com/north-hammer",
        status: "scheduled",
    },
    {
        id: "6",
        artist: "Ashen Crown",
        tourName: "Fukuoka Extreme Ritual",
        date: "2026-06-08",
        prefecture: "Fukuoka",
        venue: "Fukuoka Drum Be-1",
        genres: ["Death Metal"],
        ticketUrl: "https://example.com/tickets",
        officialUrl: "https://example.com/ashen-crown",
        status: "scheduled",
    },
];
