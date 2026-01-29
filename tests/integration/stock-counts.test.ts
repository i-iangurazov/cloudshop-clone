import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/prisma";
import { createProduct } from "@/server/services/products";
import { adjustStock } from "@/server/services/inventory";
import { addOrUpdateLineByScan, applyStockCount, createStockCount } from "@/server/services/stockCounts";
import { resetDatabase, seedBase, shouldRunDbTests } from "../helpers/db";

const describeDb = shouldRunDbTests ? describe : describe.skip;

describeDb("stock counts", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("applies counts idempotently", async () => {
    const { org, store, adminUser, baseUnit } = await seedBase();

    const product = await createProduct({
      organizationId: org.id,
      actorId: adminUser.id,
      requestId: "req-stock-count-product",
      sku: "SC-100",
      name: "Counted Product",
      baseUnitId: baseUnit.id,
      barcodes: ["BC-COUNT-1"],
    });

    await adjustStock({
      storeId: store.id,
      productId: product.id,
      qtyDelta: 5,
      reason: "Seed stock",
      actorId: adminUser.id,
      organizationId: org.id,
      requestId: "req-stock-count-seed",
      idempotencyKey: "idem-stock-count-seed",
    });

    const count = await createStockCount({
      storeId: store.id,
      notes: "Cycle count",
      actorId: adminUser.id,
      organizationId: org.id,
      requestId: "req-stock-count-create",
    });

    const line = await addOrUpdateLineByScan({
      stockCountId: count.id,
      storeId: store.id,
      barcodeOrQuery: "BC-COUNT-1",
      mode: "set",
      countedQty: 7,
      actorId: adminUser.id,
      organizationId: org.id,
      requestId: "req-stock-count-line",
    });

    expect(line.countedQty).toBe(7);

    await applyStockCount({
      stockCountId: count.id,
      actorId: adminUser.id,
      organizationId: org.id,
      requestId: "req-stock-count-apply-1",
      idempotencyKey: "idem-stock-count-apply",
    });

    await applyStockCount({
      stockCountId: count.id,
      actorId: adminUser.id,
      organizationId: org.id,
      requestId: "req-stock-count-apply-2",
      idempotencyKey: "idem-stock-count-apply",
    });

    const movements = await prisma.stockMovement.findMany({
      where: {
        storeId: store.id,
        productId: product.id,
        referenceType: "STOCK_COUNT",
        referenceId: count.id,
      },
    });

    expect(movements).toHaveLength(1);

    const snapshot = await prisma.inventorySnapshot.findUnique({
      where: {
        storeId_productId_variantKey: {
          storeId: store.id,
          productId: product.id,
          variantKey: "BASE",
        },
      },
    });

    expect(snapshot?.onHand).toBe(7);
  });
});
