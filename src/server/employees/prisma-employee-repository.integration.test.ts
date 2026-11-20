import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDatabase } from "@/test/integration-db";
import {
  describeEmployeeRepositoryContract,
  newEmployee,
} from "./employee-repository.contract";
import { PrismaEmployeeRepository } from "./prisma-employee-repository";

const prisma = createTestPrisma();

afterAll(async () => {
  await prisma.$disconnect();
});

describeEmployeeRepositoryContract("PrismaEmployeeRepository", async () => {
  await resetDatabase(prisma);
  return new PrismaEmployeeRepository(prisma);
});

describe("PrismaEmployeeRepository salary change transaction", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it("rolls back the salary update when saving the history record fails", async () => {
    const repo = new PrismaEmployeeRepository(prisma);
    const created = await repo.createWithInitialSalary(newEmployee());

    // The salary UPDATE runs first and succeeds. The history INSERT then fails
    // because the date is invalid. If the two were not in one transaction, the
    // employee would be left with a new salary and no history record.
    await expect(
      repo.applySalaryChange({
        employeeId: created.id,
        expectedCurrentSalary: 70_000,
        newAmount: 99_000,
        effectiveAt: new Date("not a date"),
        reason: null,
      }),
    ).rejects.toThrow();

    expect((await repo.findById(created.id))?.currentSalary).toBe(70_000);
    expect(await repo.listSalaryHistory(created.id)).toHaveLength(1);
  });

  it("lets only one of two simultaneous changes win", async () => {
    const repo = new PrismaEmployeeRepository(prisma);
    const created = await repo.createWithInitialSalary(newEmployee());
    const attempt = (newAmount: number) =>
      repo.applySalaryChange({
        employeeId: created.id,
        expectedCurrentSalary: 70_000,
        newAmount,
        effectiveAt: new Date("2025-06-01T00:00:00.000Z"),
        reason: null,
      });

    const results = await Promise.all([attempt(80_000), attempt(90_000)]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
    expect(await repo.listSalaryHistory(created.id)).toHaveLength(2);
  });
});
