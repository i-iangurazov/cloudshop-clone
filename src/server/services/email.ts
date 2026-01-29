import { getLogger } from "@/server/logging";

export const sendVerificationEmail = async (input: {
  email: string;
  verifyLink: string;
}) => {
  const logger = getLogger();
  logger.info({ email: input.email, verifyLink: input.verifyLink }, "email verification link generated");
};

export const sendResetEmail = async (input: {
  email: string;
  resetLink: string;
}) => {
  const logger = getLogger();
  logger.info({ email: input.email, resetLink: input.resetLink }, "password reset link generated");
};

export const sendInviteEmail = async (input: {
  email: string;
  inviteLink: string;
}) => {
  const logger = getLogger();
  logger.info({ email: input.email, inviteLink: input.inviteLink }, "invite link generated");
};
