# Changelog

## 2026-03-09

### Docs
- Replaced `docs/rebuild.txt` with structured Markdown documentation:
  - [`docs/rebuild.md`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/docs/rebuild.md)
  - [`docs/rebuild/01-product-and-architecture.md`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/docs/rebuild/01-product-and-architecture.md)
  - [`docs/rebuild/02-data-model-and-seed.md`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/docs/rebuild/02-data-model-and-seed.md)
  - [`docs/rebuild/03-api-spec.md`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/docs/rebuild/03-api-spec.md)
  - [`docs/rebuild/04-pages-and-ux.md`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/docs/rebuild/04-pages-and-ux.md)
  - [`docs/rebuild/05-algorithms-and-rules.md`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/docs/rebuild/05-algorithms-and-rules.md)
  - [`docs/rebuild/06-persistence-and-fallbacks.md`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/docs/rebuild/06-persistence-and-fallbacks.md)
  - [`docs/rebuild/07-implementation-and-qa.md`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/docs/rebuild/07-implementation-and-qa.md)
- Added OpenAPI contract:
  - [`docs/rebuild/openapi.yaml`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/docs/rebuild/openapi.yaml)

### Prisma
- Migrated deprecated `package.json#prisma` config to Prisma config file:
  - added [`prisma.config.ts`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/prisma.config.ts)
  - removed `prisma` block from [`package.json`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/package.json)

### School Details UI
- Updated yes/no criteria control to a 3-position segmented toggle:
  - left `No` (red), middle unresolved `—` (gray), right `Yes` (green)
  - made control compact for mobile
  - file: [`src/app/[locale]/schools/[id]/impression-client.tsx`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/src/app/[locale]/schools/[id]/impression-client.tsx)
- Removed denomination line from details info block:
  - file: [`src/app/[locale]/schools/[id]/page.tsx`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/src/app/[locale]/schools/[id]/page.tsx)

### Compare
- Compare table now shows:
  - `Student count`
  - `My Score`
  - removed `Address` row
  - files:
    - [`src/app/[locale]/compare/page.tsx`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/src/app/[locale]/compare/page.tsx)
    - [`src/app/[locale]/compare/table-client.tsx`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/src/app/[locale]/compare/table-client.tsx)
    - [`messages/en.json`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/messages/en.json)
    - [`messages/nl.json`](/Users/alexander/projects/schools/amsterdam-schoolkeuze/messages/nl.json)

