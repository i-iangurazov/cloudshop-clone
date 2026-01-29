-- Create DeadLetterJob table
CREATE TABLE "DeadLetterJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "jobName" TEXT NOT NULL,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT NOT NULL,
    "lastErrorAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeadLetterJob_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DeadLetterJob" ADD CONSTRAINT "DeadLetterJob_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeadLetterJob" ADD CONSTRAINT "DeadLetterJob_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DeadLetterJob_jobName_lastErrorAt_idx" ON "DeadLetterJob"("jobName", "lastErrorAt");
CREATE INDEX "DeadLetterJob_resolvedAt_idx" ON "DeadLetterJob"("resolvedAt");

-- Create StoreFeatureFlag table
CREATE TABLE "StoreFeatureFlag" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoreFeatureFlag_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StoreFeatureFlag" ADD CONSTRAINT "StoreFeatureFlag_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoreFeatureFlag" ADD CONSTRAINT "StoreFeatureFlag_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "StoreFeatureFlag_storeId_key_key" ON "StoreFeatureFlag"("storeId", "key");
CREATE INDEX "StoreFeatureFlag_storeId_idx" ON "StoreFeatureFlag"("storeId");

-- Create ProductEvent table
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ProductEvent_org_type_createdAt_idx" ON "ProductEvent"("organizationId", "type", "createdAt");

-- Create ImpersonationSession table
CREATE TABLE "ImpersonationSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "ImpersonationSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ImpersonationSession_org_createdAt_idx" ON "ImpersonationSession"("organizationId", "createdAt");
CREATE INDEX "ImpersonationSession_targetUserId_idx" ON "ImpersonationSession"("targetUserId");
CREATE INDEX "ImpersonationSession_expiresAt_idx" ON "ImpersonationSession"("expiresAt");
