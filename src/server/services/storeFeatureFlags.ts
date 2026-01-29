import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/services/errors";
import { writeAuditLog } from "@/server/services/audit";
import { toJson } from "@/server/services/json";

export const listStoreFeatureFlags = async (input: { organizationId: string }) =>
  prisma.store.findMany({
    where: { organizationId: input.organizationId },
    orderBy: { createdAt: "asc" },
    include: {
      featureFlags: { orderBy: { key: "asc" } },
    },
  });

export const upsertStoreFeatureFlag = async (input: {
  organizationId: string;
  storeId: string;
  key: string;
  enabled: boolean;
  actorId: string;
  requestId: string;
}) =>
  prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store || store.organizationId !== input.organizationId) {
      throw new AppError("storeNotFound", "NOT_FOUND", 404);
    }

    const flagKey = input.key.trim();
    if (!flagKey) {
      throw new AppError("featureFlagInvalid", "BAD_REQUEST", 400);
    }

    const existing = await tx.storeFeatureFlag.findUnique({
      where: { storeId_key: { storeId: input.storeId, key: flagKey } },
    });

    const updated = await tx.storeFeatureFlag.upsert({
      where: { storeId_key: { storeId: input.storeId, key: flagKey } },
      create: {
        storeId: input.storeId,
        key: flagKey,
        enabled: input.enabled,
        updatedById: input.actorId,
      },
      update: {
        enabled: input.enabled,
        updatedById: input.actorId,
      },
    });

    await writeAuditLog(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: existing ? "STORE_FEATURE_FLAG_UPDATE" : "STORE_FEATURE_FLAG_CREATE",
      entity: "StoreFeatureFlag",
      entityId: updated.id,
      before: existing ? toJson(existing) : undefined,
      after: toJson(updated),
      requestId: input.requestId,
    });

    return updated;
  });
