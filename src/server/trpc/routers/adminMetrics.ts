import { adminProcedure, router } from "@/server/trpc/trpc";
import { getAdminMetrics } from "@/server/services/adminMetrics";

export const adminMetricsRouter = router({
  get: adminProcedure.query(async ({ ctx }) => {
    return getAdminMetrics({ organizationId: ctx.user.organizationId });
  }),
});
