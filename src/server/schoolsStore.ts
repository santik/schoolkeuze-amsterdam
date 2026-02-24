import fs from "node:fs/promises";
import path from "node:path";

import type { Prisma, School, SchoolLevel } from "@prisma/client";

import { prisma } from "@/server/db";

export type SchoolListFilters = {
  q?: string;
  level?: SchoolLevel;
  levels?: string[];
  concept?: string;
  postalCode?: string;
  lat?: number;
  lon?: number;
  radiusKm?: number;
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

  return sampleCache;
}

function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

export async function listSchools(filters: SchoolListFilters = {}) {
  const take = Math.min(Math.max(filters.take ?? 50, 1), 200);

  if (!hasDb()) {
    const all = await getSampleSchools();
    let results = all;

    const normalizeLevel = (level: SchoolLevel) =>
      String(level).startsWith("VMBO") ? "VMBO" : String(level);

    const rank: Record<string, number> = { VMBO: 0, HAVO: 1, VWO: 2 };

    if (filters.q) {
      const q = filters.q.toLowerCase();
      results = results.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (filters.levels && filters.levels.length > 0) {
      const selected = new Set(filters.levels.map((x) => x.toUpperCase()));
      const maxSelectedRank = Math.max(
        ...Array.from(selected)
          .map((x) => rank[x])
          .filter((x): x is number => typeof x === "number")
      );

      results = results.filter((s) => {
        const school = new Set((s.levels ?? []).map(normalizeLevel));

        // required: selected levels must exist
        for (const x of selected) {
          if (!school.has(x)) return false;
        }

        // forbidden: any unselected level below the highest selected level
        for (const [lvl, r] of Object.entries(rank)) {
          if (r < maxSelectedRank && !selected.has(lvl) && school.has(lvl)) {
            return false;
          }
        }

        return true;
      });
    }
    if (filters.concept) {
      const c = filters.concept.toLowerCase();
      results = results.filter((s) =>
        s.concepts.some((x) => x.toLowerCase().includes(c))
      );
    }
    if (filters.postalCode) {
      const p = filters.postalCode.replaceAll(/\s+/g, "").toUpperCase();
      results = results.filter((s) =>
        (s.postalCode ?? "").replaceAll(/\s+/g, "").toUpperCase().startsWith(p)
      );
    }
    if (
      typeof filters.lat === "number" &&
      typeof filters.lon === "number" &&
      typeof filters.radiusKm === "number"
    ) {
      results = results.filter((s) => {
        if (s.lat == null || s.lon == null) return false;
        return (
          haversineKm(filters.lat!, filters.lon!, s.lat, s.lon) <=
          filters.radiusKm!
        );
      });
    }

    return results.slice(0, take);
  }

  const where: Prisma.SchoolWhereInput = {};
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { brin: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.levels && filters.levels.length > 0) {
      const rank: Record<string, number> = { VMBO: 0, HAVO: 1, VWO: 2 };
      const selected = new Set(filters.levels.map((x) => x.toUpperCase()));
      const maxSelectedRank = Math.max(
        ...Array.from(selected)
          .map((x) => rank[x])
          .filter((x): x is number => typeof x === "number")
      );

      const vmboOr: Prisma.SchoolWhereInput = {
        OR: [
          { levels: { has: "VMBO" as SchoolLevel } },
          { levels: { has: "VMBO_T" as SchoolLevel } },
          { levels: { has: "VMBO_B" as SchoolLevel } },
          { levels: { has: "VMBO_K" as SchoolLevel } },
        ],
      };

      const and: Prisma.SchoolWhereInput[] = [];

      // required: selected levels must exist
      if (selected.has("VMBO")) and.push(vmboOr);
      if (selected.has("HAVO")) and.push({ levels: { has: "HAVO" as SchoolLevel } });
      if (selected.has("VWO")) and.push({ levels: { has: "VWO" as SchoolLevel } });

      // forbidden: any unselected level below the highest selected level
      if (maxSelectedRank > rank.VMBO && !selected.has("VMBO")) {
        and.push({ NOT: vmboOr });
      }
      if (maxSelectedRank > rank.HAVO && !selected.has("HAVO")) {
        and.push({ NOT: { levels: { has: "HAVO" as SchoolLevel } } });
      }

      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, ...and];
    } else if (filters.level) {
      if (filters.level === "VMBO") {
        // For VMBO, include schools that have VMBO (any variant) - may also have other levels
        const levelConditions = [
          { levels: { has: "VMBO" as SchoolLevel } },
          { levels: { has: "VMBO_T" as SchoolLevel } },
          { levels: { has: "VMBO_B" as SchoolLevel } },
          { levels: { has: "VMBO_K" as SchoolLevel } },
        ];
        
        if (where.OR) {
          // Merge with existing OR conditions
          where.OR = [...where.OR, ...levelConditions];
        } else {
          where.OR = levelConditions;
        }
      } else if (filters.level === "HAVO") {
        // For HAVO, include all schools that have HAVO (but not VMBO)
        const levelConditions = [
          { levels: { has: "HAVO" as SchoolLevel } },
        ];
        
        if (where.OR) {
          // Merge with existing OR conditions
          where.OR = [...where.OR, ...levelConditions];
        } else {
          where.OR = levelConditions;
        }
        
        // Add NOT conditions for VMBO variants
        where.NOT = {
          OR: [
            { levels: { has: "VMBO" as SchoolLevel } },
            { levels: { has: "VMBO_T" as SchoolLevel } },
            { levels: { has: "VMBO_B" as SchoolLevel } },
            { levels: { has: "VMBO_K" as SchoolLevel } },
          ]
        };
      } else if (filters.level === "VWO") {
        // For VWO, include schools that have VWO only (no HAVO, no VMBO)
        const levelConditions = [
          { levels: { has: "VWO" as SchoolLevel } },
        ];
        
        if (where.OR) {
          // Merge with existing OR conditions
          where.OR = [...where.OR, ...levelConditions];
        } else {
          where.OR = levelConditions;
        }
        
        // Add NOT conditions for HAVO and VMBO variants
        where.NOT = {
          OR: [
            { levels: { has: "HAVO" as SchoolLevel } },
            { levels: { has: "VMBO" as SchoolLevel } },
            { levels: { has: "VMBO_T" as SchoolLevel } },
            { levels: { has: "VMBO_B" as SchoolLevel } },
            { levels: { has: "VMBO_K" as SchoolLevel } },
          ]
        };
      }
    }
  if (filters.postalCode) {
    where.postalCode = {
      startsWith: filters.postalCode.replaceAll(/\s+/g, "").toUpperCase(),
    };
  }

  // Radius filtering: do a light pre-filter in SQL, then precise haversine in JS.
  const candidateTake = Math.min(take * 4, 200);
  let candidates = await prisma.school.findMany({
    where,
    take: candidateTake,
    orderBy: { name: "asc" },
  });

  if (filters.concept) {
    const c = filters.concept.toLowerCase();
    candidates = candidates.filter((s) =>
      (s.concepts ?? []).some((x) => x.toLowerCase().includes(c))
    );
  }

  if (
    typeof filters.lat === "number" &&
    typeof filters.lon === "number" &&
    typeof filters.radiusKm === "number"
  ) {
    candidates = candidates.filter((s) => {
      if (s.lat == null || s.lon == null) return false;
      return haversineKm(filters.lat!, filters.lon!, s.lat, s.lon) <=
        filters.radiusKm!;
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

