"use client";
import Link from "next/link";
import { useState } from "react";
import type { Event, EventDate } from "../data/events";
import { discoveryPicks } from "../data/discovery";
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
import { xReportUrl } from "../utils/contact";
import {
  formatCalendarMonth,
  formatEventDate,
  getCurrentMonthKey,
  getEventMonthKey,
  isPastEventDate,
} from "../utils/date";
import { getEventMonths } from "../utils/months";
import { getGenreSlug } from "../utils/genres";
import { getPrefectures } from "../utils/prefectures";
import { EventCalendar } from "./EventCalendar";
import { EventDateGroup } from "./EventDateGroup";
import { EventFilters } from "./EventFilters";
import { DiscoveryArtists } from "./DiscoveryArtists";
import { SiteAnalytics } from "./Analytics";
import styles from "./page.module.css";

function formatEventCount(count: number) {
  return `${count}件のライブが見つかりました`;
}

function formatShortDate(date: string) {
  const parsedDate = new Date(`${date}T00:00:00+09:00`);

  return `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}`;
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

function getFeaturedEvents(eventList: typeof events, monthKey: string) {
  const featuredGenreKeywords = [
    "Metal",
    "Hardcore",
    "Loud",
    "Punk",
    "Rock",
  ];

  return eventList
    .filter(
      (event) =>
        !isPastEventDate(event.date) && getEventMonthKey(event.date) === monthKey,
    )
    .map((event) => {
      const genreScore = event.genres.some((genre) =>
        featuredGenreKeywords.some((keyword) => genre.includes(keyword)),
      )
        ? 2
        : 0;
      const titleScore = /fest|festival|sonic|tour|来日/i.test(event.tourName)
        ? 2
        : 0;
      const score =
        (event.isInternational ? 4 : 0) +
        genreScore +
        titleScore +
        Math.min(event.artists.length - 1, 3);

      return { event, score };
    })
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return a.event.date.localeCompare(b.event.date);
    })
    .slice(0, 5)
    .map((item) => item.event);
}

function getPopularPrefectureLinks(eventList: typeof events) {
  const eventCountByPrefecture = new Map<string, number>();

  eventList.forEach((event) => {
    eventCountByPrefecture.set(
      event.prefecture,
      (eventCountByPrefecture.get(event.prefecture) ?? 0) + 1,
    );
  });

  return getPrefectures(eventList)
    .map((prefecture) => ({
      ...prefecture,
      count: eventCountByPrefecture.get(prefecture.name) ?? 0,
    }))
    .sort((a, b) => {
      const countDiff = b.count - a.count;

      if (countDiff !== 0) {
        return countDiff;
      }

      return a.name.localeCompare(b.name, "ja");
    });
}

function formatFeaturedArtists(artists: Event["artists"]) {
  if (artists.length <= 2) {
    return artists.join(" / ");
  }

  return `${artists.slice(0, 2).join(" / ")} ほか${artists.length - 2}組`;
}

function countEventsByGenre(eventList: typeof events, genreKeyword: string) {
  return eventList.filter((event) =>
    event.genres.some((genre) =>
      genre.toLocaleLowerCase().includes(genreKeyword.toLocaleLowerCase()),
    ),
  ).length;
}

type QuickRange = "all" | "today" | "weekend" | "currentMonth" | "nextMonth";
type ViewMode = "list" | "calendar";

function getJapanDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Tokyo",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getJapanTodayDateKey() {
  return getJapanDateKey(new Date());
}

function addDaysToEventDate(date: string, days: number) {
  const parsedDate = new Date(`${date}T00:00:00+09:00`);
  const nextDate = new Date(parsedDate.getTime() + days * 24 * 60 * 60 * 1000);

  return getJapanDateKey(nextDate);
}

function getJapanWeekday(date: string) {
  const parsedDate = new Date(`${date}T00:00:00+09:00`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  }).format(parsedDate);
  const weekdayIndexes: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return weekdayIndexes[weekday] ?? 0;
}

