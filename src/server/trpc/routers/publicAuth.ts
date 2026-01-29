import { z } from "zod";

import { publicProcedure, rateLimit, router } from "@/server/trpc/trpc";
import { toTRPCError } from "@/server/trpc/errors";
import { createSignup, requestAccess } from "@/server/services/signup";
import { consumeAuthToken, createAuthToken } from "@/server/services/authTokens";
import { sendResetEmail, sendVerificationEmail } from "@/server/services/email";
import { getInviteByToken, acceptInvite } from "@/server/services/invites";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/services/errors";
import bcrypt from "bcryptjs";
import { writeAuditLog } from "@/server/services/audit";
import { toJson } from "@/server/services/json";

const emailSchema = z.string().email();

export const publicAuthRouter = router({
  signupMode: publicProcedure.query(() => ({
    mode: process.env.SIGNUP_MODE ?? "invite_only",
  })),

  requestAccess: publicProcedure
    .use(rateLimit({ windowMs: 60_000, max: 5, prefix: "access-request" }))
    .input(z.object({ email: emailSchema, orgName: z.string().optional() }))
    .mutation(async ({ input }) => {
      try {
        return await requestAccess({ email: input.email, orgName: input.orgName });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  signup: publicProcedure
    .use(rateLimit({ windowMs: 60_000, max: 3, prefix: "signup" }))
    .input(
      z.object({
        email: emailSchema,
        password: z.string().min(8),
        name: z.string().min(2),
        orgName: z.string().min(2),
        storeName: z.string().min(2),
        phone: z.string().optional(),
        preferredLocale: z.enum(["ru", "kg"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createSignup({
          email: input.email,
          password: input.password,
          name: input.name,
          orgName: input.orgName,
          storeName: input.storeName,
          phone: input.phone,
          preferredLocale: input.preferredLocale,
          requestId: ctx.requestId,
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  verifyEmail: publicProcedure
    .use(rateLimit({ windowMs: 60_000, max: 10, prefix: "verify-email" }))
    .input(z.object({ token: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const token = await consumeAuthToken({ purpose: "EMAIL_VERIFY", token: input.token });
        if (!token.userId) {
          throw new AppError("tokenInvalid", "NOT_FOUND", 404);
        }
        const user = await prisma.user.findUnique({ where: { id: token.userId } });
        if (!user) {
          throw new AppError("userNotFound", "NOT_FOUND", 404);
        }
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { emailVerifiedAt: new Date() },
        });

        await writeAuditLog(prisma, {
          organizationId: updated.organizationId,
          actorId: updated.id,
          action: "EMAIL_VERIFY",
          entity: "User",
          entityId: updated.id,
          before: toJson(user),
          after: toJson(updated),
          requestId: ctx.requestId,
        });

        return { verified: true };
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  requestPasswordReset: publicProcedure
    .use(rateLimit({ windowMs: 60_000, max: 5, prefix: "password-reset" }))
    .input(z.object({ email: emailSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await prisma.user.findUnique({ where: { email: input.email } });
        if (!user) {
          return { sent: true };
        }

        const { raw } = await createAuthToken({
          userId: user.id,
          email: user.email,
          purpose: "PASSWORD_RESET",
          expiresInMinutes: 60,
          organizationId: user.organizationId,
          actorId: user.id,
          requestId: ctx.requestId,
        });

        const resetLink = `${process.env.NEXTAUTH_URL ?? ""}/reset/${raw}`;
        await sendResetEmail({ email: user.email, resetLink });
        return { sent: true };
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  resetPassword: publicProcedure
    .use(rateLimit({ windowMs: 60_000, max: 5, prefix: "password-reset" }))
    .input(z.object({ token: z.string().min(10), password: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const token = await consumeAuthToken({ purpose: "PASSWORD_RESET", token: input.token });
        const user = await prisma.user.findUnique({ where: { email: token.email } });
        if (!user) {
          throw new AppError("userNotFound", "NOT_FOUND", 404);
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash },
        });

        await writeAuditLog(prisma, {
          organizationId: updated.organizationId,
          actorId: updated.id,
          action: "USER_PASSWORD_RESET",
          entity: "User",
          entityId: updated.id,
          before: toJson(user),
          after: toJson(updated),
          requestId: ctx.requestId,
        });

        return { reset: true };
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  inviteDetails: publicProcedure
    .use(rateLimit({ windowMs: 60_000, max: 10, prefix: "invite-details" }))
    .input(z.object({ token: z.string().min(10) }))
    .query(async ({ input }) => {
      try {
        const invite = await getInviteByToken(input.token);
        return {
          email: invite.email,
          role: invite.role,
          organizationName: invite.organization.name,
          expiresAt: invite.expiresAt,
        };
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  acceptInvite: publicProcedure
    .use(rateLimit({ windowMs: 60_000, max: 5, prefix: "invite-accept" }))
    .input(
      z.object({
        token: z.string().min(10),
        name: z.string().min(2),
        password: z.string().min(8),
        preferredLocale: z.enum(["ru", "kg"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await acceptInvite({
          token: input.token,
          name: input.name,
          password: input.password,
          preferredLocale: input.preferredLocale,
          requestId: ctx.requestId,
        });
        return user;
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  resendVerification: publicProcedure
    .use(rateLimit({ windowMs: 60_000, max: 3, prefix: "verify-resend" }))
    .input(z.object({ email: emailSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await prisma.user.findUnique({ where: { email: input.email } });
        if (!user) {
          return { sent: true };
        }
        if (user.emailVerifiedAt) {
          return { sent: true };
        }

        const { raw } = await createAuthToken({
          userId: user.id,
          email: user.email,
          purpose: "EMAIL_VERIFY",
          expiresInMinutes: 60 * 24,
          organizationId: user.organizationId,
          actorId: user.id,
          requestId: ctx.requestId,
        });
        const verifyLink = `${process.env.NEXTAUTH_URL ?? ""}/verify/${raw}`;
        await sendVerificationEmail({ email: user.email, verifyLink });
        return { sent: true };
      } catch (error) {
        throw toTRPCError(error);
      }
    }),
});
