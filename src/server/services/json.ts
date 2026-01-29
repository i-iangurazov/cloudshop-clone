import type { Prisma } from "@prisma/client";

export const toJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value));
