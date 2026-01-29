import { z } from "zod";

import { managerProcedure, router } from "@/server/trpc/trpc";
import { toTRPCError } from "@/server/trpc/errors";
import {
  getShrinkageReport,
  getSlowMoversReport,
  getStockoutsReport,
} from "@/server/services/reports";

const rangeSchema = z.object({
  storeId: z.string().optional(),
  days: z.number().min(7).max(365).optional(),
});

const resolveRange = (days?: number) => {
  const safeDays = days ?? 30;
  const to = new Date();
  const from = new Date(to.getTime() - safeDays * 24 * 60 * 60 * 1000);
  return { from, to };
};

export const reportsRouter = router({
  stockouts: managerProcedure.input(rangeSchema).query(async ({ ctx, input }) => {
    try {
      const range = resolveRange(input.days);
      return await getStockoutsReport({
        organizationId: ctx.user.organizationId,
        storeId: input.storeId,
        ...range,
      });
    } catch (error) {
      throw toTRPCError(error);
    }
  }),
  slowMovers: managerProcedure.input(rangeSchema).query(async ({ ctx, input }) => {
    try {
      const range = resolveRange(input.days);
      return await getSlowMoversReport({
        organizationId: ctx.user.organizationId,
        storeId: input.storeId,
        ...range,
      });
    } catch (error) {
      throw toTRPCError(error);
    }
  }),
  shrinkage: managerProcedure.input(rangeSchema).query(async ({ ctx, input }) => {
    try {
      const range = resolveRange(input.days);
      return await getShrinkageReport({
        organizationId: ctx.user.organizationId,
        storeId: input.storeId,
        ...range,
      });
    } catch (error) {
      throw toTRPCError(error);
    }
  }),
});
