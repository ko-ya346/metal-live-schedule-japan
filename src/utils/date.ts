import type { EventDate } from "../data/events";

const eventDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "full",
});

const eventDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseEventDate(date: EventDate) {
  const match = date.match(eventDatePattern);

  if (!match) {
    throw new Error(`Invalid event date: ${date}`);
  }

  const [, year, month, day] = match;

  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function getEventDateTime(date: EventDate) {
  return parseEventDate(date).getTime();
}

export function isPastEventDate(date: EventDate) {
  const today = new Date();
  const todayDateTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();

  return getEventDateTime(date) < todayDateTime;
}

export function formatEventDate(date: EventDate) {
  return eventDateFormatter.format(parseEventDate(date));
}

export function getEventMonthKey(date: EventDate) {
  const parsedDate = parseEventDate(date);
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function getCurrentMonthKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${today.getFullYear()}-${month}`;
}

export function formatCalendarMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return `${year}年${month}月`;
}

export function getNextMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month, 1);
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");

  return `${date.getFullYear()}-${nextMonth}`;
}

export function getPreviousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  const previousMonth = String(date.getMonth() + 1).padStart(2, "0");

  return `${date.getFullYear()}-${previousMonth}`;
}

export function getCalendarDates(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDate = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0);
  const dates: Date[] = [];

  for (let i = 0; i < firstDate.getDay(); i += 1) {
    dates.push(new Date(year, month - 1, i - firstDate.getDay() + 1));
  }

  for (let day = 1; day <= lastDate.getDate(); day += 1) {
    dates.push(new Date(year, month - 1, day));
  }

  while (dates.length % 7 !== 0) {
    const lastCalendarDate = dates[dates.length - 1];
    dates.push(
      new Date(
        lastCalendarDate.getFullYear(),
        lastCalendarDate.getMonth(),
        lastCalendarDate.getDate() + 1,
      ),
    );
  }

  return dates;
}

export function formatDateKey(date: Date): EventDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}` as EventDate;
}
