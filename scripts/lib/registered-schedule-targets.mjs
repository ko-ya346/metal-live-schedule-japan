import { publishedEvents } from "../../src/data/events.ts";

const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const scheduledEvents = publishedEvents.filter(
  (event) => event.status === "scheduled" && event.date >= today,
);
const uniqueNames = (values) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

export const scheduledArtistNames = uniqueNames(scheduledEvents.flatMap((event) => event.artists));
export const scheduledVenueNames = uniqueNames(scheduledEvents.map((event) => event.venue));
export const scheduledTicketDomains = uniqueNames(
  scheduledEvents.flatMap((event) => [
    ...(event.ticketLinks ?? []).map((ticket) => ticket.url),
    event.ticketUrl ?? "",
  ]).flatMap((value) => {
    try {
      return [new URL(value).hostname.replace(/^www\./i, "").toLowerCase()];
    } catch {
      return [];
    }
  }),
);
export const scheduledEntityKeywords = uniqueNames([
  ...scheduledArtistNames,
  ...scheduledVenueNames,
  ...scheduledTicketDomains,
]);
