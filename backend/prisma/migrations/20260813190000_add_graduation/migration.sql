CREATE TYPE "BeltRank" AS ENUM ('WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK');
CREATE TABLE "Graduation" ("id" SERIAL NOT NULL, "studentId" INTEGER NOT NULL, "modalityId" INTEGER NOT NULL, "belt" "BeltRank" NOT NULL, "beltStartedAt" TIMESTAMP(3) NOT NULL, "graduatedAt" TIMESTAMP(3) NOT NULL, "notes" TEXT, "graduatedBy" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Graduation_pkey" PRIMARY KEY ("id"));
CREATE INDEX "Graduation_studentId_graduatedAt_idx" ON "Graduation"("studentId", "graduatedAt");
ALTER TABLE "Graduation" ADD CONSTRAINT "Graduation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Graduation" ADD CONSTRAINT "Graduation_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "Modality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Graduation" ADD CONSTRAINT "Graduation_graduatedBy_fkey" FOREIGN KEY ("graduatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
