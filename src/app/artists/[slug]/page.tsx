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
import { getPrefectureSlug } from "../../../utils/prefectures";
import { getVenueSlug } from "../../../utils/venues";
import { EventDateGroup } from "../../EventDateGroup";
import { SiteAnalytics } from "../../Analytics";
import { eventLinkLabels, formatArtists } from "../../../utils/eventLinks";
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
  artistEvents: ReturnType<typeof getEventsByArtistSlug>,
) {
  const hasInternationalEvent = artistEvents.some((event) => event.isInternational);

  if (hasInternationalEvent) {
    return `${artistName} 来日公演・日本ライブ情報`;
  }

  return `${artistName}のライブ・イベント情報`;
}

function formatArtistPageDescription(
  artistName: string,
  artistEvents: ReturnType<typeof getEventsByArtistSlug>,
  upcomingEvents: ReturnType<typeof getEventsByArtistSlug>,
) {
  if (upcomingEvents.length === 0) {
    if (artistEvents.some((event) => event.isInternational)) {
      return `${artistName}の来日公演・日本ライブ情報。掲載済みの過去公演と、今後追加される日程・会場・チケット情報を確認できます。`;
    }

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
  artistEvents: ReturnType<typeof getEventsByArtistSlug>,
  upcomingEvents: ReturnType<typeof getEventsByArtistSlug>,
) {
  if (upcomingEvents.length === 0) {
    if (artistEvents.some((event) => event.isInternational)) {
      return `${artistName}の来日公演・日本ライブ情報を掲載しています。今後の公演が見つかり次第、日程・会場・公式情報を追加します。`;
    }

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
  const artistEvents = getEventsByArtistSlug(publishedEvents, artist.slug);
  const title = formatArtistPageTitle(artist.name, artistEvents);
  const description = formatArtistPageDescription(
    artist.name,
    artistEvents,
    upcomingEvents,
  );

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
  const hasInternationalEvent = artistEvents.some((event) => event.isInternational);
  const upcomingPrefectures = getUniqueValues(
    upcomingEvents.map((event) => event.prefecture),
  ).slice(0, 2);
  const upcomingVenues = getUniqueValues(
    upcomingEvents.map((event) => `${event.prefecture}\t${event.venue}`),
  ).slice(0, 2);
  const nextEvent = upcomingEvents[0];
  const upcomingEventsByDate = groupEventsByDate(upcomingEvents);
  const pastEventsByDate = groupEventsByDate(pastEvents);
  const upcomingDates = getGroupedEventDates(upcomingEventsByDate);
  const pastDates = getGroupedEventDates(pastEventsByDate).reverse();

  return (
    <main className={styles.page}>
      <header className={`${styles.header} ${styles.heroHeader}`}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Artist</p>
          <h1>{artist.name}</h1>
          <p className={styles.summary}>
            今後のライブ {upcomingEvents.length}件 / 掲載イベント全{artistEvents.length}件
          </p>
          <p className={styles.lead}>
            {formatArtistPageLead(artist.name, artistEvents, upcomingEvents)}
          </p>
          <div className={styles.heroActions} aria-label="主要ページ">
            {nextEvent ? (
              <Link className={styles.primaryLink} href={`/events/${nextEvent.id}`}>
                次回公演
              </Link>
            ) : (
              <Link className={styles.primaryLink} href="/">
                イベント一覧
              </Link>
            )}
            {hasInternationalEvent && (
              <Link className={styles.secondaryLink} href="/international">
                来日公演
              </Link>
            )}
          </div>
        </div>

        <div className={styles.heroStats} aria-label="掲載状況">
          <div>
            <strong>{upcomingEvents.length}</strong>
            <span>今後のライブ</span>
          </div>
          <div>
            <strong>{upcomingPrefectures.length}</strong>
            <span>開催地域</span>
          </div>
          <div>
            <strong>{pastEvents.length}</strong>
            <span>過去のライブ</span>
          </div>
        </div>
      </header>

      {nextEvent && (
        <section className={styles.discoveryHub} aria-labelledby="artist-search-heading">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Explore</p>
              <h2 className={styles.sectionTitle} id="artist-search-heading">
                {artist.name}のライブを探す
              </h2>
              <p className={styles.sectionLead}>
                次回公演、地域、会場から関連するライブへ進めます。
              </p>
            </div>
          </div>

          <div className={styles.discoveryCardGrid}>
            <Link className={styles.discoveryCard} href={`/events/${nextEvent.id}`}>
              <span className={styles.discoveryCardLabel}>
                {formatEventDate(nextEvent.date)}
              </span>
              <strong>{formatArtists(nextEvent.artists)}</strong>
              <span>
                {nextEvent.prefecture} / {nextEvent.venue}
              </span>
            </Link>

            {hasInternationalEvent && (
              <Link className={styles.discoveryCard} href="/international">
                <span className={styles.discoveryCardLabel}>来日</span>
                <strong>来日公演</strong>
                <span>海外アーティスト公演をまとめて確認</span>
              </Link>
            )}

            {upcomingPrefectures.map((prefecture) => (
              <Link
                className={styles.discoveryCard}
                href={`/prefectures/${getPrefectureSlug(prefecture)}`}
                key={prefecture}
              >
                <span className={styles.discoveryCardLabel}>地域</span>
                <strong>{prefecture}のライブ</strong>
                <span>{artist.name}の掲載公演あり</span>
              </Link>
            ))}

            {upcomingVenues.map((venueKey) => {
              const [prefecture, venue] = venueKey.split("\t");

              return (
                <Link
                  className={styles.discoveryCard}
                  href={`/venues/${getVenueSlug(prefecture, venue)}`}
                  key={venueKey}
                >
                  <span className={styles.discoveryCardLabel}>会場</span>
                  <strong>{venue}</strong>
                  <span>{prefecture}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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

function getUniqueValues(values: string[]) {
  return Array.from(new Set(values));
}
