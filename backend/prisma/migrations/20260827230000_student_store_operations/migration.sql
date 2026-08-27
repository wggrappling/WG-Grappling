BEGIN;

ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'OUT_OF_STOCK';
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'MADE_TO_ORDER';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_REVIEW';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_PRODUCTION';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "ProductType" AS ENUM ('SHIRT', 'SHORTS', 'SET');
CREATE TYPE "CommercialPaymentMethod" AS ENUM ('PIX_QR_CODE', 'CREDIT_CARD_LINK', 'CREDIT_CARD_PHYSICAL', 'PIX_MANUAL');
CREATE TYPE "CommercialPaymentStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED');

ALTER TABLE "Product" DROP COLUMN "availableQuantity",
ADD COLUMN "type" "ProductType" NOT NULL,
ADD COLUMN "imageKey" TEXT,
ADD COLUMN "imageMimeType" TEXT,
ADD COLUMN "madeToOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
ADD CONSTRAINT "Product_leadTimeDays_check" CHECK ("leadTimeDays" > 0);

CREATE TABLE "ProductVariant" (
  "id" SERIAL NOT NULL,
  "productId" INTEGER NOT NULL,
  "color" TEXT NOT NULL DEFAULT '',
  "size" TEXT NOT NULL DEFAULT '',
  "availableQuantity" INTEGER NOT NULL DEFAULT 0,
  "minimumStock" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductVariant_availableQuantity_check" CHECK ("availableQuantity" >= 0),
  CONSTRAINT "ProductVariant_minimumStock_check" CHECK ("minimumStock" >= 0)
);

CREATE TABLE "StockEntry" (
  "id" SERIAL NOT NULL,
  "variantId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitCost" DECIMAL(65,30) NOT NULL,
  "recordedBy" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockEntry_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "StockEntry_unitCost_check" CHECK ("unitCost" >= 0)
);

DROP INDEX "CartItem_cartId_productId_key";
ALTER TABLE "CartItem" ADD COLUMN "variantId" INTEGER NOT NULL;
CREATE UNIQUE INDEX "CartItem_cartId_productId_variantId_key" ON "CartItem"("cartId", "productId", "variantId");

ALTER TABLE "Order" ADD COLUMN "stockReleasedAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledBy" INTEGER,
ADD COLUMN "cancellationReason" TEXT;

ALTER TABLE "OrderItem" ADD COLUMN "variantId" INTEGER NOT NULL,
ADD COLUMN "color" TEXT,
ADD COLUMN "size" TEXT,
ADD COLUMN "madeToOrder" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CommercialPayment" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "method" "CommercialPaymentMethod" NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "status" "CommercialPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "justification" TEXT,
  "submittedBy" INTEGER,
  "submittedAt" TIMESTAMP(3),
  "reviewedBy" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "reviewNotes" TEXT,
  "refundedBy" INTEGER,
  "refundedAt" TIMESTAMP(3),
  "refundReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialPayment_amount_check" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "ProductVariant_productId_color_size_key" ON "ProductVariant"("productId", "color", "size");
CREATE INDEX "ProductVariant_productId_active_idx" ON "ProductVariant"("productId", "active");
CREATE INDEX "StockEntry_variantId_createdAt_idx" ON "StockEntry"("variantId", "createdAt");
CREATE INDEX "StockEntry_recordedBy_idx" ON "StockEntry"("recordedBy");
CREATE INDEX "CommercialPayment_orderId_status_idx" ON "CommercialPayment"("orderId", "status");
CREATE INDEX "CommercialPayment_status_createdAt_idx" ON "CommercialPayment"("status", "createdAt");

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockEntry" ADD CONSTRAINT "StockEntry_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockEntry" ADD CONSTRAINT "StockEntry_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialPayment" ADD CONSTRAINT "CommercialPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialPayment" ADD CONSTRAINT "CommercialPayment_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialPayment" ADD CONSTRAINT "CommercialPayment_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialPayment" ADD CONSTRAINT "CommercialPayment_refundedBy_fkey" FOREIGN KEY ("refundedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
