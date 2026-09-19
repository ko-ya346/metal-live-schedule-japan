# Metals Calendar Roadmap

## Vision

Metals Calendar is an event search and discovery service for metal, loud rock,
metalcore, hardcore, and related heavy music live events in Japan.

The product should help people move through the full live discovery flow:

1. Find a live event.
2. Become interested in the artist or event.
3. Check event details and official information.
4. Move to a ticket site.
5. Actually go to the show.

The long-term goal is to become useful not only for listeners, but also for
artists, promoters, labels, venues, festivals, and ticket sellers by providing
measurable discovery and referral value.

Metals Calendar should first become a naturally useful place to search for
Japanese metal and loud music live events. Expansion to other music genres or
event categories is a possible future direction, but it is not the current
priority.

## Current Stage

Metals Calendar is currently in **Phase 1: Audience / Measurement**.

The current product already supports:

- Published event listings.
- Monthly calendar view.
- Filtering by date range, prefecture, genre, keyword, and international shows.
- Event detail pages.
- Artist, month, prefecture, genre, venue, and international-show pages.
- Ticket and official source links.
- YouTube discovery links for artists.
- Related-event navigation from event pages.
- Candidate event review in `/admin/candidates`.
- Published event management in `/admin/events`.
- Basic authentication for admin pages and admin APIs in production.
- Semi-automated candidate collection through GitHub Actions.
- GA4 page view tracking.
- Ticket and official outbound-link tracking.
- Provider-aware ticket link data model through `ticketLinks`.
- Search Console reporting workflow.

Current priorities:

- Increase useful search traffic.
- Improve event coverage and freshness.
- Keep mobile and calendar browsing easy to use.
- Measure whether users move from event pages to ticket and official sources.
- Avoid heavy monetization until audience and referral value are clearer.

## Milestone Gates

The roadmap should be unlocked by user behavior, not by dates.

The most important commercial-readiness metric is:

**Monthly Ticket Outbound**: monthly clicks from Metals Calendar to ticket
seller pages.

This is more useful than page views alone because it shows whether Metals
Calendar sends live-interested users toward ticket purchase behavior.

The numbers below are working thresholds, not strict business forecasts. They
exist to make product decisions easier and more fun to evaluate.

| Stage | MAU Guide | Monthly Ticket Outbound | What To Do |
| --- | ---: | ---: | --- |
| Current | up to 3,000 | up to 300 | Improve GA4 tracking, SEO, event coverage, and UX. |
| First Monetization | 3,000-5,000 | 300-500 | Start ticket affiliate experiments where available. |
| Industry Contact | 5,000-10,000 | 500-1,000 | Contact initial artists, agencies, promoters, or labels about approved images and materials. |
| Ad Experiment | 10,000-20,000 | 1,000-2,000 | Test a clearly labeled Featured Live or sponsored placement. |
| Travel Monetization | 10,000-30,000 | 2,000+ | Consider hotel or travel affiliate links for natural travel-intent pages. |
| Active Sales | 30,000+ | 3,000-5,000+ | Approach promoters, labels, venues, and festivals with referral data. |

Ticket outbound milestones:

- 100/month: the site is starting to be used for live discovery.
- 500/month: ticket affiliate experiments are worth trying.
- 1,000/month: the site has referral value that can be shown to the industry.
- 2,000/month: sponsored placement experiments become realistic.
- 5,000/month: sponsor and promoter outreach becomes worth treating seriously.
- 10,000/month: Metals Calendar becomes meaningfully interesting as a ticket
  referral media property.

These gates do not mean every monetization idea should start immediately when a
number is reached. They mean the site has enough signal to run a small,
measurable experiment.

## Roadmap

### Phase 1: Audience / Measurement

#### Purpose

Grow the useful audience and make it measurable whether Metals Calendar helps
people discover shows and move toward official or ticket sources.

This phase matters because monetization or partnerships are weak without proof
that the site can attract relevant users and send them to event sources.

#### Current Status

In progress.

Already implemented:

