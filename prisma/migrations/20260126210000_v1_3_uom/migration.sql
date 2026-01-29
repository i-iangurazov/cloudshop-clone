-- Create Unit table
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelRu" TEXT NOT NULL,
    "labelKg" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- Create ProductPack table
CREATE TABLE "ProductPack" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "packName" TEXT NOT NULL,
    "packBarcode" TEXT,
    "multiplierToBase" INTEGER NOT NULL,
    "allowInPurchasing" BOOLEAN NOT NULL DEFAULT true,
    "allowInReceiving" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductPack_pkey" PRIMARY KEY ("id")
);

-- Add baseUnitId to Product
ALTER TABLE "Product" ADD COLUMN "baseUnitId" TEXT;

-- Seed Units from existing Product.unit values
INSERT INTO "Unit" ("id", "organizationId", "code", "labelRu", "labelKg", "createdAt", "updatedAt")
SELECT
  "organizationId" || ':' || "unit",
  "organizationId",
  "unit",
  "unit",
  "unit",
  NOW(),
  NOW()
FROM "Product"
GROUP BY "organizationId", "unit";

-- Backfill Product.baseUnitId
UPDATE "Product"
SET "baseUnitId" = "Unit"."id"
FROM "Unit"
WHERE "Product"."organizationId" = "Unit"."organizationId"
  AND "Product"."unit" = "Unit"."code";

-- Enforce baseUnitId not null
ALTER TABLE "Product" ALTER COLUMN "baseUnitId" SET NOT NULL;

-- Constraints and indexes
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_baseUnitId_fkey"
  FOREIGN KEY ("baseUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductPack" ADD CONSTRAINT "ProductPack_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductPack" ADD CONSTRAINT "ProductPack_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Unit_organizationId_code_key" ON "Unit"("organizationId", "code");
CREATE UNIQUE INDEX "ProductPack_productId_packName_key" ON "ProductPack"("productId", "packName");
CREATE UNIQUE INDEX "ProductPack_organizationId_packBarcode_key" ON "ProductPack"("organizationId", "packBarcode");
CREATE INDEX "Unit_organizationId_idx" ON "Unit"("organizationId");
CREATE INDEX "ProductPack_organizationId_idx" ON "ProductPack"("organizationId");
CREATE INDEX "ProductPack_productId_idx" ON "ProductPack"("productId");
