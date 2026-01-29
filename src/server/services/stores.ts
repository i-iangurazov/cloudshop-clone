import type { LegalEntityType } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/services/errors";
import { writeAuditLog } from "@/server/services/audit";
import { toJson } from "@/server/services/json";
import { assertWithinLimits } from "@/server/services/planLimits";

export type UpdateStorePolicyInput = {
  storeId: string;
  allowNegativeStock: boolean;
  trackExpiryLots: boolean;
  organizationId: string;
  actorId: string;
  requestId: string;
};

export type CreateStoreInput = {
  organizationId: string;
  actorId: string;
  requestId: string;
  name: string;
  code: string;
  allowNegativeStock: boolean;
  trackExpiryLots: boolean;
  legalEntityType?: LegalEntityType | null;
  legalName?: string | null;
  inn?: string | null;
  address?: string | null;
  phone?: string | null;
};

export const createStore = async (input: CreateStoreInput) =>
  prisma.$transaction(async (tx) => {
    await assertWithinLimits({ organizationId: input.organizationId, kind: "stores" });
    const inn = normalizeOptional(input.inn);
    if (inn && !/^\d{10,14}$/.test(inn)) {
      throw new AppError("invalidInn", "BAD_REQUEST", 400);
    }

    const store = await tx.store.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        code: input.code,
        allowNegativeStock: input.allowNegativeStock,
        trackExpiryLots: input.trackExpiryLots,
        legalEntityType: input.legalEntityType ?? null,
        legalName: normalizeOptional(input.legalName),
        inn,
        address: normalizeOptional(input.address),
        phone: normalizeOptional(input.phone),
      },
    });

    await writeAuditLog(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "STORE_CREATE",
      entity: "Store",
      entityId: store.id,
      before: null,
      after: toJson(store),
      requestId: input.requestId,
    });

    return store;
  });

export type UpdateStoreInput = {
  storeId: string;
  organizationId: string;
  actorId: string;
  requestId: string;
  name: string;
  code: string;
};

export const updateStore = async (input: UpdateStoreInput) =>
  prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store || store.organizationId !== input.organizationId) {
      throw new AppError("storeNotFound", "NOT_FOUND", 404);
    }

    const updated = await tx.store.update({
      where: { id: input.storeId },
      data: { name: input.name, code: input.code },
    });

    await writeAuditLog(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "STORE_UPDATE",
      entity: "Store",
      entityId: updated.id,
      before: toJson(store),
      after: toJson(updated),
      requestId: input.requestId,
    });

    return updated;
  });

export const updateStorePolicy = async (input: UpdateStorePolicyInput) =>
  prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store || store.organizationId !== input.organizationId) {
      throw new AppError("storeNotFound", "NOT_FOUND", 404);
    }

    const updated = await tx.store.update({
      where: { id: input.storeId },
      data: { allowNegativeStock: input.allowNegativeStock, trackExpiryLots: input.trackExpiryLots },
    });

    await tx.inventorySnapshot.updateMany({
      where: { storeId: input.storeId },
      data: { allowNegativeStock: input.allowNegativeStock },
    });

    await writeAuditLog(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "STORE_POLICY_UPDATE",
      entity: "Store",
      entityId: updated.id,
      before: toJson(store),
      after: toJson(updated),
      requestId: input.requestId,
    });

    return updated;
  });

export type UpdateStoreLegalDetailsInput = {
  storeId: string;
  organizationId: string;
  actorId: string;
  requestId: string;
  legalEntityType?: LegalEntityType | null;
  legalName?: string | null;
  inn?: string | null;
  address?: string | null;
  phone?: string | null;
};

const normalizeOptional = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const updateStoreLegalDetails = async (input: UpdateStoreLegalDetailsInput) =>
  prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store || store.organizationId !== input.organizationId) {
      throw new AppError("storeNotFound", "NOT_FOUND", 404);
    }

    const inn = normalizeOptional(input.inn);
    if (inn && !/^\d{10,14}$/.test(inn)) {
      throw new AppError("invalidInn", "BAD_REQUEST", 400);
    }

    const updated = await tx.store.update({
      where: { id: input.storeId },
      data: {
        legalEntityType: input.legalEntityType ?? null,
        legalName: normalizeOptional(input.legalName),
        inn,
        address: normalizeOptional(input.address),
        phone: normalizeOptional(input.phone),
      },
    });

    await writeAuditLog(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "STORE_LEGAL_UPDATE",
      entity: "Store",
      entityId: updated.id,
      before: toJson(store),
      after: toJson(updated),
      requestId: input.requestId,
    });

    return updated;
  });
