ALTER TABLE "School" ADD COLUMN "provenance" JSONB NOT NULL DEFAULT '[]';
CREATE TABLE "SchoolImport" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous" JSONB NOT NULL,
    "report" JSONB NOT NULL,
    CONSTRAINT "SchoolImport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SchoolImport_schoolId_importedAt_idx" ON "SchoolImport"("schoolId", "importedAt");
ALTER TABLE "SchoolImport" ADD CONSTRAINT "SchoolImport_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
