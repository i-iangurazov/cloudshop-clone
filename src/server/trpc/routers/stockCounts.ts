import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { managerProcedure, protectedProcedure, rateLimit, router } from "@/server/trpc/trpc";
import { toTRPCError } from "@/server/trpc/errors";
import {
  addOrUpdateLineByScan,
  applyStockCount,
  cancelStockCount,
  createStockCount,
  removeLine,
  setLineCountedQty,
} from "@/server/services/stockCounts";

export const stockCountsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        storeId: z.string(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "APPLIED", "CANCELLED"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const store = await ctx.prisma.store.findUnique({ where: { id: input.storeId } });
      if (!store || store.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "storeAccessDenied" });
      }

      return ctx.prisma.stockCount.findMany({
        where: {
          organizationId: ctx.user.organizationId,
          storeId: input.storeId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          _count: { select: { lines: true } },
          createdBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ stockCountId: z.string() }))
    .query(async ({ ctx, input }) => {
      const count = await ctx.prisma.stockCount.findFirst({
        where: { id: input.stockCountId, organizationId: ctx.user.organizationId },
        include: {
          store: true,
          createdBy: { select: { name: true, email: true } },
          appliedBy: { select: { name: true, email: true } },
          lines: {
            include: { product: true, variant: true },
            orderBy: { updatedAt: "desc" },
          },
        },
      });

      if (!count) {
        return null;
      }

      const totalLines = count.lines.length;
      const varianceLines = count.lines.filter((line) => line.deltaQty !== 0);
      const overages = varianceLines.filter((line) => line.deltaQty > 0).length;
      const shortages = varianceLines.filter((line) => line.deltaQty < 0).length;

      return {
        ...count,
        summary: {
          totalLines,
          varianceLines: varianceLines.length,
          overages,
          shortages,
        },
      };
    }),

  create: protectedProcedure
    .input(z.object({ storeId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await createStockCount({
          storeId: input.storeId,
          notes: input.notes,
          actorId: ctx.user.id,
          organizationId: ctx.user.organizationId,
          requestId: ctx.requestId,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  addOrUpdateLineByScan: protectedProcedure
    .use(rateLimit({ windowMs: 10_000, max: 60, prefix: "stockcount-scan" }))
    .input(
      z.object({
        stockCountId: z.string(),
        storeId: z.string(),
        barcodeOrQuery: z.string().min(1),
        mode: z.enum(["increment", "set"]).optional().default("increment"),
        countedQty: z.number().int().optional(),
        countedDelta: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await addOrUpdateLineByScan({
          stockCountId: input.stockCountId,
          storeId: input.storeId,
          barcodeOrQuery: input.barcodeOrQuery,
          mode: input.mode,
          countedQty: input.countedQty,
          countedDelta: input.countedDelta,
          actorId: ctx.user.id,
          organizationId: ctx.user.organizationId,
          requestId: ctx.requestId,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  setLineCountedQty: protectedProcedure
    .input(z.object({ lineId: z.string(), countedQty: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await setLineCountedQty({
          lineId: input.lineId,
          countedQty: input.countedQty,
          actorId: ctx.user.id,
          organizationId: ctx.user.organizationId,
          requestId: ctx.requestId,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  removeLine: protectedProcedure
    .input(z.object({ lineId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeLine({
          lineId: input.lineId,
          actorId: ctx.user.id,
          organizationId: ctx.user.organizationId,
          requestId: ctx.requestId,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  apply: managerProcedure
    .input(z.object({ stockCountId: z.string(), idempotencyKey: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await applyStockCount({
          stockCountId: input.stockCountId,
          actorId: ctx.user.id,
          organizationId: ctx.user.organizationId,
          requestId: ctx.requestId,
          idempotencyKey: input.idempotencyKey,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  cancel: managerProcedure
    .input(z.object({ stockCountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await cancelStockCount({
          stockCountId: input.stockCountId,
          actorId: ctx.user.id,
          organizationId: ctx.user.organizationId,
          requestId: ctx.requestId,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),
});
