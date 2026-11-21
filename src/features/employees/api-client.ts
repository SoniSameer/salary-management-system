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

/** A failed API call, carrying a message that is safe to show to the user. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly code: string | null = null,
    /** Messages by form field, when the API says which field is wrong. */
    public readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const NETWORK_MESSAGE = "Could not reach the server. Check your connection and try again.";

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    // An aborted request is not a failure. Let the caller recognise and ignore it.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiRequestError(NETWORK_MESSAGE, null);
  }

  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

function sendJson(method: "POST" | "PATCH", body?: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

async function toApiError(response: Response): Promise<ApiRequestError> {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string; fields?: Record<string, string[]> };
    };
    if (body.error?.message) {
      return new ApiRequestError(
        body.error.message,
        response.status,
        body.error.code ?? null,
        body.error.fields ?? {},
      );
    }
  } catch {
    // The body was not JSON. Fall through to the generic message.
  }
  return new ApiRequestError(`The server returned an error (${response.status}).`, response.status);
}

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
