import type { Event } from "../data/events";
import { EventCard } from "./EventCard";
import styles from "./page.module.css";

type EventDateGroupProps = {
  date: string;
  events: Event[];
};

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "full",
});

function formatEventDate(date: string) {
  return dateFormatter.format(new Date(date));
}

export function EventDateGroup({ date, events }: EventDateGroupProps) {
  return (
    <section className={styles.dateGroup}>
      <h2 className={styles.dateHeading}>{formatEventDate(date)}</h2>

      <div className={styles.eventList}>
        {events.map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </div>
    </section>
  );
}
