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
  getEventsByVenueSlug,
  getVenueBySlug,
  getVenues,
} from "../../../utils/venues";
import { EventDateGroup } from "../../EventDateGroup";
import { PrefectureLink } from "../../PrefectureLink";
import { SiteAnalytics } from "../../Analytics";
import styles from "../../page.module.css";

type VenuePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function decodeVenueSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function generateStaticParams() {
  return getVenues(publishedEvents).map((venue) => ({
    slug: venue.slug,
  }));
}

export async function generateMetadata({
  params,
}: VenuePageProps): Promise<Metadata> {
  const { slug: encodedSlug } = await params;
  const slug = decodeVenueSlug(encodedSlug);
  const venue = getVenueBySlug(publishedEvents, slug);

  if (!venue) {
    return {
      title: "会場が見つかりません",
    };
  }

  const title = `${venue.name}のメタルライブ・イベント情報`;
  const description = `${venue.prefecture}の${venue.name}で開催されるメタル、ハードロック、ラウドロック、メタルコア、ハードコアのライブ日程・出演者・チケット情報を掲載しています。`;
  const path = `/venues/${encodeURIComponent(venue.slug)}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
    },
  };
}

export default async function VenuePage({ params }: VenuePageProps) {
  const { slug: encodedSlug } = await params;
  const slug = decodeVenueSlug(encodedSlug);
  const venue = getVenueBySlug(publishedEvents, slug);

  if (!venue) {
    notFound();
  }

  const venueEvents = sortEventsByDate(
    getEventsByVenueSlug(publishedEvents, venue.slug),
  );
  const upcomingEvents = venueEvents.filter(
    (event) => !isPastEventDate(event.date),
  );
  const pastEvents = venueEvents
    .filter((event) => isPastEventDate(event.date))
    .reverse();
  const upcomingEventsByDate = groupEventsByDate(upcomingEvents);
  const pastEventsByDate = groupEventsByDate(pastEvents);
  const upcomingDates = getGroupedEventDates(upcomingEventsByDate);
  const pastDates = getGroupedEventDates(pastEventsByDate).reverse();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Venue</p>
        <h1>{venue.name}</h1>
        <p className={styles.summary}>
          <PrefectureLink
            className={styles.inlineLink}
            prefecture={venue.prefecture}
          />
          {" / "}今後のライブ {upcomingEvents.length}件 / 掲載イベント全
          {venueEvents.length}件
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

      <Link className={styles.textLink} href="/">
        イベント一覧へ戻る
      </Link>

      <SiteAnalytics />
    </main>
  );
}
