"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Event, EventDate } from "../../../data/events";
import {
  formatDateKey,
  formatEventDate,
  getEventDateTime,
} from "../../../utils/date";
import { formatArtists } from "../../../utils/eventLinks";
import type { RelatedEvents } from "../../../utils/events";
import styles from "../../page.module.css";

type RelatedEventsProps = {
  currentEvent: Event;
  relatedEventCandidates: RelatedEvents;
};

function isPastEventDateAt(date: EventDate, todayDate: EventDate) {
  return getEventDateTime(date) < getEventDateTime(todayDate);
}

function sortRelatedEventsAt(
  eventList: Event[],
  currentEvent: Event,
  todayDate: EventDate,
) {
  const upcomingEvents = eventList.filter(
    (event) => !isPastEventDateAt(event.date, todayDate),
  );
  const pastEvents = eventList
    .filter((event) => isPastEventDateAt(event.date, todayDate))
    .reverse();

  if (!isPastEventDateAt(currentEvent.date, todayDate)) {
    return upcomingEvents;
  }

  return [...upcomingEvents, ...pastEvents];
}

function uniqueRelatedEvents(
  eventList: Event[],
  usedEventIds: Set<string>,
  limit: number,
) {
  const relatedEvents: Event[] = [];

  for (const event of eventList) {
    if (usedEventIds.has(event.id)) {
      continue;
    }

    relatedEvents.push(event);
    usedEventIds.add(event.id);

    if (relatedEvents.length >= limit) {
      break;
    }
  }

  return relatedEvents;
}

function selectRelatedEventsAt(
  currentEvent: Event,
  relatedEventCandidates: RelatedEvents,
  todayDate: EventDate,
  limitPerGroup = 4,
) {
  const usedEventIds = new Set([currentEvent.id]);

  return {
    sameArtists: uniqueRelatedEvents(
      sortRelatedEventsAt(
        relatedEventCandidates.sameArtists,
        currentEvent,
        todayDate,
      ),
      usedEventIds,
      limitPerGroup,
    ),
    sameVenue: uniqueRelatedEvents(
      sortRelatedEventsAt(
        relatedEventCandidates.sameVenue,
        currentEvent,
        todayDate,
      ),
      usedEventIds,
      limitPerGroup,
    ),
    samePrefecture: uniqueRelatedEvents(
      sortRelatedEventsAt(
        relatedEventCandidates.samePrefecture,
        currentEvent,
        todayDate,
      ),
      usedEventIds,
      limitPerGroup,
    ),
  };
}

function RelatedEventList({
  events,
  title,
}: {
  events: Event[];
  title: string;
}) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className={styles.relatedEventGroup}>
      <h3>{title}</h3>
      <div className={styles.relatedEventList}>
        {events.map((event) => (
          <Link
            className={styles.relatedEventCard}
            href={`/events/${event.id}`}
            key={event.id}
          >
            <span className={styles.relatedEventDate}>
              {formatEventDate(event.date)}
            </span>
            <span className={styles.relatedEventArtists}>
              {formatArtists(event.artists)}
            </span>
            <span className={styles.relatedEventTour}>{event.tourName}</span>
            <span className={styles.relatedEventPlace}>
              {event.prefecture} / {event.venue}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function RelatedEvents({
  currentEvent,
  relatedEventCandidates,
}: RelatedEventsProps) {
  const [todayDate, setTodayDate] = useState<EventDate | null>(null);

  useEffect(() => {
    setTodayDate(formatDateKey(new Date()));
  }, []);

  const relatedEvents = useMemo(() => {
    if (!todayDate) {
      return null;
    }

    return selectRelatedEventsAt(
      currentEvent,
      relatedEventCandidates,
      todayDate,
    );
  }, [currentEvent, relatedEventCandidates, todayDate]);

  if (
    !relatedEvents ||
    (relatedEvents.sameArtists.length === 0 &&
      relatedEvents.sameVenue.length === 0 &&
      relatedEvents.samePrefecture.length === 0)
  ) {
    return null;
  }

  return (
    <section className={styles.relatedEventsSection}>
      <div>
        <p className={styles.kicker}>Related</p>
        <h2 className={styles.sectionTitle}>関連ライブ</h2>
      </div>
      <RelatedEventList
        events={relatedEvents.sameArtists}
        title="同じ出演者のライブ"
      />
      <RelatedEventList
        events={relatedEvents.sameVenue}
        title="同じ会場のライブ"
      />
      <RelatedEventList
        events={relatedEvents.samePrefecture}
        title="同じ地域の近いライブ"
      />
    </section>
  );
}