function getWeekendDateKeys(today: string) {
  const weekday = getJapanWeekday(today);

  if (weekday === 0) {
    return new Set([today]);
  }

  const saturdayOffset = (6 - weekday + 7) % 7;
  const saturday = addDaysToEventDate(today, saturdayOffset);

  return new Set([saturday, addDaysToEventDate(saturday, 1)]);
}

function getNextMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function matchesQuickRange(
  event: Event,
  quickRange: QuickRange,
  today: string,
  weekendDates: Set<string>,
  currentMonthKey: string,
  nextMonthKey: string,
) {
  if (quickRange === "today") {
    return event.date === today;
  }

  if (quickRange === "weekend") {
    return weekendDates.has(event.date);
  }

  if (quickRange === "currentMonth") {
    return getEventMonthKey(event.date) === currentMonthKey;
  }

  if (quickRange === "nextMonth") {
    return getEventMonthKey(event.date) === nextMonthKey;
  }

  return true;
}

function formatQuickRangeTitle(quickRange: QuickRange) {
  if (quickRange === "today") {
    return "今日のライブ";
  }

  if (quickRange === "weekend") {
    return "今週末のライブ";
  }

  if (quickRange === "currentMonth") {
    return "今月のライブ";
  }

  if (quickRange === "nextMonth") {
    return "来月のライブ";
  }

  return "今後のライブ";
}

function FeaturedEventCard({ event }: { event: Event }) {
  return (
    <Link className={styles.featuredCard} href={`/events/${event.id}`}>
      <span className={styles.featuredTopLine}>
        <span className={styles.featuredDate}>{formatEventDate(event.date)}</span>
        {event.isInternational && <span className={styles.featuredBadge}>来日</span>}
      </span>
      <span className={styles.featuredArtist}>
        {formatFeaturedArtists(event.artists)}
      </span>
      <span className={styles.featuredPlace}>
        {event.prefecture} / {event.venue}
      </span>
      <span className={styles.featuredTour} title={event.tourName}>
        {event.tourName}
      </span>
      <span className={styles.featuredTags}>
        {event.genres.slice(0, 1).map((genre) => (
          <span key={genre}>{genre}</span>
        ))}
      </span>
    </Link>
  );
}

