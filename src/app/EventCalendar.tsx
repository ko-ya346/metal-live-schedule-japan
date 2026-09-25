import { useState, type CSSProperties } from "react";
import Link from "next/link";
import type { Event } from "../data/events";
import {
  formatCalendarMonth,
  formatDateKey,
  getCalendarDates,
  getNextMonthKey,
  getPreviousMonthKey,
  getCurrentMonthKey,
} from "../utils/date";
import styles from "./EventCalendar.module.css";

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
  const [previewDate, setPreviewDate] = useState<Event["date"] | null>(null);
  const calendarDates = getCalendarDates(monthKey);
  const eventsByDate = groupEventsByDate(events);
  const monthlyEvents = events.filter((event) => event.date.startsWith(monthKey));
  const monthlyLiveDateCount = new Set(monthlyEvents.map((event) => event.date))
    .size;
  const monthlyInternationalCount = monthlyEvents.filter(
    (event) => event.isInternational,
  ).length;
  const todayKey = formatDateKey(new Date());
  const currentMonthKey = getCurrentMonthKey();
  const isCurrentMonth = monthKey === currentMonthKey;

  return (
    <section className={styles.calendar} aria-label="月間カレンダー">
      <div className={styles.calendarHeader}>
        <h2 className={styles.calendarTitle}>{formatCalendarMonth(monthKey)}</h2>

        <button
          className={styles.monthButton}
          type="button"
          onClick={() => {
            setPreviewDate(null);
            onMonthChange(getPreviousMonthKey(monthKey));
          }}
        >
          前の月
        </button>

        <button
          className={styles.monthButton}
          type="button"
          onClick={() => {
            setPreviewDate(null);
            onMonthChange(currentMonthKey);
          }}
          disabled={isCurrentMonth}
        >
          今月
        </button>

        <button
          className={styles.monthButton}
          type="button"
          onClick={() => {
            setPreviewDate(null);
            onMonthChange(getNextMonthKey(monthKey));
          }}
        >
          次の月
        </button>
      </div>

      <dl
        className={styles.calendarSummary}
        aria-label={`${formatCalendarMonth(monthKey)}の掲載状況`}
      >
        <div>
          <dt>掲載ライブ</dt>
          <dd>{monthlyEvents.length}件</dd>
        </div>
        <div>
          <dt>来日公演</dt>
          <dd>{monthlyInternationalCount}件</dd>
        </div>
        <div>
          <dt>開催日</dt>
          <dd>{monthlyLiveDateCount}日</dd>
        </div>
      </dl>

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
          const isPreviewed = previewDate === dateKey;
          const isToday = dateKey === todayKey;
          const isPastDate = dateKey < todayKey;

          return (
            <div
              className={`${styles.calendarCell} ${
                isCurrentMonth ? "" : styles.outsideMonth
              } ${isPastDate ? styles.pastDate : ""} ${
                isToday ? styles.todayDate : ""
              } ${isSelected ? styles.selectedDate : ""} ${
                isPreviewed ? styles.mobilePreviewDate : ""
              }`}
              key={dateKey}
            >
              <button
                className={styles.calendarDateButton}
                type="button"
                onClick={() => {
                  onDateSelect(dateKey);
                  setPreviewDate(dateEvents.length > 0 ? dateKey : null);
                }}
              >
                <span>{date.getDate()}</span>
                {dateEvents.length > 0 && (
                  <span className={styles.calendarDateCount}>
                    {dateEvents.length}件
                  </span>
                )}
              </button>
              {dateEvents.length > 0 && (
                <div className={styles.calendarMobilePreview}>
                  <button
                    className={styles.calendarMobileSummaryButton}
                    type="button"
                    onClick={() => {
                      onDateSelect(dateKey);
                      setPreviewDate(dateKey);
                    }}
                  >
                    {dateEvents.length}件
                  </button>
                  <Link
                    className={styles.calendarMobileTooltip}
                    href={`/dates/${dateKey}`}
                    prefetch={false}
                    role="tooltip"
                  >
                    {dateEvents.slice(0, 3).map((event) => (
                      <span key={event.id}>
                        {formatCalendarEventArtists(event.artists)}
                      </span>
                    ))}
                    {dateEvents.length > 3 && (
                      <span>ほか{dateEvents.length - 3}件</span>
                    )}
                    <strong>この日のライブを見る</strong>
                  </Link>
                </div>
              )}
              <div className={styles.calendarEvents}>
                {visibleDateEvents.map((event) => (
                  <Link
                    className={styles.calendarEvent}
                    href={`/events/${event.id}`}
                    key={event.id}
                    prefetch={false}
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
