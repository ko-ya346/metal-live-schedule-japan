# SEO / AI Search Notes

Metals Calendar aims to be readable for people, search engines, and AI answer engines without adding thin keyword pages.

## Current Coverage

- Event detail pages exist at `/events/[id]`.
- Artist pages exist at `/artists/[slug]`.
- Prefecture pages exist at `/prefectures/[slug]`.
- Month pages exist at `/months/[month]`.
- Date pages exist at `/dates/[date]`.
- Venue pages exist at `/venues/[slug]`.
- `sitemap.xml` includes event, artist, prefecture, genre, month, date, venue, and core static pages.
- `robots.txt` allows public pages and blocks `/admin/`.
- Event detail pages generate metadata, canonical URLs, Open Graph, Twitter Card, and JSON-LD.

## Current Gaps

- Event data does not currently include city, open time, start time, or event images.
- These unknown fields should not be guessed for SEO.
- If the source does not include a field, the page should show that the information is not listed and ask users to confirm official sources.

## URL Design Candidates

These pages may help users and AI search if they contain real, data-derived summaries and useful navigation.

### Worth Considering

- `/international`
  - Already exists.
  - Valuable because visiting international artists are a major user intent.
- `/months/[month]`
  - Already exists.
  - Useful for queries such as "2026年10月のメタルライブ".
- `/prefectures/[slug]`
  - Already exists.
  - Useful for queries such as "大阪のメタルライブ".
- `/artists/[slug]`
  - Already exists.
  - Useful for queries such as "Sabaton 来日公演".

### Possible Future Additions

- `/cities/[slug]`
  - Add only after event data has a reliable `city` field.
  - Do not infer city from venue text automatically.
- `/festivals`
  - Add only if event data can identify festivals reliably.
  - A simple keyword-only page would be too thin.
- `/months/[month]/prefectures/[slug]`
  - Useful for queries like "2026年10月 東京 メタルライブ".
  - Add only if the page can show enough events and a useful summary.

## Page Summary Pattern

List pages should use actual event counts:

```text
2026年10月に東京都で開催予定のメタルライブは12件です。
```

Do not create pages only to target keywords. Add pages when they improve event discovery for users.

## Bot Policy

- `Googlebot` should be allowed for public pages.
- `OAI-SearchBot` should be allowed for public pages so AI search products can discover the site.
- Admin pages remain blocked.
- Training crawlers such as `GPTBot` are a separate policy decision from AI search indexing.
