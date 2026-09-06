import Link from "next/link";
import type { DiscoveryPick } from "../data/discovery";
import type { Event } from "../data/events";
import { getArtistSlug } from "../utils/artists";
import { formatEventDate, getEventMonthKey, isPastEventDate } from "../utils/date";
import { sortEventsByDate } from "../utils/events";
import styles from "./page.module.css";

type DiscoveryArtist = DiscoveryPick & {
  artistSlug: string;
  events: Event[];
};

type DiscoveryArtistsProps = {
  eventList: Event[];
  monthKey: string;
  picks: DiscoveryPick[];
};

export function getMonthlyDiscoveryArtists({
  eventList,
  monthKey,
  picks,
}: DiscoveryArtistsProps) {
  return picks
    .map<DiscoveryArtist | null>((pick) => {
      const artistSlug = getArtistSlug(pick.artistName);
      const monthlyEvents = sortEventsByDate(
        eventList.filter(
          (event) =>
            !isPastEventDate(event.date) &&
            getEventMonthKey(event.date) === monthKey &&
            event.artists.some((artist) => getArtistSlug(artist) === artistSlug),
        ),
      );

      if (monthlyEvents.length === 0) {
        return null;
      }

      return {
        ...pick,
        artistSlug,
        events: monthlyEvents,
      };
    })
    .filter((artist): artist is DiscoveryArtist => artist !== null)
    .slice(0, 4);
}

export function DiscoveryArtists({
  eventList,
  monthKey,
  picks,
}: DiscoveryArtistsProps) {
  const artists = getMonthlyDiscoveryArtists({ eventList, monthKey, picks });

  if (artists.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.artistDiscovery}
      aria-labelledby="artist-discovery-title"
      data-analytics="discovery-section"
      data-discovery-month={monthKey}
    >
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.kicker}>Discovery</p>
          <h2 className={styles.sectionTitle} id="artist-discovery-title">
            今月、何聴く？
          </h2>
          <p className={styles.sectionLead}>
            今月ライブ予定があるアーティストから、まず1曲聴いてほしいものを選びました。
          </p>
        </div>
      </div>

      <div className={styles.artistDiscoveryGrid}>
        {artists.map((artist) => {
          const nextEvent = artist.events[0];

          return (
            <article
              className={styles.artistDiscoveryCard}
              key={artist.artistSlug}
              data-analytics="discovery-card-impression"
              data-artist={artist.artistName}
              data-discovery-month={monthKey}
            >
              <div className={styles.artistDiscoveryCardHeader}>
                <span className={styles.artistDiscoveryGenre}>{artist.genre}</span>
                <h3>{artist.artistName}</h3>
              </div>
              <p className={styles.artistDiscoveryDescription}>
                {artist.description}
              </p>
              <p className={styles.artistDiscoveryRecommendation}>
                {artist.recommendedFor}
              </p>
              <div
                className={styles.artistDiscoveryEvent}
                aria-label={`${artist.artistName}の次回掲載ライブ`}
              >
                <span>{formatEventDate(nextEvent.date)}</span>
                <span>
                  {nextEvent.prefecture} / {nextEvent.venue}
                </span>
              </div>
              <div className={styles.artistDiscoveryActions}>
                <a
                  className={styles.primaryLink}
                  href={artist.firstListen.url}
                  target="_blank"
                  rel="noreferrer"
                  data-analytics="discovery-youtube-click"
                  data-artist={artist.artistName}
                  data-track-label={artist.firstListen.label}
                >
                  {artist.firstListen.label}を聴く
                </a>
                <Link
                  className={styles.secondaryLink}
                  href={`/artists/${encodeURIComponent(artist.artistSlug)}`}
                  data-analytics="discovery-artist-click"
                  data-artist={artist.artistName}
                >
                  ライブ予定
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
