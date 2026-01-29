import pino from "pino";

import { getRequestId } from "@/server/middleware/requestContext";

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

export const getLogger = (requestId?: string) =>
  baseLogger.child({ requestId: requestId ?? getRequestId() });
