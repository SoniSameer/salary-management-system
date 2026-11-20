export interface Employee {
  id: string;
  fullName: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  /** ISO 4217 code. Fixed once set: it ties the employee to their salary history. */
  currency: string;
  /** Annual salary in whole currency units. Mirrors the latest SalaryRecord. */
  currentSalary: number;
  isActive: boolean;
  hiredAt: Date;
  deactivatedAt: Date | null;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  amount: number;
  currency: string;
  effectiveAt: Date;
  reason: string | null;
}

/** Fields HR may edit on an existing employee. Salary and currency are excluded on purpose. */
export interface EmployeeProfilePatch {
  fullName?: string;
  email?: string;
  country?: string;
  department?: string;
  jobTitle?: string;
  hiredAt?: Date;
}
