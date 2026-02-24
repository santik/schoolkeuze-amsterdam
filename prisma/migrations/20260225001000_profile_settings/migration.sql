-- CreateEnum
CREATE TYPE "AdviceLevel" AS ENUM ('VMBO', 'HAVO', 'VWO');

-- CreateTable
CREATE TABLE "ProfileSettings" (
    "profileId" TEXT NOT NULL,
    "adviceLevel" "AdviceLevel" NOT NULL DEFAULT 'VWO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileSettings_pkey" PRIMARY KEY ("profileId")
);
