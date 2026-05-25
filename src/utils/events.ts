import type { Event, EventDate } from "../data/events";
import {
  getEventDateTime,
  isEventDateInCurrentMonth,
  isEventDateInCurrentWeek,
} from "./date";

export const ALL_FILTER_VALUE = "all";
export const DATE_RANGE_ALL_VALUE = "all";

export type DateRangeFilter = "all" | "thisWeek" | "thisMonth";

type EventGroupsByDate = Record<string, Event[]>;

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

export function filterEvents(
  eventList: Event[],
  selectedPrefecture: string,
  selectedGenre: string,
  selectedDateRange: DateRangeFilter = DATE_RANGE_ALL_VALUE,
  searchQuery = "",
) {
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();

  return eventList.filter((event) => {
    const matchesPrefecture =
      selectedPrefecture === ALL_FILTER_VALUE ||
      event.prefecture === selectedPrefecture;
    const matchesGenre =
      selectedGenre === ALL_FILTER_VALUE || event.genres.includes(selectedGenre);
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
    const matchesDateRange =
      selectedDateRange === DATE_RANGE_ALL_VALUE ||
      (selectedDateRange === "thisWeek" &&
        isEventDateInCurrentWeek(event.date)) ||
      (selectedDateRange === "thisMonth" &&
        isEventDateInCurrentMonth(event.date));

    return matchesPrefecture && matchesGenre && matchesSearch && matchesDateRange;
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
