import type { Event } from "../data/events";
import Link from "next/link";
import { isPastEventDate } from "../utils/date";
import {
  formatArtists,
  formatEventStatus,
  formatYoutubeLinkLabel,
  getSetlistSearchUrl,
  getYoutubeSearchUrl,
} from "../utils/eventLinks";
import styles from "./page.module.css";
import { useEffect, useRef, useState } from "react";

type EventCardProps = {
  event: Event;
};

export function EventCard({ event }: EventCardProps) {
  const shouldShowSetlistLink = isPastEventDate(event.date);
  const shouldCollapseYoutubeLinks = event.artists.length > 1;
  const [isYoutubeOpen, setIsYoutubeOpen] = useState(false);
  const youtubeDetailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!isYoutubeOpen) {
      return;
    }

    function closeYoutubeLinks(event: PointerEvent) {
      if (!youtubeDetailsRef.current?.contains(event.target as Node)) {
        setIsYoutubeOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeYoutubeLinks);

    return () => {
      document.removeEventListener("pointerdown", closeYoutubeLinks);
    };
  }, [isYoutubeOpen]);

  return (
    <article className={styles.eventCard}>
      <div>
        <p className={styles.artist}>
          <Link className={styles.eventTitleLink} href={`/events/${event.id}`}>
            {formatArtists(event.artists)}
          </Link>
        </p>
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

      <div className={styles.eventLinks}>
        <Link className={styles.secondaryLink} href={`/events/${event.id}`}>
          詳細
        </Link>
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
        {shouldCollapseYoutubeLinks ? (
          <details
            className={styles.youtubeDetails}
            onToggle={(event) => setIsYoutubeOpen(event.currentTarget.open)}
            open={isYoutubeOpen}
            ref={youtubeDetailsRef}
          >
            <summary className={styles.secondaryLink}>YouTube</summary>
            <div className={styles.youtubeArtistLinks}>
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
            </div>
          </details>
        ) : (
          <a
            className={styles.secondaryLink}
            href={getYoutubeSearchUrl(event.artists[0])}
            target="_blank"
            rel="noreferrer"
          >
            {formatYoutubeLinkLabel(event.artists[0], event.artists.length)}
          </a>
        )}
      </div>
    </article>
  );
}
