import placementData from "../../data/school-placement-history.json";

import {
  buildPlacementSchoolKey,
  getPlacementDataForSchoolKey,
  type PlacementDataset,
} from "@/lib/placement-history";

const dataset = placementData as PlacementDataset;

export function getSchoolPlacementData(school: {
  sourceKey?: string | null;
  brin?: string | null;
  name: string;
}) {
  return getPlacementDataForSchoolKey(dataset, buildPlacementSchoolKey(school));
}

export function getPlacementSources() {
  return { capacity: dataset.capacity, matching: dataset.matching };
}
