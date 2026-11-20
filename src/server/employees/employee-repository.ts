import type { Employee, EmployeeProfilePatch, SalaryRecord } from "./employee";

export interface NewEmployee {
  fullName: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  currency: string;
  hiredAt: Date;
  initialSalary: {
    amount: number;
    effectiveAt: Date;
    reason: string;
  };
}

/**
 * Storage port for employees. Implemented by Prisma in production and by an
 * in-memory fake in unit tests. Both must pass the same contract tests.
 */
export interface EmployeeRepository {
  /**
   * Creates the employee and their first salary record as one atomic step.
   * @throws EmailAlreadyExistsError if the email is taken.
   */
  createWithInitialSalary(input: NewEmployee): Promise<Employee>;

  findById(id: string): Promise<Employee | null>;

  /**
   * @returns the updated employee, or null if the id does not exist.
   * @throws EmailAlreadyExistsError if the new email is taken by someone else.
   */
  updateProfile(id: string, patch: EmployeeProfilePatch): Promise<Employee | null>;

  /**
   * Marks the employee inactive. Salary history is kept. If the employee is
   * already inactive nothing changes and the original date is preserved.
   * @returns the employee, or null if the id does not exist.
   */
  deactivate(id: string, at: Date): Promise<Employee | null>;

  /** Salary history, newest first. */
  listSalaryHistory(employeeId: string): Promise<SalaryRecord[]>;

  /**
   * Atomically updates the employee's current salary and appends a history
   * record, or does neither. The write only happens if the employee is still
   * active and still paid `expectedCurrentSalary`, which protects against two
   * people editing at the same time.
   *
   * @returns the result, or null if the employee does not exist, is inactive,
   *          or the salary changed since it was read.
   */
  applySalaryChange(change: SalaryChange): Promise<AppliedSalaryChange | null>;
}

export interface SalaryChange {
  employeeId: string;
  expectedCurrentSalary: number;
  newAmount: number;
  effectiveAt: Date;
  reason: string | null;
}

export interface AppliedSalaryChange {
  employee: Employee;
  record: SalaryRecord;
}
