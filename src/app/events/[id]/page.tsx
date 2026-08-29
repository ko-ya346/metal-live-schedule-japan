import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { events } from "../../../data/events";
import { getArtistSlug } from "../../../utils/artists";
import { formatEventDate, isPastEventDate } from "../../../utils/date";
import {
  eventLinkLabels,
  formatArtists,
  formatEventStatus,
  formatYoutubeLinkLabel,
  getSetlistSearchUrl,
  getYoutubeSearchUrl,
} from "../../../utils/eventLinks";
import { getRelatedEventCandidates } from "../../../utils/events";
import { getPrefectureSlug } from "../../../utils/prefectures";
import { getVenueSlug } from "../../../utils/venues";
import { SiteAnalytics } from "../../Analytics";
import { ArtistLinks } from "../../ArtistLinks";
import { PrefectureLink } from "../../PrefectureLink";
import { VenueLink } from "../../VenueLink";
import { siteName, siteUrl } from "../../site";
import { EventShareLinks } from "./EventShareLinks";
import { RelatedEvents } from "./RelatedEvents";
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
  const primaryArtist = event.artists[0];
  const eventYear = event.date.slice(0, 4);
  const location = event.prefecture.replace(/都|府|県$/, "");
  const eventDate = event.date.slice(5).replace("-", "/");

  if (event.isInternational) {
    return `${primaryArtist} 来日公演 ${eventYear} ${location} ${eventDate} | チケット・会場`;
  }

  return `${primaryArtist}のメタルライブ ${eventYear} ${location} ${eventDate} | チケット・会場`;
}

function formatEventPageDescription(event: NonNullable<ReturnType<typeof findEvent>>) {
  const artists = formatArtists(event.artists);
  const primaryArtist = event.artists[0];
  const supportText =
    event.artists.length > 1
      ? `出演: ${artists}。`
      : `${primaryArtist}の公演情報。`;
  const ticketText = event.ticketUrl
    ? "チケット情報あり。"
    : "チケット情報は公式発表を確認してください。";
  const eventTypeText = event.isInternational
    ? `${primaryArtist}の来日公演情報。`
    : `${primaryArtist}の日本国内メタルライブ情報。`;

  return `${eventTypeText}${supportText}${event.tourName}は${formatEventDate(
    event.date,
  )}、${event.prefecture} / ${event.venue}で開催。${ticketText}公式リンク、会場情報、関連ライブを掲載。`;
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

function formatOperationalDate(date: string | undefined) {
  if (!date) {
    return null;
  }

  return formatEventDate(date as `${number}-${number}-${number}`);
}

function formatEventSummary(event: NonNullable<ReturnType<typeof findEvent>>) {
  const artists = formatArtists(event.artists);
  const eventType = event.isInternational ? "来日公演" : "ライブ";
  const hasEnded = isPastEventDate(event.date);
  const eventTimingText = hasEnded ? "開催されました" : "開催予定です";
  const linkTargets = [
    event.ticketUrl ? "チケット情報" : null,
    event.officialUrl ? "公式情報" : null,
  ].filter((target): target is string => Boolean(target));
  const linkText =
    linkTargets.length > 0
      ? `${linkTargets.join("と")}へのリンクを掲載しています。`
      : "確認できた範囲の公演情報を掲載しています。";

  return `${artists}の${eventType}「${event.tourName}」は、${formatEventDate(
    event.date,
  )}に${event.prefecture}の${event.venue}で${eventTimingText}。${linkText}`;
}

function EventDiscoveryLinks({
  event,
}: {
  event: NonNullable<ReturnType<typeof findEvent>>;
}) {
  const artistLinks = event.artists.slice(0, 3).map((artist) => ({
    href: `/artists/${encodeURIComponent(getArtistSlug(artist))}`,
    label: `${artist}のライブ`,
  }));
  const links = [
    ...artistLinks,
    {
      href: `/venues/${encodeURIComponent(
        getVenueSlug(event.prefecture, event.venue),
      )}`,
      label: `${event.venue}のライブ`,
    },
    {
      href: `/prefectures/${getPrefectureSlug(event.prefecture)}`,
      label: `${event.prefecture}のライブ`,
    },
  ];

  if (event.isInternational) {
    links.push({
      href: "/international",
      label: "来日公演をもっと見る",
    });
  }

  return (
    <section className={styles.discoverySection}>
      <div>
        <p className={styles.kicker}>Discover</p>
        <h2>このライブから探す</h2>
        <p>
          気になった出演者、会場、地域から近いライブを続けて探せます。
        </p>
      </div>
      <div className={styles.discoveryLinks}>
        {links.map((link) => (
          <Link className={styles.discoveryLink} href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
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
  const hasPrimaryEventLinks = Boolean(event.ticketUrl || event.officialUrl);
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
  const relatedEventCandidates = getRelatedEventCandidates(event, events);
  const updatedDate = formatOperationalDate(event.updatedAt);

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
        <p className={styles.eventDetailSummary}>{formatEventSummary(event)}</p>

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
            <dt>{isInternational ? "ジャンル / Genre" : "ジャンル"}</dt>
            <dd>{event.genres.join(", ")}</dd>
          </div>
          <div>
            <dt>{isInternational ? "状況 / Status" : "状況"}</dt>
            <dd>{formatEventStatus(event.status)}</dd>
          </div>
        </dl>

        <div className={styles.eventDetailLinks}>
          {hasPrimaryEventLinks && (
            <div className={styles.eventPrimaryLinks}>
              {event.ticketUrl && (
                <a
                  className={styles.primaryLink}
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {eventLinkLabels.ticket}
                </a>
              )}
              {event.officialUrl && (
                <a
                  className={styles.secondaryLink}
                  href={event.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {eventLinkLabels.official}
                </a>
              )}
            </div>
          )}

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

          <EventShareLinks eventUrl={eventUrl} shareText={shareText} />
        </div>

        <EventDiscoveryLinks event={event} />

        <section className={styles.eventSourceSection}>
          {updatedDate && <p>情報更新日: {updatedDate}</p>}
          <p>
            公演内容は変更される場合があります。来場前に公式情報やチケット販売ページを確認してください。
          </p>
        </section>

        {shouldShowSetlistLink && (
          <section className={styles.eventArchiveNote}>
            <h2>アーカイブ</h2>
            <p>
              この公演は終了しています。過去の公演記録として掲載し、セットリスト検索への導線を残しています。
            </p>
          </section>
        )}
      </article>

      <RelatedEvents
        currentEvent={event}
        relatedEventCandidates={relatedEventCandidates}
      />

      <Link className={styles.textLink} href="/">
        {eventLinkLabels.allEvents}
      </Link>

      <SiteAnalytics />
    </main>
  );
}
