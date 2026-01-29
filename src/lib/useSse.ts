"use client";

import { useEffect, useRef } from "react";

export type SseEvent = {
  type: string;
  payload: unknown;
};

export const useSse = (handlers: Record<string, (payload: unknown) => void>) => {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const source = new EventSource("/api/sse");

    const listener = (eventName: string) => (message: MessageEvent) => {
      const handler = handlersRef.current[eventName];
      if (!handler) {
        return;
      }
      try {
        const data = JSON.parse(message.data);
        handler(data);
      } catch {
        handler(null);
      }
    };

    const eventNames = Object.keys(handlersRef.current);
    const subscriptions = eventNames.map((eventName) => {
      const handler = listener(eventName);
      source.addEventListener(eventName, handler);
      return { eventName, handler };
    });

    return () => {
      subscriptions.forEach(({ eventName, handler }) => {
        source.removeEventListener(eventName, handler);
      });
      source.close();
    };
  }, []);
};
