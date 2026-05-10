import type { Event } from "../data/events";
import {
  formatCalendarMonth,
  formatDateKey,
  getCalendarDates,
  getNextMonthKey,
  getPreviousMonthKey,
} from "../utils/date";
import styles from "./page.module.css";

type EventCalendarProps = {
  events: Event[];
  monthKey: string;
  selectedDate: Event["date"] | null;
  onMonthChange: (monthKey: string) => void;
  onDateSelect: (date: Event["date"]) => void;
};

const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

function groupEventsByDate(events: Event[]) {
  return events.reduce<Record<string, Event[]>>((groups, event) => {
    if (!groups[event.date]) {
      groups[event.date] = [];
    }

    groups[event.date].push(event);
    return groups;
  }, {});
}

function formatCalendarEventArtists(artists: Event["artists"]) {
  const [headliner, ...otherArtists] = artists;

  if (otherArtists.length === 0) {
    return headliner;
  }

  return `${headliner} +${otherArtists.length}`;
}

export function EventCalendar({
  events,
  monthKey,
  selectedDate,
  onMonthChange,
  onDateSelect,
}: EventCalendarProps) {
  const calendarDates = getCalendarDates(monthKey);
  const eventsByDate = groupEventsByDate(events);

  return (
    <section className={styles.calendar} aria-label="月間カレンダー">
      <div className={styles.calendarHeader}>
        <button
          className={styles.monthButton}
          type="button"
          onClick={() => onMonthChange(getPreviousMonthKey(monthKey))}
        >
          前の月
        </button>
        <h2 className={styles.calendarTitle}>{formatCalendarMonth(monthKey)}</h2>
        <button
          className={styles.monthButton}
          type="button"
          onClick={() => onMonthChange(getNextMonthKey(monthKey))}
        >
          次の月
        </button>
      </div>

      <div className={styles.calendarGrid}>
        {weekDays.map((day) => (
          <div className={styles.weekDay} key={day}>
            {day}
          </div>
        ))}

        {calendarDates.map((date) => {
          const dateKey = formatDateKey(date);
          const dateEvents = eventsByDate[dateKey] ?? [];
          const isCurrentMonth = dateKey.startsWith(monthKey);
          const isSelected = selectedDate === dateKey;

          return (
            <button
              className={`${styles.calendarCell} ${
                isCurrentMonth ? "" : styles.outsideMonth
              } ${isSelected ? styles.selectedDate : ""}`}
              key={dateKey}
              type="button"
              onClick={() => onDateSelect(dateKey)}
            >
              <span className={styles.calendarDate}>{date.getDate()}</span>
              <div className={styles.calendarEvents}>
                {dateEvents.map((event) => (
                  <p className={styles.calendarEvent} key={event.id}>
                    {formatCalendarEventArtists(event.artists)}
                  </p>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
