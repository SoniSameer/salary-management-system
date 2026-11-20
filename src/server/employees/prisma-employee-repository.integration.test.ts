import { afterAll } from "vitest";
import { createTestPrisma, resetDatabase } from "@/test/integration-db";
import { describeEmployeeRepositoryContract } from "./employee-repository.contract";
import { PrismaEmployeeRepository } from "./prisma-employee-repository";

const prisma = createTestPrisma();

afterAll(async () => {
  await prisma.$disconnect();
});

describeEmployeeRepositoryContract("PrismaEmployeeRepository", async () => {
  await resetDatabase(prisma);
  return new PrismaEmployeeRepository(prisma);
});
