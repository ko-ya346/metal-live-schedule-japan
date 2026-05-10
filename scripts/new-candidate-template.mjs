const today = new Date().toISOString().slice(0, 10);

console.log(`{
    id: "artist-2026-prefecture-or-city",
    artists: ["ARTIST"],
    tourName: null,
    date: null,
    prefecture: null,
    venue: null,
    genres: ["Heavy Metal"],
    ticketUrl: null,
    officialUrl: null,
    sourceUrl: "https://example.com/source",
    sourceType: "manual",
    sourceName: "Source name",
    eventStatus: "scheduled",
    reviewStatus: "new",
    notes: "",
    collectedAt: "${today}",
    reviewedAt: null,
},`);
