# 07. Implementation Plan and Acceptance Tests

Back to [index](../rebuild.md).

## 1. Recommended Build Order

1. Project scaffold:
   - Next.js App Router + TypeScript + Tailwind.
   - next-intl locale routing.
2. Prisma schema + migrations.
3. Seed pipeline from sample JSON.
4. School store abstraction with DB/sample fallback.
5. School APIs (`/api/schools`, `/api/schools/[id]`, `/api/compare`).
6. Profile base model (`useProfileId` + storage + URL handling).
7. Favorites/notes/settings/impression APIs + hooks + local fallback.
8. Schools page with filters, map, favorites toggle, details navigation.
9. School details page with exams, impression, notes, admissions.
10. Profile page with DnD reorder and PDF export.
11. Compare page with student count + My Score.
12. Feedback page + API.
13. SEO/metadata/sitemap/robots polish.
14. Mobile QA and localization QA.

## 2. Functional Acceptance Checklist

## 2.1 Locale and navigation

- `/` redirects to `/nl`.
- Locale switch keeps same route and query.
- Mobile header only shows compass icon text hidden.

## 2.2 Schools page

- default bike slider value is 30.
- max bike slider value is 45.
- no width overflow before any checkbox interaction on mobile.
- filter order is Praktijk, VMBO, HAVO, VWO.
- concept and postcode text filters are not present in current schools UI.
- selecting favorite does not reorder list.
- list order: VWO only, VWO+HAVO, VWO+HAVO+VMBO, HAVO+VMBO, VMBO only.

## 2.3 Level filter logic

- VWO -> all schools with VWO.
- HAVO -> all schools with HAVO.
- VMBO + HAVO -> all schools with VMBO or HAVO.
- Praktijk -> all schools with Praktijk.

## 2.4 Distance behavior

- distance block is collapsible.
- map block is collapsible.
- “Use my location” clears ZIP.
- entering valid ZIP disables “Use my location”.
- if location enabled and available, human marker appears on map.

## 2.5 School details

- card click from list opens details page.
- top block includes favorite star, levels, address+Google link, website, student count, denomination.
- exam results block is collapsible.
- notes are autosaved.
- impression values autosave and score/confidence update.

## 2.6 Profile

- profile ID panel collapses/expands.
- load profile by ID works.
- share link copy includes `profileId` query.
- drag/drop reorder updates persistent favorites rank.
- remove button is `×`.
- score badge appears when impression score exists.

## 2.7 Compare

- no address row.
- has student count row.
- has My Score row.
- score uses DB first then local fallback.

## 2.8 Feedback

- submit creates DB row.
- strict sanitize + max length enforced.
- thank-you message shown after success.

## 3. Data Integrity and Migration Checks

- `School.name` uniqueness enforced.
- `School.brin` is non-unique.
- sample and DB student counts should not be duplicated incorrectly across shared BRIN schools.
- verify known schools with previously corrected counts (for example ALASCA/Berlage).

## 4. Smoke Tests (Manual)

1. Open schools page in mobile viewport.
2. Toggle levels and verify expected count changes.
3. Enter valid ZIP and verify distance labels appear.
4. Toggle location and verify ZIP clears.
5. Favorite a school and reload page; favorite persists.
6. Open details, set impression values, refresh; values persist.
7. Add note, refresh; note persists.
8. Open profile, reorder favorites, refresh; order persists.
9. Open compare from profile; rows match expected columns.
10. Submit feedback and verify success state.

## 5. Non-Goals for Current Version

- No authentication/user accounts.
- No server-side email dispatch for feedback by default.
- No real route-based biking path API (distance is straight-line estimate).
