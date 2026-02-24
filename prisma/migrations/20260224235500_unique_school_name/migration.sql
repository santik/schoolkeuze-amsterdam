-- DropIndex
DROP INDEX "School_name_idx";

-- CreateIndex
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");
