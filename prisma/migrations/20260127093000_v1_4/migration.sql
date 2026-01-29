-- Add isActive to AttributeDefinition
ALTER TABLE "AttributeDefinition" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Create ImportBatch table
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" JSONB,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackById" TEXT,
    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_rolledBackById_fkey"
  FOREIGN KEY ("rolledBackById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ImportBatch_org_createdAt_idx" ON "ImportBatch"("organizationId", "createdAt");

-- Create ImportedEntity table
CREATE TABLE "ImportedEntity" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportedEntity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ImportedEntity" ADD CONSTRAINT "ImportedEntity_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ImportedEntity_batch_entity_key" ON "ImportedEntity"("batchId", "entityType", "entityId");
CREATE INDEX "ImportedEntity_entity_idx" ON "ImportedEntity"("entityType", "entityId");

-- Create ImportRollbackReport table
CREATE TABLE "ImportRollbackReport" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" JSONB,
    CONSTRAINT "ImportRollbackReport_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ImportRollbackReport" ADD CONSTRAINT "ImportRollbackReport_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportRollbackReport" ADD CONSTRAINT "ImportRollbackReport_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ImportRollbackReport_batchId_key" ON "ImportRollbackReport"("batchId");

-- Create OnboardingProgress table
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "OnboardingProgress_organizationId_key" ON "OnboardingProgress"("organizationId");
