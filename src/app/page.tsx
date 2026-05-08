"use client";
import { useState } from "react";
import { events } from "../data/events";
import {
  ALL_FILTER_VALUE,
  filterEvents,
  getEventGenres,
  getEventPrefectures,
  groupEventsByDate,
  sortEventsByDate,
} from "../utils/events";
import { EventDateGroup } from "./EventDateGroup";
import { EventFilters } from "./EventFilters";
import styles from "./page.module.css";

export default function Page() {
  const [selectedPrefecture, setSelectedPrefecture] = useState(ALL_FILTER_VALUE);
  const [selectedGenre, setSelectedGenre] = useState(ALL_FILTER_VALUE);
  const hasActiveFilters =
    selectedPrefecture !== ALL_FILTER_VALUE || selectedGenre !== ALL_FILTER_VALUE;

  const genres = getEventGenres(events);
  const prefectures = getEventPrefectures(events);

  const sortedEvents = sortEventsByDate(events);
  const filteredEvents = filterEvents(
    sortedEvents,
    selectedPrefecture,
    selectedGenre,
  );

  const eventsByDate = groupEventsByDate(filteredEvents);
  const eventDates = Object.keys(eventsByDate);

  function resetFilters() {
    setSelectedPrefecture(ALL_FILTER_VALUE);
    setSelectedGenre(ALL_FILTER_VALUE);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Japan heavy metal live events</p>
        <h1>Metal Live Calendar</h1>
        <p className={styles.summary}>
          {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"} found
        </p>
      </header>

      <EventFilters
        genres={genres}
        prefectures={prefectures}
        selectedGenre={selectedGenre}
        selectedPrefecture={selectedPrefecture}
        canReset={hasActiveFilters}
        onGenreChange={setSelectedGenre}
        onPrefectureChange={setSelectedPrefecture}
        onReset={resetFilters}
      />

      {eventDates.length === 0 ? (
        <p className={styles.empty}>
          No events match these filters. Try changing or resetting the filters.
        </p>
      ) : (
        <div className={styles.dateGroups}>
          {eventDates.map((date) => (
            <EventDateGroup date={date} events={eventsByDate[date]} key={date} />
          ))}
        </div>
      )}
    </main>
  );
}
