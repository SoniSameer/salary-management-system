import { randomUUID } from "node:crypto";
import type { Employee, EmployeeProfilePatch, SalaryRecord } from "@/server/employees/employee";
import type {
  EmployeeFilterOptions,
  EmployeeListQuery,
  EmployeeListResult,
} from "@/server/employees/employee-list";
import type {
  AppliedSalaryChange,
  EmployeeRepository,
  NewEmployee,
  SalaryChange,
} from "@/server/employees/employee-repository";
import { EmailAlreadyExistsError } from "@/server/employees/errors";

function compareValues(a: string | number | Date, b: string | number | Date): number {
  const left = a instanceof Date ? a.getTime() : a;
  const right = b instanceof Date ? b.getTime() : b;
  if (left < right) return -1;
  return left > right ? 1 : 0;
}

/** Test double for EmployeeRepository. Kept honest by the shared contract tests. */
export class InMemoryEmployeeRepository implements EmployeeRepository {
  private readonly employees = new Map<string, Employee>();
  private readonly salaryRecords: SalaryRecord[] = [];

  async createWithInitialSalary(input: NewEmployee): Promise<Employee> {
    this.assertEmailAvailable(input.email);

    const employee: Employee = {
      id: randomUUID(),
      fullName: input.fullName,
      email: input.email,
      country: input.country,
      department: input.department,
      jobTitle: input.jobTitle,
      currency: input.currency,
      currentSalary: input.initialSalary.amount,
      isActive: true,
      hiredAt: input.hiredAt,
      deactivatedAt: null,
    };
    this.employees.set(employee.id, employee);
    this.salaryRecords.push({
      id: randomUUID(),
      employeeId: employee.id,
      amount: input.initialSalary.amount,
      currency: input.currency,
      effectiveAt: input.initialSalary.effectiveAt,
      reason: input.initialSalary.reason,
    });

    return { ...employee };
  }

  async findById(id: string): Promise<Employee | null> {
    const employee = this.employees.get(id);
    return employee ? { ...employee } : null;
  }

  async updateProfile(id: string, patch: EmployeeProfilePatch): Promise<Employee | null> {
    const existing = this.employees.get(id);
    if (!existing) return null;

    if (patch.email !== undefined) {
      this.assertEmailAvailable(patch.email, id);
    }

    const updated: Employee = { ...existing, ...patch };
    this.employees.set(id, updated);
    return { ...updated };
  }

  async deactivate(id: string, at: Date): Promise<Employee | null> {
    const existing = this.employees.get(id);
    if (!existing) return null;

    if (existing.isActive) {
      const updated: Employee = { ...existing, isActive: false, deactivatedAt: at };
      this.employees.set(id, updated);
      return { ...updated };
    }
    return { ...existing };
  }

  async listSalaryHistory(employeeId: string): Promise<SalaryRecord[]> {
    return this.salaryRecords
      .filter((record) => record.employeeId === employeeId)
      .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime())
      .map((record) => ({ ...record }));
  }

  async list(query: EmployeeListQuery): Promise<EmployeeListResult> {
    const search = query.search?.toLowerCase();
    const matching = [...this.employees.values()].filter((employee) => {
      if (query.status === "active" && !employee.isActive) return false;
      if (query.status === "inactive" && employee.isActive) return false;
      if (query.country && employee.country !== query.country) return false;
      if (query.department && employee.department !== query.department) return false;
      if (query.jobTitle && employee.jobTitle !== query.jobTitle) return false;
      if (query.currency && employee.currency !== query.currency) return false;
      if (
        search &&
        !employee.fullName.toLowerCase().includes(search) &&
        !employee.email.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });

    const direction = query.sortOrder === "asc" ? 1 : -1;
    matching.sort((a, b) => {
      const byField = compareValues(a[query.sortBy], b[query.sortBy]) * direction;
      // Same tiebreaker as the database query, so paging is stable.
      return byField !== 0 ? byField : compareValues(a.id, b.id);
    });

    const start = (query.page - 1) * query.pageSize;
    return {
      items: matching.slice(start, start + query.pageSize).map((employee) => ({ ...employee })),
      total: matching.length,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(matching.length / query.pageSize),
    };
  }

  async getFilterOptions(): Promise<EmployeeFilterOptions> {
    const distinct = (pick: (employee: Employee) => string): string[] =>
      [...new Set([...this.employees.values()].map(pick))].sort(compareValues);

    return {
      countries: distinct((employee) => employee.country),
      departments: distinct((employee) => employee.department),
      jobTitles: distinct((employee) => employee.jobTitle),
      currencies: distinct((employee) => employee.currency),
    };
  }

  async applySalaryChange(change: SalaryChange): Promise<AppliedSalaryChange | null> {
    const existing = this.employees.get(change.employeeId);
    if (!existing || !existing.isActive || existing.currentSalary !== change.expectedCurrentSalary) {
      return null;
    }

    const updated: Employee = { ...existing, currentSalary: change.newAmount };
    const record: SalaryRecord = {
      id: randomUUID(),
      employeeId: existing.id,
      amount: change.newAmount,
      currency: existing.currency,
      effectiveAt: change.effectiveAt,
      reason: change.reason,
    };
    this.employees.set(updated.id, updated);
    this.salaryRecords.push(record);

    return { employee: { ...updated }, record: { ...record } };
  }

  private assertEmailAvailable(email: string, ownerId?: string): void {
    for (const employee of this.employees.values()) {
      if (employee.email === email && employee.id !== ownerId) {
        throw new EmailAlreadyExistsError(email);
      }
    }
  }
}
