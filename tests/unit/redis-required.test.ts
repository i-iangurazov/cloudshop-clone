import { afterEach, describe, expect, it, vi } from "vitest";

describe("redis requirements", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws in production when REDIS_URL is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("REDIS_URL", "");

    vi.resetModules();
    const { createRateLimiter } = await import("@/server/middleware/rateLimiter");

    expect(() =>
      createRateLimiter({
        windowMs: 1000,
        max: 1,
        prefix: "test",
      }),
    ).toThrow();

    vi.unstubAllEnvs();
  });
});
