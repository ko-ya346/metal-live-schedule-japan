import type { Event } from "../data/events";

export type ArtistSummary = {
  name: string;
  slug: string;
};

export function getArtistSlug(name: string) {
  return name
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function getArtists(eventList: Event[]) {
  const artistsBySlug = new Map<string, ArtistSummary>();

  for (const event of eventList) {
    for (const name of event.artists) {
      const slug = getArtistSlug(name);

      if (slug && !artistsBySlug.has(slug)) {
        artistsBySlug.set(slug, { name, slug });
      }
    }
  }

  return Array.from(artistsBySlug.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ja"),
  );
}

export function getArtistBySlug(eventList: Event[], slug: string) {
  return getArtists(eventList).find((artist) => artist.slug === slug);
}

export function getEventsByArtistSlug(eventList: Event[], slug: string) {
  return eventList.filter((event) =>
    event.artists.some((artist) => getArtistSlug(artist) === slug),
  );
}
