import { PurchaseOrderStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/services/errors";
import { recordFirstEvent } from "@/server/services/productEvents";

export type OnboardingStep =
  | "store"
  | "users"
  | "catalog"
  | "inventory"
  | "procurement"
  | "receive";

export type OnboardingStepStatus = "pending" | "completed" | "skipped";

export type OnboardingSteps = Record<OnboardingStep, OnboardingStepStatus>;

const defaultSteps: OnboardingSteps = {
  store: "pending",
  users: "pending",
  catalog: "pending",
  inventory: "pending",
  procurement: "pending",
  receive: "pending",
};

const resolveSteps = (steps?: unknown): OnboardingSteps => {
  if (!steps || typeof steps !== "object") {
    return { ...defaultSteps };
  }
  return {
    store: (steps as OnboardingSteps).store ?? "pending",
    users: (steps as OnboardingSteps).users ?? "pending",
    catalog: (steps as OnboardingSteps).catalog ?? "pending",
    inventory: (steps as OnboardingSteps).inventory ?? "pending",
    procurement: (steps as OnboardingSteps).procurement ?? "pending",
    receive: (steps as OnboardingSteps).receive ?? "pending",
  };
};

const canSkip = (step: OnboardingStep) => step !== "store";

export const getOnboardingProgress = async (input: { organizationId: string }) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.onboardingProgress.findUnique({
      where: { organizationId: input.organizationId },
    });

    const steps = resolveSteps(existing?.steps);
    if (!canSkip("store") && steps.store === "skipped") {
      steps.store = "pending";
    }

    const [
      legalStoreCount,
      teamCount,
      productCount,
      reorderPolicyCount,
      movementCount,
      supplierCount,
      purchaseOrderCount,
      receivedOrderCount,
    ] = await Promise.all([
      tx.store.count({
        where: {
          organizationId: input.organizationId,
          legalEntityType: { not: null },
          legalName: { not: null },
        },
      }),
      tx.user.count({
        where: {
          organizationId: input.organizationId,
          role: { in: ["MANAGER", "STAFF"] },
          isActive: true,
        },
      }),
      tx.product.count({
        where: { organizationId: input.organizationId, isDeleted: false },
      }),
      tx.reorderPolicy.count({
        where: { store: { organizationId: input.organizationId } },
      }),
      tx.stockMovement.count({
        where: {
          product: { organizationId: input.organizationId },
          type: { in: ["RECEIVE", "ADJUSTMENT"] },
        },
      }),
      tx.supplier.count({ where: { organizationId: input.organizationId } }),
      tx.purchaseOrder.count({ where: { organizationId: input.organizationId } }),
      tx.purchaseOrder.count({
        where: {
          organizationId: input.organizationId,
          status: { in: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.PARTIALLY_RECEIVED] },
        },
      }),
    ]);

    const autoComplete = {
      store: legalStoreCount > 0,
      users: teamCount > 0,
      catalog: productCount >= 3,
      inventory: reorderPolicyCount > 0 || movementCount > 0,
      procurement: supplierCount > 0 && purchaseOrderCount > 0,
      receive: receivedOrderCount > 0,
    } satisfies Record<OnboardingStep, boolean>;

    let changed = false;
    for (const step of Object.keys(autoComplete) as OnboardingStep[]) {
      if (steps[step] === "pending" && autoComplete[step]) {
        steps[step] = "completed";
        changed = true;
      }
    }

    const allDone = (Object.entries(steps) as [OnboardingStep, OnboardingStepStatus][])
      .every(([step, status]) => (step === "store" ? status === "completed" : status !== "pending"));
    const nextCompletedAt = allDone ? existing?.completedAt ?? new Date() : null;
    const completedAtChanged =
      (existing?.completedAt?.getTime() ?? null) !== (nextCompletedAt?.getTime() ?? null);

    if (!existing) {
      await tx.onboardingProgress.create({
        data: {
          organizationId: input.organizationId,
          steps,
          completedAt: nextCompletedAt,
        },
      });
      await recordFirstEvent({
        organizationId: input.organizationId,
        type: "onboarding_started",
      });
      changed = false;
    } else if (changed || completedAtChanged) {
      await tx.onboardingProgress.update({
        where: { id: existing.id },
        data: {
          steps,
          completedAt: nextCompletedAt,
        },
      });
    }

    if (completedAtChanged && nextCompletedAt) {
      await recordFirstEvent({
        organizationId: input.organizationId,
        type: "onboarding_completed",
      });
    }

    return {
      steps,
      completedAt: nextCompletedAt,
      stats: {
        legalStoreCount,
        teamCount,
        productCount,
        reorderPolicyCount,
        movementCount,
        supplierCount,
        purchaseOrderCount,
        receivedOrderCount,
      },
    };
  });

export const completeOnboardingStep = async (input: {
  organizationId: string;
  step: OnboardingStep;
}) =>
  prisma.$transaction(async (tx) => {
    const progress = await tx.onboardingProgress.findUnique({
      where: { organizationId: input.organizationId },
    });
    if (!progress) {
      throw new AppError("onboardingMissing", "NOT_FOUND", 404);
    }

    const steps = resolveSteps(progress.steps);
    if (input.step === "store") {
      const legalStoreCount = await tx.store.count({
        where: {
          organizationId: input.organizationId,
          legalEntityType: { not: null },
          legalName: { not: null },
        },
      });
      if (legalStoreCount === 0) {
        throw new AppError("onboardingStoreIncomplete", "CONFLICT", 409);
      }
    }

    steps[input.step] = "completed";

    const allDone = (Object.entries(steps) as [OnboardingStep, OnboardingStepStatus][])
      .every(([step, status]) => (step === "store" ? status === "completed" : status !== "pending"));

    const updated = await tx.onboardingProgress.update({
      where: { id: progress.id },
      data: {
        steps,
        completedAt: allDone ? progress.completedAt ?? new Date() : null,
      },
    });

    return { steps: resolveSteps(updated.steps), completedAt: updated.completedAt };
  });

export const skipOnboardingStep = async (input: {
  organizationId: string;
  step: OnboardingStep;
}) =>
  prisma.$transaction(async (tx) => {
    if (!canSkip(input.step)) {
      throw new AppError("onboardingStoreRequired", "CONFLICT", 409);
    }

    const progress = await tx.onboardingProgress.findUnique({
      where: { organizationId: input.organizationId },
    });
    if (!progress) {
      throw new AppError("onboardingMissing", "NOT_FOUND", 404);
    }

    const steps = resolveSteps(progress.steps);
    steps[input.step] = "skipped";

    const allDone = (Object.entries(steps) as [OnboardingStep, OnboardingStepStatus][])
      .every(([step, status]) => (step === "store" ? status === "completed" : status !== "pending"));

    const updated = await tx.onboardingProgress.update({
      where: { id: progress.id },
      data: {
        steps,
        completedAt: allDone ? progress.completedAt ?? new Date() : null,
      },
    });

    return { steps: resolveSteps(updated.steps), completedAt: updated.completedAt };
  });
