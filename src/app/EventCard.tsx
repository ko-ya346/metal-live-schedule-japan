import type { Event } from "../data/events";
import { isPastEventDate } from "../utils/date";
import styles from "./page.module.css";

type EventCardProps = {
  event: Event;
};

function formatEventStatus(status: Event["status"]) {
  if (status === "cancelled") {
    return "中止";
  }

  if (status === "postponed") {
    return "延期";
  }

  return "開催予定";
}

function formatArtists(artists: Event["artists"]) {
  return artists.join(" / ");
}

function getSetlistSearchUrl(artists: Event["artists"]) {
  const headliner = artists[0];
  const query = encodeURIComponent(headliner);

  return `https://www.setlist.fm/search?query=${query}`;
}

export function EventCard({ event }: EventCardProps) {
  const shouldShowSetlistLink = isPastEventDate(event.date);
  const hasEventLinks = event.ticketUrl || event.officialUrl || shouldShowSetlistLink;

  return (
    <article className={styles.eventCard}>
      <div>
        <p className={styles.artist}>{formatArtists(event.artists)}</p>
        <p className={styles.tourName}>{event.tourName}</p>
      </div>

      <dl className={styles.eventMeta}>
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

      {hasEventLinks && (
        <div className={styles.eventLinks}>
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
        </div>
      )}

      {!hasEventLinks && <p className={styles.pendingLinks}>リンク未定</p>}
    </article>
  );
}
