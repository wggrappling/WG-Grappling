-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StudentModalityStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FINISHED');

-- CreateEnum
CREATE TYPE "StudentPlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'FINISHED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'JUSTIFIED');

-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('ENROLLMENT_FEE', 'MONTHLY_FEE', 'PRIVATE_CLASS', 'PRODUCT', 'EVENT', 'GRADUATION_EXAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Address" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Brasil',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "enrollmentNumber" TEXT NOT NULL,
    "status" "StudentStatus" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responsible" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "relationship" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Responsible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentResponsible" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "responsibleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentResponsible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modality" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hasGraduation" BOOLEAN NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "weeklyClasses" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPlan" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "monthlyPrice" DECIMAL(65,30) NOT NULL,
    "billingDay" INTEGER NOT NULL,
    "status" "StudentPlanStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "modalityId" INTEGER NOT NULL,
    "teacherUserId" INTEGER NOT NULL,
    "weekDays" TEXT[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentClass" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charge" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "planId" INTEGER,
    "type" "ChargeType" NOT NULL,
    "description" TEXT NOT NULL,
    "originalAmount" DECIMAL(65,30) NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(65,30) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentModality" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "modalityId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "status" "StudentModalityStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentModality_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Address_personId_key" ON "Address"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_personId_key" ON "Student"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_enrollmentNumber_key" ON "Student"("enrollmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Responsible_cpf_key" ON "Responsible"("cpf");

-- CreateIndex
CREATE INDEX "StudentResponsible_studentId_responsibleId_idx" ON "StudentResponsible"("studentId", "responsibleId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentResponsible_studentId_responsibleId_key" ON "StudentResponsible"("studentId", "responsibleId");

-- CreateIndex
CREATE UNIQUE INDEX "Modality_name_key" ON "Modality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE INDEX "Attendance_classId_studentId_attendanceDate_idx" ON "Attendance"("classId", "studentId", "attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_classId_studentId_attendanceDate_key" ON "Attendance"("classId", "studentId", "attendanceDate");

-- CreateIndex
CREATE INDEX "StudentClass_studentId_classId_idx" ON "StudentClass"("studentId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentClass_studentId_classId_key" ON "StudentClass"("studentId", "classId");

-- CreateIndex
CREATE INDEX "Charge_studentId_status_idx" ON "Charge"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Charge_studentId_type_referenceMonth_key" ON "Charge"("studentId", "type", "referenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "StudentModality_studentId_modalityId_key" ON "StudentModality"("studentId", "modalityId");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResponsible" ADD CONSTRAINT "StudentResponsible_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResponsible" ADD CONSTRAINT "StudentResponsible_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "Responsible"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPlan" ADD CONSTRAINT "StudentPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPlan" ADD CONSTRAINT "StudentPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "Modality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClass" ADD CONSTRAINT "StudentClass_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClass" ADD CONSTRAINT "StudentClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentModality" ADD CONSTRAINT "StudentModality_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentModality" ADD CONSTRAINT "StudentModality_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "Modality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
