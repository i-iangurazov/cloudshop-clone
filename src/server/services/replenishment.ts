export type ReorderInputs = {
  p50Daily: number;
  p90Daily: number;
  leadTimeDays: number;
  reviewPeriodDays: number;
  safetyStockDays: number;
  onHand: number;
  onOrder: number;
};

export type ReorderResult = {
  demandDuringLeadTime: number;
  safetyStock: number;
  reorderPoint: number;
  targetLevel: number;
  suggestedOrderQty: number;
};

export const computeReorder = (inputs: ReorderInputs): ReorderResult => {
  const demandDuringLeadTime = inputs.p50Daily * inputs.leadTimeDays;
  const safetyStock =
    (inputs.p90Daily - inputs.p50Daily) * inputs.leadTimeDays +
    inputs.safetyStockDays * inputs.p50Daily;
  const reorderPoint = demandDuringLeadTime + safetyStock;
  const targetLevel = reorderPoint + inputs.reviewPeriodDays * inputs.p50Daily;
  const suggestedOrderQty = Math.max(0, Math.ceil(targetLevel - (inputs.onHand + inputs.onOrder)));

  return {
    demandDuringLeadTime,
    safetyStock,
    reorderPoint,
    targetLevel,
    suggestedOrderQty,
  };
};