- Searchable event listings and monthly calendar.
- Individual event pages and related discovery links.
- SEO pages for artists, months, prefectures, genres, venues, and international shows.
- GA4 page view tracking.
- Outbound click tracking for ticket and official links.
- Search Console reporting workflow.
- Candidate review workflow for adding events without auto-publishing.
- Admin route protection for candidate and event management.

#### Next Work

- Improve search landing pages based on Search Console queries and impressions.
- Continue improving mobile event discovery, especially calendar and list density.
- Improve the freshness and coverage of event data, especially the next three months.
- Keep collecting ticket and official outbound-click data.
- Make `ticketLinks` adoption gradual for events where multiple sellers exist.
- Review page speed and Core Web Vitals when real usage data is available.
- Keep admin and candidate workflows simple enough for one-person operation.

#### Metrics

- DAU / MAU.
- Organic Search impressions and clicks.
- Event detail page views.
- Ticket outbound clicks.
- Ticket CTR from event pages and lists.
- Official-source outbound clicks.
- Returning users.

Primary measurement sources:

- Google Search Console.
- GA4.
- Vercel Analytics as a lightweight traffic reference.

#### Move To Next Phase When

- Ticket outbound clicks are consistently measurable.
- Monthly Ticket Outbound is approaching or exceeding the 300-500 range.
- The site has enough search and repeat usage to identify which events,
  artists, pages, and ticket providers drive user actions.
- The ticket link model is ready to support multiple providers without making
  event cards noisy.

### Phase 2: Ticket Monetization

#### Purpose

Introduce ticket affiliate links only after Metals Calendar can show meaningful
ticket referral value.

The goal is not just immediate revenue. The goal is to understand which events,
artists, regions, and ticket providers receive traffic from Metals Calendar.

#### Future Work

- Identify ticket providers that support affiliate or partner programs.
- Keep normal ticket URLs and affiliate URLs separate in data.
- Add affiliate links only where they do not reduce trust or usability.
- Clearly disclose affiliate links when needed.
- Track ticket clicks by provider through GA4.
- Support multiple ticket sellers per event without crowding event cards.
- Prefer source quality and user usefulness over affiliate payout order.

Relevant data model direction:

- `ticketLinks[].provider`
- `ticketLinks[].url`
- `ticketLinks[].affiliateUrl`
- `ticketLinks[].saleStatus`
- `ticketLinks[].saleEndsAt`
- `ticketLinks[].priority`

#### Metrics

- Ticket outbound clicks by provider.
- Ticket CTR by event page.
- Ticket CTR from event cards.
- Events and artists that drive ticket traffic.
- Affiliate-link click share versus non-affiliate ticket click share.

#### Move To Next Phase When

- Ticket referral data is stable enough to explain Metals Calendar's sending
  value to artists, promoters, labels, venues, or ticket sellers.
- Monthly Ticket Outbound is approaching or exceeding the 1,000-2,000 range.
- Affiliate behavior can be introduced without changing the core user
  experience into an ad-heavy site.

### Phase 3: Advertising / Promotion

#### Purpose

Offer promotion options only when there is enough audience and referral value to
make those placements useful and credible.

Advertising must not make the site less useful as a live search and discovery
service.

#### Future Work

- Design small, clearly labeled promotion slots.
- Consider formats such as:
  - Featured Live.
  - Featured Artist.
  - Homepage placement.
  - Time-limited event promotion.
  - Sponsored editorial or guide content.
- Keep sponsored content clearly marked.
- Avoid hiding organic events behind paid placement.
- Measure clicks and downstream engagement separately for sponsored placements.

Potential customers:

- Artists.
- Promoters.
- Labels.
- Venues.
- Festivals and event organizers.

#### Metrics

- Sponsored placement impressions.
- Sponsored placement clicks.
- Sponsored event detail views.
- Ticket and official clicks from sponsored placements.
- User engagement with non-sponsored content after viewing sponsored content.

#### Move To Next Phase When

- Promotion slots can be added without harming trust, search usability, or event
  browsing.
- There is enough audience data to explain what a sponsor receives.
- A small test placement can report a chain such as sponsored impressions,
  event detail views, sponsored clicks, and ticket outbound clicks.

### Phase 4: Affiliate Expansion

#### Purpose

Explore travel-related affiliate opportunities only where they naturally support
live attendance.

