import { getPrisma } from "@/lib/db";
import { EmployeeService } from "@/server/employees/employee-service";
import { PrismaEmployeeRepository } from "@/server/employees/prisma-employee-repository";
import { SalaryService } from "@/server/employees/salary-service";
import { InsightsService } from "@/server/insights/insights-service";
import { PrismaInsightsRepository } from "@/server/insights/prisma-insights-repository";

/**
 * Composition root: the one place that decides which implementations the app
 * uses. Route handlers ask for services here and never touch Prisma directly.
 */
function getEmployeeRepository(): PrismaEmployeeRepository {
  return new PrismaEmployeeRepository(getPrisma());
}

export function getEmployeeService(): EmployeeService {
  return new EmployeeService(getEmployeeRepository());
}

export function getSalaryService(): SalaryService {
  return new SalaryService(getEmployeeRepository());
}

export function getInsightsService(): InsightsService {
  return new InsightsService(new PrismaInsightsRepository(getPrisma()));
}
