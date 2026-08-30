"use client";
import Link from "next/link";
import { useState } from "react";
import type { Event, EventDate } from "../data/events";
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
  const hasActiveFilters =
    selectedPrefecture !== ALL_FILTER_VALUE ||
    selectedGenre !== ALL_FILTER_VALUE ||
    internationalOnly ||
    searchQuery.trim() !== "";

  const filterGenres = getEventGenres(events);
  const filterPrefectures = getEventPrefectures(events);
  const recentlyPublishedEvents = getRecentlyPublishedEvents(events);
  const currentMonthKey = getCurrentMonthKey();
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
  const selectedDateEvents = selectedDate
    ? filteredEvents.filter((event) => event.date === selectedDate)
    : [];
  const upcomingEvents = filteredEvents.filter(
    (event) => !isPastEventDate(event.date) && event.date !== selectedDate,
  );
  const pastFilteredEvents = hasActiveFilters
    ? filteredEvents
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

  function resetFilters() {
    setSelectedPrefecture(ALL_FILTER_VALUE);
    setSelectedGenre(ALL_FILTER_VALUE);
    setInternationalOnly(false);
    setSearchQuery("");
    clearSelectedDate();
  }

  function applyInternationalFilter() {
    setSelectedGenre(ALL_FILTER_VALUE);
    setSelectedPrefecture(ALL_FILTER_VALUE);
    setInternationalOnly(true);
    setSearchQuery("");
    setSelectedDate(null);
  }

  return (
    <main className={styles.page}>
      <header className={`${styles.header} ${styles.heroHeader}`}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>日本のメタルライブ・来日公演予定</p>
          <h1>Metals Calendar</h1>
          <p className={styles.summary}>
            {formatEventCount(filteredEvents.length)}
          </p>
          <p className={styles.lead}>
            来日公演から国内バンドの小規模ライブまで、日本で観られるヘヴィミュージックの予定をまとめています。
            行ける日、行ける場所、気になるバンドから次のライブを探せます。
          </p>
          <div className={styles.heroActions} aria-label="主要ページ">
            <Link className={styles.primaryLink} href={`/months/${currentMonthKey}`}>
              今月のライブ
            </Link>
            <Link className={styles.secondaryLink} href="/international">
              来日公演
            </Link>
          </div>
        </div>
        <div className={styles.heroStats} aria-label="掲載状況">
          <div>
            <strong>{allUpcomingEvents.length}</strong>
            <span>今後のライブ</span>
          </div>
          <div>
            <strong>{upcomingInternationalCount}</strong>
            <span>来日公演</span>
          </div>
          <div>
            <strong>{upcomingMonthLinks.length}</strong>
            <span>掲載月</span>
          </div>
        </div>
      </header>

      <section className={styles.discoveryHub} aria-labelledby="discovery-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Explore</p>
            <h2 className={styles.sectionTitle} id="discovery-title">
              目的からライブを探す
            </h2>
            <p className={styles.sectionLead}>
              日程、地域、来日公演、ジャンルからすぐに絞り込めます。
            </p>
          </div>
        </div>

        <div className={styles.discoveryCardGrid}>
          <Link
            className={styles.discoveryCard}
            href={`/months/${currentMonthKey}`}
          >
            <span className={styles.discoveryCardLabel}>今月</span>
            <strong>{formatCalendarMonth(currentMonthKey)}のライブ</strong>
            <span>{currentMonthEvents.length}件</span>
          </Link>
          <button
            className={styles.discoveryCard}
            type="button"
            onClick={applyInternationalFilter}
          >
            <span className={styles.discoveryCardLabel}>来日</span>
            <strong>来日公演に絞る</strong>
            <span>{upcomingInternationalCount}件</span>
          </button>
          {discoveryPrefectures.map((prefecture) => (
            <Link
              className={styles.discoveryCard}
              href={`/prefectures/${prefecture.slug}`}
              key={prefecture.slug}
            >
              <span className={styles.discoveryCardLabel}>地域</span>
              <strong>{prefecture.name}のライブ</strong>
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

      <div className={styles.contentLayout}>
        <aside className={styles.sidebar} aria-label="絞り込みと探し方">
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
                <p className={styles.empty}>
                  選択した日に一致するライブはありません。
                </p>
              )}
            </section>
          )}

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
              <h2 className={styles.sectionTitle}>最近追加したライブ</h2>
              <div className={styles.eventList}>
                {recentlyPublishedEvents.map((event) => (
                  <EventCard event={event} key={event.id} />
                ))}
              </div>
            </section>
          )}

          <section className={styles.upcomingSection}>
            <h2 className={styles.sectionTitle}>
              {hasActiveFilters ? "絞り込み結果" : "今後のライブ"}
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
