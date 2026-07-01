const today = new Date().toISOString().slice(0, 10);

console.log(`{
    id: "artist-2026-prefecture-or-city",
    artists: ["ARTIST"],
    tourName: null,
    date: null,
    prefecture: null,
    venue: null,
    genres: ["Heavy Metal"],
    isInternational: false,
    ticketUrl: null,
    officialUrl: null,
    sourceUrl: "https://example.com/source",
    sourceType: "manual",
    sourceName: "Source name",
    confidence: "medium",
    eventStatus: "scheduled",
    reviewStatus: "review_needed",
    reviewNotes: "",
    collectedAt: "${today}",
    reviewedAt: null,
},`);
