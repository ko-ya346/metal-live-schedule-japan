import type { Event } from "../data/events";
import { getEventDateTime } from "./date";

export const ALL_FILTER_VALUE = "all";

export function getEventGenres(eventList: Event[]) {
  return Array.from(new Set(eventList.flatMap((event) => event.genres))).sort();
}

export function getEventPrefectures(eventList: Event[]) {
  return Array.from(new Set(eventList.map((event) => event.prefecture))).sort();
}

export function sortEventsByDate(eventList: Event[]) {
  return [...eventList].sort(
    (a, b) => getEventDateTime(a.date) - getEventDateTime(b.date),
  );
}

export function filterEvents(
  eventList: Event[],
  selectedPrefecture: string,
  selectedGenre: string,
) {
  return eventList.filter((event) => {
    const matchesPrefecture =
      selectedPrefecture === ALL_FILTER_VALUE ||
      event.prefecture === selectedPrefecture;
    const matchesGenre =
      selectedGenre === ALL_FILTER_VALUE || event.genres.includes(selectedGenre);

    return matchesPrefecture && matchesGenre;
  });
}

export function groupEventsByDate(eventList: Event[]) {
  return eventList.reduce<Record<string, Event[]>>((groups, event) => {
    if (!groups[event.date]) {
      groups[event.date] = [];
    }

    groups[event.date].push(event);
    return groups;
  }, {});
}
