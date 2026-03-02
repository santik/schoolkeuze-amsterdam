CREATE TABLE "SchoolImpression" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "metrics" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SchoolImpression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolImpression_profileId_schoolId_key" ON "SchoolImpression"("profileId", "schoolId");
CREATE INDEX "SchoolImpression_profileId_idx" ON "SchoolImpression"("profileId");
