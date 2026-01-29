-- Store legal entity details
CREATE TYPE "LegalEntityType" AS ENUM ('IP', 'OSOO', 'AO', 'OTHER');

ALTER TABLE "Store" ADD COLUMN "legalEntityType" "LegalEntityType";
ALTER TABLE "Store" ADD COLUMN "legalName" TEXT;
ALTER TABLE "Store" ADD COLUMN "inn" TEXT;
ALTER TABLE "Store" ADD COLUMN "address" TEXT;
ALTER TABLE "Store" ADD COLUMN "phone" TEXT;
