"use client";

import type { Event } from "../data/events";
import Link from "next/link";
import { isPastEventDate } from "../utils/date";
import {
  formatEventStatus,
  formatYoutubeLinkLabel,
  getSetlistSearchUrl,
  getYoutubeSearchUrl,
} from "../utils/eventLinks";
import styles from "./page.module.css";
import { useEffect, useRef, useState } from "react";
import { ArtistLinks } from "./ArtistLinks";
import { PrefectureLink } from "./PrefectureLink";
import { VenueLink } from "./VenueLink";

type EventCardProps = {
  event: Event;
};

export function EventCard({ event }: EventCardProps) {
  const shouldShowSetlistLink = isPastEventDate(event.date);
  const shouldCollapseYoutubeLinks = event.artists.length > 1;
  const [isYoutubeOpen, setIsYoutubeOpen] = useState(false);
  const youtubeDetailsRef = useRef<HTMLDetailsElement>(null);
  const labels = event.isInternational
    ? {
        venue: "会場 / Venue",
        genre: "ジャンル / Genre",
        status: "状況 / Status",
      }
    : {
        venue: "会場",
        genre: "ジャンル",
        status: "状況",
      };

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
          <ArtistLinks
            artists={event.artists}
            className={styles.eventTitleLink}
          />
        </p>
        <p className={styles.tourName}>{event.tourName}</p>
      </div>

      <dl className={styles.eventMeta}>
        <div>
          <dt>{labels.venue}</dt>
          <dd>
            <PrefectureLink
              className={styles.inlineLink}
              prefecture={event.prefecture}
            />{" "}
            / {" "}
            <VenueLink
              className={styles.inlineLink}
              prefecture={event.prefecture}
              venue={event.venue}
            />
          </dd>
        </div>
        <div>
          <dt>{labels.genre}</dt>
          <dd>{event.genres.join(", ")}</dd>
        </div>
        <div>
          <dt>{labels.status}</dt>
          <dd>{formatEventStatus(event.status)}</dd>
        </div>
      </dl>

      <div className={styles.eventLinks}>
        <Link className={styles.secondaryLink} href={`/events/${event.id}`}>
          詳細 / Details
        </Link>
        {event.ticketUrl && (
          <a
            className={styles.primaryLink}
            href={event.ticketUrl}
            target="_blank"
            rel="noreferrer"
          >
            チケット / Tickets
          </a>
        )}
        {event.officialUrl && (
          <a
            className={styles.secondaryLink}
            href={event.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            公式 / Official
          </a>
        )}
        {shouldShowSetlistLink && (
          <a
            className={styles.secondaryLink}
            href={getSetlistSearchUrl(event.artists)}
            target="_blank"
            rel="noreferrer"
          >
            セットリスト / Setlist
          </a>
        )}
        {shouldCollapseYoutubeLinks ? (
          <details
            className={styles.youtubeDetails}
            onToggle={(event) => setIsYoutubeOpen(event.currentTarget.open)}
            open={isYoutubeOpen}
            ref={youtubeDetailsRef}
          >
            <summary className={styles.secondaryLink}>
              アーティスト別にYouTubeで探す / Search by artist
            </summary>
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
