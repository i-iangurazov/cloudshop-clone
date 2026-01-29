import { z } from "zod";

import { adminProcedure, router } from "@/server/trpc/trpc";
import { toTRPCError } from "@/server/trpc/errors";
import { listDeadLetterJobs, retryDeadLetterJob, resolveDeadLetterJob } from "@/server/services/deadLetterJobs";

export const adminJobsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return listDeadLetterJobs({ organizationId: ctx.user.organizationId });
  }),

  retry: adminProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await retryDeadLetterJob({
          jobId: input.jobId,
          actorId: ctx.user.id,
          organizationId: ctx.user.organizationId,
          requestId: ctx.requestId,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  resolve: adminProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await resolveDeadLetterJob({
          jobId: input.jobId,
          actorId: ctx.user.id,
          organizationId: ctx.user.organizationId,
          requestId: ctx.requestId,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),
});
