import type { Event, EventDate } from "../data/events";
import { getEventDateTime } from "./date";

export const ALL_FILTER_VALUE = "all";

type EventGroupsByDate = Record<string, Event[]>;

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
  return eventList.reduce<EventGroupsByDate>((groups, event) => {
    if (!groups[event.date]) {
      groups[event.date] = [];
    }

    groups[event.date].push(event);
    return groups;
  }, {});
}

export function getGroupedEventDates(groups: EventGroupsByDate) {
  return (Object.keys(groups) as EventDate[]).sort(
    (a, b) => getEventDateTime(a) - getEventDateTime(b),
  );
}
