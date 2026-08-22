import type { Event } from "../data/events";
import { isPastEventDate } from "./date";

export type GenreSummary = {
  name: string;
  slug: string;
  count: number;
  upcomingCount: number;
};

export const MIN_GENRE_PAGE_EVENT_COUNT = 3;

export function getGenreSlug(name: string) {
  return name
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function getGenres(eventList: Event[]) {
  const genresBySlug = new Map<string, GenreSummary>();

  for (const event of eventList) {
    for (const name of event.genres) {
      const slug = getGenreSlug(name);

      if (!slug) {
        continue;
      }

      const current = genresBySlug.get(slug);
      const nextCount = (current?.count ?? 0) + 1;
      const nextUpcomingCount =
        (current?.upcomingCount ?? 0) + (isPastEventDate(event.date) ? 0 : 1);

      genresBySlug.set(slug, {
        name: current?.name ?? name,
        slug,
        count: nextCount,
        upcomingCount: nextUpcomingCount,
      });
    }
  }

  return Array.from(genresBySlug.values()).sort((a, b) => {
    const upcomingDiff = b.upcomingCount - a.upcomingCount;

    if (upcomingDiff !== 0) {
      return upcomingDiff;
    }

    const countDiff = b.count - a.count;

    if (countDiff !== 0) {
      return countDiff;
    }

    return a.name.localeCompare(b.name, "ja");
  });
}

export function getGenreBySlug(eventList: Event[], slug: string) {
  return getGenres(eventList).find((genre) => genre.slug === slug);
}

export function getPageableGenres(eventList: Event[]) {
  return getGenres(eventList).filter(
    (genre) => genre.count >= MIN_GENRE_PAGE_EVENT_COUNT,
  );
}

export function getEventsByGenreSlug(eventList: Event[], slug: string) {
  return eventList.filter((event) =>
    event.genres.some((genre) => getGenreSlug(genre) === slug),
  );
}
