import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDatabase } from "@/test/integration-db";
import { seedDatabase } from "./seed-database";

const prisma = createTestPrisma();

describe("seedDatabase", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("inserts employees and their salary history", async () => {
    const result = await seedDatabase(prisma, { count: 300, seed: 1 });

    expect(result.skipped).toBe(false);
    expect(await prisma.employee.count()).toBe(300);
    expect(await prisma.salaryRecord.count()).toBe(result.salaryRecords);
  });

  it("stores a current salary that matches the latest history record", async () => {
    await seedDatabase(prisma, { count: 100, seed: 1 });

    const employees = await prisma.employee.findMany({
      include: { salaryRecords: { orderBy: { effectiveAt: "desc" }, take: 1 } },
    });

    for (const employee of employees) {
      expect(employee.currentSalary).toBe(employee.salaryRecords[0].amount);
      expect(employee.currency).toBe(employee.salaryRecords[0].currency);
    }
  });

  it("does nothing when employees already exist", async () => {
    await seedDatabase(prisma, { count: 50, seed: 1 });

    const second = await seedDatabase(prisma, { count: 80, seed: 2 });

    expect(second.skipped).toBe(true);
    expect(await prisma.employee.count()).toBe(50);
  });

  it("replaces existing data only when reset is requested", async () => {
    await seedDatabase(prisma, { count: 50, seed: 1 });

    const second = await seedDatabase(prisma, { count: 80, seed: 2, reset: true });

    expect(second.skipped).toBe(false);
    expect(await prisma.employee.count()).toBe(80);
  });

  it("seeds more rows than one batch holds", async () => {
    await seedDatabase(prisma, { count: 2_500, seed: 3 });

    expect(await prisma.employee.count()).toBe(2_500);
  });
});
