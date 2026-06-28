import type { Metadata } from "next";
import Link from "next/link";
import { publishedEvents } from "../../data/events";
import { isPastEventDate } from "../../utils/date";
import { isInternationalEvent } from "../../utils/eventCollections";
import {
  getGroupedEventDates,
  groupEventsByDate,
  sortEventsByDate,
} from "../../utils/events";
import { EventDateGroup } from "../EventDateGroup";
import { SiteAnalytics } from "../Analytics";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "来日メタル・海外バンド公演",
  description:
    "日本で開催される来日メタル、海外ハードロック、ラウドロック、メタルコア、ハードコア系アーティストのライブ予定をまとめています。",
  alternates: {
    canonical: "/international",
  },
  openGraph: {
    title: "来日メタル・海外バンド公演 | Metals Calendar",
    description:
      "来日メタル、海外ハードロック、ラウドロック、メタルコア、ハードコア系アーティストの日本公演予定を探せます。",
    url: "/international",
  },
};

export default function InternationalPage() {
  const internationalEvents = sortEventsByDate(
    publishedEvents.filter(isInternationalEvent),
  );
  const upcomingEvents = internationalEvents.filter(
    (event) => !isPastEventDate(event.date),
  );
  const eventsByDate = groupEventsByDate(upcomingEvents);
  const dates = getGroupedEventDates(eventsByDate);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>International</p>
        <h1>来日メタル・海外バンド公演</h1>
        <p className={styles.summary}>
          {upcomingEvents.length}件の来日・海外アーティスト公演があります
        </p>
        <p className={styles.lead}>
          日本で開催される海外メタル、ハードロック、ラウドロック、メタルコア、ハードコア系アーティストのライブ予定をまとめています。
          チケットや公式情報は各イベントページから確認できます。
        </p>
      </header>

      <section className={styles.infoContent}>
        <div className={styles.infoSection}>
          <h2>掲載対象</h2>
          <p>
            海外アーティストの来日公演、Japan Tour と明記された公演、海外バンドが主要出演者として含まれるフェスやイベントを中心に掲載しています。
          </p>
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
              />
            ))}
          </div>
        )}
      </section>

      <Link className={styles.textLink} href="/">
        イベント一覧へ戻る
      </Link>

      <SiteAnalytics />
    </main>
  );
}
