# GA4 tracking

GA4 can track page views and outbound clicks from Metals Calendar.

## Environment variable

Set this in Vercel project settings:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

If the environment variable is missing, GA4 is not loaded.

## Page views

All page views are sent explicitly as GA4 `page_view` events.

This is intentional because the site uses Next.js client-side navigation. The
GA4 default page view is disabled with `send_page_view: false`, then the app
sends `page_view` whenever the route changes.

## Custom outbound click event

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
3. Open the home page and confirm `page_view` appears.
4. Move to an event page and confirm another `page_view` appears.
5. Click a ticket or official link.
6. Confirm `outbound_event_link_click` appears.
7. Check `link_type` and `source_surface`.

Use this custom event as the main metric for ticket/official outbound clicks.
GA4 enhanced measurement may also record generic outbound clicks, so avoid mixing
the two metrics when reviewing results.
