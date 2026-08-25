-- Preserve existing Graduation rows while introducing modality-specific levels for new records.
ALTER TABLE "Graduation" ALTER COLUMN "belt" DROP NOT NULL;

CREATE TYPE "GraduationStatus" AS ENUM ('ACTIVE', 'CANCELLED');

CREATE TABLE "GraduationLevel" (
    "id" SERIAL NOT NULL,
    "modalityId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rankOrder" INTEGER NOT NULL,
    "minDegree" INTEGER,
    "maxDegree" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GraduationLevel_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Graduation"
  ADD COLUMN "graduationLevelId" INTEGER,
  ADD COLUMN "degree" INTEGER,
  ADD COLUMN "status" "GraduationStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "correctedBy" INTEGER,
  ADD COLUMN "correctedAt" TIMESTAMP(3),
  ADD COLUMN "correctionReason" TEXT,
  ADD COLUMN "cancelledBy" INTEGER,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT;

CREATE UNIQUE INDEX "GraduationLevel_modalityId_code_key" ON "GraduationLevel"("modalityId", "code");
CREATE UNIQUE INDEX "GraduationLevel_modalityId_rankOrder_key" ON "GraduationLevel"("modalityId", "rankOrder");
CREATE INDEX "GraduationLevel_modalityId_active_idx" ON "GraduationLevel"("modalityId", "active");
CREATE INDEX "Graduation_graduationLevelId_idx" ON "Graduation"("graduationLevelId");
CREATE INDEX "Graduation_studentId_modalityId_status_graduatedAt_idx" ON "Graduation"("studentId", "modalityId", "status", "graduatedAt");
CREATE UNIQUE INDEX "Graduation_studentId_modalityId_graduationLevelId_degree_graduatedAt_key" ON "Graduation"("studentId", "modalityId", "graduationLevelId", "degree", "graduatedAt");

ALTER TABLE "GraduationLevel" ADD CONSTRAINT "GraduationLevel_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "Modality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Graduation" ADD CONSTRAINT "Graduation_graduationLevelId_fkey" FOREIGN KEY ("graduationLevelId") REFERENCES "GraduationLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Graduation" ADD CONSTRAINT "Graduation_correctedBy_fkey" FOREIGN KEY ("correctedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Graduation" ADD CONSTRAINT "Graduation_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GraduationLevel" ADD CONSTRAINT "GraduationLevel_degree_range_check" CHECK (
  ("minDegree" IS NULL AND "maxDegree" IS NULL)
  OR ("minDegree" IS NOT NULL AND "maxDegree" IS NOT NULL AND "minDegree" >= 0 AND "maxDegree" >= "minDegree")
);
