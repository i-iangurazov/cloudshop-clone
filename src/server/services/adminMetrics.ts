import { prisma } from "@/server/db/prisma";
import type { ProductEventType } from "@/server/services/productEvents";

const FIRST_VALUE_EVENTS: ProductEventType[] = [
  "first_product_created",
  "first_import_completed",
  "first_po_created",
  "first_po_received",
  "first_price_tags_printed",
];

export const getAdminMetrics = async (input: { organizationId: string }) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const onboardingProgress = await prisma.onboardingProgress.findUnique({
    where: { organizationId: input.organizationId },
    select: { completedAt: true },
  });

  const onboardingStarted = await prisma.productEvent.findFirst({
    where: { organizationId: input.organizationId, type: "onboarding_started" },
    orderBy: { createdAt: "asc" },
  });

  const firstValue = await prisma.productEvent.findFirst({
    where: { organizationId: input.organizationId, type: { in: FIRST_VALUE_EVENTS } },
    orderBy: { createdAt: "asc" },
  });

  const timeToFirstValueHours =
    onboardingStarted && firstValue
      ? (firstValue.createdAt.getTime() - onboardingStarted.createdAt.getTime()) / (1000 * 60 * 60)
      : null;

  const wauUsers = await prisma.productEvent.groupBy({
    by: ["actorId"],
    where: {
      organizationId: input.organizationId,
      actorId: { not: null },
      createdAt: { gte: sevenDaysAgo },
    },
  });

  const adjustments30d = await prisma.stockMovement.count({
    where: {
      store: { organizationId: input.organizationId },
      type: "ADJUSTMENT",
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  const stockoutsCurrent = await prisma.inventorySnapshot.count({
    where: {
      store: { organizationId: input.organizationId },
      onHand: { lte: 0 },
    },
  });

  return {
    onboardingCompleted: Boolean(onboardingProgress?.completedAt),
    onboardingCompletedAt: onboardingProgress?.completedAt ?? null,
    onboardingStartedAt: onboardingStarted?.createdAt ?? null,
    firstValueAt: firstValue?.createdAt ?? null,
    firstValueType: firstValue?.type ?? null,
    timeToFirstValueHours,
    weeklyActiveUsers: wauUsers.length,
    adjustments30d,
    stockoutsCurrent,
  };
};
