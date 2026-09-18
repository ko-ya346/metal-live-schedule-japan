# GA4 click tracking

GA4 can track outbound clicks from Metals Calendar.

## Environment variable

Set this in Vercel project settings:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

If the environment variable is missing, GA4 is not loaded.

## Custom event

Ticket and official links send this event:

```text
outbound_event_link_click
```

Parameters:

- `link_type`: `ticket`, `official`, or `combined`
- `source_surface`: `event_card` or `event_detail`
- `event_id`
- `event_name`
- `event_date`
- `primary_artist`
- `artist_count`
- `prefecture`
- `venue`
- `is_international`
- `destination_domain`
- `destination_url`

## Verification

1. Deploy with `NEXT_PUBLIC_GA_MEASUREMENT_ID` set.
2. Open GA4 Realtime or DebugView.
3. Open a public event page.
4. Click a ticket or official link.
5. Confirm `outbound_event_link_click` appears.
6. Check `link_type` and `source_surface`.

Use this custom event as the main metric for ticket/official outbound clicks.
GA4 enhanced measurement may also record generic outbound clicks, so avoid mixing
the two metrics when reviewing results.

