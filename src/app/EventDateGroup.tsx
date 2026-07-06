import type { Event } from "../data/events";
import Link from "next/link";
import { formatEventDate, getEventMonthKey } from "../utils/date";
import { EventCard } from "./EventCard";
import styles from "./page.module.css";

type EventDateGroupProps = {
  date: Event["date"];
  events: Event[];
  linkToMonth?: boolean;
  showEnglishDate?: boolean;
};

export function EventDateGroup({
  date,
  events,
  linkToMonth = true,
  showEnglishDate = false,
}: EventDateGroupProps) {
  const dateLabel = (
    <>
      {formatEventDate(date)}
      {showEnglishDate ? ` / ${date}` : ""}
    </>
  );

  return (
    <section className={styles.dateGroup}>
      <h2 className={styles.dateHeading}>
        {linkToMonth ? (
          <Link
            className={styles.dateHeadingLink}
            href={`/months/${getEventMonthKey(date)}`}
          >
            {dateLabel}
          </Link>
        ) : (
          dateLabel
        )}
      </h2>

      <div className={styles.eventList}>
        {events.map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </div>
    </section>
  );
}
