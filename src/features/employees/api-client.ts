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

export interface EmployeeListDto {
  items: EmployeeDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** A failed API call, carrying a message that is safe to show to the user. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly code: string | null = null,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const NETWORK_MESSAGE = "Could not reach the server. Check your connection and try again.";

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    // An aborted request is not a failure. Let the caller recognise and ignore it.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiRequestError(NETWORK_MESSAGE, null);
  }

  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiRequestError> {
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    if (body.error?.message) {
      return new ApiRequestError(body.error.message, response.status, body.error.code ?? null);
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
  return request<EmployeeListDto>(`/api/employees${qs ? `?${qs}` : ""}`, signal);
}

export function fetchFilterOptions(signal?: AbortSignal): Promise<EmployeeFilterOptions> {
  return request<EmployeeFilterOptions>("/api/employees/filter-options", signal);
}
