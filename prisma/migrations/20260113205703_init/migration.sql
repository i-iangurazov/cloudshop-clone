-- DropForeignKey
ALTER TABLE IF EXISTS "ProductBarcode" DROP CONSTRAINT IF EXISTS "ProductBarcode_productId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ProductVariant" DROP CONSTRAINT IF EXISTS "ProductVariant_productId_fkey";

-- AddForeignKey
ALTER TABLE IF EXISTS "ProductBarcode" ADD CONSTRAINT "ProductBarcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
