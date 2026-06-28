"use client";
import Link from "next/link";
import { useState } from "react";
import type { EventDate } from "../data/events";
import { events } from "../data/events";
import {
  ALL_FILTER_VALUE,
  DATE_RANGE_ALL_VALUE,
  type DateRangeFilter,
  filterEvents,
  getEventGenres,
  getGroupedEventDates,
  getEventPrefectures,
  groupEventsByDate,
  sortEventsByDate,
} from "../utils/events";
import { xReportUrl } from "../utils/contact";
import { getCurrentMonthKey, isPastEventDate } from "../utils/date";
import { EventCalendar } from "./EventCalendar";
import { EventCard } from "./EventCard";
import { EventDateGroup } from "./EventDateGroup";
import { EventFilters } from "./EventFilters";
import { SiteAnalytics } from "./Analytics";
import styles from "./page.module.css";

function formatEventCount(count: number) {
  return `${count}件のライブが見つかりました`;
}

function getRecentlyPublishedEvents(eventList: typeof events) {
  return eventList
    .filter((event) => event.publishedAt)
    .sort((a, b) => {
      const publishedDiff = b.publishedAt!.localeCompare(a.publishedAt!);

      if (publishedDiff !== 0) {
        return publishedDiff;
      }

      return a.date.localeCompare(b.date);
    })
    .slice(0, 5);
}

export default function Page() {
  const [selectedPrefecture, setSelectedPrefecture] = useState(ALL_FILTER_VALUE);
  const [selectedGenre, setSelectedGenre] = useState(ALL_FILTER_VALUE);
  const [selectedDateRange, setSelectedDateRange] =
    useState<DateRangeFilter>(DATE_RANGE_ALL_VALUE);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<EventDate | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(getCurrentMonthKey);
  const hasActiveFilters =
    selectedPrefecture !== ALL_FILTER_VALUE ||
    selectedGenre !== ALL_FILTER_VALUE ||
    selectedDateRange !== DATE_RANGE_ALL_VALUE ||
    searchQuery.trim() !== "";

  const filterGenres = getEventGenres(events);
  const filterPrefectures = getEventPrefectures(events);
  const recentlyPublishedEvents = getRecentlyPublishedEvents(events);

  const sortedEvents = sortEventsByDate(events);
  const filteredEvents = filterEvents(
    sortedEvents,
    selectedPrefecture,
    selectedGenre,
    selectedDateRange,
    searchQuery,
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
    setSelectedDateRange(DATE_RANGE_ALL_VALUE);
    setSearchQuery("");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>日本のメタルライブ・来日公演予定</p>
        <h1>Metals Calendar</h1>
        <p className={styles.summary}>{formatEventCount(filteredEvents.length)}</p>
        <p className={styles.lead}>
          日本のメタルライブ、来日公演、ラウドロック、メタルコア、ハードコアのライブ情報を、日付・地域・ジャンルで探せます。
          たとえば「メタル ライブ」「来日公演」「バンド名」で探すときの入口にしています。
        </p>
      </header>

      <section className={styles.feedbackBanner}>
        <div>
          <h2>掲載漏れ・修正依頼</h2>
          <p>
            載っていないライブや変更情報があれば、公式URLつきで教えてください。
          </p>
        </div>
        <div className={styles.bannerLinks}>
          <Link className={styles.secondaryLink} href="/international">
            来日公演を見る
          </Link>
          <a
            className={styles.primaryLink}
            href={xReportUrl}
            target="_blank"
            rel="noreferrer"
          >
            Xで連絡する
          </a>
        </div>
      </section>

      <EventFilters
        genres={filterGenres}
        prefectures={filterPrefectures}
        selectedGenre={selectedGenre}
        selectedPrefecture={selectedPrefecture}
        selectedDateRange={selectedDateRange}
        searchQuery={searchQuery}
        canReset={hasActiveFilters}
        onGenreChange={setSelectedGenre}
        onPrefectureChange={setSelectedPrefecture}
        onDateRangeChange={setSelectedDateRange}
        onSearchQueryChange={setSearchQuery}
        onReset={resetFilters}
      />

      <EventCalendar
        events={filteredEvents}
        monthKey={visibleMonth}
        selectedDate={selectedDate}
        onMonthChange={setVisibleMonth}
        onDateSelect={setSelectedDate}
      />

      {recentlyPublishedEvents.length > 0 && (
        <section className={styles.recentSection}>
          <h2 className={styles.sectionTitle}>最近追加したライブ</h2>
          <div className={styles.eventList}>
            {recentlyPublishedEvents.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        </section>
      )}

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

      <SiteAnalytics />
    </main>
  );
}
