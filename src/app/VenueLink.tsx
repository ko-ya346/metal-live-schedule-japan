import Link from "next/link";
import { getVenueSlug } from "../utils/venues";

type VenueLinkProps = {
  className?: string;
  prefecture: string;
  venue: string;
};

export function VenueLink({ className, prefecture, venue }: VenueLinkProps) {
  const slug = getVenueSlug(prefecture, venue);

  return (
    <Link className={className} href={`/venues/${encodeURIComponent(slug)}`}>
      {venue}
    </Link>
  );
}
