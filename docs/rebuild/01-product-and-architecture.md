# 01. Product and Architecture

Back to [index](../rebuild.md).

## 1. Product Goal

Help families choose secondary schools in Amsterdam by combining:

- school search/filtering,
- map and distance context,
- profile-level favorites and ranking,
- school notes and subjective impression scoring,
- compare view,
- shareable profile IDs,
- feedback collection.

## 2. Core User Types

- Parents and students evaluating school options.
- Dutch and English users.
- Heavy mobile usage.

## 3. High-Level Architecture

- Next.js App Router with locale-prefixed routes.
- Server API routes under `/api`.
- Prisma ORM for database persistence.
- Client hooks for profile-scoped local state and localStorage fallback.
- SSR + client components:
  - server components fetch core data,
  - client components handle interaction-heavy UI (map, drag-drop, form autosave).

## 4. Locale and Routing Model

- Supported locales: `nl`, `en`.
- Default locale: `nl`.
- Root route redirects `/` to `/nl`.
- Locale switcher keeps the same path and query string.

## 5. Header and Navigation

- Sticky top header.
- Left side: brand with compass icon, text hidden on small screens.
- Main nav: Schools + Profile (active state highlighted).
- Utility controls: theme toggle and locale switch.
- Compare route remains available but is accessed from profile flow.

## 6. SEO/Metadata Strategy

- Metadata configured globally and per-page.
- Canonical and language alternates set for locale pages.
- OpenGraph + Twitter metadata set.
- Home page emits JSON-LD (`WebSite`, `SearchAction`).
- `robots.ts` and `sitemap.ts` are present.

## 7. Design Direction

- Bright, kid-friendly gradients and rounded cards.
- Compact controls on mobile.
- Collapsible sections used to reduce vertical clutter:
  - distance block on schools page,
  - map block on schools page,
  - profile ID block on profile page,
  - exam results block on details page.

