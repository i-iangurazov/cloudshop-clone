import { beforeEach, describe, expect, it } from "vitest";

import { createProduct } from "@/server/services/products";
import { adjustStock } from "@/server/services/inventory";
import {
  getShrinkageReport,
  getSlowMoversReport,
  getStockoutsReport,
} from "@/server/services/reports";
import { resetDatabase, seedBase, shouldRunDbTests } from "../helpers/db";

const describeDb = shouldRunDbTests ? describe : describe.skip;

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

describeDb("reports", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns stockouts, slow movers, and shrinkage data", async () => {
    const { org, store, adminUser, baseUnit } = await seedBase();

    const stockoutProduct = await createProduct({
      organizationId: org.id,
      actorId: adminUser.id,
      requestId: "req-report-product-1",
      sku: "SKU-REPORT-1",
      name: "Report Product 1",
      baseUnitId: baseUnit.id,
    });

    await adjustStock({
      storeId: store.id,
      productId: stockoutProduct.id,
      qtyDelta: 5,
      reason: "Seed",
      actorId: adminUser.id,
      organizationId: org.id,
      requestId: "req-report-adjust-1",
      idempotencyKey: "idem-report-adjust-1",
    });

    await adjustStock({
      storeId: store.id,
      productId: stockoutProduct.id,
      qtyDelta: -5,
      reason: "Stockout",
      actorId: adminUser.id,
      organizationId: org.id,
      requestId: "req-report-adjust-2",
      idempotencyKey: "idem-report-adjust-2",
    });

    const slowProduct = await createProduct({
      organizationId: org.id,
      actorId: adminUser.id,
      requestId: "req-report-product-2",
      sku: "SKU-REPORT-2",
      name: "Report Product 2",
      baseUnitId: baseUnit.id,
    });

    const range = { from: daysAgo(30), to: new Date() };

    const stockouts = await getStockoutsReport({
      organizationId: org.id,
      storeId: store.id,
      ...range,
    });
    expect(stockouts.some((row) => row.productId === stockoutProduct.id && row.count === 1)).toBe(
      true,
    );

    const slowMovers = await getSlowMoversReport({
      organizationId: org.id,
      storeId: store.id,
      ...range,
    });
    expect(slowMovers.some((row) => row.productId === slowProduct.id)).toBe(true);

    const shrinkage = await getShrinkageReport({
      organizationId: org.id,
      storeId: store.id,
      ...range,
    });
    expect(shrinkage.some((row) => row.productId === stockoutProduct.id && row.totalQty === 5)).toBe(
      true,
    );
  });
});
