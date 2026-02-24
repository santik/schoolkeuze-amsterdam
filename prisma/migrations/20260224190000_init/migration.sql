-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SchoolLevel" AS ENUM ('VMBO', 'VMBO_T', 'VMBO_B', 'VMBO_K', 'HAVO', 'VWO');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "brin" TEXT,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "phone" TEXT,
    "street" TEXT,
    "houseNumber" TEXT,
    "postalCode" TEXT,
    "city" TEXT DEFAULT 'Amsterdam',
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "levels" "SchoolLevel"[],
    "concepts" TEXT[],
    "denomination" TEXT,
    "size" INTEGER,
    "results" JSONB,
    "admissions" JSONB,
    "source" TEXT,
    "sourceUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_brin_key" ON "School"("brin");

-- CreateIndex
CREATE INDEX "School_name_idx" ON "School"("name");

-- CreateIndex
CREATE INDEX "School_postalCode_idx" ON "School"("postalCode");

