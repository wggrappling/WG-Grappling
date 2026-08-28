CREATE TABLE "Notice" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NoticeStudentRecipient" (
    "noticeId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    CONSTRAINT "NoticeStudentRecipient_pkey" PRIMARY KEY ("noticeId", "studentId")
);

CREATE TABLE "NoticeModalityRecipient" (
    "noticeId" INTEGER NOT NULL,
    "modalityId" INTEGER NOT NULL,
    CONSTRAINT "NoticeModalityRecipient_pkey" PRIMARY KEY ("noticeId", "modalityId")
);

CREATE TABLE "NoticeClassRecipient" (
    "noticeId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    CONSTRAINT "NoticeClassRecipient_pkey" PRIMARY KEY ("noticeId", "classId")
);

CREATE TABLE "NoticeRead" (
    "noticeId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoticeRead_pkey" PRIMARY KEY ("noticeId", "studentId")
);

CREATE INDEX "Notice_publishedAt_idx" ON "Notice"("publishedAt");
CREATE INDEX "NoticeStudentRecipient_studentId_noticeId_idx" ON "NoticeStudentRecipient"("studentId", "noticeId");
CREATE INDEX "NoticeModalityRecipient_modalityId_noticeId_idx" ON "NoticeModalityRecipient"("modalityId", "noticeId");
CREATE INDEX "NoticeClassRecipient_classId_noticeId_idx" ON "NoticeClassRecipient"("classId", "noticeId");
CREATE INDEX "NoticeRead_studentId_readAt_idx" ON "NoticeRead"("studentId", "readAt");

ALTER TABLE "NoticeStudentRecipient" ADD CONSTRAINT "NoticeStudentRecipient_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoticeStudentRecipient" ADD CONSTRAINT "NoticeStudentRecipient_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoticeModalityRecipient" ADD CONSTRAINT "NoticeModalityRecipient_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoticeModalityRecipient" ADD CONSTRAINT "NoticeModalityRecipient_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "Modality"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoticeClassRecipient" ADD CONSTRAINT "NoticeClassRecipient_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoticeClassRecipient" ADD CONSTRAINT "NoticeClassRecipient_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
