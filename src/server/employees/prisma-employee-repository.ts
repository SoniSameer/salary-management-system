import {
  Prisma,
  type Employee as EmployeeRow,
  type PrismaClient,
  type SalaryRecord as SalaryRecordRow,
} from "@/generated/prisma/client";
import type { Employee, EmployeeProfilePatch, SalaryRecord } from "./employee";
import type {
  EmployeeFilterOptions,
  EmployeeListQuery,
  EmployeeListResult,
} from "./employee-list";
import type {
  AppliedSalaryChange,
  EmployeeRepository,
  NewEmployee,
  SalaryChange,
} from "./employee-repository";
import { EmailAlreadyExistsError } from "./errors";
import { escapeLikePattern } from "./like-pattern";

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

function buildWhere(query: EmployeeListQuery): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};

  if (query.status !== "all") where.isActive = query.status === "active";
  if (query.country) where.country = query.country;
  if (query.department) where.department = query.department;
  if (query.jobTitle) where.jobTitle = query.jobTitle;
  if (query.currency) where.currency = query.currency;
  if (query.search) {
    // Case-insensitive "contains" on name or email (ILIKE in PostgreSQL).
    // The text is escaped so "%" and "_" match themselves, not any character.
    const search = escapeLikePattern(query.search);
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
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

  async list(query: EmployeeListQuery): Promise<EmployeeListResult> {
    const where = buildWhere(query);

    // The page and the total run in one transaction so they describe the same
    // snapshot. `id` is the tiebreaker that keeps paging stable when many rows
    // share a sort value (for example the same salary).
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        orderBy: [{ [query.sortBy]: query.sortOrder }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      items: rows.map(toEmployee),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async getFilterOptions(): Promise<EmployeeFilterOptions> {
    const [countries, departments, jobTitles, currencies] = await Promise.all([
      this.prisma.employee.groupBy({ by: ["country"], orderBy: { country: "asc" } }),
      this.prisma.employee.groupBy({ by: ["department"], orderBy: { department: "asc" } }),
      this.prisma.employee.groupBy({ by: ["jobTitle"], orderBy: { jobTitle: "asc" } }),
      this.prisma.employee.groupBy({ by: ["currency"], orderBy: { currency: "asc" } }),
    ]);

    return {
      countries: countries.map((row) => row.country),
      departments: departments.map((row) => row.department),
      jobTitles: jobTitles.map((row) => row.jobTitle),
      currencies: currencies.map((row) => row.currency),
    };
  }

  async applySalaryChange(change: SalaryChange): Promise<AppliedSalaryChange | null> {
    return this.prisma.$transaction(async (tx) => {
      // The WHERE clause is the concurrency guard. If another request changed
      // the salary or deactivated the employee since we read it, no row
      // matches, nothing is written and we return null. Two simultaneous
      // changes cannot both match, because the first one moves currentSalary.
      const { count } = await tx.employee.updateMany({
        where: {
          id: change.employeeId,
          isActive: true,
          currentSalary: change.expectedCurrentSalary,
        },
        data: { currentSalary: change.newAmount },
      });
      if (count === 0) return null;

      const employee = await tx.employee.findUniqueOrThrow({ where: { id: change.employeeId } });
      // If this insert fails the transaction rolls back the salary update too.
      const record = await tx.salaryRecord.create({
        data: {
          employeeId: employee.id,
          amount: change.newAmount,
          currency: employee.currency,
          effectiveAt: change.effectiveAt,
          reason: change.reason,
        },
      });

      return { employee: toEmployee(employee), record: toSalaryRecord(record) };
    });
  }

  async listSalaryHistory(employeeId: string): Promise<SalaryRecord[]> {
    const rows = await this.prisma.salaryRecord.findMany({
      where: { employeeId },
      orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(toSalaryRecord);
  }
}
