import type { Event } from "../data/events";

export function isInternationalEvent(event: Event) {
  return event.isInternational;
}
