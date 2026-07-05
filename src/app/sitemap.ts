import type { MetadataRoute } from "next";
import { publishedEvents, type Event } from "../data/events";
import { siteUrl } from "./site";

function getEventModifiedDate(event: Event) {
  return event.updatedAt ?? event.publishedAt;
}

function getLatestEventModifiedDate(events: Event[]) {
  return events
    .map(getEventModifiedDate)
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => b.localeCompare(a))[0];
}

export default function sitemap(): MetadataRoute.Sitemap {
  const latestEventModifiedDate = getLatestEventModifiedDate(publishedEvents);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: latestEventModifiedDate,
    },
    {
      url: `${siteUrl}/about`,
    },
    {
      url: `${siteUrl}/international`,
      lastModified: latestEventModifiedDate,
    },
    {
      url: `${siteUrl}/contact`,
    },
  ];

  const eventPages: MetadataRoute.Sitemap = publishedEvents.map((event) => {
    const lastModified = getEventModifiedDate(event);

    return {
      url: `${siteUrl}/events/${event.id}`,
      ...(lastModified ? { lastModified } : {}),
    };
  });

  return [...staticPages, ...eventPages];
}
