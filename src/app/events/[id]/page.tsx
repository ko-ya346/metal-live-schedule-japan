import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { events } from "../../../data/events";
import { formatEventDate, isPastEventDate } from "../../../utils/date";
import {
  formatArtists,
  formatEventStatus,
  formatYoutubeLinkLabel,
  getSetlistSearchUrl,
  getXShareUrl,
  getYoutubeSearchUrl,
} from "../../../utils/eventLinks";
import { SiteAnalytics } from "../../Analytics";
import { ArtistLinks } from "../../ArtistLinks";
import { siteName, siteUrl } from "../../site";
import styles from "../../page.module.css";

type EventPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function findEvent(id: string) {
  return events.find((event) => event.id === id);
}

function formatEventPageTitle(event: NonNullable<ReturnType<typeof findEvent>>) {
  const artists = formatArtists(event.artists);
  const eventYear = event.date.slice(0, 4);
  const location = event.prefecture.replace(/都|府|県$/, "");
  const eventType = event.isInternational ? "来日メタルライブ" : "メタルライブ";

  return `${artists}の${eventType} ${eventYear} ${location} | チケット・会場情報`;
}

function formatEventPageDescription(event: NonNullable<ReturnType<typeof findEvent>>) {
  const artists = formatArtists(event.artists);
  const ticketText = event.ticketUrl ? "チケット情報、" : "";
  const eventTypeText = event.isInternational
    ? "日本のメタルライブ・来日公演情報。"
    : "日本のメタルライブ情報。";

  return `${eventTypeText}${artists}「${event.tourName}」のライブ情報。${formatEventDate(
    event.date,
  )}、${event.prefecture} / ${event.venue}。${ticketText}公式リンクを掲載。Japan metal concert schedule and ticket links.`;
}

function getSchemaEventStatus(event: NonNullable<ReturnType<typeof findEvent>>) {
  if (event.status === "cancelled") {
    return "https://schema.org/EventCancelled";
  }

  if (event.status === "postponed") {
    return "https://schema.org/EventPostponed";
  }

  return "https://schema.org/EventScheduled";
}

export function generateStaticParams() {
  return events.map((event) => ({
    id: event.id,
  }));
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = findEvent(id);

  if (!event) {
    return {
      title: "イベントが見つかりません",
    };
  }

  const title = formatEventPageTitle(event);
  const description = formatEventPageDescription(event);

  return {
    title,
    description,
    alternates: {
      canonical: `/events/${event.id}`,
    },
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url: `/events/${event.id}`,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `${title} | ${siteName}`,
      description,
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const event = findEvent(id);

  if (!event) {
    notFound();
  }

  const shouldShowSetlistLink = isPastEventDate(event.date);
  const eventUrl = `${siteUrl}/events/${event.id}`;
  const isInternational = event.isInternational;
  const eventStructuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${formatArtists(event.artists)} - ${event.tourName}`,
    description: formatEventPageDescription(event),
    startDate: event.date,
    eventStatus: getSchemaEventStatus(event),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: eventUrl,
    location: {
      "@type": "Place",
      name: event.venue,
      address: {
        "@type": "PostalAddress",
        addressRegion: event.prefecture,
        addressCountry: "JP",
      },
    },
    performer: event.artists.map((artist) => ({
      "@type": "PerformingGroup",
      name: artist,
    })),
  };
  const shareText = `${formatArtists(event.artists)}「${event.tourName}」${formatEventDate(
    event.date,
  )} ${event.prefecture} / ${event.venue} - ${siteName}`;

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <header className={styles.header}>
        <p className={styles.kicker}>Event</p>
        <h1>
          <ArtistLinks
            artists={event.artists}
            className={styles.eventTitleLink}
          />
        </h1>
        <p className={styles.summary}>{event.tourName}</p>
      </header>

      <article className={styles.eventDetail}>
        <dl className={styles.eventDetailMeta}>
          <div>
            <dt>{isInternational ? "日程 / Date" : "日程"}</dt>
            <dd>
              {formatEventDate(event.date)}
              {isInternational ? ` / ${event.date}` : ""}
            </dd>
          </div>
          <div>
            <dt>{isInternational ? "会場 / Venue" : "会場"}</dt>
            <dd>
              {event.prefecture} / {event.venue}
            </dd>
          </div>
          <div>
            <dt>{isInternational ? "ジャンル / Genre" : "ジャンル"}</dt>
            <dd>{event.genres.join(", ")}</dd>
          </div>
          <div>
            <dt>{isInternational ? "状況 / Status" : "状況"}</dt>
            <dd>{formatEventStatus(event.status)}</dd>
          </div>
        </dl>

        <div className={styles.eventDetailLinks}>
          {event.ticketUrl && (
            <a
              className={styles.primaryLink}
              href={event.ticketUrl}
              target="_blank"
              rel="noreferrer"
            >
              {isInternational ? "チケット / Tickets" : "チケット"}
            </a>
          )}
          {event.officialUrl && (
            <a
              className={styles.secondaryLink}
              href={event.officialUrl}
              target="_blank"
              rel="noreferrer"
            >
              {isInternational ? "公式 / Official" : "公式"}
            </a>
          )}
          {shouldShowSetlistLink && (
            <a
              className={styles.secondaryLink}
              href={getSetlistSearchUrl(event.artists)}
              target="_blank"
              rel="noreferrer"
            >
              セットリストを探す
            </a>
          )}
          {event.artists.map((artist) => (
            <a
              className={styles.secondaryLink}
              href={getYoutubeSearchUrl(artist)}
              key={artist}
              target="_blank"
              rel="noreferrer"
            >
              {formatYoutubeLinkLabel(artist, event.artists.length)}
            </a>
          ))}
          <a
            className={styles.secondaryLink}
            href={getXShareUrl(shareText, eventUrl)}
            target="_blank"
            rel="noreferrer"
          >
            Xで共有
          </a>
        </div>
      </article>

      <Link className={styles.textLink} href="/">
        {isInternational ? "イベント一覧へ戻る / All events" : "イベント一覧へ戻る"}
      </Link>

      <SiteAnalytics />
    </main>
  );
}
