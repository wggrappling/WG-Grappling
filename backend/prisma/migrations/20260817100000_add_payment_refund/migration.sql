ALTER TABLE "Payment"
ADD COLUMN "refundedAt" TIMESTAMP(3),
ADD COLUMN "refundReason" TEXT,
ADD COLUMN "refundedBy" INTEGER;

CREATE INDEX "Payment_chargeId_refundedAt_idx" ON "Payment"("chargeId", "refundedAt");
CREATE INDEX "Payment_refundedBy_idx" ON "Payment"("refundedBy");

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_refundedBy_fkey"
FOREIGN KEY ("refundedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
