"use client";

import type { MouseEvent, ReactNode } from "react";
import type { Event } from "../data/events";

type TrackedExternalLinkProps = {
  children: ReactNode;
  className?: string;
  event: Event;
  href: string;
  linkType: "ticket" | "official" | "combined";
  sourceSurface: "event_card" | "event_detail";
  ticketProvider?: string;
  isAffiliate?: boolean;
};

function getDestinationDomain(href: string) {
  try {
    return new URL(href).hostname;
  } catch {
    return "";
  }
}

function trackEventLinkClick({
  event,
  href,
  isAffiliate,
  linkType,
  sourceSurface,
  ticketProvider,
}: Omit<TrackedExternalLinkProps, "children" | "className">) {
  if (typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("event", "outbound_event_link_click", {
    artist_count: event.artists.length,
    destination_domain: getDestinationDomain(href),
    destination_url: href,
    event_date: event.date,
    event_id: event.id,
    event_name: event.tourName,
    is_international: event.isInternational,
    link_type: linkType,
    prefecture: event.prefecture,
    primary_artist: event.artists[0],
    is_affiliate: isAffiliate ?? false,
    source_surface: sourceSurface,
    ticket_provider: ticketProvider ?? null,
    venue: event.venue,
  });
}

export function TrackedExternalLink({
  children,
  className,
  event,
  href,
  isAffiliate,
  linkType,
  sourceSurface,
  ticketProvider,
}: TrackedExternalLinkProps) {
  function handleClick(clickEvent: MouseEvent<HTMLAnchorElement>) {
    trackEventLinkClick({
      event,
      href,
      isAffiliate,
      linkType,
      sourceSurface,
      ticketProvider,
    });
  }

  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
