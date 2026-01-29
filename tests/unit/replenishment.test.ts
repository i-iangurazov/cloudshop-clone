import { describe, expect, it } from "vitest";

import { computeReorder } from "@/server/services/replenishment";

describe("replenishment", () => {
  it("computes reorder suggestion deterministically", () => {
    const result = computeReorder({
      p50Daily: 5,
      p90Daily: 8,
      leadTimeDays: 4,
      reviewPeriodDays: 7,
      safetyStockDays: 2,
      onHand: 10,
      onOrder: 5,
    });

    expect(result.demandDuringLeadTime).toBe(20);
    expect(result.safetyStock).toBe(22);
    expect(result.reorderPoint).toBe(42);
    expect(result.targetLevel).toBe(77);
    expect(result.suggestedOrderQty).toBe(62);
  });

  it("never suggests negative order quantities", () => {
    const result = computeReorder({
      p50Daily: 2,
      p90Daily: 3,
      leadTimeDays: 3,
      reviewPeriodDays: 7,
      safetyStockDays: 1,
      onHand: 100,
      onOrder: 10,
    });

    expect(result.suggestedOrderQty).toBeGreaterThanOrEqual(0);
  });
});
