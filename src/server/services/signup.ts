import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/services/errors";
import { writeAuditLog } from "@/server/services/audit";
import { toJson } from "@/server/services/json";
import { createAuthToken } from "@/server/services/authTokens";
import { sendVerificationEmail } from "@/server/services/email";

const TRIAL_DAYS = 14;

const ensureSignupOpen = () => {
  const mode = process.env.SIGNUP_MODE ?? "invite_only";
  if (mode !== "open") {
    throw new AppError("signupInviteOnly", "FORBIDDEN", 403);
  }
};

export const requestAccess = async (input: {
  email: string;
  orgName?: string | null;
}) => {
  const existing = await prisma.accessRequest.findFirst({
    where: { email: input.email },
  });
  if (existing) {
    return existing;
  }
  return prisma.accessRequest.create({
    data: {
      email: input.email,
      orgName: input.orgName ?? null,
    },
  });
};

export const createSignup = async (input: {
  email: string;
  password: string;
  name: string;
  orgName: string;
  storeName: string;
  phone?: string | null;
  preferredLocale: string;
  requestId: string;
}) => {
  ensureSignupOpen();

  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    throw new AppError("emailInUse", "CONFLICT", 409);
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const storeCode = `ST${randomUUID().slice(0, 4).toUpperCase()}`;
    const org = await tx.organization.create({
      data: {
        name: input.orgName,
        plan: "TRIAL",
        trialEndsAt,
      },
    });

    const store = await tx.store.create({
      data: {
        organizationId: org.id,
        name: input.storeName,
        code: storeCode,
        allowNegativeStock: false,
        trackExpiryLots: false,
        phone: input.phone ?? null,
      },
    });

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await tx.user.create({
      data: {
        organizationId: org.id,
        email: input.email,
        name: input.name,
        role: "ADMIN",
        passwordHash,
        preferredLocale: input.preferredLocale,
      },
    });

    await writeAuditLog(tx, {
      organizationId: org.id,
      actorId: null,
      action: "ORG_SIGNUP",
      entity: "Organization",
      entityId: org.id,
      after: toJson(org),
      requestId: input.requestId,
    });

    await writeAuditLog(tx, {
      organizationId: org.id,
      actorId: user.id,
      action: "STORE_CREATE",
      entity: "Store",
      entityId: store.id,
      after: toJson(store),
      requestId: input.requestId,
    });

    return { org, user };
  });

  const { raw } = await createAuthToken({
    userId: result.user.id,
    email: result.user.email,
    purpose: "EMAIL_VERIFY",
    expiresInMinutes: 60 * 24,
    organizationId: result.org.id,
    actorId: result.user.id,
    requestId: input.requestId,
  });

  const verifyLink = `${process.env.NEXTAUTH_URL ?? ""}/verify/${raw}`;
  await sendVerificationEmail({ email: result.user.email, verifyLink });

  return { userId: result.user.id, organizationId: result.org.id, verifyLink };
};
