# 06. Persistence, Fallbacks, and Error Handling

Back to [index](../rebuild.md).

## 1. Persistence Layers

- Primary: API + PostgreSQL via Prisma.
- Secondary fallback: localStorage (client-side).
- School dataset fallback: sample JSON when DB read is unavailable.

## 2. localStorage Keys

- profile ID:
  - `schoolkeuze:profile:id:v1`
- favorites:
  - `schoolkeuze:favorites:v1:{profileId}`
- notes:
  - `schoolkeuze:notes:v1:{profileId}`
- profile settings:
  - `schoolkeuze:settings:v1:{profileId}`
- impressions:
  - `schoolkeuze:impression:v1:{profileId}:{schoolId}`

## 3. Hook Behavior

## `useProfileId`

- resolves from query -> storage -> generated UUID.
- stores normalized profile ID.

## `useFavorites`

- fetches from API first,
- local fallback if request fails,
- updates localStorage immediately on changes,
- pushes best-effort `PUT` sync to API.

## `useNotes`

- fetches from API first,
- local fallback if request fails,
- updates localStorage immediately,
- best-effort `PUT` sync per note change.

## `useProfileSettings`

- API-first load + local fallback.
- updates local and then best-effort `PUT`.

## Impression clients

- API-first load + local fallback.
- writes local and API on update (best-effort API).

## 4. Debounce Timings

- ZIP lookup request debounce: ~350ms.
- Impression save debounce: ~350ms.
- Notes save debounce: ~500ms.

These values should be preserved for UX parity.

## 5. School Read Fallback and Caching

In school store:
- uses DB when possible.
- falls back to sample data when:
  - no `DATABASE_URL`,
  - pool timeout errors for read operations.

Sample caching:
- cached outside development,
- uncached in development to reflect file edits quickly.

## 6. Input Validation and Sanitization

## Profile ID

- trimmed string,
- non-empty,
- max length 128.

## Notes

- strict plain text sanitization:
  - normalize newlines,
  - remove control chars,
  - strip HTML tags.
- max length 3000.

## Feedback

- same strict sanitization model.
- max length 4000.

## ZIP

- Dutch format regex: `^\d{4}\s?[A-Za-z]{2}$`.

## 7. Graceful Degradation Expectations

- If DB unavailable:
  - school browsing should still work from sample data,
  - profile data should continue locally.
- If profile APIs fail:
  - favorites/notes/settings/impressions still work for current browser profile using localStorage.
- If geocoding fails:
  - show inline zip error text,
  - keep search functional without distance filtering.

