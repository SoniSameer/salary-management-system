import type { Employee, SalaryRecord } from "./employee";
import type { EmployeeRepository } from "./employee-repository";
import {
  ConcurrentSalaryChangeError,
  EmployeeInactiveError,
  EmployeeNotFoundError,
  SalaryUnchangedError,
} from "./errors";
import type { ChangeSalaryInput } from "./salary-schemas";

export interface SalaryChangeResult {
  employee: Employee;
  record: SalaryRecord;
}

/**
 * Rules for changing an employee's salary. This class decides whether a change
 * is allowed. The repository makes the write atomic, so the salary and its
 * history record are saved together or not at all.
 */
export class SalaryService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async changeSalary(employeeId: string, input: ChangeSalaryInput): Promise<SalaryChangeResult> {
    const employee = await this.employees.findById(employeeId);
    if (!employee) throw new EmployeeNotFoundError(employeeId);
    if (!employee.isActive) throw new EmployeeInactiveError(employeeId);
    if (employee.currentSalary === input.salary) throw new SalaryUnchangedError(input.salary);

    const applied = await this.employees.applySalaryChange({
      employeeId,
      // Only write if nobody changed the employee since we read it above.
      expectedCurrentSalary: employee.currentSalary,
      newAmount: input.salary,
      effectiveAt: this.now(),
      reason: input.reason ?? null,
    });
    if (!applied) throw new ConcurrentSalaryChangeError(employeeId);

    return applied;
  }
}
