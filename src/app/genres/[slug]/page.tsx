import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedEvents } from "../../../data/events";
import { isPastEventDate } from "../../../utils/date";
import { eventLinkLabels } from "../../../utils/eventLinks";
import {
  getGroupedEventDates,
  groupEventsByDate,
  sortEventsByDate,
} from "../../../utils/events";
import {
  getEventsByGenreSlug,
  getGenreBySlug,
  getPageableGenres,
} from "../../../utils/genres";
import { SiteAnalytics } from "../../Analytics";
import { EventDateGroup } from "../../EventDateGroup";
import styles from "../../page.module.css";

type GenrePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getPageableGenres(publishedEvents).map((genre) => ({
    slug: genre.slug,
  }));
}

export async function generateMetadata({
  params,
}: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const genre = getGenreBySlug(publishedEvents, slug);

  if (!genre) {
    return {
      title: "ジャンルが見つかりません",
    };
  }

  const title = `${genre.name}のメタルライブ・来日公演情報`;
  const description = `${genre.name}系のメタル、ハードロック、ラウドロック、メタルコア、ハードコアのライブ日程・会場・チケット情報を掲載しています。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/genres/${genre.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/genres/${genre.slug}`,
    },
  };
}

export default async function GenrePage({ params }: GenrePageProps) {
  const { slug } = await params;
  const genre = getGenreBySlug(publishedEvents, slug);

  if (!genre) {
    notFound();
  }

  const genreEvents = sortEventsByDate(
    getEventsByGenreSlug(publishedEvents, genre.slug),
  );
  const upcomingEvents = genreEvents.filter(
    (event) => !isPastEventDate(event.date),
  );
  const pastEvents = genreEvents
    .filter((event) => isPastEventDate(event.date))
    .reverse();
  const upcomingEventsByDate = groupEventsByDate(upcomingEvents);
  const pastEventsByDate = groupEventsByDate(pastEvents);
  const upcomingDates = getGroupedEventDates(upcomingEventsByDate);
  const pastDates = getGroupedEventDates(pastEventsByDate).reverse();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Genre</p>
        <h1>{genre.name}のライブ</h1>
        <p className={styles.summary}>
          今後のライブ {upcomingEvents.length}件 / 掲載イベント全{genreEvents.length}件
        </p>
        <p className={styles.lead}>
          {genre.name}
          系のライブを日付順にまとめています。公演日、会場、チケットや公式情報は各イベントページから確認できます。
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
