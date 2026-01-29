import type { Prisma } from "@prisma/client";

import { AppError } from "@/server/services/errors";

const resolveVariantKey = (variantId?: string | null) => variantId ?? "BASE";

export const updateProductCost = async (
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    productId: string;
    variantId?: string | null;
    qtyReceived: number;
    unitCost: number;
  },
) => {
  if (input.qtyReceived <= 0) {
    return null;
  }
  if (!Number.isFinite(input.unitCost) || input.unitCost < 0) {
    throw new AppError("unitCostInvalid", "BAD_REQUEST", 400);
  }

  const variantKey = resolveVariantKey(input.variantId);
  const existing = await tx.productCost.findUnique({
    where: {
      organizationId_productId_variantKey: {
        organizationId: input.organizationId,
        productId: input.productId,
        variantKey,
      },
    },
  });

  const prevQty = existing?.costBasisQty ?? 0;
  const prevAvg = existing ? Number(existing.avgCostKgs) : 0;
  const nextQty = prevQty + input.qtyReceived;
  const nextAvg = nextQty > 0 ? (prevAvg * prevQty + input.unitCost * input.qtyReceived) / nextQty : 0;

  const result = await tx.productCost.upsert({
    where: {
      organizationId_productId_variantKey: {
        organizationId: input.organizationId,
        productId: input.productId,
        variantKey,
      },
    },
    update: {
      avgCostKgs: nextAvg,
      costBasisQty: nextQty,
      lastReceiptAt: new Date(),
    },
    create: {
      organizationId: input.organizationId,
      productId: input.productId,
      variantId: input.variantId ?? undefined,
      variantKey,
      avgCostKgs: nextAvg,
      costBasisQty: nextQty,
      lastReceiptAt: new Date(),
    },
  });

  return result;
};
