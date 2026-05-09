# Event data update workflow

This app is manually maintained for now. Update event data in `src/data/events.ts`.

## Search sources

Use official or ticketing sources for final confirmation.

- Artist official sites: live, tour, schedule, news pages
- Promoters: Creativeman, UDO, SMASH, Hayashi International Promotions, Evoken de Valhall Production
- Ticket platforms: eplus, Ticket Pia, Lawson Ticket, Rakuten Ticket
- Venue schedules: Club Citta, Zepp, Club Quattro, Shibuya venues, Osaka venues
- Discovery only: metal news sites, SNS posts, fan calendars

Do not use discovery-only sources as the final source. Confirm with an artist, promoter, venue, or ticket page before adding an event.

## Add an event

1. Open `src/data/events.ts`.
2. Copy an existing event object.
3. Replace every field.
4. Keep `date` as `YYYY-MM-DD`.
5. Put all performers in `artists`.
6. Put the headliner or main calendar label first in `artists`.
7. Use Japanese prefecture names, such as `東京都`, `大阪府`, `神奈川県`.
8. Use `ticketUrl: null` when ticket information is not published yet.
9. Use `officialUrl` for an artist, venue, or organizer page that verifies the event.
10. Use one of these statuses: `scheduled`, `postponed`, `cancelled`.
11. Run the local checks.

```bash
npm run lint
npm run build
```

## Event object template

```ts
{
    id: "artist-2026-prefecture-or-city",
    artists: ["HEADLINER", "SUPPORT ACT"],
    tourName: "TOUR NAME",
    date: "2026-01-01",
    prefecture: "東京都",
    venue: "会場名",
    genres: ["Heavy Metal"],
    ticketUrl: null,
    officialUrl: "https://example.com/event",
    status: "scheduled",
},
```

## ID naming

Use stable lowercase IDs. Include artist, year, and place or sequence.

- `iron-maiden-2026-kanagawa-1`
- `iron-maiden-2026-kanagawa-2`
- `amorphis-2026-tokyo-1`

## After editing

Check the page manually:

- Events are sorted by date.
- Prefecture filter includes the new prefecture.
- Genre filter includes the new genres.
- Ticket and official links open correct pages.
- Missing links show `リンク未定`.
- Mobile width does not cause text overlap.