export default function Page() {
  const [selectedPrefecture, setSelectedPrefecture] = useState(ALL_FILTER_VALUE);
  const [selectedGenre, setSelectedGenre] = useState(ALL_FILTER_VALUE);
  const [internationalOnly, setInternationalOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<EventDate | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(getCurrentMonthKey);
  const [quickRange, setQuickRange] = useState<QuickRange>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const hasActiveFilters =
    selectedPrefecture !== ALL_FILTER_VALUE ||
    selectedGenre !== ALL_FILTER_VALUE ||
    internationalOnly ||
    searchQuery.trim() !== "" ||
    quickRange !== "all";

  const filterGenres = getEventGenres(events);
  const filterPrefectures = getEventPrefectures(events);
  const recentlyPublishedEvents = getRecentlyPublishedEvents(events);
  const currentMonthKey = getCurrentMonthKey();
  const nextMonthKey = getNextMonthKey(currentMonthKey);
  const todayDate = getJapanTodayDateKey();
  const weekendDates = getWeekendDateKeys(todayDate);
  const featuredEvents = getFeaturedEvents(events, currentMonthKey);

  const sortedEvents = sortEventsByDate(events);
  const allUpcomingEvents = sortedEvents.filter(
    (event) => !isPastEventDate(event.date),
  );
  const upcomingInternationalCount = allUpcomingEvents.filter(
    (event) => event.isInternational,
  ).length;
  const currentMonthEvents = allUpcomingEvents.filter(
    (event) => getEventMonthKey(event.date) === currentMonthKey,
  );
  const upcomingMonthLinks = getEventMonths(allUpcomingEvents);
  const popularPrefectureLinks = getPopularPrefectureLinks(allUpcomingEvents);
  const discoveryPrefectures = ["東京都", "大阪府", "神奈川県"]
    .map((name) => popularPrefectureLinks.find((prefecture) => prefecture.name === name))
    .filter(
      (prefecture): prefecture is NonNullable<typeof prefecture> =>
        Boolean(prefecture && prefecture.count > 0),
    );
  const discoveryGenres = [
    { label: "Death Metal", value: "Death Metal" },
    { label: "Metalcore", value: "Metalcore" },
    { label: "Hardcore", value: "Hardcore" },
    { label: "Heavy Metal", value: "Heavy Metal" },
  ]
    .map((genre) => ({
      ...genre,
      count: countEventsByGenre(allUpcomingEvents, genre.value),
    }))
    .filter((genre) => genre.count > 0);
  const filteredEvents = filterEvents(
    sortedEvents,
    selectedPrefecture,
    selectedGenre,
    searchQuery,
    internationalOnly,
  );
  const rangedFilteredEvents = filteredEvents.filter((event) =>
    matchesQuickRange(
      event,
      quickRange,
      todayDate,
      weekendDates,
      currentMonthKey,
      nextMonthKey,
    ),
  );
  const selectedDateEvents = selectedDate
    ? rangedFilteredEvents.filter((event) => event.date === selectedDate)
    : [];
  const upcomingEvents = rangedFilteredEvents.filter(
    (event) => !isPastEventDate(event.date) && event.date !== selectedDate,
  );
  const pastFilteredEvents = hasActiveFilters
    ? rangedFilteredEvents
        .filter((event) => isPastEventDate(event.date) && event.date !== selectedDate)
        .reverse()
    : [];

  const upcomingEventsByDate = groupEventsByDate(upcomingEvents);
  const pastFilteredEventsByDate = groupEventsByDate(pastFilteredEvents);
  const upcomingDates = getGroupedEventDates(upcomingEventsByDate);
  const pastFilteredDates = getGroupedEventDates(pastFilteredEventsByDate).reverse();

  function clearSelectedDate() {
    setSelectedDate(null);
  }

  function updateSearchQuery(query: string) {
    setSearchQuery(query);
    clearSelectedDate();
  }

  function updatePrefecture(prefecture: string) {
    setSelectedPrefecture(prefecture);
    clearSelectedDate();
  }

  function updateGenre(genre: string) {
    setSelectedGenre(genre);
    clearSelectedDate();
  }

  function updateInternationalOnly(nextInternationalOnly: boolean) {
    setInternationalOnly(nextInternationalOnly);
    clearSelectedDate();
  }

  function updateQuickRange(nextQuickRange: QuickRange) {
    setQuickRange(nextQuickRange);
    clearSelectedDate();

    if (nextQuickRange === "currentMonth") {
      setVisibleMonth(currentMonthKey);
    }

    if (nextQuickRange === "nextMonth") {
      setVisibleMonth(nextMonthKey);
    }
  }

  function resetFilters() {
    setSelectedPrefecture(ALL_FILTER_VALUE);
    setSelectedGenre(ALL_FILTER_VALUE);
    setInternationalOnly(false);
    setSearchQuery("");
    setQuickRange("all");
    clearSelectedDate();
  }

  function applyInternationalFilter() {
    setSelectedGenre(ALL_FILTER_VALUE);
    setSelectedPrefecture(ALL_FILTER_VALUE);
    setInternationalOnly(true);
    setSearchQuery("");
    setQuickRange("all");
    setSelectedDate(null);
  }

  return (
    <main className={styles.page}>
      <header className={`${styles.header} ${styles.heroHeader}`}>
        <div className={styles.heroCopy}>
          <div className={styles.heroBrand}>
            <img src="/images/favicon.png" alt="" aria-hidden="true" />
            <div>
              <h1>Metals Calendar</h1>
              <p>日本のメタルライブ・来日公演を探す</p>
            </div>
          </div>
          <p className={styles.lead}>
            日程、地域、ジャンルから次のライブを探せます。
          </p>
        </div>
        <p className={styles.heroCount}>{formatEventCount(rangedFilteredEvents.length)}</p>
      </header>

      <section className={styles.topSearchPanel} aria-label="ライブ検索">
        <EventFilters
          genres={filterGenres}
          prefectures={filterPrefectures}
          selectedGenre={selectedGenre}
          selectedPrefecture={selectedPrefecture}
          internationalOnly={internationalOnly}
          searchQuery={searchQuery}
          canReset={hasActiveFilters}
          onGenreChange={updateGenre}
          onPrefectureChange={updatePrefecture}
          onInternationalOnlyChange={updateInternationalOnly}
          onSearchQueryChange={updateSearchQuery}
          onReset={resetFilters}
        />

        <div className={styles.searchControlBar}>
          <div className={styles.segmentedControl} aria-label="期間">
            {[
              ["all", "すべて"],
              ["today", "今日"],
              ["weekend", "今週末"],
              ["currentMonth", "今月"],
              ["nextMonth", "来月"],
            ].map(([value, label]) => (
              <button
                aria-pressed={quickRange === value}
                className={quickRange === value ? styles.segmentActive : undefined}
                key={value}
                type="button"
                onClick={() => updateQuickRange(value as QuickRange)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.segmentedControl} aria-label="表示形式">
            {[
              ["list", "リスト表示"],
              ["calendar", "カレンダー表示"],
            ].map(([value, label]) => (
              <button
                aria-pressed={viewMode === value}
                className={viewMode === value ? styles.segmentActive : undefined}
                key={value}
                type="button"
                onClick={() => setViewMode(value as ViewMode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.contentLayout}>
        <aside className={styles.sidebar} aria-label="絞り込みと探し方">
          <section className={styles.discoveryHub} aria-labelledby="discovery-title">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.kicker}>Explore</p>
                <h2 className={styles.sectionTitle} id="discovery-title">
                  目的から探す
                </h2>
              </div>
            </div>

            <div className={styles.discoveryCardGrid}>
              <Link
                className={styles.discoveryCard}
                href={`/months/${currentMonthKey}`}
              >
                <span className={styles.discoveryCardLabel}>今月</span>
                <strong>{formatCalendarMonth(currentMonthKey)}</strong>
                <span>{currentMonthEvents.length}件</span>
              </Link>
              <button
                className={styles.discoveryCard}
                type="button"
                onClick={applyInternationalFilter}
              >
                <span className={styles.discoveryCardLabel}>来日</span>
                <strong>来日公演</strong>
                <span>{upcomingInternationalCount}件</span>
              </button>
              {discoveryPrefectures.map((prefecture) => (
                <Link
                  className={styles.discoveryCard}
                  href={`/prefectures/${prefecture.slug}`}
                  key={prefecture.slug}
                >
                  <span className={styles.discoveryCardLabel}>地域</span>
                  <strong>{prefecture.name}</strong>
                  <span>{prefecture.count}件</span>
                </Link>
              ))}
              {discoveryGenres.map((genre) => (
                <Link
                  className={styles.discoveryCard}
                  href={`/genres/${getGenreSlug(genre.value)}`}
                  key={genre.value}
                >
                  <span className={styles.discoveryCardLabel}>ジャンル</span>
                  <strong>{genre.label}</strong>
                  <span>{genre.count}件</span>
                </Link>
              ))}
            </div>
          </section>

          <DiscoveryArtists
            eventList={allUpcomingEvents}
            monthKey={currentMonthKey}
            picks={discoveryPicks}
          />

          <section
            className={styles.searchGuide}
            aria-labelledby="search-guide-title"
          >
            <div>
              <p className={styles.kicker}>Search</p>
              <h2 id="search-guide-title">目的別に探す</h2>
            </div>

            <div className={styles.searchGuideGroups}>
              <div className={styles.searchGuideGroup}>
                <h3>来日公演</h3>
                <Link href="/international">来日公演</Link>
              </div>

              <div className={styles.searchGuideGroup}>
                <h3>月別</h3>
                <div className={styles.searchGuideLinks}>
                  {upcomingMonthLinks.map((month) => (
                    <Link href={`/months/${month.key}`} key={month.key}>
                      {month.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.searchGuideGroup}>
                <h3>地域別</h3>
                <div className={styles.searchGuideLinks}>
                  {popularPrefectureLinks.map((prefecture) => (
                    <Link
                      href={`/prefectures/${prefecture.slug}`}
                      key={prefecture.slug}
                    >
                      {prefecture.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.searchGuideGroup}>
                <h3>ジャンル別</h3>
                <div className={styles.searchGuideLinks}>
                  {discoveryGenres.map((genre) => (
                    <Link
                      href={`/genres/${getGenreSlug(genre.value)}`}
                      key={genre.value}
                    >
                      {genre.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.feedbackBanner}>
            <div>
              <h2>掲載漏れ・修正の連絡</h2>
              <p>
                来日公演や国内ライブの掲載漏れ、変更情報があれば連絡してください。
              </p>
            </div>
            <div className={styles.bannerLinks}>
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
        </aside>

        <div className={styles.mainColumn}>
          {viewMode === "calendar" && (
            <EventCalendar
              events={rangedFilteredEvents}
              monthKey={visibleMonth}
              selectedDate={selectedDate}
              onMonthChange={setVisibleMonth}
              onDateSelect={setSelectedDate}
            />
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
                <p className={styles.empty}>
                  選択した日に一致するライブはありません。
                </p>
              )}
            </section>
          )}

          <section className={styles.upcomingSection}>
            <h2 className={styles.sectionTitle}>
              {hasActiveFilters
                ? `${formatQuickRangeTitle(quickRange)}・絞り込み結果`
                : formatQuickRangeTitle(quickRange)}
            </h2>

            {upcomingDates.length === 0 ? (
              <p className={styles.empty}>
                {hasActiveFilters
                  ? "一致する今後のライブはありません。条件を変更するか、リセットしてください。"
                  : "今後のライブはありません。絞り込み条件を変更するか、リセットしてください。"}
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

          {!hasActiveFilters && featuredEvents.length > 0 && (
            <section className={styles.featuredSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.kicker}>Featured</p>
                  <h2 className={styles.sectionTitle}>
                    {formatCalendarMonth(currentMonthKey)}の注目ライブ
                  </h2>
                  <p className={styles.sectionLead}>
                    来日公演やフェスを中心にピックアップしています。
                  </p>
                </div>
                <Link
                  className={styles.secondaryLink}
                  href={`/months/${currentMonthKey}`}
                >
                  今月のライブをみる
                </Link>
              </div>
              <div className={styles.featuredGrid}>
                {featuredEvents.map((event) => (
                  <FeaturedEventCard event={event} key={event.id} />
                ))}
              </div>
            </section>
          )}

          {!hasActiveFilters && recentlyPublishedEvents.length > 0 && (
            <section className={styles.recentSection}>
              <div className={styles.recentHeader}>
                <h2 className={styles.recentTitle}>最近追加したライブ</h2>
                <span>{recentlyPublishedEvents.length}件</span>
              </div>
              <div className={styles.recentList}>
                {recentlyPublishedEvents.map((event) => (
                  <Link
                    className={styles.recentItem}
                    href={`/events/${event.id}`}
                    key={event.id}
                  >
                    <span className={styles.recentPublishedAt}>
                      {event.publishedAt
                        ? `${formatShortDate(event.publishedAt)}追加`
                        : "追加"}
                    </span>
                    <span className={styles.recentItemBody}>
                      <strong>{event.artists.join(" / ")}</strong>
                      <span>
                        {formatShortDate(event.date)} / {event.prefecture} /{" "}
                        {event.venue}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {hasActiveFilters && pastFilteredDates.length > 0 && (
            <section className={styles.recentSection}>
              <h2 className={styles.sectionTitle}>過去の一致イベント</h2>
              <div className={styles.dateGroups}>
                {pastFilteredDates.map((date) => (
                  <EventDateGroup
                    date={date}
                    events={pastFilteredEventsByDate[date]}
                    key={date}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <SiteAnalytics />
    </main>
  );
}
