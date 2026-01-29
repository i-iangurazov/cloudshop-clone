import { protectedProcedure, router } from "@/server/trpc/trpc";

export const impersonationRouter = router({
  status: protectedProcedure.query(({ ctx }) => {
    if (!ctx.impersonator || !ctx.impersonationSessionId) {
      return { active: false };
    }
    return {
      active: true,
      sessionId: ctx.impersonationSessionId,
      impersonator: {
        id: ctx.impersonator.id,
        email: ctx.impersonator.email,
        role: ctx.impersonator.role,
      },
    };
  }),
});
