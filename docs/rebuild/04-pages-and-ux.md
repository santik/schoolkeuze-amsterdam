# 04. Pages, Components, and UX Behavior

Back to [index](../rebuild.md).

## 1. Home (`/{locale}`)

Purpose:
- app introduction and quick navigation.

Content:
- hero card with title/subtitle and 3 CTAs:
  - Browse schools -> `/schools`
  - Guide -> `/guide`
  - Feedback -> `/feedback`
- feature cards:
  - Search & filter -> `/schools`
  - Favorites & list -> `/profile`

Notes:
- no compare teaser block on homepage.

## 2. Schools (`/{locale}/schools`)

Component: `SchoolsExplorer`.

### 2.1 Filters and controls

- Search by text.
- Level checkboxes in this order:
  1. Praktijk (`PRAKTIJKONDERWIJS`)
  2. VMBO
  3. HAVO
  4. VWO

- Collapsible section: “Distance & bike time”.
  - Use my location checkbox.
  - ZIP field for distance origin.
  - Bike time slider:
    - default `30`,
    - min `5`,
    - max `45`,
    - step `5`.

Mutual behavior:
- toggling location clears ZIP-related state.
- entering valid ZIP while location is on auto-disables location.

### 2.2 Map behavior

- Collapsible map block under filters.
- Marker colors/types:
  - default marker,
  - selected marker (red),
  - favorite marker (yellow),
  - user origin marker is human icon (`🧍`) when origin exists.

Marker popup:
- click to open,
- displays school name + levels,
- includes Info button linking to details,
- close button available,
- no hover-driven popup interactions.

### 2.3 List behavior

- Show school count.
- School card click/tap opens details page.
- Hovering a school card marks it selected on map.
- Favorite star button inside card:
  - toggles favorite state,
  - does not navigate to details.
- Favoriting does not reorder list.
- No “add to compare” button in school list.

## 3. School Details (`/{locale}/schools/{id}`)

Top merged info block:
- school name,
- favorite star button,
- levels,
- address + Google Maps link (address query),
- website,
- student count,
- denomination,
- collapsible exam results block.

### 3.1 Exam Results block

- collapsed by default.
- columns:
  - level,
  - candidates,
  - passed,
  - pass rate,
  - average grade.

### 3.2 Your Impression block

- grouped criteria UI.
- star fields (1..5) and yes/no toggles.
- per-section and overall score/confidence.
- autosave to API with local fallback.

### 3.3 Notes block

- sits below impression block.
- debounced autosave.
- no manual save button.

### 3.4 Admissions & lottery block

- displays bilingual structured admissions content from `admissionsInfo`.
- includes sources list with external links.

Removed from details:
- compare button.
- “back to schools” link.

## 4. Profile (`/{locale}/profile`)

### 4.1 Left panel

- Advice/level dropdown (DB + local fallback).
- Collapsible Profile ID panel:
  - load profile by ID,
  - copy share link.
- Optional use-my-location for distance labels in favorites list.

### 4.2 Favorites panel

- favorites list with drag-and-drop reordering.
- row click opens school details.
- row contains:
  - rank,
  - school name,
  - levels/concepts,
  - mismatch warning against advice level (if school does not offer advice level),
  - optional distance label,
  - optional “My Score”.
- remove button is compact cross (`×`).

Actions:
- Compare -> `/compare?ids=...`
- Export list -> styled PDF.

## 5. Compare (`/{locale}/compare?ids=...`)

Server fetches schools by IDs, client computes score row.

Rows:
- Level
- Pass rate (2023–2024)
- Concept
- Student count
- My Score
- Website

No address row.

## 6. Guide (`/{locale}/guide`)

Two sections:
- how to use app features,
- admissions and lottery explanation with source links.

## 7. Feedback (`/{locale}/feedback`)

- one textarea + send button.
- on success shows thank-you message.

