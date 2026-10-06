import assert from "node:assert/strict";
import test from "node:test";

import placementData from "../../data/school-placement-history.json";
import schools from "../../data/schools.sample.json";

import {
  buildPlacementSchoolKey,
  getPlacementDataForSchoolKey,
  validatePlacementDataset,
  type PlacementDataset,
} from "../../src/lib/placement-history";

const dataset: PlacementDataset = {
  generatedAt: "2026-10-02T00:00:00.000Z",
  capacity: {
    academicYear: "2026-2027",
    status: "preliminary",
    sourceLabel: "OSVO voorlopige capaciteit 2026",
    sourceUrl: "https://example.test/capacity.pdf",
  },
  matching: {
    academicYear: "2025-2026",
    status: "final",
    sourceLabel: "OSVO matching report 2025",
    sourceUrl: "https://example.test/matching.pdf",
  },
  schools: {
    "sample:00aa:barlaeus-gymnasium": {
      capacityGroups: [
        {
          profile: null,
          capacity: 140,
          pathways: ["vwo"],
          preselection: false,
        },
      ],
      matchingGroups: [
        {
          department: "vwo",
          capacity: 140,
          firstPreferences: 160,
          secondPreferences: 30,
          thirdPreferences: 20,
          totalPlaced: 145,
          placedFirstPreference: 120,
          placedSecondPreference: 20,
          placedThirdPreference: 4,
          placedOtherPreference: 1,
        },
      ],
    },
  },
};

test("returns separate current capacity and previous matching rows", () => {
  const result = getPlacementDataForSchoolKey(
    dataset,
    "sample:00aa:barlaeus-gymnasium"
  );

  assert.equal(result?.capacityGroups[0]?.capacity, 140);
  assert.equal(result?.matchingGroups[0]?.firstPreferences, 160);
  assert.equal(result?.matchingGroups[0]?.totalPlaced, 145);
});

test("builds the same stable key used by the school importer", () => {
  assert.equal(
    buildPlacementSchoolKey({ brin: "00AA", name: "Barlaeus Gymnasium" }),
    "sample:00aa:barlaeus-gymnasium"
  );
  assert.equal(
    buildPlacementSchoolKey({
      sourceKey: "OSVO:123",
      brin: "00AA",
      name: "Renamed display label",
    }),
    "osvo:123"
  );
});

test("does not manufacture data for an unmapped school key", () => {
  assert.equal(getPlacementDataForSchoolKey(dataset, "sample:unknown"), null);
});

test("validates source metadata, values and deterministic school mappings", () => {
  assert.deepEqual(
    validatePlacementDataset(dataset, ["sample:00aa:barlaeus-gymnasium"]),
    []
  );

  const invalid: PlacementDataset = {
    ...dataset,
    schools: {
      "sample:unmapped": {
        capacityGroups: [
          {
            profile: null,
            capacity: -1,
            pathways: [],
            preselection: false,
          },
        ],
        matchingGroups: [],
      },
    },
  };

  const issues = validatePlacementDataset(invalid, ["sample:00aa:barlaeus-gymnasium"]);
  assert.ok(issues.some((issue) => issue.includes("sample:unmapped")));
  assert.ok(issues.some((issue) => issue.includes("capacity")));
  assert.ok(issues.some((issue) => issue.includes("pathways")));
});

test("zero and missing values remain distinguishable", () => {
  const row = dataset.schools["sample:00aa:barlaeus-gymnasium"]!.matchingGroups[0]!;
  assert.equal(row.placedOtherPreference, 1);
  assert.notEqual(row.capacity, null);
});

test("committed OSVO dataset maps cleanly and preserves checked source values", () => {
  const actual = placementData as PlacementDataset;
  const schoolKeys = schools.map((school) => buildPlacementSchoolKey(school));

  assert.deepEqual(validatePlacementDataset(actual, schoolKeys), []);
  assert.equal(actual.schools["sample:00aa:barlaeus-gymnasium"]?.capacityGroups[0]?.capacity, 140);
  assert.equal(
    actual.schools["sample:00aa:barlaeus-gymnasium"]?.matchingGroups[0]?.firstPreferences,
    254
  );
  assert.equal(actual.schools["sample:03aq:osb-amsterdam"]?.matchingGroups.length, 5);
  assert.equal(actual.schools["sample:00ac:hyperion-lyceum"]?.matchingGroups[0]?.totalPlaced, 153);
});
