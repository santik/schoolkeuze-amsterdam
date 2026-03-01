import { Prisma, PrismaClient, SchoolLevel } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { buildAdmissionsInfo } from "../src/lib/admissions-info";

type SeedSchool = {
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
  levels?: Array<keyof typeof SchoolLevel>;
  concepts?: string[];
  denomination?: string;
  size?: number;
  results?: unknown;
  examens_2023_2024?: unknown;
  examens_bron?: string;
  admissions?: unknown;
  admissionsInfo?: unknown;
  source?: string;
  sourceUrl?: string;
};

const prisma = new PrismaClient();
const SOURCE = "sample";

function slugify(v: string) {
  return v.toLowerCase().trim().replaceAll(/\W+/g, "-");
}

function toLevel(v: string): SchoolLevel | null {
  const key = v.toUpperCase().trim().replaceAll("-", "_");
  if (key === "PRAKTIJKONDERWIJS") return SchoolLevel.PRAKTIJKONDERWIJS;
  if (key === "VMBO") return SchoolLevel.VMBO;
  if (key === "VMBO_T") return SchoolLevel.VMBO_T;
  if (key === "VMBO_B") return SchoolLevel.VMBO_B;
  if (key === "VMBO_K") return SchoolLevel.VMBO_K;
  if (key === "HAVO") return SchoolLevel.HAVO;
  if (key === "VWO") return SchoolLevel.VWO;
  return null;
}

async function main() {
  const filePath = path.join(process.cwd(), "data", "schools.sample.json");
  const raw = await fs.readFile(filePath, "utf8");
  const schools = JSON.parse(raw) as SeedSchool[];

  await prisma.school.deleteMany({
    where: { source: SOURCE },
  });

  for (const s of schools) {
    const levels = (s.levels ?? [])
      .map((x) => toLevel(String(x)))
      .filter((x): x is SchoolLevel => x !== null);

    const sourceKey = `${SOURCE}:${s.brin?.trim() || "no-brin"}:${slugify(s.name)}`;
    const admissionsInfo =
      (s.admissionsInfo as Prisma.InputJsonValue | undefined) ??
      (buildAdmissionsInfo({
        name: s.name,
        websiteUrl: s.websiteUrl,
        levels,
      }) as Prisma.InputJsonValue);
    const hasExamData =
      s.examens_2023_2024 !== undefined || s.examens_bron !== undefined;
    const results: Prisma.InputJsonValue | undefined = (() => {
      if (!hasExamData) return s.results as Prisma.InputJsonValue | undefined;

      const base =
        s.results && typeof s.results === "object"
          ? (s.results as Record<string, unknown>)
          : {};

      return {
        ...base,
        examens_2023_2024: s.examens_2023_2024 ?? null,
        examens_bron: s.examens_bron ?? null,
      } as Prisma.InputJsonValue;
    })();

    await prisma.school.upsert({
      where: { sourceKey },
      create: {
        sourceKey,
        brin: s.brin ?? null,
        name: s.name,
        websiteUrl: s.websiteUrl,
        phone: s.phone,
        street: s.street,
        houseNumber: s.houseNumber,
        postalCode: s.postalCode,
        city: s.city ?? "Amsterdam",
        lat: s.lat,
        lon: s.lon,
        levels,
        concepts: s.concepts ?? [],
        denomination: s.denomination,
        size: s.size,
        results,
        admissions: s.admissions as Prisma.InputJsonValue,
        admissionsInfo,
        source: s.source ?? SOURCE,
        sourceUrl: s.sourceUrl,
      },
      update: {
        sourceKey,
        brin: s.brin ?? null,
        name: s.name,
        websiteUrl: s.websiteUrl,
        phone: s.phone,
        street: s.street,
        houseNumber: s.houseNumber,
        postalCode: s.postalCode,
        city: s.city ?? "Amsterdam",
        lat: s.lat,
        lon: s.lon,
        levels,
        concepts: s.concepts ?? [],
        denomination: s.denomination,
        size: s.size,
        results,
        admissions: s.admissions as Prisma.InputJsonValue,
        admissionsInfo,
        source: s.source ?? SOURCE,
        sourceUrl: s.sourceUrl,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
