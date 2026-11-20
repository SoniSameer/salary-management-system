export class EmployeeNotFoundError extends Error {
  constructor(public readonly employeeId: string) {
    super(`Employee ${employeeId} was not found`);
    this.name = "EmployeeNotFoundError";
  }
}

export class EmployeeInactiveError extends Error {
  constructor(public readonly employeeId: string) {
    super(`Employee ${employeeId} is deactivated and cannot be changed`);
    this.name = "EmployeeInactiveError";
  }
}

export class SalaryUnchangedError extends Error {
  constructor(public readonly salary: number) {
    super(`The salary is already ${salary}`);
    this.name = "SalaryUnchangedError";
  }
}

/** Someone else changed or deactivated the employee between our read and write. */
export class ConcurrentSalaryChangeError extends Error {
  constructor(public readonly employeeId: string) {
    super(`Employee ${employeeId} was changed by someone else. Reload and try again`);
    this.name = "ConcurrentSalaryChangeError";
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor(public readonly email: string) {
    super(`An employee with email ${email} already exists`);
    this.name = "EmailAlreadyExistsError";
  }
}
