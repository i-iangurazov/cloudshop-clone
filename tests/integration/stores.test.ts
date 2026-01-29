import { beforeEach, describe, expect, it } from "vitest";
import { LegalEntityType } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { resetDatabase, seedBase, shouldRunDbTests } from "../helpers/db";
import { createTestCaller } from "../helpers/context";

const describeDb = shouldRunDbTests ? describe : describe.skip;

describeDb("stores", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("updates legal details for admin", async () => {
    const { org, store, adminUser } = await seedBase();
    const caller = createTestCaller({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      organizationId: org.id,
    });

    const updated = await caller.stores.updateLegalDetails({
      storeId: store.id,
      legalEntityType: LegalEntityType.IP,
      legalName: "IP Test",
      inn: "1234567890",
      address: "Bishkek",
      phone: "+996700000000",
    });

    expect(updated).toMatchObject({
      id: store.id,
      legalEntityType: LegalEntityType.IP,
      legalName: "IP Test",
      inn: "1234567890",
    });

    const stored = await prisma.store.findUnique({ where: { id: store.id } });
    expect(stored?.legalEntityType).toBe(LegalEntityType.IP);
    expect(stored?.inn).toBe("1234567890");
  });

  it("forbids staff updates", async () => {
    const { org, store, staffUser } = await seedBase();
    const caller = createTestCaller({
      id: staffUser.id,
      email: staffUser.email,
      role: staffUser.role,
      organizationId: org.id,
    });

    await expect(
      caller.stores.updateLegalDetails({
        storeId: store.id,
        legalEntityType: LegalEntityType.OSOO,
        legalName: "Test LLC",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
