import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter } from "@/server/trpc/routers/_app";
import { createContext } from "@/server/trpc/trpc";
import { ensureRequestId, runWithRequestContext } from "@/server/middleware/requestContext";
import { incrementCounter, httpRequestsTotal } from "@/server/metrics/metrics";

export const runtime = "nodejs";

const handler = async (request: Request) => {
  incrementCounter(httpRequestsTotal, { path: "/api/trpc" });

  const requestId = ensureRequestId(request.headers.get("x-request-id"));
  return runWithRequestContext(requestId, () =>
    fetchRequestHandler({
      endpoint: "/api/trpc",
      req: request,
      router: appRouter,
      createContext,
      responseMeta() {
        return {
          headers: {
            "x-request-id": requestId,
          },
        };
      },
    }),
  );
};

export { handler as GET, handler as POST };
