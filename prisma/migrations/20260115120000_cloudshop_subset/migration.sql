-- Extend enum for stock movements
ALTER TYPE "StockMovementType" RENAME VALUE 'RECEIPT' TO 'RECEIVE';

-- Product and supplier extensions
ALTER TABLE "Supplier" ADD COLUMN "notes" TEXT;
ALTER TABLE "Product" ADD COLUMN "category" TEXT;
ALTER TABLE "Product" ADD COLUMN "description" TEXT;
ALTER TABLE "Product" ADD COLUMN "photoUrl" TEXT;

-- Catalog tables
CREATE TABLE "ProductBarcode" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductBarcode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariant" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT,
  "sku" TEXT,
  "attributes" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- Inventory extensions
ALTER TABLE "InventorySnapshot" ADD COLUMN "variantId" TEXT;
ALTER TABLE "InventorySnapshot" ADD COLUMN "variantKey" TEXT NOT NULL DEFAULT 'BASE';

ALTER TABLE "StockMovement" ADD COLUMN "variantId" TEXT;

ALTER TABLE "PurchaseOrderLine" ADD COLUMN "variantId" TEXT;
ALTER TABLE "PurchaseOrderLine" ADD COLUMN "variantKey" TEXT NOT NULL DEFAULT 'BASE';

ALTER TABLE "ReorderPolicy" ADD COLUMN "minStock" INTEGER NOT NULL DEFAULT 0;

-- Foreign keys
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventorySnapshot" ADD CONSTRAINT "InventorySnapshot_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes and constraints
CREATE UNIQUE INDEX "ProductBarcode_organizationId_value_key" ON "ProductBarcode"("organizationId", "value");
CREATE INDEX "ProductBarcode_productId_idx" ON "ProductBarcode"("productId");
CREATE INDEX "ProductBarcode_organizationId_idx" ON "ProductBarcode"("organizationId");

CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");

DROP INDEX IF EXISTS "InventorySnapshot_storeId_productId_key";
DROP INDEX IF EXISTS "InventorySnapshot_storeId_productId_idx";
CREATE UNIQUE INDEX "InventorySnapshot_storeId_productId_variantKey_key" ON "InventorySnapshot"("storeId", "productId", "variantKey");
CREATE INDEX "InventorySnapshot_storeId_productId_variantKey_idx" ON "InventorySnapshot"("storeId", "productId", "variantKey");

DROP INDEX IF EXISTS "StockMovement_storeId_productId_createdAt_idx";
CREATE INDEX "StockMovement_storeId_productId_variantId_createdAt_idx" ON "StockMovement"("storeId", "productId", "variantId", "createdAt");

DROP INDEX IF EXISTS "PurchaseOrderLine_purchaseOrderId_productId_key";
CREATE UNIQUE INDEX "PurchaseOrderLine_purchaseOrderId_productId_variantKey_key" ON "PurchaseOrderLine"("purchaseOrderId", "productId", "variantKey");