This phase should help users answer: "What do I need to go to this live event?"
It should not simply add generic ads.

#### Future Work

- Consider hotel or travel links for festivals, regional shows, and major tours.
- Prioritize pages where travel intent is plausible, such as city, venue,
  festival, and multi-day event pages.
- Avoid adding travel links to every event by default.
- Keep travel suggestions separate from official event information.
- Track clicks separately from ticket clicks.

#### Metrics

- Travel-link impressions and clicks.
- Clicks from regional, festival, and venue pages.
- Impact on ticket CTR and event detail engagement.

#### Move To Next Phase When

- Travel links are useful for real user journeys and do not distract from event
  discovery or ticket checking.
- Monthly Ticket Outbound is high enough to identify pages where travel intent
  is natural, especially regional shows, festivals, and multi-day events.

### Phase 5: Artist / Industry Partnerships

#### Purpose

Build relationships with artists, labels, promoters, venues, and event
organizers so Metals Calendar can publish better event data and approved visual
materials.

This phase is important because official materials can make the site more useful
and visually stronger without relying on unlicensed images.

#### Future Work

- Define a lightweight process for receiving event submissions.
- Clarify what information is needed from organizers.
- Explore permissioned use of:
  - Official artist photos.
  - Event flyers.
  - Press materials.
  - Artist profiles.
  - Promoter-provided event updates.
- Keep human review before publishing.
- Avoid storing or using images without appropriate permission.

#### Metrics

- Events submitted by rights holders or organizers.
- Approved visual assets received.
- Update speed for partner-provided event changes.
- Referral traffic sent back to partner sites.

#### Move To Next Phase When

- Partner-supplied event data or assets become a practical source of site value.
- The review workflow can handle submissions without increasing operational
  burden too much.

### Phase 6: Event Discovery

#### Purpose

Evolve Metals Calendar from a site people search into a service that helps them
discover shows they did not already know about.

The target experience is: "I found a live event I did not know about, and now I
want to go."

#### Future Work

- Favorite artists.
- Favorite genres.
- Favorite regions.
- "This weekend" and "near me" discovery.
- Related artists and co-performing artist discovery.
- Recommended shows.
- Notifications or feeds.
- Ranking pages based on real engagement.
- Personalization after there is enough data and a clear privacy model.

#### Metrics

- Discovery-module clicks.
- Event detail views from related/recommended links.
- Returning users.
- Ticket and official clicks after discovery interactions.
- Repeat visits to artist, genre, region, and venue pages.

#### Long-Term Completion Signal

Users return to Metals Calendar not only when they search for a known artist,
but also when they want to find something to attend.

## Metrics

Metals Calendar should avoid judging progress by page views alone.

Core metrics:

- DAU / MAU.
- Organic Search impressions.
- Organic Search clicks.
- Indexed page coverage.
- Event detail page views.
- Ticket outbound clicks.
- Ticket CTR.
- Official outbound clicks.
- Returning users.

Operational metrics:

- Candidate events awaiting review.
- Event freshness.
- Coverage for the next three months.
- Time from official announcement to candidate creation.
- Time from candidate creation to publication.

Commercial-readiness metrics:

- Ticket clicks by provider.
- Ticket clicks by event.
- Ticket clicks by artist.
- Ticket clicks by region or venue.
- Affiliate versus non-affiliate click behavior, when affiliate links exist.

## Long-Term Direction

The long-term system should structure and connect:

- Event data collection.
- Artist, event, venue, and ticket data.
- Search.
- Discovery.
- Recommendation.
- Analytics.
- Ticket conversion.
- Monetization.

The immediate focus remains narrow: make Metals Calendar the useful place to
find metal and loud music live events in Japan.

Future expansion to other genres or event areas is possible only after the
Metals Calendar model proves useful, maintainable, and measurable.

## Product Principles

- Human review remains the final step before publishing.
- Coverage and freshness matter, but not at the cost of obvious misinformation.
- Official and reliable sources are preferred.
- User trust is more important than short-term monetization.
- Sponsored or affiliate content must be clearly understandable.
- The product should remain maintainable by one operator.
- Add systems only when they reduce work or create clear user value.
