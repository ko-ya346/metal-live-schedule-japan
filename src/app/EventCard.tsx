import type { Event } from "../data/events";
import styles from "./page.module.css";

type EventCardProps = {
  event: Event;
};

export function EventCard({ event }: EventCardProps) {
  return (
    <article className={styles.eventCard}>
      <div>
        <p className={styles.artist}>{event.artist}</p>
        <p className={styles.tourName}>{event.tourName}</p>
      </div>

      <dl className={styles.eventMeta}>
        <div>
          <dt>Venue</dt>
          <dd>
            {event.prefecture} / {event.venue}
          </dd>
        </div>
        <div>
          <dt>Genre</dt>
          <dd>{event.genres.join(", ")}</dd>
        </div>
      </dl>

      <div className={styles.eventLinks}>
        <a
          className={styles.primaryLink}
          href={event.ticketUrl}
          target="_blank"
          rel="noreferrer"
        >
          Ticket
        </a>
        <a
          className={styles.secondaryLink}
          href={event.officialUrl}
          target="_blank"
          rel="noreferrer"
        >
          Official
        </a>
      </div>
    </article>
  );
}
