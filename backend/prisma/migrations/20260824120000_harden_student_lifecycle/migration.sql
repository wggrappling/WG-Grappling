BEGIN;

-- Refuse inconsistent existing data before changing the schema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "StudentPlan"
    WHERE "status" = 'ACTIVE'
    GROUP BY "studentId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one active StudentPlan: duplicate ACTIVE plans exist';
  END IF;
END $$;

-- Preserve modality lifecycle periods and allow a new period after FINISHED.
ALTER TABLE "StudentModality"
ADD COLUMN "pausedAt" TIMESTAMP(3),
ADD COLUMN "resumedAt" TIMESTAMP(3),
ADD COLUMN "finishedAt" TIMESTAMP(3);

DROP INDEX "StudentModality_studentId_modalityId_key";
CREATE INDEX "StudentModality_studentId_modalityId_idx"
ON "StudentModality"("studentId", "modalityId");
CREATE INDEX "StudentModality_studentId_status_idx"
ON "StudentModality"("studentId", "status");
CREATE UNIQUE INDEX "StudentModality_one_current_period_key"
ON "StudentModality"("studentId", "modalityId")
WHERE "status" IN ('ACTIVE', 'PAUSED');

-- Preserve class membership periods instead of deleting associations.
CREATE TYPE "StudentClassStatus" AS ENUM ('ACTIVE', 'FINISHED');
ALTER TABLE "StudentClass"
ADD COLUMN "status" "StudentClassStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "joinedAt" TIMESTAMP(3),
ADD COLUMN "leftAt" TIMESTAMP(3);

UPDATE "StudentClass" SET "joinedAt" = "createdAt" WHERE "joinedAt" IS NULL;
ALTER TABLE "StudentClass" ALTER COLUMN "joinedAt" SET NOT NULL;
ALTER TABLE "StudentClass" ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP;

DROP INDEX "StudentClass_studentId_classId_key";
CREATE INDEX "StudentClass_studentId_status_idx"
ON "StudentClass"("studentId", "status");
CREATE UNIQUE INDEX "StudentClass_one_active_membership_key"
ON "StudentClass"("studentId", "classId")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "StudentPlan_one_active_per_student_key"
ON "StudentPlan"("studentId")
WHERE "status" = 'ACTIVE';

COMMIT;
