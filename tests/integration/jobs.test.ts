import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/prisma";
import { runJob, registerJobForTests } from "@/server/jobs";
import { retryDeadLetterJob } from "@/server/services/deadLetterJobs";
import { resetDatabase, seedBase, shouldRunDbTests } from "../helpers/db";

const describeDb = shouldRunDbTests ? describe : describe.skip;

describeDb("jobs reliability", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates dead letters after retries", async () => {
    const { org } = await seedBase();
    registerJobForTests("failing-job", async () => {
      throw new Error("boom");
    });

    const result = await runJob("failing-job", { organizationId: org.id });

    expect(result.status).toBe("skipped");
    const deadLetters = await prisma.deadLetterJob.findMany({
      where: { jobName: "failing-job" },
    });

    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]?.attempts).toBeGreaterThan(0);
  });

  it("retries dead letters and resolves when successful", async () => {
    const { org, adminUser } = await seedBase();
    registerJobForTests("retry-job", async () => ({ job: "retry-job", status: "ok" }));

    const deadLetter = await prisma.deadLetterJob.create({
      data: {
        organizationId: org.id,
        jobName: "retry-job",
        payload: { organizationId: org.id },
        attempts: 1,
        lastError: "boom",
        lastErrorAt: new Date(),
      },
    });

    const result = await retryDeadLetterJob({
      jobId: deadLetter.id,
      actorId: adminUser.id,
      organizationId: org.id,
      requestId: "req-retry-job",
    });

    expect(result.status).toBe("resolved");
  });
});
