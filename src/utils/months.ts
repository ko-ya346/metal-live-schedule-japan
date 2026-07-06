import type { Event } from "../data/events";
import { formatCalendarMonth, getEventMonthKey } from "./date";

export type EventMonth = {
  key: string;
  label: string;
};

export function getEventMonths(eventList: Event[]) {
  return Array.from(
    new Set(eventList.map((event) => getEventMonthKey(event.date))),
  )
    .sort()
    .map((key) => ({
      key,
      label: formatCalendarMonth(key),
    }));
}

export function getEventMonthByKey(eventList: Event[], key: string) {
  return getEventMonths(eventList).find((month) => month.key === key);
}

export function getEventsByMonthKey(eventList: Event[], key: string) {
  return eventList.filter((event) => getEventMonthKey(event.date) === key);
}
