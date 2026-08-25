BEGIN;

ALTER TABLE "Attendance"
  ADD COLUMN "recordedBy" INTEGER,
  ADD COLUMN "correctedBy" INTEGER,
  ADD COLUMN "correctedAt" TIMESTAMP(3),
  ADD COLUMN "correctionReason" TEXT;

ALTER TABLE "Attendance"
  ADD CONSTRAINT "Attendance_recordedBy_fkey"
  FOREIGN KEY ("recordedBy") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Attendance"
  ADD CONSTRAINT "Attendance_correctedBy_fkey"
  FOREIGN KEY ("correctedBy") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Attendance_recordedBy_idx" ON "Attendance"("recordedBy");
CREATE INDEX "Attendance_correctedBy_idx" ON "Attendance"("correctedBy");

-- Existing history is preserved. If legacy same-day duplicates exist, deployment stops for manual review.
CREATE UNIQUE INDEX "Attendance_classId_studentId_attendanceDay_key"
  ON "Attendance"("classId", "studentId", ("attendanceDate"::date));

COMMIT;
