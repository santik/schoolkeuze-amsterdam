-- DropIndex
DROP INDEX IF EXISTS "School_name_idx";

-- De-duplicate school names before adding unique constraint.
-- Keep the most recently updated row for each name.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY name
      ORDER BY "updatedAt" DESC, "createdAt" DESC, id DESC
    ) AS rn
  FROM "School"
)
DELETE FROM "School" s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");
