import { getPrisma } from "@/lib/db";
import { EmployeeService } from "@/server/employees/employee-service";
import { PrismaEmployeeRepository } from "@/server/employees/prisma-employee-repository";

/**
 * Composition root: the one place that decides which implementations the app
 * uses. Route handlers ask for services here and never touch Prisma directly.
 */
export function getEmployeeService(): EmployeeService {
  return new EmployeeService(new PrismaEmployeeRepository(getPrisma()));
}
