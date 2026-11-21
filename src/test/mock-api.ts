import { vi } from "vitest";
import type { EmployeeDto, EmployeeListDto } from "@/features/employees/api-client";
import type { EmployeeFilterOptions } from "@/server/employees/employee-list";

export function employeeDto(overrides: Partial<EmployeeDto> = {}): EmployeeDto {
  return {
    id: "f4856dc2-08f7-4b6c-8148-fa7069a3fdbf",
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    country: "Germany",
    department: "Engineering",
    jobTitle: "Software Engineer",
    currency: "EUR",
    currentSalary: 70000,
    isActive: true,
    hiredAt: "2024-01-15T00:00:00.000Z",
    deactivatedAt: null,
    ...overrides,
  };
}

export function listDto(
  items: EmployeeDto[],
  overrides: Partial<EmployeeListDto> = {},
): EmployeeListDto {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 25,
    totalPages: items.length === 0 ? 0 : 1,
    ...overrides,
  };
}

export const FILTER_OPTIONS: EmployeeFilterOptions = {
  countries: ["France", "Germany", "Japan"],
  departments: ["Engineering", "Sales"],
  jobTitles: ["Account Executive", "Software Engineer"],
  currencies: ["EUR", "JPY"],
};

type Handler<T> = (url: URL) => T | Promise<T>;

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

interface ApiMockOptions {
  list?: Handler<EmployeeListDto | Response>;
  options?: Handler<EmployeeFilterOptions | Response>;
  /**
   * Handles any other request (details, create, update, deactivate). Return a
   * Response to answer it, or undefined to fall through to the list and options routes.
   */
  custom?: (request: RecordedRequest, url: URL) => Response | Promise<Response> | undefined;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Error body in the same shape the real API returns. */
export function apiError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

/**
 * Replaces `fetch` with a router for the directory's two endpoints. A handler
 * may return data, a Response (for errors) or a promise, so tests can control
 * exactly when a request finishes.
 */
export function mockEmployeeApi({
  list = () => listDto([]),
  options = () => FILTER_OPTIONS,
  custom,
}: ApiMockOptions = {}) {
  const listCalls: URL[] = [];
  /** Every request that was not a list or filter-options call, in order. */
  const requests: RecordedRequest[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const method = init?.method ?? "GET";

    if (url.pathname === "/api/employees/filter-options") {
      const result = await options(url);
      return result instanceof Response ? result : json(result);
    }

    if (custom) {
      const body = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined;
      const recorded = { method, path: url.pathname, body };
      const response = await custom(recorded, url);
      if (response) {
        requests.push(recorded);
        return response;
      }
    }

    listCalls.push(url);
    const result = await list(url);
    return result instanceof Response ? result : json(result);
  });

  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, listCalls, requests, lastListCall: () => listCalls[listCalls.length - 1] };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return json(body, status);
}
