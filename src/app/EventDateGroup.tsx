import type { Event } from "../data/events";
import { formatEventDate } from "../utils/date";
import { EventCard } from "./EventCard";
import styles from "./page.module.css";

type EventDateGroupProps = {
  date: Event["date"];
  events: Event[];
  showEnglishDate?: boolean;
};

export function EventDateGroup({
  date,
  events,
  showEnglishDate = false,
}: EventDateGroupProps) {
  return (
    <section className={styles.dateGroup}>
      <h2 className={styles.dateHeading}>
        {formatEventDate(date)}
        {showEnglishDate ? ` / ${date}` : ""}
      </h2>

      <div className={styles.eventList}>
        {events.map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </div>
    </section>
  );
}
