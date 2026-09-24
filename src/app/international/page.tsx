import type { Metadata } from "next";
import Link from "next/link";
import { publishedEvents } from "../../data/events";
import {
  formatCalendarMonth,
  formatEventDate,
  getEventDateTime,
  getEventMonthKey,
} from "../../utils/date";
import { isInternationalEvent } from "../../utils/eventCollections";
import {
  getEventPrefectures,
  getGroupedEventDates,
  groupEventsByDate,
  sortEventsByDate,
} from "../../utils/events";
import { getPrefectureSlug } from "../../utils/prefectures";
import { EventDateGroup } from "../EventDateGroup";
import { SiteAnalytics } from "../Analytics";
import { eventLinkLabels } from "../../utils/eventLinks";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "メタル来日公演・海外バンドのJapan Tour情報",
  description:
    "日本で開催される海外メタル、ハードロック、メタルコア、ハードコア系アーティストの来日公演・Japan Tour日程、会場、チケット情報を掲載しています。",
  alternates: {
    canonical: "/international",
  },
  openGraph: {
    title: "メタル来日公演・海外バンドのJapan Tour情報 | Metals Calendar",
    description:
      "日本で開催される海外メタル、ハードロック、メタルコア、ハードコア系アーティストの来日公演・Japan Tour日程を探せます。",
    url: "/international",
  },
};

export default function InternationalPage() {
  const internationalEvents = sortEventsByDate(
    publishedEvents.filter(isInternationalEvent),
  );
  const upcomingEvents = internationalEvents.filter(
    (event) => getEventDateTime(event.date) >= getTodayDateTime(),
  );
  const threeMonthLimit = getThreeMonthLimitDateTime();
  const nextThreeMonthEvents = upcomingEvents.filter(
    (event) => getEventDateTime(event.date) <= threeMonthLimit,
  );
  const featuredEvents = upcomingEvents.slice(0, 4);
  const monthSummaries = getInternationalMonthSummaries(upcomingEvents).slice(
    0,
    8,
  );
  const prefectureSummaries = getInternationalPrefectureSummaries(upcomingEvents)
    .filter((summary) => summary.count > 0)
    .slice(0, 8);
  const eventsByDate = groupEventsByDate(upcomingEvents);
  const dates = getGroupedEventDates(eventsByDate);

  return (
    <main className={styles.page}>
      <header className={`${styles.header} ${styles.subpageHeader}`}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>来日公演</p>
          <h1>来日メタル・海外バンド公演</h1>
          <p className={styles.summary}>
            今後の来日公演 {upcomingEvents.length}件 / 今後3か月{" "}
            {nextThreeMonthEvents.length}件 / 掲載月 {monthSummaries.length}件 /
            開催地域 {prefectureSummaries.length}件
          </p>
          <p className={styles.lead}>
            日本で開催される海外メタル、ハードロック、ラウドロック、メタルコア、ハードコア系アーティストの来日公演・Japan Tour予定をまとめています。
            公演日、会場、チケットや公式情報は各イベントページから確認できます。
          </p>
          <div className={styles.heroActions} aria-label="主要ページ">
            <Link className={styles.primaryLink} href="/">
              イベント一覧
            </Link>
            {monthSummaries[0] && (
              <Link
                className={styles.secondaryLink}
                href={`/months/${monthSummaries[0].monthKey}`}
              >
                直近の月別ページ
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className={styles.discoveryHub} aria-labelledby="international-search-heading">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Explore</p>
            <h2 className={styles.sectionTitle} id="international-search-heading">
              来日公演を探す
            </h2>
            <p className={styles.sectionLead}>
              直近の公演、月別、地域別に来日公演を確認できます。
            </p>
          </div>
        </div>

        {featuredEvents.length > 0 && (
          <div className={styles.discoveryCardGrid}>
            {featuredEvents.map((event) => (
              <Link
                className={styles.discoveryCard}
                href={`/events/${event.id}`}
                key={event.id}
                prefetch={false}
              >
                <span className={styles.discoveryCardLabel}>
                  {formatEventDate(event.date)}
                </span>
                <strong>{event.artists.join(" / ")}</strong>
                <span>
                  {event.prefecture} / {event.venue}
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className={styles.searchGuideGroups}>
          <div className={styles.searchGuideGroup}>
            <h3>月別</h3>
            <div className={styles.searchGuideLinks}>
              {monthSummaries.map((summary) => (
                <Link
                  href={`/months/${summary.monthKey}`}
                  key={summary.monthKey}
                  prefetch={false}
                >
                  {summary.label} ({summary.count})
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.searchGuideGroup}>
            <h3>地域別</h3>
            <div className={styles.searchGuideLinks}>
              {prefectureSummaries.map((summary) => (
                <Link
                  href={`/prefectures/${getPrefectureSlug(summary.prefecture)}`}
                  key={summary.prefecture}
                  prefetch={false}
                >
                  {summary.prefecture} ({summary.count})
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.upcomingSection}>
        <h2 className={styles.sectionTitle}>今後の来日公演</h2>

        {dates.length === 0 ? (
          <p className={styles.empty}>今後の来日公演はまだありません。</p>
        ) : (
          <div className={styles.dateGroups}>
            {dates.map((date) => (
              <EventDateGroup
                date={date}
                events={eventsByDate[date]}
                key={date}
                showEnglishDate
              />
            ))}
          </div>
        )}
      </section>

      <Link className={styles.textLink} href="/">{eventLinkLabels.allEvents}</Link>

      <SiteAnalytics />
    </main>
  );
}

function getTodayDateTime() {
  const today = new Date();

  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
}

function getThreeMonthLimitDateTime() {
  const today = new Date();

  return new Date(
    today.getFullYear(),
    today.getMonth() + 3,
    today.getDate(),
  ).getTime();
}

function getInternationalMonthSummaries(events: typeof publishedEvents) {
  const counts = events.reduce<Record<string, number>>((summaries, event) => {
    const monthKey = getEventMonthKey(event.date);
    summaries[monthKey] = (summaries[monthKey] ?? 0) + 1;

    return summaries;
  }, {});

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, count]) => ({
      monthKey,
      count,
      label: formatCalendarMonth(monthKey),
    }));
}

function getInternationalPrefectureSummaries(events: typeof publishedEvents) {
  return getEventPrefectures(events).map((prefecture) => ({
    prefecture,
    count: events.filter((event) => event.prefecture === prefecture).length,
  }));
}
