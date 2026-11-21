import { request, sendJson } from "@/lib/api-request";
import type { EmployeeFilterOptions, EmployeeListQuery } from "@/server/employees/employee-list";
import { queryToSearchParams } from "./directory-state";

/** An employee as it arrives over HTTP: dates are ISO strings, not Date objects. */
export interface EmployeeDto {
  id: string;
  fullName: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  currency: string;
  currentSalary: number;
  isActive: boolean;
  hiredAt: string;
  deactivatedAt: string | null;
}

export interface SalaryRecordDto {
  id: string;
  employeeId: string;
  amount: number;
  currency: string;
  effectiveAt: string;
  reason: string | null;
}

export interface EmployeeDetailsDto {
  employee: EmployeeDto;
  salaryHistory: SalaryRecordDto[];
}

export interface EmployeeListDto {
  items: EmployeeDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** What the create form sends. `hiredAt` is a plain date such as "2024-01-15". */
export interface NewEmployeePayload {
  fullName: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  currency: string;
  salary: number;
  hiredAt: string;
}

/** The profile fields an edit may change. Salary and currency are not editable here. */
export type EmployeePatchPayload = Partial<
  Pick<NewEmployeePayload, "fullName" | "email" | "country" | "department" | "jobTitle" | "hiredAt">
>;

// The request helper and error type are shared with the insights feature.
export { ApiRequestError } from "@/lib/api-request";

export function fetchEmployees(
  query: EmployeeListQuery,
  signal?: AbortSignal,
): Promise<EmployeeListDto> {
  const qs = queryToSearchParams(query).toString();
  return request<EmployeeListDto>(`/api/employees${qs ? `?${qs}` : ""}`, { signal });
}

export function fetchFilterOptions(signal?: AbortSignal): Promise<EmployeeFilterOptions> {
  return request<EmployeeFilterOptions>("/api/employees/filter-options", { signal });
}

export function fetchEmployeeDetails(id: string, signal?: AbortSignal): Promise<EmployeeDetailsDto> {
  return request<EmployeeDetailsDto>(`/api/employees/${id}`, { signal });
}

export function createEmployee(payload: NewEmployeePayload): Promise<EmployeeDto> {
  return request<EmployeeDto>("/api/employees", sendJson("POST", payload));
}

export function updateEmployee(id: string, patch: EmployeePatchPayload): Promise<EmployeeDto> {
  return request<EmployeeDto>(`/api/employees/${id}`, sendJson("PATCH", patch));
}

export interface SalaryChangePayload {
  /** New annual salary in the employee's own currency. */
  salary: number;
  reason?: string;
}

export interface SalaryChangeResultDto {
  employee: EmployeeDto;
  record: SalaryRecordDto;
}

export function changeSalary(id: string, payload: SalaryChangePayload): Promise<SalaryChangeResultDto> {
  return request<SalaryChangeResultDto>(`/api/employees/${id}/salary`, sendJson("POST", payload));
}

export function deactivateEmployee(id: string): Promise<EmployeeDto> {
  return request<EmployeeDto>(`/api/employees/${id}/deactivate`, sendJson("POST"));
}
