import type { Employee } from "./employee";
import type { EmployeeRepository } from "./employee-repository";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "./employee-schemas";
import { EmployeeNotFoundError } from "./errors";

/**
 * Business rules for employees. Input is already validated by Zod at the API
 * boundary. Storage is behind EmployeeRepository, so this class has no
 * database code and is tested with an in-memory fake.
 */
export class EmployeeService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(input: CreateEmployeeInput): Promise<Employee> {
    const { salary, ...profile } = input;

    return this.employees.createWithInitialSalary({
      ...profile,
      initialSalary: {
        amount: salary,
        // The starting salary applies from the day the person was hired.
        effectiveAt: input.hiredAt,
        reason: "Starting salary",
      },
    });
  }

  /** Edits profile fields only. Salary changes go through the salary service. */
  async update(id: string, patch: UpdateEmployeeInput): Promise<Employee> {
    const updated = await this.employees.updateProfile(id, patch);
    if (!updated) throw new EmployeeNotFoundError(id);
    return updated;
  }

  /** Employees are never deleted: deactivating keeps their record and history. */
  async deactivate(id: string): Promise<Employee> {
    const deactivated = await this.employees.deactivate(id, this.now());
    if (!deactivated) throw new EmployeeNotFoundError(id);
    return deactivated;
  }
}
