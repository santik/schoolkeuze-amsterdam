-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolNote" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_profileId_schoolId_key" ON "Favorite"("profileId", "schoolId");

-- CreateIndex
CREATE INDEX "Favorite_profileId_rank_idx" ON "Favorite"("profileId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolNote_profileId_schoolId_key" ON "SchoolNote"("profileId", "schoolId");

-- CreateIndex
CREATE INDEX "SchoolNote_profileId_idx" ON "SchoolNote"("profileId");
