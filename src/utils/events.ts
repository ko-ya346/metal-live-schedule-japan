import type { Event } from "../data/events";

export function sortEventsByDate(eventList: Event[]) {
  return [...eventList].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function filterEvents(
  eventList: Event[],
  selectedPrefecture: string,
  selectedGenre: string,
) {
  return eventList.filter((event) => {
    const matchesPrefecture =
      selectedPrefecture === "all" || event.prefecture === selectedPrefecture;
    const matchesGenre =
      selectedGenre === "all" || event.genres.includes(selectedGenre);

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
