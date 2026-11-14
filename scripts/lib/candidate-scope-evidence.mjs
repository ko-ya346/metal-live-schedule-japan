function normalizeForMatch(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　"'“”‘’・･.,，.()（）\-ー]/g, "");
}

export function hasOfficialBandMetalEvidence(candidate, summaries, eventSource, heavySignalKeywords) {
  const candidateArtists = candidate.artists.map(normalizeForMatch);
  return summaries.some((summary) => {
    if (summary.error || summary === eventSource) return false;
    let host = "";
    try { host = new URL(summary.url).hostname.toLowerCase(); } catch { return false; }
    if (!host.endsWith(".bandcamp.com")) return false;
    const titleAndHeadings = [summary.title, ...(summary.headings ?? [])]
      .filter(Boolean).join(" ");
    if (!candidateArtists.some((artist) => normalizeForMatch(titleAndHeadings).includes(artist))) return false;
    const text = [summary.description, summary.text, summary.bodyText].filter(Boolean).join(" ").toLowerCase();
    return heavySignalKeywords.some((keyword) => text.includes(keyword.toLowerCase()));
  });
}
