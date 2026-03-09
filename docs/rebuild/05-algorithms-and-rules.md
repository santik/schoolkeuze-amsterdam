# 05. Algorithms and Business Rules

Back to [index](../rebuild.md).

## 1. Level Hierarchy and Filtering

Rank mapping:
- `VWO` = 2
- `HAVO` = 1
- `VMBO` = 0
- `PRAKTIJKONDERWIJS` = -1

Selected levels are normalized to the rankable set above.

Rule set:
1. School must contain every selected level.
2. School must not contain any level below the minimum selected rank.

VMBO matching:
- VMBO selection matches any of:
  - `VMBO`
  - `VMBO_T`
  - `VMBO_B`
  - `VMBO_K`

Examples:
- select only `VWO` -> show VWO-only schools.
- select `HAVO` -> show HAVO and HAVO+VWO, exclude VWO-only and VMBO/praktijk.
- select `VMBO` -> show VMBO-track schools, exclude praktijk-only mixed-below rank.

## 2. School List Ordering

Sorting keys:
1. highest level rank offered by school (desc),
2. school name (asc, localeCompare base sensitivity).

## 3. Distance and Bike Time

Shared constants/functions in `src/lib/bike.ts`:
- `BIKE_SPEED_KMH = 12`
- `bikeRadiusKmFromMinutes(minutes) = minutes * (12 / 60)`
- `bikeMinutesFromKm(km) = round((km / 12) * 60)`

Distance geometry:
- Haversine great-circle distance in km.

Usage:
- API filtering radius uses `bikeRadiusKmFromMinutes`.
- UI labels use `bikeMinutesFromKm`.

## 4. Distance Origin Priority

Source for distance calculations:
1. if `useMyLocation` and geolocation available -> use device coords.
2. else if valid ZIP is geocoded -> use ZIP coords.
3. else distance disabled.

## 5. Impression Scoring Model

### 5.1 Metric conversion

- star value `1..5` -> `20..100`.
- toggle:
  - `yes` -> `100`
  - `no` -> `0`

### 5.2 Section weights and metric weights

1. Fit & learning (`0.28`)
   - `canImagineYourself` (`1.2`)
   - `teachingImpression` (`1.2`)
   - `homeworkLoad` (`1.0`)

2. Atmosphere & building (`0.24`)
   - `overallVibe` (`1.2`)
   - `buildingVibe` (`1.1`)
   - `buildingModern` (`1.0`)
   - `hasLockerForEveryStudent` (`0.8`)
   - `hasIndoorBreakSpace` (`0.8`)

3. Travel & access (`0.16`)
   - `bikeRoute` (`1.0`)
   - `publicTransportAccess` (`1.0`)

4. Food & breaks (`0.14`)
   - `hasCanteen` (`0.9`)
   - `hasHealthyFood` (`1.0`)
   - `canBringOwnLunch` (`0.8`)
   - `foodQuality` (`1.0`)
   - `foodPrice` (`0.9`)

5. Activities & sports (`0.18`)
   - `hasProperGym` (`1.0`)
   - `hasChoirBandOrchestra` (`0.8`)
   - `hasSportsTeams` (`0.9`)
   - `hasClubs` (`1.0`)

### 5.3 Calculations

- Section score: weighted average of answered fields only.
- Section confidence: answered field weight / section total weight.
- Overall score: weighted average of answered section scores.
- Overall confidence: weighted average of section confidences by section weight.

Display:
- rounded whole percentages in list/compare contexts.

## 6. Compare and Favorites Score Read Rule

When showing score in compare/favorites:
1. try `/api/profile/impression` data.
2. for missing entries, attempt localStorage metric blob.

## 7. Map Interaction Rules

- School list hover sets selected marker.
- Marker click sets selected marker and opens popup.
- Popup close clears pinned popup state for that marker.
- Favorite schools use dedicated marker style.

## 8. Legacy/Reserved Metric Key

`extracurricularMatch` exists in impression metrics shape for compatibility but is not currently rendered in UI scoring inputs.

