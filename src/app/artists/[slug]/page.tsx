import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedEvents } from "../../../data/events";
import {
  getArtistBySlug,
  getArtists,
  getEventsByArtistSlug,
} from "../../../utils/artists";
import { isPastEventDate } from "../../../utils/date";
import {
  getGroupedEventDates,
  groupEventsByDate,
  sortEventsByDate,
} from "../../../utils/events";
import { EventDateGroup } from "../../EventDateGroup";
import { SiteAnalytics } from "../../Analytics";
import { eventLinkLabels } from "../../../utils/eventLinks";
import styles from "../../page.module.css";

type ArtistPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function decodeArtistSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function generateStaticParams() {
  return getArtists(publishedEvents).map((artist) => ({
    slug: artist.slug,
  }));
}

export async function generateMetadata({
  params,
}: ArtistPageProps): Promise<Metadata> {
  const { slug: encodedSlug } = await params;
  const slug = decodeArtistSlug(encodedSlug);
  const artist = getArtistBySlug(publishedEvents, slug);

  if (!artist) {
    return {
      title: "アーティストが見つかりません",
    };
  }

  const title = `${artist.name}のライブ・来日公演情報`;
  const description = `${artist.name}が出演する日本国内のメタルライブ、来日公演、イベントの日程・会場・チケット情報を掲載しています。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/artists/${encodeURIComponent(artist.slug)}`,
    },
    openGraph: {
      title,
      description,
      url: `/artists/${encodeURIComponent(artist.slug)}`,
    },
  };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { slug: encodedSlug } = await params;
  const slug = decodeArtistSlug(encodedSlug);
  const artist = getArtistBySlug(publishedEvents, slug);

  if (!artist) {
    notFound();
  }

  const artistEvents = sortEventsByDate(
    getEventsByArtistSlug(publishedEvents, artist.slug),
  );
  const upcomingEvents = artistEvents.filter(
    (event) => !isPastEventDate(event.date),
  );
  const pastEvents = artistEvents
    .filter((event) => isPastEventDate(event.date))
    .reverse();
  const upcomingEventsByDate = groupEventsByDate(upcomingEvents);
  const pastEventsByDate = groupEventsByDate(pastEvents);
  const upcomingDates = getGroupedEventDates(upcomingEventsByDate);
  const pastDates = getGroupedEventDates(pastEventsByDate).reverse();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Artist</p>
        <h1>{artist.name}</h1>
        <p className={styles.summary}>
          今後のライブ {upcomingEvents.length}件 / 掲載イベント全{artistEvents.length}件
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
