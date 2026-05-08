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

export function formatEventDate(date: EventDate) {
  return eventDateFormatter.format(parseEventDate(date));
}
