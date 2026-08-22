import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedEvents } from "../../../data/events";
import { isPastEventDate } from "../../../utils/date";
import {
  getGroupedEventDates,
  groupEventsByDate,
  sortEventsByDate,
} from "../../../utils/events";
import {
  getEventsByPrefectureSlug,
  getPrefectureBySlug,
  getPrefectures,
} from "../../../utils/prefectures";
import { EventDateGroup } from "../../EventDateGroup";
import { SiteAnalytics } from "../../Analytics";
import { eventLinkLabels } from "../../../utils/eventLinks";
import styles from "../../page.module.css";

type PrefecturePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getPrefectures(publishedEvents).map((prefecture) => ({
    slug: prefecture.slug,
  }));
}

export async function generateMetadata({
  params,
}: PrefecturePageProps): Promise<Metadata> {
  const { slug } = await params;
  const prefecture = getPrefectureBySlug(publishedEvents, slug);

  if (!prefecture) {
    return {
      title: "地域が見つかりません",
    };
  }

  const title = `${prefecture.name}のメタルライブ・来日公演情報`;
  const description = `${prefecture.name}で開催されるメタル、ハードロック、ラウドロック、メタルコア、ハードコアのライブ日程・会場・チケット情報を掲載しています。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/prefectures/${prefecture.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/prefectures/${prefecture.slug}`,
    },
  };
}

export default async function PrefecturePage({ params }: PrefecturePageProps) {
  const { slug } = await params;
  const prefecture = getPrefectureBySlug(publishedEvents, slug);

  if (!prefecture) {
    notFound();
  }

  const prefectureEvents = sortEventsByDate(
    getEventsByPrefectureSlug(publishedEvents, prefecture.slug),
  );
  const upcomingEvents = prefectureEvents.filter(
    (event) => !isPastEventDate(event.date),
  );
  const pastEvents = prefectureEvents
    .filter((event) => isPastEventDate(event.date))
    .reverse();
  const upcomingEventsByDate = groupEventsByDate(upcomingEvents);
  const pastEventsByDate = groupEventsByDate(pastEvents);
  const upcomingDates = getGroupedEventDates(upcomingEventsByDate);
  const pastDates = getGroupedEventDates(pastEventsByDate).reverse();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Prefecture</p>
        <h1>{prefecture.name}のメタルライブ</h1>
        <p className={styles.summary}>
          今後のライブ {upcomingEvents.length}件 / 掲載イベント全{prefectureEvents.length}件
        </p>
      </header>

      <section className={styles.upcomingSection}>
        <h2 className={styles.sectionTitle}>今後のライブ</h2>
        {upcomingDates.length === 0 ? (
          <p className={styles.empty}>今後の掲載イベントはありません。</p>
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

      {pastDates.length > 0 && (
        <section className={styles.recentSection}>
          <h2 className={styles.sectionTitle}>過去のライブ</h2>
          <div className={styles.dateGroups}>
            {pastDates.map((date) => (
              <EventDateGroup
                date={date}
                events={pastEventsByDate[date]}
                key={date}
              />
            ))}
          </div>
        </section>
      )}

      <Link className={styles.textLink} href="/">{eventLinkLabels.allEvents}</Link>

      <SiteAnalytics />
    </main>
  );
}
