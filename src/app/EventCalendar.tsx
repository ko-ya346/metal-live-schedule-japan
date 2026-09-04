import type { CSSProperties } from "react";
import Link from "next/link";
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
const genreColorRules = [
  { keywords: ["Black", "Death", "Doom", "Grind", "Extreme"], color: "#c84bff" },
  { keywords: ["Core", "Hardcore", "Loud"], color: "#ff6b6b" },
  { keywords: ["Power", "Melodic", "Symphonic"], color: "#f4b84a" },
  { keywords: ["Hard Rock", "Heavy Rock", "Rock"], color: "#4fb3ff" },
  { keywords: ["Punk"], color: "#67d78f" },
  { keywords: ["Metal"], color: "#d7d7d2" },
];
const fallbackGenreColor = "#9a9a94";
const maxVisibleEventsPerDate = 4;

function sortCalendarEvents(events: Event[]) {
  return [...events].sort((a, b) => {
    if (a.isInternational !== b.isInternational) {
      return a.isInternational ? -1 : 1;
    }

    return a.artists[0].localeCompare(b.artists[0], "ja");
  });
}

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

function getGenreColor(genre: string) {
  const matchedRule = genreColorRules.find((rule) =>
    rule.keywords.some((keyword) =>
      genre.toLowerCase().includes(keyword.toLowerCase()),
    ),
  );

  return matchedRule?.color ?? fallbackGenreColor;
}

function getCalendarEventStyle(genres: Event["genres"]) {
  return {
    "--genre-color": getGenreColor(genres[0] ?? "") ?? fallbackGenreColor,
  } as CSSProperties;
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
  const todayKey = formatDateKey(new Date());

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
          const dateEvents = sortCalendarEvents(eventsByDate[dateKey] ?? []);
          const visibleDateEvents = dateEvents.slice(0, maxVisibleEventsPerDate);
          const hiddenEventCount = dateEvents.length - visibleDateEvents.length;
          const isCurrentMonth = dateKey.startsWith(monthKey);
          const isSelected = selectedDate === dateKey;
          const isToday = dateKey === todayKey;
          const isPastDate = dateKey < todayKey;

          return (
            <div
              className={`${styles.calendarCell} ${
                isCurrentMonth ? "" : styles.outsideMonth
              } ${isPastDate ? styles.pastDate : ""} ${
                isToday ? styles.todayDate : ""
              } ${isSelected ? styles.selectedDate : ""}`}
              key={dateKey}
            >
              <button
                className={styles.calendarDateButton}
                type="button"
                onClick={() => onDateSelect(dateKey)}
              >
                <span>{date.getDate()}</span>
                {dateEvents.length > 0 && (
                  <span className={styles.calendarDateCount}>
                    {dateEvents.length}件
                  </span>
                )}
              </button>
              <div className={styles.calendarEvents}>
                {visibleDateEvents.map((event) => (
                  <Link
                    className={styles.calendarEvent}
                    href={`/events/${event.id}`}
                    key={event.id}
                    style={getCalendarEventStyle(event.genres)}
                    title={`${event.artists.join(", ")} / ${event.tourName}`}
                  >
                    <span>{formatCalendarEventArtists(event.artists)}</span>
                    {event.isInternational && (
                      <span className={styles.calendarInternationalBadge}>
                        来日
                      </span>
                    )}
                  </Link>
                ))}
                {hiddenEventCount > 0 && (
                  <button
                    className={styles.calendarMoreButton}
                    type="button"
                    onClick={() => onDateSelect(dateKey)}
                  >
                    +{hiddenEventCount}件
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
