import type { Event } from "../data/events";
import { getPrefectureSlug } from "./prefectures";

export type VenueSummary = {
  name: string;
  prefecture: string;
  slug: string;
};

function normalizeVenueName(name: string) {
  return name
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function getVenueSlug(prefecture: string, name: string) {
  return `${getPrefectureSlug(prefecture)}-${normalizeVenueName(name)}`;
}

export function getVenues(eventList: Event[]) {
  const venuesBySlug = new Map<string, VenueSummary>();

  for (const event of eventList) {
    const slug = getVenueSlug(event.prefecture, event.venue);

    if (!venuesBySlug.has(slug)) {
      venuesBySlug.set(slug, {
        name: event.venue,
        prefecture: event.prefecture,
        slug,
      });
    }
  }

  return Array.from(venuesBySlug.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ja"),
  );
}

export function getVenueBySlug(eventList: Event[], slug: string) {
  return getVenues(eventList).find((venue) => venue.slug === slug);
}

export function getEventsByVenueSlug(eventList: Event[], slug: string) {
  return eventList.filter(
    (event) => getVenueSlug(event.prefecture, event.venue) === slug,
  );
}
