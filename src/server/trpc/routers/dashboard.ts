import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "@/server/trpc/trpc";
import { buildReorderSuggestion } from "@/server/services/reorderSuggestions";
import { enrichRecentActivity } from "@/server/services/activity";

export const dashboardRouter = router({
  summary: protectedProcedure
    .input(z.object({ storeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const store = await ctx.prisma.store.findUnique({ where: { id: input.storeId } });
      if (!store || store.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "storeAccessDenied" });
      }

      const snapshots = await ctx.prisma.inventorySnapshot.findMany({
        where: { storeId: input.storeId, product: { isDeleted: false } },
        include: { product: true, variant: true },
        orderBy: { updatedAt: "desc" },
      });

      const productIds = snapshots.map((snapshot) => snapshot.productId);
      const policies = await ctx.prisma.reorderPolicy.findMany({
        where: { storeId: input.storeId, productId: { in: productIds } },
      });
      const forecasts = await ctx.prisma.forecastSnapshot.findMany({
        where: { storeId: input.storeId, productId: { in: productIds } },
        orderBy: { generatedAt: "desc" },
        distinct: ["productId"],
      });

      const policyMap = new Map(policies.map((policy) => [policy.productId, policy]));
      const forecastMap = new Map(
        forecasts.map((forecast) => [forecast.productId, forecast]),
      );

      const lowStock = snapshots
        .map((snapshot) => {
          const policy = policyMap.get(snapshot.productId) ?? null;
          const minStock = policy?.minStock ?? 0;
          return {
            snapshot,
            product: snapshot.product,
            variant: snapshot.variant,
            minStock,
            lowStock: minStock > 0 && snapshot.onHand <= minStock,
            reorder: buildReorderSuggestion(
              snapshot,
              policy,
              forecastMap.get(snapshot.productId) ?? null,
            ),
          };
        })
        .filter((item) => item.lowStock)
        .slice(0, 5);

      const recentMovements = await ctx.prisma.stockMovement.findMany({
        where: { storeId: input.storeId },
        include: {
          product: true,
          variant: true,
          createdBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      });

      const pendingPurchaseOrders = await ctx.prisma.purchaseOrder.findMany({
        where: {
          organizationId: ctx.user.organizationId,
          status: { in: ["SUBMITTED", "APPROVED"] },
        },
        include: { supplier: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      const recentActivityLogs = await ctx.prisma.auditLog.findMany({
        where: { organizationId: ctx.user.organizationId },
        include: {
          actor: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      });

      const recentActivity = await enrichRecentActivity(ctx.prisma, recentActivityLogs);

      return { lowStock, pendingPurchaseOrders, recentActivity, recentMovements };
    }),
});
