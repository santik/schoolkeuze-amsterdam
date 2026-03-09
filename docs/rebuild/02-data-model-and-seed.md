# 02. Data Model and Seed Strategy

Back to [index](../rebuild.md).

## 1. Prisma Enums

### `SchoolLevel`

- `PRAKTIJKONDERWIJS`
- `VSO`
- `VMBO`
- `VMBO_T`
- `VMBO_B`
- `VMBO_K`
- `HAVO`
- `VWO`

### `AdviceLevel`

- `VMBO`
- `HAVO`
- `VWO`

## 2. Prisma Models

## `School`

Purpose: canonical school dataset.

Important fields:
- identity: `id`, `sourceKey` (unique), `brin` (non-unique), `name` (unique).
- address/location: `street`, `houseNumber`, `postalCode`, `city`, `lat`, `lon`.
- classification: `levels[]`, `concepts[]`, `denomination`.
- metrics: `size`, `results` JSON, `admissionsInfo` JSON.
- source metadata: `source`, `sourceUrl`.

Indexes:
- `brin`
- `postalCode`

## `Favorite`

Purpose: profile-scoped ranked shortlist.

- `profileId`, `schoolId`, `rank`
- unique `(profileId, schoolId)`

## `SchoolNote`

Purpose: profile-scoped note per school.

- unique `(profileId, schoolId)`
- text field `note` with sanitization + max length enforcement at API level.

## `SchoolImpression`

Purpose: profile-scoped subjective metrics JSON.

- unique `(profileId, schoolId)`
- `metrics` JSON.

## `ProfileSettings`

Purpose: profile-scoped advice level.

- PK `profileId`
- `adviceLevel`

## `Feedback`

Purpose: user feedback messages.

- `message`, optional `locale`, `createdAt`.

## 3. Seed Pipeline

Seed file: `prisma/seed.ts`.

Source data:
- `data/schools.sample.json`

Behavior:
- deletes existing sample-source schools,
- upserts every sample school by `sourceKey`,
- maps level strings to enum values,
- copies exam info into `results.examens_2023_2024` + `results.examens_bron`,
- generates `admissionsInfo` from helper if missing.

## 4. School Read Fallback Strategy

Implemented in `src/server/schoolsStore.ts`.

Rules:
- if no DB URL, read from sample JSON.
- if Prisma pool timeout (`P2024` or pool timeout message), fallback to sample for read operations.

## 5. Student Count (`size`) Fallback

If DB row has missing `size`:

1. first try exact school name lookup in sample data.
2. if no name match, only use BRIN-based fallback when that BRIN appears exactly once in sample.

This avoids wrong size reuse across schools that share BRIN.

