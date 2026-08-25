ALTER TYPE "GraduationStatus" ADD VALUE 'SUPERSEDED';

ALTER TABLE "Graduation" ADD COLUMN "correctsGraduationId" INTEGER;

ALTER TABLE "Graduation"
  ADD CONSTRAINT "Graduation_correctsGraduationId_fkey"
  FOREIGN KEY ("correctsGraduationId") REFERENCES "Graduation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Graduation_correctsGraduationId_key"
  ON "Graduation"("correctsGraduationId");

DROP INDEX "Graduation_studentId_modalityId_graduationLevelId_degree_graduatedAt_key";

-- Only current records participate in business deduplication. Historical versions remain preserved.
-- COALESCE makes PostgreSQL treat absent level/degree consistently for uniqueness purposes.
CREATE UNIQUE INDEX "Graduation_active_business_duplicate_key"
  ON "Graduation"(
    "studentId",
    "modalityId",
    COALESCE("graduationLevelId", -1),
    COALESCE("degree", -1),
    "graduatedAt"
  )
  WHERE "status" = 'ACTIVE';
