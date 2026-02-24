-- AlterTable
ALTER TABLE "School" ADD COLUMN "sourceKey" TEXT;

-- DropIndex
DROP INDEX "School_brin_key";

-- CreateIndex
CREATE UNIQUE INDEX "School_sourceKey_key" ON "School"("sourceKey");

-- CreateIndex
CREATE INDEX "School_brin_idx" ON "School"("brin");
