import type { MetadataRoute } from "next";
import { publishedEvents, type Event } from "../data/events";
import {
  getArtists,
  getEventsByArtistSlug,
} from "../utils/artists";
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

  const artistPages: MetadataRoute.Sitemap = getArtists(publishedEvents).map(
    (artist) => {
      const artistEvents = getEventsByArtistSlug(publishedEvents, artist.slug);
      const lastModified = getLatestEventModifiedDate(artistEvents);

      return {
        url: `${siteUrl}/artists/${encodeURIComponent(artist.slug)}`,
        ...(lastModified ? { lastModified } : {}),
      };
    },
  );

  return [...staticPages, ...eventPages, ...artistPages];
}
