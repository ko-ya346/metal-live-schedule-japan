"use client";

import type { Event } from "../data/events";
import Link from "next/link";
import { isPastEventDate } from "../utils/date";
import {
  eventLinkLabels,
  formatTicketProvider,
  formatTicketSaleStatus,
  formatEventStatus,
  formatYoutubeLinkLabel,
  getPrimaryEventLinks,
  getSetlistSearchUrl,
  getTicketLinks,
  getYoutubeSearchUrl,
} from "../utils/eventLinks";
import styles from "./page.module.css";
import { useEffect, useRef, useState } from "react";
import { ArtistLinks } from "./ArtistLinks";
import { PrefectureLink } from "./PrefectureLink";
import { TrackedExternalLink } from "./TrackedExternalLink";
import { VenueLink } from "./VenueLink";

type EventCardProps = {
  event: Event;
};

export function EventCard({ event }: EventCardProps) {
  const shouldShowSetlistLink = isPastEventDate(event.date);
  const shouldCollapseYoutubeLinks = event.artists.length > 1;
  const ticketLinks = getTicketLinks(event);
  const shouldCollapseTicketLinks = ticketLinks.length > 1;
  const primaryEventLinks = getPrimaryEventLinks(event);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [isYoutubeOpen, setIsYoutubeOpen] = useState(false);
  const ticketDetailsRef = useRef<HTMLDetailsElement>(null);
  const youtubeDetailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!isTicketOpen && !isYoutubeOpen) {
      return;
    }

    function closeOpenMenus(pointerEvent: PointerEvent) {
      if (!ticketDetailsRef.current?.contains(pointerEvent.target as Node)) {
        setIsTicketOpen(false);
      }

      if (!youtubeDetailsRef.current?.contains(pointerEvent.target as Node)) {
        setIsYoutubeOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOpenMenus);

    return () => {
      document.removeEventListener("pointerdown", closeOpenMenus);
    };
  }, [isTicketOpen, isYoutubeOpen]);

  return (
    <article className={styles.eventCard}>
      <div className={styles.eventCardHeader}>
        <div>
          <p className={styles.artist}>
            <ArtistLinks
              artists={event.artists}
              className={styles.eventTitleLink}
            />
          </p>
          <p className={styles.tourName}>{event.tourName}</p>
        </div>
        {event.status !== "scheduled" && (
          <div className={styles.eventHeaderActions}>
            <span className={styles.eventStatusBadge}>
              {formatEventStatus(event.status)}
            </span>
          </div>
        )}
      </div>

      <dl className={styles.eventMeta}>
        <div>
          <dt>会場</dt>
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
          <dt>ジャンル</dt>
          <dd>{event.genres.join(", ")}</dd>
        </div>
      </dl>

      <div className={styles.eventLinks} aria-label="イベントリンク">
        <div className={styles.eventPrimaryLinks}>
          {shouldCollapseTicketLinks && (
            <details
              className={styles.ticketDetails}
              onToggle={(event) => setIsTicketOpen(event.currentTarget.open)}
              open={isTicketOpen}
              ref={ticketDetailsRef}
            >
              <summary className={styles.primaryLink}>
                {eventLinkLabels.ticketMenu}（{ticketLinks.length}）
              </summary>
              <div className={styles.ticketProviderLinks}>
                {ticketLinks.map((ticketLink) => (
                  <TrackedExternalLink
                    className={styles.ticketProviderLink}
                    event={event}
                    href={ticketLink.href}
                    isAffiliate={Boolean(ticketLink.affiliateUrl)}
                    key={`${ticketLink.provider}-${ticketLink.url}`}
                    linkType="ticket"
                    sourceSurface="event_card"
                    ticketProvider={ticketLink.provider}
                  >
                    <span>{formatTicketProvider(ticketLink.provider)}</span>
                    <span>{formatTicketSaleStatus(ticketLink.saleStatus)} →</span>
                  </TrackedExternalLink>
                ))}
              </div>
            </details>
          )}
          {primaryEventLinks.map((link) => (
            <TrackedExternalLink
              className={
                link.variant === "primary"
                  ? styles.primaryLink
                  : styles.secondaryLink
              }
              event={event}
              href={link.href}
              key={`${link.label}-${link.href}`}
              linkType={link.linkType}
              sourceSurface="event_card"
              ticketProvider={link.linkType === "ticket" ? ticketLinks[0]?.provider : undefined}
              isAffiliate={
                link.linkType === "ticket" ? Boolean(ticketLinks[0]?.affiliateUrl) : false
              }
            >
              {link.label}
            </TrackedExternalLink>
          ))}
        </div>

        <div className={styles.eventSupportLinks}>
          {shouldShowSetlistLink && (
            <a
              className={styles.secondaryLink}
              href={getSetlistSearchUrl(event.artists)}
              target="_blank"
              rel="noreferrer"
            >
              {eventLinkLabels.setlist}
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
                {eventLinkLabels.youtubeMenu}
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
          <Link
            aria-label={`${event.artists.join(" / ")} ${event.tourName}の詳細を見る`}
            className={styles.infoLink}
            href={`/events/${event.id}`}
            title="詳細を見る"
          >
            詳細
          </Link>
        </div>
      </div>
    </article>
  );
}
