import { eventBus } from "@/server/events/eventBus";
import {
  decrementGauge,
  incrementCounter,
  incrementGauge,
  httpRequestsTotal,
  sseConnectionsActive,
} from "@/server/metrics/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
  incrementCounter(httpRequestsTotal, { path: "/api/sse" });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      incrementGauge(sseConnectionsActive);
      const send = (event: { type: string; payload: unknown }) => {
        const payload = JSON.stringify(event.payload);
        controller.enqueue(encoder.encode(`event: ${event.type}\n`));
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      const unsubscribe = eventBus.subscribe(send);
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe();
        decrementGauge(sseConnectionsActive);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
};
