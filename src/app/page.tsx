"use client";
import { useState } from "react";
import type { EventDate } from "../data/events";
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
import { getEventMonthKey, isPastEventDate } from "../utils/date";
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
  const [selectedDate, setSelectedDate] = useState<EventDate | null>(null);
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
  const selectedDateEvents = selectedDate
    ? filteredEvents.filter((event) => event.date === selectedDate)
    : [];
  const upcomingEvents = filteredEvents.filter(
    (event) => !isPastEventDate(event.date) && event.date !== selectedDate,
  );

  const upcomingEventsByDate = groupEventsByDate(upcomingEvents);
  const upcomingDates = getGroupedEventDates(upcomingEventsByDate);

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
        selectedDate={selectedDate}
        onMonthChange={setVisibleMonth}
        onDateSelect={setSelectedDate}
      />

      {selectedDate && (
        <section className={styles.selectedDateSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>選択した日のライブ</h2>
            <button
              className={styles.clearDateButton}
              type="button"
              onClick={() => setSelectedDate(null)}
            >
              選択を解除
            </button>
          </div>

          {selectedDateEvents.length > 0 ? (
            <EventDateGroup date={selectedDate} events={selectedDateEvents} />
          ) : (
            <p className={styles.empty}>選択した日に一致するライブはありません。</p>
          )}
        </section>
      )}

      <section className={styles.upcomingSection}>
        <h2 className={styles.sectionTitle}>今後のライブ</h2>

        {upcomingDates.length === 0 ? (
          <p className={styles.empty}>
            今後のライブはありません。絞り込み条件を変更するか、リセットしてください。
          </p>
        ) : (
          <div className={styles.dateGroups}>
            {upcomingDates.map((date) => (
              <EventDateGroup
                date={date}
                events={upcomingEventsByDate[date]}
                key={date}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
