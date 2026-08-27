BEGIN;

CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT');

CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "salePrice" DECIMAL(65,30) NOT NULL,
    "availableQuantity" INTEGER NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Product_availableQuantity_check" CHECK ("availableQuantity" >= 0),
    CONSTRAINT "Product_salePrice_check" CHECK ("salePrice" >= 0)
);

CREATE TABLE "Cart" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartItem" (
    "id" SERIAL NOT NULL,
    "cartId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CartItem_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Order_subtotal_check" CHECK ("subtotal" >= 0),
    CONSTRAINT "Order_total_check" CHECK ("total" >= 0)
);

CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrderItem_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "OrderItem_unitPrice_check" CHECK ("unitPrice" >= 0),
    CONSTRAINT "OrderItem_subtotal_check" CHECK ("subtotal" >= 0)
);

CREATE INDEX "Product_status_name_idx" ON "Product"("status", "name");
CREATE UNIQUE INDEX "Cart_studentId_key" ON "Cart"("studentId");
CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "CartItem"("cartId", "productId");
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");
CREATE INDEX "Order_studentId_createdAt_idx" ON "Order"("studentId", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

ALTER TABLE "Cart" ADD CONSTRAINT "Cart_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
