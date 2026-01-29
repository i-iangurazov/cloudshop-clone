import { protectedProcedure, router } from "@/server/trpc/trpc";
import { getBillingSummary } from "@/server/services/billing";

export const billingRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return getBillingSummary({ organizationId: ctx.user.organizationId });
  }),
});
