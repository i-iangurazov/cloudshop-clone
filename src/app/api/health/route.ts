import { prisma } from "@/server/db/prisma";
import { getRedisPublisher } from "@/server/redis";
import { incrementCounter, httpRequestsTotal } from "@/server/metrics/metrics";

export const runtime = "nodejs";

export const GET = async () => {
  incrementCounter(httpRequestsTotal, { path: "/api/health" });

  let db = "unknown";
  let migrations = "unknown";
  let redis = "unknown";

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }

  try {
    const pending = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
    `;
    migrations = pending[0]?.count === 0 ? "ok" : "pending";
  } catch {
    migrations = "unknown";
  }

  try {
    const client = getRedisPublisher();
    if (!client) {
      redis = "missing";
    } else {
      await client.ping();
      redis = "up";
    }
  } catch {
    redis = "down";
  }

  const status = db === "up" && migrations === "ok" && redis === "up" ? "ok" : "degraded";

  return Response.json({ status, db, migrations, redis });
};
