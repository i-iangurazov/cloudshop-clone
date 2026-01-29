import { prisma } from "@/server/db/prisma";
import { toJson } from "@/server/services/json";

export type ProductEventType =
  | "onboarding_started"
  | "onboarding_completed"
  | "first_product_created"
  | "first_import_completed"
  | "first_po_created"
  | "first_po_received"
  | "first_price_tags_printed";

export const recordEvent = async (input: {
  organizationId: string;
  type: ProductEventType;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
}) =>
  prisma.productEvent.create({
    data: {
      organizationId: input.organizationId,
      type: input.type,
      actorId: input.actorId ?? null,
      metadata: input.metadata ? toJson(input.metadata) : undefined,
    },
  });

export const recordFirstEvent = async (input: {
  organizationId: string;
  type: ProductEventType;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
}) => {
  const existing = await prisma.productEvent.findFirst({
    where: { organizationId: input.organizationId, type: input.type },
    select: { id: true },
  });
  if (existing) {
    return null;
  }
  return recordEvent(input);
};
