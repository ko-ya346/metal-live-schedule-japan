import type { Event } from "../data/events";

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
  official: "公式",
  setlist: "セットリスト",
  share: "Xでシェア",
  international: "来日公演一覧",
  allEvents: "イベント一覧へ戻る",
  youtubeMenu: "アーティスト別にYouTubeで探す",
} as const;

export function formatYoutubeLinkLabel(artist: string, artistCount: number) {
  if (artistCount === 1) {
    return "YouTubeで探す";
  }

  return `${artist}をYouTubeで探す`;
}
