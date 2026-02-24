import fs from "node:fs/promises";
import path from "node:path";

import { Prisma, PrismaClient, SchoolLevel } from "@prisma/client";

type InputSchool = {
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
  levels?: string[];
  concepts?: string[];
  denomination?: string;
  size?: number;
  results?: unknown;
  admissions?: unknown;
  source?: string;
  sourceUrl?: string;
};

function toLevel(v: string): SchoolLevel | null {
  const key = v.toUpperCase().trim();
  if (key === "VMBO") return SchoolLevel.VMBO;
  if (key === "HAVO") return SchoolLevel.HAVO;
  if (key === "VWO") return SchoolLevel.VWO;
  return null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for ingestion.");
  }

  const prisma = new PrismaClient();
  const filePath = path.join(process.cwd(), "data", "schools.sample.json");
  const raw = await fs.readFile(filePath, "utf8");
  const schools = JSON.parse(raw) as InputSchool[];

  let index = 0;
  for (const s of schools) {
    const brin = s.brin ? `${s.brin}_${index}` : `${s.name.toLowerCase().replaceAll(/\s+/g, "-")}-sample_${index}`;
    const levels = (s.levels ?? [])
      .map(toLevel)
      .filter((x): x is SchoolLevel => x !== null);

    await prisma.school.upsert({
      where: { brin },
      create: {
        brin,
        name: s.name,
        websiteUrl: s.websiteUrl,
        phone: s.phone,
        street: s.street,
        houseNumber: s.houseNumber,
        postalCode: s.postalCode?.replaceAll(/\s+/g, "").toUpperCase(),
        city: s.city ?? "Amsterdam",
        lat: s.lat,
        lon: s.lon,
        levels,
        concepts: s.concepts ?? [],
        denomination: s.denomination,
        size: s.size,
        results: s.results as Prisma.InputJsonValue,
        admissions: s.admissions as Prisma.InputJsonValue,
        source: s.source ?? "sample",
        sourceUrl: s.sourceUrl,
      },
      update: {
        name: s.name,
        websiteUrl: s.websiteUrl,
        phone: s.phone,
        street: s.street,
        houseNumber: s.houseNumber,
        postalCode: s.postalCode?.replaceAll(/\s+/g, "").toUpperCase(),
        city: s.city ?? "Amsterdam",
        lat: s.lat,
        lon: s.lon,
        levels,
        concepts: s.concepts ?? [],
        denomination: s.denomination,
        size: s.size,
        results: s.results as Prisma.InputJsonValue,
        admissions: s.admissions as Prisma.InputJsonValue,
        source: s.source ?? "sample",
        sourceUrl: s.sourceUrl,
      },
    });

    index++;
  }

  await prisma.$disconnect();
  console.log(`Upserted ${schools.length} schools from sample dataset.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

