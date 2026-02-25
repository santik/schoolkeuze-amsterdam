import fs from "node:fs/promises";
import path from "node:path";

import type { Prisma, School, SchoolLevel } from "@prisma/client";

import { prisma } from "@/server/db";

export type SchoolListFilters = {
  q?: string;
  level?: SchoolLevel;
  levels?: string[];
  lat?: number;
  lon?: number;
  bikeMinutes?: number;
  take?: number;
};

type SampleSchool = {
  brin?: string;
  name: string;
  websiteUrl?: string;
  phone?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  lat?: number;
  lon?: number;
  levels?: SchoolLevel[];
  concepts?: string[];
  denomination?: string;
  size?: number;
  results?: unknown;
  examens_2023_2024?: unknown;
  examens_bron?: string;
  admissions?: unknown;
  source?: string;
  sourceUrl?: string;
};

let sampleCache: School[] | null = null;

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const c =
    s1 * s1 +
    Math.cos((aLat * Math.PI) / 180) *
    Math.cos((bLat * Math.PI) / 180) *
    s2 *
    s2;
  const v = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
  return R * v;
}

async function getSampleSchools(): Promise<School[]> {
  if (sampleCache) return sampleCache;

  const filePath = path.join(process.cwd(), "data", "schools.sample.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as SampleSchool[];

  // Map sample -> Prisma-like shape. IDs are stable-ish for demos.
  sampleCache = parsed.map((s, index) => ({
    id: `sample_${(s.brin ?? s.name).toLowerCase().replaceAll(/\W+/g, "_")}_${index}`,
    sourceKey: null,
    brin: s.brin ?? null,
    name: s.name,
    websiteUrl: s.websiteUrl ?? null,
    phone: s.phone ?? null,
    street: s.street ?? null,
    houseNumber: s.houseNumber ?? null,
    postalCode: s.postalCode ?? null,
    city: s.city ?? "Amsterdam",
    lat: s.lat ?? null,
    lon: s.lon ?? null,
    levels: s.levels ?? [],
    concepts: s.concepts ?? [],
    denomination: s.denomination ?? null,
    size: s.size ?? null,
    results: (() => {
      const hasExamData =
        s.examens_2023_2024 !== undefined || s.examens_bron !== undefined;
      if (!hasExamData) return (s.results ?? null) as Prisma.JsonValue | null;

      const base =
        s.results && typeof s.results === "object" ? (s.results as Record<string, unknown>) : {};

      return {
        ...base,
        examens_2023_2024: s.examens_2023_2024 ?? null,
        examens_bron: s.examens_bron ?? null,
      } as Prisma.JsonValue;
    })(),
    admissions: (s.admissions ?? null) as Prisma.JsonValue | null,
    source: s.source ?? "sample",
    sourceUrl: s.sourceUrl ?? null,
    updatedAt: new Date(),
    createdAt: new Date(),
  }));

  return sampleCache ?? [];
}

function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

const LEVEL_RANK: Record<"PRAKTIJKONDERWIJS" | "VMBO" | "HAVO" | "VWO", number> = {
  PRAKTIJKONDERWIJS: -1,
  VMBO: 0,
  HAVO: 1,
  VWO: 2,
};

function normalizeSelectedLevels(filters: SchoolListFilters) {
  const raw =
    filters.levels && filters.levels.length > 0
      ? filters.levels
      : filters.level
        ? [String(filters.level)]
        : [];

  const selected = Array.from(
    new Set(
      raw
        .map((x) => x.toUpperCase().trim())
        .filter((x): x is "PRAKTIJKONDERWIJS" | "VMBO" | "HAVO" | "VWO" => x in LEVEL_RANK)
    )
  );

  return selected;
}

export async function listSchools(filters: SchoolListFilters = {}) {
  const take = Math.min(Math.max(filters.take ?? 50, 1), 200);

  if (!hasDb()) {
    const all = await getSampleSchools();
    let results = all;

    const normalizeLevel = (level: SchoolLevel) =>
      String(level).startsWith("VMBO") ? "VMBO" : String(level);

    if (filters.q) {
      const q = filters.q.toLowerCase();
      results = results.filter((s) => s.name.toLowerCase().includes(q));
    }
    const selectedLevels = normalizeSelectedLevels(filters);
    if (selectedLevels.length > 0) {
      const selected = new Set(selectedLevels);
      const minSelectedRank = Math.min(
        ...selectedLevels.map((x) => LEVEL_RANK[x])
      );

      results = results.filter((s) => {
        const levelSet = new Set((s.levels ?? []).map(normalizeLevel));

        for (const selectedLevel of selected) {
          if (!levelSet.has(selectedLevel)) return false;
        }

        for (const schoolLevel of levelSet) {
          if (
            schoolLevel in LEVEL_RANK &&
            LEVEL_RANK[
              schoolLevel as "PRAKTIJKONDERWIJS" | "VMBO" | "HAVO" | "VWO"
            ] < minSelectedRank
          ) {
            return false;
          }
        }

        return true;
      });
    }
    // Convert bikeMinutes to km using 15 km/h average bike speed.
    const bikeSpeedKmh = 15;
    const radiusKm = filters.bikeMinutes != null ? filters.bikeMinutes * (bikeSpeedKmh / 60) : undefined;
    if (
      typeof filters.lat === "number" &&
      typeof filters.lon === "number" &&
      typeof radiusKm === "number"
    ) {
      results = results.filter((s) => {
        if (s.lat == null || s.lon == null) return false;
        return haversineKm(filters.lat!, filters.lon!, s.lat, s.lon) <= radiusKm!;
      });
    }

    return results.slice(0, take);
  }

  const and: Prisma.SchoolWhereInput[] = [];
  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { brin: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  const selectedLevels = normalizeSelectedLevels(filters);
  if (selectedLevels.length > 0) {
    const selected = new Set(selectedLevels);
    const minSelectedRank = Math.min(
      ...selectedLevels.map((x) => LEVEL_RANK[x])
    );

    const praktijkFilter: Prisma.SchoolWhereInput = {
      levels: { has: "PRAKTIJKONDERWIJS" as SchoolLevel },
    };
    const vmboOr: Prisma.SchoolWhereInput = {
      OR: [
        { levels: { has: "VMBO" as SchoolLevel } },
        { levels: { has: "VMBO_T" as SchoolLevel } },
        { levels: { has: "VMBO_B" as SchoolLevel } },
        { levels: { has: "VMBO_K" as SchoolLevel } },
      ],
    };

    if (selected.has("PRAKTIJKONDERWIJS")) and.push(praktijkFilter);
    if (selected.has("VMBO")) and.push(vmboOr);
    if (selected.has("HAVO")) and.push({ levels: { has: "HAVO" as SchoolLevel } });
    if (selected.has("VWO")) and.push({ levels: { has: "VWO" as SchoolLevel } });

    if (minSelectedRank > LEVEL_RANK.PRAKTIJKONDERWIJS) {
      and.push({ NOT: praktijkFilter });
    }
    if (minSelectedRank > LEVEL_RANK.VMBO) {
      and.push({ NOT: vmboOr });
    }
    if (minSelectedRank > LEVEL_RANK.HAVO) {
      and.push({ NOT: { levels: { has: "HAVO" as SchoolLevel } } });
    }
  }
  const where: Prisma.SchoolWhereInput = and.length > 0 ? { AND: and } : {};

  // Radius filtering: do a light pre-filter in SQL, then precise haversine in JS.
  // Convert bikeMinutes to km using 15 km/h average bike speed.
  const bikeSpeedKmh = 15;
  const radiusKm = filters.bikeMinutes != null ? filters.bikeMinutes * (bikeSpeedKmh / 60) : undefined;
  const candidateTake = radiusKm != null ? Math.min(take * 4, 200) : take;
  let candidates = await prisma.school.findMany({
    where,
    take: candidateTake,
    orderBy: { name: "asc" },
  });

  if (
    typeof filters.lat === "number" &&
    typeof filters.lon === "number" &&
    typeof radiusKm === "number"
  ) {
    candidates = candidates.filter((s) => {
      if (s.lat == null || s.lon == null) return false;
      return haversineKm(filters.lat!, filters.lon!, s.lat, s.lon) <= radiusKm!;
    });
  }

  return candidates.slice(0, take);
}

export async function getSchoolById(id: string) {
  if (!hasDb()) {
    const all = await getSampleSchools();
    return all.find((s) => s.id === id) ?? null;
  }
  return prisma.school.findUnique({ where: { id } });
}

export async function getSchoolsByIds(ids: string[]) {
  const uniq = Array.from(new Set(ids)).slice(0, 25);
  if (uniq.length === 0) return [];

  if (!hasDb()) {
    const all = await getSampleSchools();
    return all.filter((s) => uniq.includes(s.id));
  }

  const schools = await prisma.school.findMany({
    where: { id: { in: uniq } },
    orderBy: { name: "asc" },
  });

  // Preserve input order
  const byId = new Map(schools.map((s) => [s.id, s]));
  return uniq.map((id) => byId.get(id)).filter((x): x is School => Boolean(x));
}
