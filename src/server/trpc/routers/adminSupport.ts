import { z } from "zod";

import { adminProcedure, router } from "@/server/trpc/trpc";
import { toTRPCError } from "@/server/trpc/errors";
import { createImpersonationSession, revokeImpersonationSession } from "@/server/services/impersonation";
import { getSupportBundle } from "@/server/services/supportBundle";
import { listStoreFeatureFlags, upsertStoreFeatureFlag } from "@/server/services/storeFeatureFlags";

export const adminSupportRouter = router({
  storeFlags: adminProcedure.query(async ({ ctx }) => {
    return listStoreFeatureFlags({ organizationId: ctx.user.organizationId });
  }),

  upsertStoreFlag: adminProcedure
    .input(z.object({ storeId: z.string(), key: z.string().min(1), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await upsertStoreFeatureFlag({
          organizationId: ctx.user.organizationId,
          storeId: input.storeId,
          key: input.key,
          enabled: input.enabled,
          actorId: ctx.user.id,
          requestId: ctx.requestId,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  createImpersonation: adminProcedure
    .input(
      z.object({
        targetUserId: z.string(),
        ttlMinutes: z.number().min(5).max(240).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createImpersonationSession({
          organizationId: ctx.user.organizationId,
          createdById: ctx.user.id,
          targetUserId: input.targetUserId,
          ttlMinutes: input.ttlMinutes,
          requestId: ctx.requestId,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  revokeImpersonation: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await revokeImpersonationSession({
          organizationId: ctx.user.organizationId,
          actorId: ctx.user.id,
          sessionId: input.sessionId,
          requestId: ctx.requestId,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  exportBundle: adminProcedure.mutation(async ({ ctx }) => {
    return getSupportBundle({
      organizationId: ctx.user.organizationId,
      actorId: ctx.user.id,
      requestId: ctx.requestId,
    });
  }),
});
