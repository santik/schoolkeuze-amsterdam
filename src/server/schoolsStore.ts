import fs from "node:fs/promises";
import path from "node:path";

import type { Prisma, School, SchoolLevel } from "@prisma/client";

import { prisma } from "@/server/db";
import { buildAdmissionsInfo } from "@/lib/admissions-info";
import { missingProvenance, readProvenance } from "@/lib/data-provenance";
import { bikeRadiusKmFromMinutes } from "@/lib/bike";
import { matchesSchoolSearch } from "@/lib/school-search";

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
  admissionsInfo?: unknown;
  provenance?: unknown;
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
  if (process.env.NODE_ENV !== "development" && sampleCache) return sampleCache;

  const filePath = path.join(process.cwd(), "data", "schools.sample.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as SampleSchool[];

  // Map sample -> Prisma-like shape. IDs are stable-ish for demos.
  const mapped = parsed.map((s, index) => ({
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
    // Admissions data is an annual, centrally maintained data set. Generate it
    // here instead of trusting a possibly stale copy embedded in the sample file.
    admissionsInfo: buildAdmissionsInfo({
      name: s.name,
      websiteUrl: s.websiteUrl ?? null,
      levels: s.levels ?? [],
    }) as Prisma.JsonValue,
    provenance: readProvenance(s.provenance) as Prisma.JsonValue,
    source: s.source ?? "sample",
    sourceUrl: s.sourceUrl ?? null,
    updatedAt: new Date(),
    createdAt: new Date(),
  }));

  mapped.forEach(reportMissingProvenance);
  if (process.env.NODE_ENV !== "development") {
    sampleCache = mapped;
  }

  return mapped;
}

const warned = new Set<string>();
function reportMissingProvenance(school: School) {
  if (process.env.NODE_ENV !== "development") return;
  const missing = missingProvenance(school);
  const key = `${school.id}:${missing.join(",")}`;
  if (missing.length && !warned.has(key)) {
    warned.add(key);
    console.warn(`[provenance] ${school.name}: missing ${missing.join(", ")}`);
  }
}

async function withSizeFallback(school: School | null): Promise<School | null> {
  if (!school) return null;
  return (await withSizeFallbackMany([school]))[0];
}

async function withSizeFallbackMany(schools: School[]): Promise<School[]> {
  const needsFallback = schools.some(s => s.size == null && !readProvenance(s.provenance).some(p => p.fieldGroup === "enrolment"));
  const sample = needsFallback ? await getSampleSchools() : [];
  return schools.map(school => {
    const provenance = readProvenance(school.provenance);
    let result = { ...school, provenance: provenance as Prisma.JsonValue };
    // Never undo a sourced removal or attach database metadata to a sample value.
    if (school.size == null && !provenance.some(p => p.fieldGroup === "enrolment")) {
      const byName = sample.find(s => s.name.toLowerCase() === school.name.toLowerCase());
      const byBrin = sample.filter(s => school.brin && s.brin?.toUpperCase() === school.brin.toUpperCase());
      const fallback = byName ?? (byBrin.length === 1 ? byBrin[0] : undefined);
      const source = readProvenance(fallback?.provenance).find(p => p.fieldGroup === "enrolment");
      if (fallback && typeof fallback.size === "number" && source) {
        result = { ...result, size: fallback.size, provenance: [...provenance, source] as Prisma.JsonValue };
      }
    }
    reportMissingProvenance(result);
    return result;
  });
}

function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

function isPoolTimeoutError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  if (e.code === "P2024") return true;
  if (typeof e.message === "string" && e.message.includes("connection pool")) {
    return true;
  }
  return false;
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

function normalizeLevel(level: string) {
  const upper = String(level).toUpperCase().trim();
  return upper.startsWith("VMBO") ? "VMBO" : upper;
}

// One filter pipeline shared by the database, sample and pool-timeout fallback
// records so every backend returns the same schools for the same filters.
function applyListFilters(schools: School[], filters: SchoolListFilters) {
  let results = schools;

  if (filters.q) {
    results = results.filter((s) => matchesSchoolSearch(s, filters.q!));
  }

  const selectedLevels = normalizeSelectedLevels(filters);
  if (selectedLevels.length > 0) {
    const selected = new Set(selectedLevels);
    results = results.filter((s) =>
      (s.levels ?? []).some((level) => selected.has(normalizeLevel(level) as never))
    );
  }

  const radiusKm =
    filters.bikeMinutes != null
      ? bikeRadiusKmFromMinutes(filters.bikeMinutes)
      : undefined;
  if (
    typeof filters.lat === "number" &&
    typeof filters.lon === "number" &&
    typeof radiusKm === "number"
  ) {
    results = results.filter((s) => {
      if (s.lat == null || s.lon == null) return false;
      return haversineKm(filters.lat!, filters.lon!, s.lat, s.lon) <= radiusKm;
    });
  }

  return results;
}

export async function listSchools(filters: SchoolListFilters = {}) {
  const take = Math.min(Math.max(filters.take ?? 50, 1), 200);

  if (!hasDb()) {
    return applyListFilters(await getSampleSchools(), filters).slice(0, take);
  }

  // The catalogue is small, so fetch every school and filter in JS: text
  // normalization and the precise distance check then behave identically to the
  // sample backend and nothing is truncated before filtering. Revisit (SQL
  // pre-filtering/indexing) if the catalogue grows.
  let candidates: School[];
  try {
    candidates = await prisma.school.findMany({ orderBy: { name: "asc" } });
  } catch (error) {
    if (!isPoolTimeoutError(error)) throw error;
    candidates = await getSampleSchools();
  }

  return withSizeFallbackMany(applyListFilters(candidates, filters).slice(0, take));
}

export async function getAllSchoolIds(): Promise<string[]> {
  if (!hasDb()) {
    const all = await getSampleSchools();
    return all.map((s) => s.id);
  }
  try {
    const schools = await prisma.school.findMany({
      select: { id: true },
      orderBy: { name: "asc" },
    });
    return schools.map((s) => s.id);
  } catch (error) {
    if (!isPoolTimeoutError(error)) throw error;
    const all = await getSampleSchools();
    return all.map((s) => s.id);
  }
}

export async function getSchoolById(id: string) {
  if (!hasDb()) {
    const all = await getSampleSchools();
    return all.find((s) => s.id === id) ?? null;
  }
  try {
    const school = await prisma.school.findUnique({ where: { id } });
    return withSizeFallback(school);
  } catch (error) {
    if (!isPoolTimeoutError(error)) throw error;
    const all = await getSampleSchools();
    return all.find((s) => s.id === id) ?? null;
  }
}

export async function getSchoolsByIds(ids: string[]) {
  const uniq = Array.from(new Set(ids)).slice(0, 25);
  if (uniq.length === 0) return [];

  if (!hasDb()) {
    const all = await getSampleSchools();
    return all.filter((s) => uniq.includes(s.id));
  }

  let schools: School[];
  try {
    schools = await prisma.school.findMany({
      where: { id: { in: uniq } },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    if (!isPoolTimeoutError(error)) throw error;
    const all = await getSampleSchools();
    schools = all.filter((s) => uniq.includes(s.id));
  }

  // Preserve input order
  const byId = new Map(schools.map((s) => [s.id, s]));
  const ordered = uniq.map((id) => byId.get(id)).filter((x): x is School => Boolean(x));
  return withSizeFallbackMany(ordered);
}
