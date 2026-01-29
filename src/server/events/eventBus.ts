import { randomUUID } from "node:crypto";

import { getLogger } from "@/server/logging";
import { getRedisPublisher, getRedisSubscriber, redisConfigured } from "@/server/redis";
import {
  eventsPublishedTotal,
  eventsPublishFailuresTotal,
  incrementCounter,
} from "@/server/metrics/metrics";

export type EventPayload =
  | { type: "inventory.updated"; payload: { storeId: string; productId: string; variantId?: string | null } }
  | { type: "purchaseOrder.updated"; payload: { poId: string; status: string } }
  | {
      type: "lowStock.triggered";
      payload: { storeId: string; productId: string; variantId?: string | null; onHand: number; minStock: number };
    };

type Listener = (event: EventPayload) => void;

type EventEnvelope = {
  sourceId: string;
  event: EventPayload;
};

const CHANNEL = "inventory.events";

class InMemoryEventBus {
  private listeners = new Set<Listener>();

  publish(event: EventPayload) {
    incrementCounter(eventsPublishedTotal, { type: event.type });
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

class RedisEventBus {
  private listeners = new Set<Listener>();
  private readonly sourceId = randomUUID();
  private readonly logger = getLogger();
  private readonly publisher = getRedisPublisher();
  private readonly subscriber = getRedisSubscriber();
  private subscribed = false;

  publish(event: EventPayload) {
    incrementCounter(eventsPublishedTotal, { type: event.type });
    for (const listener of this.listeners) {
      listener(event);
    }

    if (!this.publisher) {
      return;
    }

    const envelope: EventEnvelope = { sourceId: this.sourceId, event };
    this.publisher
      .publish(CHANNEL, JSON.stringify(envelope))
      .catch((error) => {
        incrementCounter(eventsPublishFailuresTotal, { type: event.type });
        this.logger.warn({ error, eventType: event.type }, "event publish failed");
      });
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    this.ensureSubscription();
    return () => this.listeners.delete(listener);
  }

  private ensureSubscription() {
    if (this.subscribed || !this.subscriber) {
      return;
    }
    this.subscribed = true;

    this.subscriber.subscribe(CHANNEL).catch((error) => {
      incrementCounter(eventsPublishFailuresTotal, { type: "subscribe" });
      this.logger.warn({ error }, "event subscription failed");
    });

    this.subscriber.on("message", (_channel, message) => {
      try {
        const envelope = JSON.parse(message) as EventEnvelope;
        if (envelope.sourceId === this.sourceId) {
          return;
        }
        for (const listener of this.listeners) {
          listener(envelope.event);
        }
      } catch (error) {
        this.logger.warn({ error }, "failed to parse event payload");
      }
    });
  }
}

export const eventBus = redisConfigured() ? new RedisEventBus() : new InMemoryEventBus();
