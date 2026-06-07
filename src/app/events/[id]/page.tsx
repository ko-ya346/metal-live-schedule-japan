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

  const artists = formatArtists(event.artists);
  const eventYear = event.date.slice(0, 4);
  const title = `${artists} ライブ情報 ${eventYear} ${event.prefecture}`;
  const description = `${artists}「${event.tourName}」のメタルライブ情報。${formatEventDate(
    event.date,
  )}、${event.prefecture} / ${event.venue}。`;

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
  const shareText = `${formatArtists(event.artists)}「${event.tourName}」${formatEventDate(
    event.date,
  )} ${event.prefecture} / ${event.venue} - ${siteName}`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Event</p>
        <h1>{formatArtists(event.artists)}</h1>
        <p className={styles.summary}>{event.tourName}</p>
      </header>

      <article className={styles.eventDetail}>
        <dl className={styles.eventDetailMeta}>
          <div>
            <dt>日程</dt>
            <dd>{formatEventDate(event.date)}</dd>
          </div>
          <div>
            <dt>会場</dt>
            <dd>
              {event.prefecture} / {event.venue}
            </dd>
          </div>
          <div>
            <dt>ジャンル</dt>
            <dd>{event.genres.join(", ")}</dd>
          </div>
          <div>
            <dt>状況</dt>
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
              チケット
            </a>
          )}
          {event.officialUrl && (
            <a
              className={styles.secondaryLink}
              href={event.officialUrl}
              target="_blank"
              rel="noreferrer"
            >
              公式
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
        イベント一覧へ戻る
      </Link>
    </main>
  );
}
