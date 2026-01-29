import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/services/errors";
import { writeAuditLog } from "@/server/services/audit";
import { toJson } from "@/server/services/json";

export type SetMinStockInput = {
  storeId: string;
  productId: string;
  minStock: number;
  organizationId: string;
  actorId: string;
  requestId: string;
};

export type SetDefaultMinStockInput = {
  storeId: string;
  minStock: number;
  organizationId: string;
  actorId: string;
  requestId: string;
};

const defaultPolicy = {
  leadTimeDays: 7,
  reviewPeriodDays: 7,
  safetyStockDays: 3,
  minOrderQty: 0,
};

export const setMinStock = async (input: SetMinStockInput) =>
  prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store || store.organizationId !== input.organizationId) {
      throw new AppError("storeNotFound", "NOT_FOUND", 404);
    }

    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product || product.organizationId !== input.organizationId || product.isDeleted) {
      throw new AppError("productNotFound", "NOT_FOUND", 404);
    }

    const before = await tx.reorderPolicy.findUnique({
      where: { storeId_productId: { storeId: input.storeId, productId: input.productId } },
    });

    const policy = await tx.reorderPolicy.upsert({
      where: { storeId_productId: { storeId: input.storeId, productId: input.productId } },
      update: { minStock: input.minStock },
      create: {
        storeId: input.storeId,
        productId: input.productId,
        minStock: input.minStock,
        ...defaultPolicy,
      },
    });

    await writeAuditLog(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "REORDER_POLICY_UPDATE",
      entity: "ReorderPolicy",
      entityId: policy.id,
      before: before ? toJson(before) : null,
      after: toJson(policy),
      requestId: input.requestId,
    });

    return policy;
  });

export const setDefaultMinStock = async (input: SetDefaultMinStockInput) =>
  prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store || store.organizationId !== input.organizationId) {
      throw new AppError("storeNotFound", "NOT_FOUND", 404);
    }

    const products = await tx.product.findMany({
      where: { organizationId: input.organizationId, isDeleted: false },
      select: { id: true },
    });

    for (const product of products) {
      await tx.reorderPolicy.upsert({
        where: { storeId_productId: { storeId: input.storeId, productId: product.id } },
        update: { minStock: input.minStock },
        create: {
          storeId: input.storeId,
          productId: product.id,
          minStock: input.minStock,
          ...defaultPolicy,
        },
      });
    }

    await writeAuditLog(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "REORDER_POLICY_BULK_SET",
      entity: "Store",
      entityId: store.id,
      before: null,
      after: toJson({ storeId: store.id, minStock: input.minStock, count: products.length }),
      requestId: input.requestId,
    });

    return { count: products.length };
  });
