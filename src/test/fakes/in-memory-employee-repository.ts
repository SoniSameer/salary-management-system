import { randomUUID } from "node:crypto";
import type { Employee, EmployeeProfilePatch, SalaryRecord } from "@/server/employees/employee";
import type { EmployeeRepository, NewEmployee } from "@/server/employees/employee-repository";
import { EmailAlreadyExistsError } from "@/server/employees/errors";

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

  private assertEmailAvailable(email: string, ownerId?: string): void {
    for (const employee of this.employees.values()) {
      if (employee.email === email && employee.id !== ownerId) {
        throw new EmailAlreadyExistsError(email);
      }
    }
  }
}
