import type { Event, EventDate } from "../data/events";
import { getEventDateTime } from "./date";

export const ALL_FILTER_VALUE = "all";

type EventGroupsByDate = Record<string, Event[]>;

export type RelatedEvents = {
  sameArtists: Event[];
  sameVenue: Event[];
  samePrefecture: Event[];
};

const PREFECTURE_ORDER = [
  "北海道",
  "宮城県",
  "東京都",
  "神奈川県",
  "石川県",
  "愛知県",
  "大阪府",
  "福岡県",
];

export function getEventGenres(eventList: Event[]) {
  return Array.from(new Set(eventList.flatMap((event) => event.genres))).sort();
}

export function getEventPrefectures(eventList: Event[]) {
  return Array.from(new Set(eventList.map((event) => event.prefecture))).sort(
    (a, b) => {
      const aIndex = PREFECTURE_ORDER.indexOf(a);
      const bIndex = PREFECTURE_ORDER.indexOf(b);

      if (aIndex === -1 && bIndex === -1) {
        return a.localeCompare(b, "ja");
      }

      if (aIndex === -1) {
        return 1;
      }

      if (bIndex === -1) {
        return -1;
      }

      return aIndex - bIndex;
    },
  );
}

export function sortEventsByDate(eventList: Event[]) {
  return [...eventList].sort(
    (a, b) => getEventDateTime(a.date) - getEventDateTime(b.date),
  );
}

function normalizeFilterText(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function filterEvents(
  eventList: Event[],
  selectedPrefecture: string,
  selectedGenre: string,
  searchQuery = "",
) {
  const normalizedSearchQuery = normalizeFilterText(searchQuery);
  const normalizedPrefecture = normalizeFilterText(selectedPrefecture);
  const normalizedGenre = normalizeFilterText(selectedGenre);

  return eventList.filter((event) => {
    const matchesPrefecture =
      selectedPrefecture === ALL_FILTER_VALUE ||
      normalizeFilterText(event.prefecture).includes(normalizedPrefecture);
    const matchesGenre =
      selectedGenre === ALL_FILTER_VALUE ||
      event.genres.some((genre) =>
        normalizeFilterText(genre).includes(normalizedGenre),
      );
    const searchableText = [
      ...event.artists,
      event.tourName,
      event.prefecture,
      event.venue,
      ...event.genres,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    const matchesSearch =
      normalizedSearchQuery === "" ||
      searchableText.includes(normalizedSearchQuery);

    return matchesPrefecture && matchesGenre && matchesSearch;
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

function hasSharedArtist(a: Event, b: Event) {
  return a.artists.some((artist) => b.artists.includes(artist));
}

export function getRelatedEventCandidates(
  currentEvent: Event,
  eventList: Event[],
): RelatedEvents {
  const otherEvents = eventList.filter((event) => event.id !== currentEvent.id);

  return {
    sameArtists: sortEventsByDate(
      otherEvents.filter((event) => hasSharedArtist(currentEvent, event)),
    ),
    sameVenue: sortEventsByDate(
      otherEvents.filter(
        (event) =>
          event.prefecture === currentEvent.prefecture &&
          event.venue === currentEvent.venue,
      ),
    ),
    samePrefecture: sortEventsByDate(
      otherEvents.filter((event) => event.prefecture === currentEvent.prefecture),
    ),
  };
}
