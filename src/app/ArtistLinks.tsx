import Link from "next/link";
import type { Event } from "../data/events";
import { getArtistSlug } from "../utils/artists";

type ArtistLinksProps = {
  artists: Event["artists"];
  className?: string;
};

export function ArtistLinks({ artists, className }: ArtistLinksProps) {
  return artists.map((artist, index) => (
    <span key={`${artist}-${index}`}>
      {index > 0 ? " / " : ""}
      <Link
        className={className}
        href={`/artists/${encodeURIComponent(getArtistSlug(artist))}`}
      >
        {artist}
      </Link>
    </span>
  ));
}
