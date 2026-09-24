import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { events } from "../../../data/events";
import { getArtistSlug } from "../../../utils/artists";
import { formatEventDate, isPastEventDate } from "../../../utils/date";
import {
  eventLinkLabels,
  formatArtists,
  formatEventDisplayStatus,
  formatTicketProvider,
  formatTicketSaleStatus,
  formatYoutubeLinkLabel,
  getOfficialEventLink,
  getSetlistSearchUrl,
  getTicketLinkLabel,
  getTicketLinks,
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
import { TrackedExternalLink } from "../../TrackedExternalLink";
import styles from "../../page.module.css";

type EventPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamicParams = false;

function findEvent(id: string) {
  return events.find((event) => event.id === id);
}

function formatEventPageTitle(event: NonNullable<ReturnType<typeof findEvent>>) {
  const primaryArtist = event.artists[0];
  const location = event.prefecture.replace(/都|府|県$/, "");

  if (event.isInternational) {
    return `${primaryArtist} ${location}来日公演 ${formatEventDate(event.date)} | チケット・会場`;
  }

  return `${primaryArtist} ${location}公演 ${formatEventDate(event.date)} | チケット・会場`;
}

function formatEventPageDescription(event: NonNullable<ReturnType<typeof findEvent>>) {
  const artists = formatArtists(event.artists);
  const primaryArtist = event.artists[0];
  const supportText =
    event.artists.length > 1
      ? `出演: ${artists}。`
      : `${primaryArtist}の公演情報。`;
  const ticketText = getTicketLinks(event).length > 0
    ? "チケット情報あり。"
    : "チケット情報は公式発表を確認してください。";
  const eventTypeText = event.isInternational
    ? `${primaryArtist}の来日公演情報。`
    : `${primaryArtist}の日本国内メタルライブ情報。`;

  return `${eventTypeText}${supportText}${event.tourName}は${formatEventDate(
    event.date,
  )}、${event.prefecture}の${event.venue}で開催。${ticketText}公式情報、会場情報、関連ライブを掲載しています。`;
}

function getSchemaEventStatus(event: NonNullable<ReturnType<typeof findEvent>>) {
  if (event.status === "cancelled") {
    return "https://schema.org/EventCancelled";
  }

  if (event.status === "postponed") {
    return "https://schema.org/EventPostponed";
  }

  if (isPastEventDate(event.date)) {
    return "https://schema.org/EventCompleted";
  }

  return "https://schema.org/EventScheduled";
}

function formatOperationalDate(date: string | undefined) {
  if (!date) {
    return null;
  }

  return formatEventDate(date as `${number}-${number}-${number}`);
}

function getEventLastUpdatedDate(event: NonNullable<ReturnType<typeof findEvent>>) {
  return event.updatedAt ?? event.publishedAt;
}

function formatOptionalOperationalDate(date: string | undefined) {
  return formatOperationalDate(date) ?? "未掲載";
}

function formatMissingDetail(label: string) {
  return `未掲載（${label}は公式情報を確認してください）`;
}

function getOfferAvailability(saleStatus: ReturnType<typeof getTicketLinks>[number]["saleStatus"]) {
  if (saleStatus === "sold_out") {
    return "https://schema.org/SoldOut";
  }

  if (saleStatus === "not_started" || saleStatus === "presale") {
    return "https://schema.org/PreOrder";
  }

  if (saleStatus === "on_sale") {
    return "https://schema.org/InStock";
  }

  return undefined;
}

function getMusicEventStructuredData({
  event,
  eventUrl,
  ticketLinks,
}: {
  event: NonNullable<ReturnType<typeof findEvent>>;
  eventUrl: string;
  ticketLinks: ReturnType<typeof getTicketLinks>;
}) {
  const offers = ticketLinks.map((ticketLink) => {
    const availability = getOfferAvailability(ticketLink.saleStatus);

    return {
      "@type": "Offer",
      url: ticketLink.href,
      name: getTicketLinkLabel(ticketLink),
      seller: {
        "@type": "Organization",
        name: formatTicketProvider(ticketLink.provider),
      },
      ...(availability ? { availability } : {}),
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: `${formatArtists(event.artists)} - ${event.tourName}`,
    description: formatEventPageDescription(event),
    startDate: event.date,
    eventStatus: getSchemaEventStatus(event),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: eventUrl,
    mainEntityOfPage: eventUrl,
    location: {
      "@type": "MusicVenue",
      name: event.venue,
      address: {
        "@type": "PostalAddress",
        addressRegion: event.prefecture,
        addressCountry: "JP",
      },
    },
    performer: event.artists.map((artist) => ({
      "@type": "MusicGroup",
      name: artist,
    })),
    ...(event.officialUrl ? { sameAs: event.officialUrl } : {}),
    ...(offers.length > 0 ? { offers } : {}),
  };
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
  const ticketLinks = getTicketLinks(event);
  const officialLink = getOfficialEventLink(event);
  const eventStructuredData = getMusicEventStructuredData({
    event,
    eventUrl,
    ticketLinks,
  });
  const shareText = `${formatArtists(event.artists)}「${event.tourName}」${formatEventDate(
    event.date,
  )} ${event.prefecture} / ${event.venue} - ${siteName}`;
  const relatedEventCandidates = getRelatedEventCandidates(event, events);
  const updatedDate = formatOperationalDate(getEventLastUpdatedDate(event));

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Link className={styles.eventBackLink} href="/">
        {eventLinkLabels.allEvents}
      </Link>

      <header className={`${styles.header} ${styles.subpageHeader}`}>
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
            <dt>公演名</dt>
            <dd>{event.tourName}</dd>
          </div>
          <div>
            <dt>出演者</dt>
            <dd>{formatArtists(event.artists)}</dd>
          </div>
          <div>
            <dt>日程</dt>
            <dd>{formatEventDate(event.date)}</dd>
          </div>
          <div>
            <dt>開場 / 開演</dt>
            <dd>{formatMissingDetail("開場・開演時刻")}</dd>
          </div>
          <div>
            <dt>都道府県</dt>
            <dd>
              <PrefectureLink
                className={styles.inlineLink}
                prefecture={event.prefecture}
              />
            </dd>
          </div>
          <div>
            <dt>都市</dt>
            <dd>{formatMissingDetail("都市")}</dd>
          </div>
          <div>
            <dt>会場</dt>
            <dd>
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
          <div>
            <dt>状況</dt>
            <dd>{formatEventDisplayStatus(event)}</dd>
          </div>
          <div>
            <dt>最終更新</dt>
            <dd>{formatOptionalOperationalDate(getEventLastUpdatedDate(event))}</dd>
          </div>
        </dl>

        <div className={styles.eventDetailLinks}>
          {(ticketLinks.length > 0 || officialLink) && (
            <div className={styles.eventPrimaryLinks}>
              {ticketLinks.map((ticketLink) => (
                <TrackedExternalLink
                  className={styles.primaryLink}
                  event={event}
                  href={ticketLink.href}
                  isAffiliate={Boolean(ticketLink.affiliateUrl)}
                  key={`${ticketLink.provider}-${ticketLink.url}`}
                  linkType="ticket"
                  sourceSurface="event_detail"
                  ticketProvider={ticketLink.provider}
                >
                  <span>{getTicketLinkLabel(ticketLink)}</span>
                  {ticketLinks.length > 1 && (
                    <span className={styles.linkSubLabel}>
                      {formatTicketSaleStatus(ticketLink.saleStatus)}
                    </span>
                  )}
                </TrackedExternalLink>
              ))}
              {officialLink && (
                <TrackedExternalLink
                  className={styles.secondaryLink}
                  event={event}
                  href={officialLink}
                  linkType="official"
                  sourceSurface="event_detail"
                >
                  {eventLinkLabels.official}
                </TrackedExternalLink>
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

        <section className={styles.eventSourceSection}>
          <h2>情報の確認</h2>
          <p>最終更新日: {updatedDate ?? "未掲載"}</p>
          {event.officialUrl ? (
            <p>
              公式情報:{" "}
              <a href={event.officialUrl} target="_blank" rel="noreferrer">
                公式サイトを確認する
              </a>
            </p>
          ) : (
            <p>公式情報: 未掲載</p>
          )}
          {ticketLinks.length > 0 ? (
            <p>
              チケット購入先:{" "}
              {ticketLinks
                .map((ticketLink) => formatTicketProvider(ticketLink.provider))
                .join(" / ")}
            </p>
          ) : (
            <p>チケット購入先: 未掲載</p>
          )}
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

      <EventDiscoveryLinks event={event} />

      <RelatedEvents
        currentEvent={event}
        relatedEventCandidates={relatedEventCandidates}
      />

      <SiteAnalytics />
    </main>
  );
}
