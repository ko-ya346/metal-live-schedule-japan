"use client";
import { useState } from "react";
import { events } from "../data/events";
import {
  ALL_FILTER_VALUE,
  filterEvents,
  getEventGenres,
  getGroupedEventDates,
  getEventPrefectures,
  groupEventsByDate,
  sortEventsByDate,
} from "../utils/events";
import { getEventMonthKey } from "../utils/date";
import { EventCalendar } from "./EventCalendar";
import { EventDateGroup } from "./EventDateGroup";
import { EventFilters } from "./EventFilters";
import styles from "./page.module.css";

function formatEventCount(count: number) {
  return `${count}件のライブが見つかりました`;
}

export default function Page() {
  const [selectedPrefecture, setSelectedPrefecture] = useState(ALL_FILTER_VALUE);
  const [selectedGenre, setSelectedGenre] = useState(ALL_FILTER_VALUE);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getEventMonthKey(sortEventsByDate(events)[0].date),
  );
  const hasActiveFilters =
    selectedPrefecture !== ALL_FILTER_VALUE || selectedGenre !== ALL_FILTER_VALUE;

  const filterGenres = getEventGenres(events);
  const filterPrefectures = getEventPrefectures(events);

  const sortedEvents = sortEventsByDate(events);
  const filteredEvents = filterEvents(
    sortedEvents,
    selectedPrefecture,
    selectedGenre,
  );

  const eventsByDate = groupEventsByDate(filteredEvents);
  const groupedDates = getGroupedEventDates(eventsByDate);

  function resetFilters() {
    setSelectedPrefecture(ALL_FILTER_VALUE);
    setSelectedGenre(ALL_FILTER_VALUE);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>日本のヘヴィメタルライブ予定</p>
        <h1>Metal Live Schedule</h1>
        <p className={styles.summary}>{formatEventCount(filteredEvents.length)}</p>
      </header>

      <EventFilters
        genres={filterGenres}
        prefectures={filterPrefectures}
        selectedGenre={selectedGenre}
        selectedPrefecture={selectedPrefecture}
        canReset={hasActiveFilters}
        onGenreChange={setSelectedGenre}
        onPrefectureChange={setSelectedPrefecture}
        onReset={resetFilters}
      />

      <EventCalendar
        events={filteredEvents}
        monthKey={visibleMonth}
        onMonthChange={setVisibleMonth}
      />

      {groupedDates.length === 0 ? (
        <p className={styles.empty}>
          条件に一致するライブはありません。絞り込み条件を変更するか、リセットしてください。
        </p>
      ) : (
        <div className={styles.dateGroups}>
          {groupedDates.map((date) => (
            <EventDateGroup date={date} events={eventsByDate[date]} key={date} />
          ))}
        </div>
      )}
    </main>
  );
}
