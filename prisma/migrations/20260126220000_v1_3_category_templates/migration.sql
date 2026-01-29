-- Create CategoryAttributeTemplate table
CREATE TABLE "CategoryAttributeTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "attributeKey" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CategoryAttributeTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CategoryAttributeTemplate" ADD CONSTRAINT "CategoryAttributeTemplate_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CategoryAttributeTemplate" ADD CONSTRAINT "CategoryAttributeTemplate_definition_fkey"
  FOREIGN KEY ("organizationId", "attributeKey") REFERENCES "AttributeDefinition"("organizationId", "key") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CategoryAttributeTemplate_org_category_key_key"
  ON "CategoryAttributeTemplate"("organizationId", "category", "attributeKey");
CREATE INDEX "CategoryAttributeTemplate_org_category_idx"
  ON "CategoryAttributeTemplate"("organizationId", "category");
