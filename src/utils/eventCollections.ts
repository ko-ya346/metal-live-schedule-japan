import type { Event } from "../data/events";

const INTERNATIONAL_ARTISTS = new Set(
  [
    "A Perfect Circle",
    "AMORPHIS",
    "AVENGED SEVENFOLD",
    "Bloodbound",
    "Brujeria",
    "CARCASS",
    "CURRENTS",
    "DEFTONES",
    "Draconian",
    "ELECTRIC CALLBOY",
    "Elvenking",
    "Enterprise Earth",
    "ERIK GRÖNWALL",
    "EVANESCENCE",
    "Fabio Lione's Dawn of Victory",
    "FOREIGN HANDS",
    "GAEREA",
    "HELLOWEEN",
    "HYENA",
    "I AM MORBID",
    "Incantation",
    "IRON MAIDEN",
    "KATATONIA",
    "LORNA SHORE",
    "Mayhem",
    "METAL CHURCH",
    "Mörk Gryning",
    "Paradise Lost",
    "PIG",
    "POISON THE WELL",
    "POWERWOLF",
    "PUSCIFER",
    "Rivers Of Nihil",
    "Sarcófago",
    "Satanic Warmaster",
    "SLAPSHOT",
    "SMASH INTO PIECES",
    "SPEED",
    "STRATOVARIUS",
    "Terrorizer",
    "THE CROWN",
    "THE HAUNTED",
    "The Kovenant",
    "UADA",
    "VINDICTA",
    "Within Destruction",
  ].map((artist) => artist.toLocaleLowerCase()),
);

const INTERNATIONAL_TITLE_KEYWORDS = [
  "japan tour",
  "live in japan",
  "live in tokyo",
  "world tour japan",
  "death over japan",
  "decay over japan",
  "asia tour",
];

export function isInternationalEvent(event: Event) {
  const hasInternationalArtist = event.artists.some((artist) =>
    INTERNATIONAL_ARTISTS.has(artist.toLocaleLowerCase()),
  );
  const searchableTitle = `${event.tourName} ${event.id}`.toLocaleLowerCase();
  const hasInternationalTitle = INTERNATIONAL_TITLE_KEYWORDS.some((keyword) =>
    searchableTitle.includes(keyword),
  );

  return hasInternationalArtist || hasInternationalTitle;
}
