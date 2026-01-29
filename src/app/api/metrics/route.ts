import { incrementCounter, httpRequestsTotal, renderMetrics } from "@/server/metrics/metrics";

export const runtime = "nodejs";

export const GET = async () => {
  incrementCounter(httpRequestsTotal, { path: "/api/metrics" });

  return new Response(renderMetrics(), {
    headers: {
      "Content-Type": "text/plain; version=0.0.4",
    },
  });
};
