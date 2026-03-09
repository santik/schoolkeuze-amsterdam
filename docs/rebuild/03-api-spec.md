# 03. API Specification

Back to [index](../rebuild.md).

All APIs return JSON.

## 1. Schools APIs

## `GET /api/schools`

Query params:
- `q` (string, optional): name/BRIN search.
- `levels` (comma-separated list, optional): `PRAKTIJKONDERWIJS,VMBO,HAVO,VWO`.
- `lat`, `lon` (number, optional): distance origin.
- `bikeMinutes` (number, optional): travel-time radius.
- `take` (number, optional): max returned schools (capped server-side).

Response:
- `200 { schools: SchoolDTO[] }`
- `500 { error: string }`

## `GET /api/schools/[id]`

Response:
- `200 { school: SchoolDTO }`
- `404 { error: "Not found" }`

## 2. Compare API

## `GET /api/compare`

Query:
- `ids=id1,id2,...`

Response:
- `200 { schools: SchoolDTO[] }` in input order.

## 3. ZIP Geocode API

## `GET /api/geocode-zip`

Query:
- `zip` (Dutch postal code)

Validation:
- regex: `^\d{4}\s?[A-Za-z]{2}$`

Response:
- `200 { lat: number, lon: number, zip: string }`
- `400 { error: "Invalid zip code" }`
- `404 { error: "Zip code not found" }`
- `502 { error: "Geocoding failed" | "Invalid geocoding result" }`

External dependency:
- Nominatim OSM search API.

## 4. Profile Favorites API

## `GET /api/profile/favorites`

Query:
- `profileId`

Response:
- `200 { ids: string[] }` ordered by rank.
- `400 { error: "Invalid profileId" }`

## `PUT /api/profile/favorites`

Body:
```json
{ "profileId": "string", "ids": ["schoolId1", "schoolId2"] }
```

Behavior:
- trims, dedupes, keeps max 100 IDs,
- fully replaces favorites for that profile in a DB transaction.

Response:
- `200 { ok: true, ids: string[] }`
- `400 { error: string }`

## 5. Profile Notes API

## `GET /api/profile/notes`

Query:
- `profileId`

Response:
- `200 { notesById: Record<string,string> }`

## `PUT /api/profile/notes`

Body:
```json
{ "profileId": "string", "schoolId": "string", "note": "string" }
```

Behavior:
- strict sanitize,
- max length 3000,
- empty note deletes row.

Response:
- `200 { ok: true }` or `{ ok: true, deleted: true }`
- `400 { error: string }`

## 6. Profile Settings API

## `GET /api/profile/settings`

Query:
- `profileId`

Response:
- `200 { adviceLevel: "VMBO" | "HAVO" | "VWO" }` (default VWO)

## `PUT /api/profile/settings`

Body:
```json
{ "profileId": "string", "adviceLevel": "VMBO|HAVO|VWO" }
```

Response:
- `200 { ok: true }`
- `400 { error: string }`

## 7. Profile Impression API

## `GET /api/profile/impression`

Modes:
- single-school mode:
  - query: `profileId`, `schoolId`
  - response: `{ metrics: Record<string,unknown> }`
- multi-school mode:
  - query: `profileId`, `schoolIds` comma list
  - response: `{ items: [{ schoolId, metrics }] }`

## `PUT /api/profile/impression`

Body:
```json
{
  "profileId": "string",
  "schoolId": "string",
  "metrics": { "...": "..." }
}
```

Behavior:
- if no meaningful values, deletes impression row.

Response:
- `200 { ok: true }` or `{ ok: true, deleted: true }`

## 8. Feedback API

## `POST /api/feedback`

Body:
```json
{ "message": "string", "locale": "nl|en|..." }
```

Behavior:
- strict sanitize,
- max length 4000,
- stores in `Feedback`.

Response:
- `200 { ok: true }`
- `400 { error: string }`

