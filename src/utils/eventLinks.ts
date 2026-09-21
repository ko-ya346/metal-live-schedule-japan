import type { Event, TicketLink } from "../data/events";
import { isPastEventDate } from "./date";

type PrimaryEventLink = {
  href: string;
  label: string;
  linkType: "ticket" | "official" | "combined";
  variant: "primary" | "secondary";
};

export type DisplayTicketLink = TicketLink & {
  href: string;
};

export function formatArtists(artists: Event["artists"]) {
  return artists.join(" / ");
}

export function formatEventStatus(status: Event["status"]) {
  if (status === "cancelled") {
    return "中止";
  }

  if (status === "postponed") {
    return "延期";
  }

  return "開催予定";
}

export function formatEventDisplayStatus(event: Event) {
  if (event.status !== "scheduled") {
    return formatEventStatus(event.status);
  }

  if (isPastEventDate(event.date)) {
    return "開催終了";
  }

  return formatEventStatus(event.status);
}

export function getSetlistSearchUrl(artists: Event["artists"]) {
  const headliner = artists[0];
  const query = encodeURIComponent(headliner);

  return `https://www.setlist.fm/search?query=${query}`;
}

export function getYoutubeSearchUrl(artist: string) {
  const query = encodeURIComponent(artist);

  return `https://www.youtube.com/results?search_query=${query}`;
}

export function getXShareUrl(text: string, url: string) {
  const params = new URLSearchParams({
    text,
    url,
  });

  return `https://x.com/intent/post?${params.toString()}`;
}

export const eventLinkLabels = {
  detail: "詳細",
  ticket: "チケット",
  ticketMenu: "チケットを選ぶ",
  official: "公式",
  setlist: "セットリスト",
  share: "Xでシェア",
  international: "来日公演一覧",
  allEvents: "イベント一覧へ戻る",
  youtubeMenu: "アーティスト別にYouTubeで探す",
} as const;

function normalizeComparableUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

const ticketProviderLabels: Record<string, string> = {
  eplus: "イープラス",
  pia: "チケットぴあ",
  lawson: "ローソンチケット",
  livepocket: "LivePocket",
  rakuten: "楽天チケット",
  creativeman: "Creativeman",
  smash: "SMASH",
  evp: "EVP4U",
  other: "チケット",
};

const ticketSaleStatusLabels: Record<NonNullable<TicketLink["saleStatus"]>, string> = {
  not_started: "発売前",
  on_sale: "販売中",
  presale: "先行受付",
  sold_out: "売切",
  unknown: "確認する",
};

export function formatTicketProvider(provider: string) {
  return ticketProviderLabels[provider] ?? provider;
}

export function formatTicketSaleStatus(status: TicketLink["saleStatus"]) {
  return ticketSaleStatusLabels[status ?? "unknown"];
}

export function getTicketLinkHref(ticketLink: TicketLink) {
  return ticketLink.affiliateUrl || ticketLink.url;
}

export function getTicketLinks(event: Event): DisplayTicketLink[] {
  const normalizedLinks =
    event.ticketLinks && event.ticketLinks.length > 0
      ? event.ticketLinks
      : event.ticketUrl
        ? [
            {
              provider: "other",
              url: event.ticketUrl,
              affiliateUrl: null,
              saleStatus: "unknown" as const,
              saleEndsAt: null,
              priority: 1,
            },
          ]
        : [];

  return [...normalizedLinks]
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .map((ticketLink) => ({
      ...ticketLink,
      href: getTicketLinkHref(ticketLink),
    }));
}

export function getTicketLinkLabel(ticketLink: DisplayTicketLink) {
  if (ticketLink.provider === "other") {
    return eventLinkLabels.ticket;
  }

  return `${formatTicketProvider(ticketLink.provider)}で購入`;
}

export function getOfficialEventLink(event: Event) {
  if (!event.officialUrl) {
    return null;
  }

  const officialUrl = normalizeComparableUrl(event.officialUrl);
  const isSameAsTicketLink = getTicketLinks(event).some(
    (ticketLink) =>
      normalizeComparableUrl(ticketLink.url) === officialUrl ||
      normalizeComparableUrl(ticketLink.href) === officialUrl,
  );

  if (isSameAsTicketLink) {
    return null;
  }

  return event.officialUrl;
}

export function getPrimaryEventLinks(event: Event): PrimaryEventLink[] {
  const ticketLinks = getTicketLinks(event);
  const ticketLink = ticketLinks[0];
  const officialUrl = getOfficialEventLink(event);

  if (ticketLinks.length > 1) {
    return officialUrl
      ? [
          {
            href: officialUrl,
            label: eventLinkLabels.official,
            linkType: "official",
            variant: "secondary",
          },
        ]
      : [];
  }

  const links: PrimaryEventLink[] = [];

  if (ticketLink) {
    links.push({
      href: ticketLink.href,
      label: getTicketLinkLabel(ticketLink),
      linkType: "ticket",
      variant: "primary",
    });
  }

  if (officialUrl) {
    links.push({
      href: officialUrl,
      label: eventLinkLabels.official,
      linkType: "official",
      variant: "secondary",
    });
  }

  return links;
}

export function formatYoutubeLinkLabel(artist: string, artistCount: number) {
  if (artistCount === 1) {
    return "YouTubeで探す";
  }

  return `${artist}をYouTubeで探す`;
}
