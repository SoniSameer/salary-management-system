import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestPrisma, resetDatabase } from "./integration-db";

const prisma = createTestPrisma();

function newEmployee(overrides: { email?: string } = {}) {
  return {
    fullName: "Ada Lovelace",
    email: overrides.email ?? "ada@example.com",
    country: "Germany",
    department: "Engineering",
    jobTitle: "Software Engineer",
    currency: "EUR",
    currentSalary: 70000,
    hiredAt: new Date("2024-01-15"),
  };
}

describe("database schema", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores an employee with a salary record", async () => {
    const employee = await prisma.employee.create({
      data: {
        ...newEmployee(),
        salaryRecords: { create: { amount: 70000, currency: "EUR" } },
      },
      include: { salaryRecords: true },
    });

    expect(employee.isActive).toBe(true);
    expect(employee.salaryRecords).toHaveLength(1);
    expect(employee.salaryRecords[0].amount).toBe(70000);
  });

  it("rejects a duplicate email", async () => {
    await prisma.employee.create({ data: newEmployee() });

    await expect(
      prisma.employee.create({ data: newEmployee() }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("rejects a salary record for an unknown employee", async () => {
    await expect(
      prisma.salaryRecord.create({
        data: {
          employeeId: "00000000-0000-4000-8000-000000000000",
          amount: 1,
          currency: "EUR",
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("refuses to delete an employee that has salary history", async () => {
    const employee = await prisma.employee.create({
      data: {
        ...newEmployee(),
        salaryRecords: { create: { amount: 70000, currency: "EUR" } },
      },
    });

    await expect(
      prisma.employee.delete({ where: { id: employee.id } }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
});
