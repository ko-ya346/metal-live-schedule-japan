import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedEvents } from "../../../data/events";
import {
  getArtistBySlug,
  getArtists,
  getEventsByArtistSlug,
} from "../../../utils/artists";
import { formatEventDate, isPastEventDate } from "../../../utils/date";
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

function formatArtistPageTitle(
  artistName: string,
  upcomingEvents: ReturnType<typeof getEventsByArtistSlug>,
) {
  const hasInternationalEvent = upcomingEvents.some((event) => event.isInternational);

  if (hasInternationalEvent) {
    return `${artistName} 来日公演・日本ライブ情報`;
  }

  return `${artistName}のライブ・イベント情報`;
}

function formatArtistPageDescription(
  artistName: string,
  upcomingEvents: ReturnType<typeof getEventsByArtistSlug>,
) {
  if (upcomingEvents.length === 0) {
    return `${artistName}が出演する日本国内のメタルライブ、来日公演、イベントの日程・会場・チケット情報を掲載しています。`;
  }

  const nextEvent = upcomingEvents[0];
  const prefectures = Array.from(
    new Set(upcomingEvents.map((event) => event.prefecture)),
  ).slice(0, 3);
  const eventTypeText = upcomingEvents.some((event) => event.isInternational)
    ? "来日公演・日本ライブ"
    : "日本国内ライブ";

  return `${artistName}の${eventTypeText}情報。次回は${formatEventDate(
    nextEvent.date,
  )}、${nextEvent.prefecture} / ${nextEvent.venue}で開催予定。${prefectures.join(
    "、",
  )}などの日程・会場・チケット情報を掲載しています。`;
}

function formatArtistPageLead(
  artistName: string,
  upcomingEvents: ReturnType<typeof getEventsByArtistSlug>,
) {
  if (upcomingEvents.length === 0) {
    return `${artistName}が出演する日本国内のライブ情報を掲載しています。今後の掲載イベントが見つかり次第、日程・会場・公式情報を追加します。`;
  }

  const nextEvent = upcomingEvents[0];
  const prefectures = Array.from(
    new Set(upcomingEvents.map((event) => event.prefecture)),
  ).slice(0, 4);
  const eventTypeText = upcomingEvents.some((event) => event.isInternational)
    ? "来日公演・日本ライブ"
    : "日本国内ライブ";

  return `${artistName}の${eventTypeText}を日付順にまとめています。次回は${formatEventDate(
    nextEvent.date,
  )}の${nextEvent.prefecture} / ${
    nextEvent.venue
  }公演です。掲載地域: ${prefectures.join("、")}。`;
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

  const upcomingEvents = sortEventsByDate(
    getEventsByArtistSlug(publishedEvents, artist.slug),
  ).filter((event) => !isPastEventDate(event.date));
  const title = formatArtistPageTitle(artist.name, upcomingEvents);
  const description = formatArtistPageDescription(artist.name, upcomingEvents);

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
        <p className={styles.lead}>
          {formatArtistPageLead(artist.name, upcomingEvents)}
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
