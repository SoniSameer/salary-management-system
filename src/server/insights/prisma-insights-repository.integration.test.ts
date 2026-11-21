import { afterAll } from "vitest";
import { createTestPrisma, resetDatabase } from "@/test/integration-db";
import { describeInsightsRepositoryContract } from "./insights-repository.contract";
import { PrismaInsightsRepository } from "./prisma-insights-repository";

const prisma = createTestPrisma();

afterAll(async () => {
  await prisma.$disconnect();
});

describeInsightsRepositoryContract("PrismaInsightsRepository", async () => {
  await resetDatabase(prisma);

  return {
    repository: new PrismaInsightsRepository(prisma),
    seed: async (employees) => {
      await prisma.employee.createMany({
        data: employees.map((employee, index) => ({
          fullName: `Person ${index}`,
          email: `person${index}@example.com`,
          country: employee.country,
          department: "Any",
          jobTitle: employee.jobTitle,
          currency: employee.currency,
          currentSalary: employee.salary,
          isActive: employee.active !== false,
          hiredAt: new Date("2024-01-01T00:00:00.000Z"),
        })),
      });
    },
  };
});
