# School Choice Rebuild Documentation

This documentation is intended to let another engineer or GenAI system rebuild the application from scratch with behavior parity.

## Documentation Map

1. [Product and Architecture](./rebuild/01-product-and-architecture.md)
2. [Data Model and Seed Strategy](./rebuild/02-data-model-and-seed.md)
3. [API Specification](./rebuild/03-api-spec.md)
4. [Pages, Components, and UX Behavior](./rebuild/04-pages-and-ux.md)
5. [Algorithms and Business Rules](./rebuild/05-algorithms-and-rules.md)
6. [Persistence, Fallbacks, and Error Handling](./rebuild/06-persistence-and-fallbacks.md)
7. [Implementation Plan and Acceptance Tests](./rebuild/07-implementation-and-qa.md)
8. [OpenAPI Contract (YAML)](./rebuild/openapi.yaml)

## Quick Facts

- Framework: Next.js App Router + TypeScript.
- i18n: `next-intl`, locales `nl` (default) and `en`.
- DB: Prisma + PostgreSQL.
- Maps: Leaflet / react-leaflet.
- Drag-and-drop: `@hello-pangea/dnd`.
- PDF export: `jsPDF`.
- Core app concept: profile-based state without authentication.

## Routes (Canonical)

- `/{locale}`
- `/{locale}/schools`
- `/{locale}/schools/{id}`
- `/{locale}/profile`
- `/{locale}/compare?ids=...`
- `/{locale}/guide`
- `/{locale}/feedback`

## Key Rebuild Constraints

- Preserve profile behavior based on `profileId` URL/query/localStorage.
- Preserve DB-first + localStorage fallback for profile user data.
- Preserve school read fallback to sample data when DB is unavailable/timeouts.
- Preserve level filter union logic exactly (including Praktijk and VMBO sublevels).
- Preserve mobile behavior (no horizontal overflow in school controls and cards).
