import { z } from "zod";

import { adminProcedure, router } from "@/server/trpc/trpc";
import { toTRPCError } from "@/server/trpc/errors";
import { completeOnboardingStep, getOnboardingProgress, skipOnboardingStep } from "@/server/services/onboarding";

const stepSchema = z.enum([
  "store",
  "users",
  "catalog",
  "inventory",
  "procurement",
  "receive",
]);

export const onboardingRouter = router({
  get: adminProcedure.query(async ({ ctx }) => {
    try {
      return await getOnboardingProgress({ organizationId: ctx.user.organizationId });
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  completeStep: adminProcedure
    .input(z.object({ step: stepSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await completeOnboardingStep({
          organizationId: ctx.user.organizationId,
          step: input.step,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  skipStep: adminProcedure
    .input(z.object({ step: stepSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await skipOnboardingStep({
          organizationId: ctx.user.organizationId,
          step: input.step,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),
});
