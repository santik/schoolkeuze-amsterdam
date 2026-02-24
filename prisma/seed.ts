import { Prisma, PrismaClient, SchoolLevel } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

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
  admissions?: unknown;
  source?: string;
  sourceUrl?: string;
};

const prisma = new PrismaClient();
const SOURCE = "sample";

function slugify(v: string) {
  return v.toLowerCase().trim().replaceAll(/\W+/g, "-");
}

function toLevel(v: string): SchoolLevel | null {
  const key = v.toUpperCase().trim();
  if (key === "VMBO") return SchoolLevel.VMBO;
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
        results: s.results as Prisma.InputJsonValue,
        admissions: s.admissions as Prisma.InputJsonValue,
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
        results: s.results as Prisma.InputJsonValue,
        admissions: s.admissions as Prisma.InputJsonValue,
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
