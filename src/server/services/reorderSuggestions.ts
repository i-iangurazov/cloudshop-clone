import type { ForecastSnapshot, InventorySnapshot, ReorderPolicy } from "@prisma/client";

import { computeReorder } from "@/server/services/replenishment";

export type ReorderSuggestion = {
  demandDuringLeadTime: number;
  safetyStock: number;
  reorderPoint: number;
  targetLevel: number;
  suggestedOrderQty: number;
};

export const buildReorderSuggestion = (
  snapshot: InventorySnapshot,
  policy: ReorderPolicy | null,
  forecast: ForecastSnapshot | null,
): ReorderSuggestion | null => {
  if (!policy || !forecast) {
    return null;
  }

  return computeReorder({
    p50Daily: forecast.p50Daily,
    p90Daily: forecast.p90Daily,
    leadTimeDays: policy.leadTimeDays,
    reviewPeriodDays: policy.reviewPeriodDays,
    safetyStockDays: policy.safetyStockDays,
    onHand: snapshot.onHand,
    onOrder: snapshot.onOrder,
  });
};
