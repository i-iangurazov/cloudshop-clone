-- AlterEnum
ALTER TYPE "PurchaseOrderStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredLocale" TEXT NOT NULL DEFAULT 'ru';

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "receivedEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_receivedEventId_key" ON "PurchaseOrder"("receivedEventId");

-- AlterTable
ALTER TABLE "IdempotencyKey" RENAME COLUMN "action" TO "route";
ALTER TABLE "IdempotencyKey" DROP COLUMN IF EXISTS "requestId";
ALTER TABLE "IdempotencyKey" ADD COLUMN IF NOT EXISTS "responseHash" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "IdempotencyKey_key_action_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyKey_key_route_userId_key" ON "IdempotencyKey"("key", "route", "userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventorysnapshot_nonnegative_check'
  ) THEN
    ALTER TABLE "InventorySnapshot"
    ADD CONSTRAINT "inventorysnapshot_nonnegative_check"
    CHECK ("allowNegativeStock" OR "onHand" >= 0);
  END IF;
END
$$;
