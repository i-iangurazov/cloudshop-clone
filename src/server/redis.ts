import Redis from "ioredis";

import { getLogger } from "@/server/logging";

let publisher: Redis | null = null;
let subscriber: Redis | null = null;
let warnedMissing = false;
let warnedError = false;

const isProduction = process.env.NODE_ENV === "production";

const getRedisUrl = () => {
  const url = process.env.REDIS_URL ?? "";
  if (!url && isProduction) {
    throw new Error("REDIS_URL is required in production.");
  }
  return url;
};

export const assertRedisConfigured = () => {
  getRedisUrl();
};

const createClient = (role: "publisher" | "subscriber") => {
  const url = getRedisUrl();
  const logger = getLogger();
  if (!url) {
    if (!warnedMissing) {
      warnedMissing = true;
      logger.warn("REDIS_URL is not set; falling back to in-memory realtime and rate limiting.");
    }
    return null;
  }

  try {
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });

    client.on("error", (error) => {
      if (!warnedError) {
        warnedError = true;
        logger.warn({ error, role }, "Redis connection error; falling back to in-memory behavior.");
      }
    });

    client.connect().catch((error) => {
      if (!warnedError) {
        warnedError = true;
        logger.warn({ error, role }, "Redis connection failed; falling back to in-memory behavior.");
      }
    });

    return client;
  } catch (error) {
    if (!warnedError) {
      warnedError = true;
      logger.warn({ error, role }, "Redis client init failed; falling back to in-memory behavior.");
    }
    return null;
  }
};

export const getRedisPublisher = () => {
  if (!publisher) {
    publisher = createClient("publisher");
  }
  return publisher;
};

export const getRedisSubscriber = () => {
  if (!subscriber) {
    subscriber = createClient("subscriber");
  }
  return subscriber;
};

export const redisConfigured = () => Boolean(getRedisUrl());
