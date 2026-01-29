import { prisma } from "@/server/db/prisma";
import { getLimitsForPlan } from "@/server/services/planLimits";

export const getBillingSummary = async (input: { organizationId: string }) => {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, name: true, plan: true, trialEndsAt: true, createdAt: true },
  });
  if (!org) {
    return null;
  }

  const [stores, users, products] = await Promise.all([
    prisma.store.count({ where: { organizationId: org.id } }),
    prisma.user.count({ where: { organizationId: org.id } }),
    prisma.product.count({ where: { organizationId: org.id } }),
  ]);

  const limits = getLimitsForPlan(org.plan);
  const trialExpired =
    org.plan === "TRIAL" && org.trialEndsAt ? org.trialEndsAt < new Date() : false;

  return {
    organizationId: org.id,
    plan: org.plan,
    trialEndsAt: org.trialEndsAt,
    trialExpired,
    usage: { stores, users, products },
    limits,
  };
};
