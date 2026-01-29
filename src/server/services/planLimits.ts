import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/services/errors";

const TRIAL_LIMITS = {
  maxStores: 3,
  maxUsers: 10,
  maxProducts: 1000,
};

const PRO_LIMITS = {
  maxStores: 50,
  maxUsers: 200,
  maxProducts: 50000,
};

export type PlanLimits = typeof TRIAL_LIMITS;

export const getLimitsForPlan = (plan: "TRIAL" | "PRO"): PlanLimits =>
  plan === "PRO" ? PRO_LIMITS : TRIAL_LIMITS;

export const getOrganizationPlan = async (organizationId: string) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, plan: true, trialEndsAt: true },
  });
  if (!org) {
    throw new AppError("orgNotFound", "NOT_FOUND", 404);
  }
  return org;
};

export const assertTrialActive = async (organizationId: string) => {
  const org = await getOrganizationPlan(organizationId);
  if (org.plan === "PRO") {
    return org;
  }
  if (org.trialEndsAt && org.trialEndsAt < new Date()) {
    throw new AppError("trialExpired", "FORBIDDEN", 403);
  }
  return org;
};

export const assertCapacity = async (input: {
  organizationId: string;
  kind: "stores" | "users" | "products";
  add: number;
}) => {
  const org = await getOrganizationPlan(input.organizationId);
  const limits = getLimitsForPlan(org.plan);
  const limit =
    input.kind === "stores"
      ? limits.maxStores
      : input.kind === "users"
        ? limits.maxUsers
        : limits.maxProducts;

  let count = 0;
  if (input.kind === "stores") {
    count = await prisma.store.count({ where: { organizationId: input.organizationId } });
  } else if (input.kind === "users") {
    count = await prisma.user.count({ where: { organizationId: input.organizationId } });
  } else {
    count = await prisma.product.count({ where: { organizationId: input.organizationId } });
  }

  if (count + input.add > limit) {
    throw new AppError("planLimitReached", "CONFLICT", 409);
  }

  return { org, limits, count, limit };
};

export const assertWithinLimits = async (input: {
  organizationId: string;
  kind: "stores" | "users" | "products";
}) => assertCapacity({ organizationId: input.organizationId, kind: input.kind, add: 1 });
