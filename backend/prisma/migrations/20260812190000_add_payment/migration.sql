CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CASH', 'TRANSFER');

CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "chargeId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payment_chargeId_paidAt_idx" ON "Payment"("chargeId", "paidAt");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_chargeId_fkey"
FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
