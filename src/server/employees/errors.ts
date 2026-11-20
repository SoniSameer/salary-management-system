export class EmployeeNotFoundError extends Error {
  constructor(public readonly employeeId: string) {
    super(`Employee ${employeeId} was not found`);
    this.name = "EmployeeNotFoundError";
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor(public readonly email: string) {
    super(`An employee with email ${email} already exists`);
    this.name = "EmailAlreadyExistsError";
  }
}
