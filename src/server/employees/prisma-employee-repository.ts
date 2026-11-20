import {
  Prisma,
  type Employee as EmployeeRow,
  type PrismaClient,
  type SalaryRecord as SalaryRecordRow,
} from "@/generated/prisma/client";
import type { Employee, EmployeeProfilePatch, SalaryRecord } from "./employee";
import type { EmployeeRepository, NewEmployee } from "./employee-repository";
import { EmailAlreadyExistsError } from "./errors";

// Prisma error codes: https://www.prisma.io/docs/orm/reference/error-reference
const UNIQUE_VIOLATION = "P2002";
const RECORD_NOT_FOUND = "P2025";

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    country: row.country,
    department: row.department,
    jobTitle: row.jobTitle,
    currency: row.currency,
    currentSalary: row.currentSalary,
    isActive: row.isActive,
    hiredAt: row.hiredAt,
    deactivatedAt: row.deactivatedAt,
  };
}

function toSalaryRecord(row: SalaryRecordRow): SalaryRecord {
  return {
    id: row.id,
    employeeId: row.employeeId,
    amount: row.amount,
    currency: row.currency,
    effectiveAt: row.effectiveAt,
    reason: row.reason,
  };
}

export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createWithInitialSalary(input: NewEmployee): Promise<Employee> {
    try {
      // A nested create runs as a single transaction: the employee and the
      // first salary record are both saved, or neither is.
      const row = await this.prisma.employee.create({
        data: {
          fullName: input.fullName,
          email: input.email,
          country: input.country,
          department: input.department,
          jobTitle: input.jobTitle,
          currency: input.currency,
          currentSalary: input.initialSalary.amount,
          hiredAt: input.hiredAt,
          salaryRecords: {
            create: {
              amount: input.initialSalary.amount,
              currency: input.currency,
              effectiveAt: input.initialSalary.effectiveAt,
              reason: input.initialSalary.reason,
            },
          },
        },
      });
      return toEmployee(row);
    } catch (error) {
      if (hasCode(error, UNIQUE_VIOLATION)) throw new EmailAlreadyExistsError(input.email);
      throw error;
    }
  }

  async findById(id: string): Promise<Employee | null> {
    const row = await this.prisma.employee.findUnique({ where: { id } });
    return row ? toEmployee(row) : null;
  }

  async updateProfile(id: string, patch: EmployeeProfilePatch): Promise<Employee | null> {
    try {
      const row = await this.prisma.employee.update({ where: { id }, data: patch });
      return toEmployee(row);
    } catch (error) {
      if (hasCode(error, RECORD_NOT_FOUND)) return null;
      if (hasCode(error, UNIQUE_VIOLATION) && patch.email !== undefined) {
        throw new EmailAlreadyExistsError(patch.email);
      }
      throw error;
    }
  }

  async deactivate(id: string, at: Date): Promise<Employee | null> {
    // The isActive filter makes this a no-op for an already inactive employee,
    // so the original deactivation date is never overwritten.
    await this.prisma.employee.updateMany({
      where: { id, isActive: true },
      data: { isActive: false, deactivatedAt: at },
    });
    return this.findById(id);
  }

  async listSalaryHistory(employeeId: string): Promise<SalaryRecord[]> {
    const rows = await this.prisma.salaryRecord.findMany({
      where: { employeeId },
      orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(toSalaryRecord);
  }
}
